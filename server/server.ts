import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';
import { getGoogleAuthUrl, getGoogleTokens, fetchGA4Data } from './services/googleAnalytics.js';
import { getMetaAuthUrl, getMetaTokens, fetchMetaAdsData } from './services/metaAds.js';
import { initDatabase } from './services/insightDb.js';
import { checkCache, storeInCache, generateFileHash, generateUrlHash, getInsightStats } from './services/insightCache.js';
import { initCreativeMemoryDatabase, CompetitiveContextGenerator, getCreativeMemoryStats } from './services/creativeMemory/index.js';
import { TrackedIndustry, TRACKED_INDUSTRIES, INDUSTRY_KEYWORDS } from './types/creativeMemoryTypes.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- TYPES (matching frontend types.ts) ---
interface AnalysisResult {
    auditId?: string;
    demographics: any;
    psychographics: any;
    behavioral: any;
    adDiagnostics: any[];
    brandAnalysis?: any;
    brandStrategyWindow: any[];
    brandArchetypeDetail?: any;
    roiMetrics?: any;
    modelHealth?: any;
    validationSuite?: any;
    campaignStrategy?: any;
    industry?: string;  // Auto-detected industry classification
}

interface CampaignStrategy {
    keyPillars: string[];
    keyMessages: Array<{ headline: string; subMessage: string }>;
    channelSelection: string[];
    timeline: string;
    budgetAllocation: string;
    successMetrics: string[];
}

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE_MB = 100; // Supports videos up to ~3 minutes
const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/mpeg", "video/quicktime"];

// DETERMINISM CONFIG
const GENERATION_CONFIG = {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

// --- AI CLIENT ---
const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// --- ERROR TYPES ---
class ValidationError extends Error {
    public readonly code = 'VALIDATION_ERROR';
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

class AIOutputError extends Error {
    public readonly code = 'AI_OUTPUT_INVALID';
    constructor(message: string) {
        super(message);
        this.name = 'AIOutputError';
    }
}

class AIRuntimeError extends Error {
    public readonly code = 'AI_RUNTIME_ERROR';
    constructor(message: string) {
        super(message);
        this.name = 'AIRuntimeError';
    }
}

// --- VALIDATION HELPERS ---
const validateInputs = (textContext: string, analysisLabel: string, fileData?: string | null, mimeType?: string | null, fileUri?: string | null) => {
    const hasText = textContext && textContext.trim().length > 0;

    if (!hasText && !fileData && !fileUri) {
        throw new ValidationError("Input required: Provide 'textContext', upload a 'mediaFile', or provide a 'videoUrl'.");
    }

    if (textContext && textContext.length > 5000) {
        throw new ValidationError("'textContext' exceeds 5000 characters.");
    }

    if (!analysisLabel || analysisLabel.trim().length === 0) {
        throw new ValidationError("'analysisLabel' cannot be empty.");
    }

    if (fileData && mimeType) {
        if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
            throw new ValidationError(`Unsupported MIME type '${mimeType}'. Supported: ${SUPPORTED_MIME_TYPES.join(", ")}`);
        }

        const fileSizeBytes = (fileData.length * 3) / 4;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            throw new ValidationError(`File size ~${fileSizeMB.toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE_MB}MB.`);
        }
    }
};

const validateAnalysisResult = (data: any): AnalysisResult => {
    const requiredKeys = [
        "modelHealth", "validationSuite", "demographics", "psychographics",
        "behavioral", "brandAnalysis", "brandStrategyWindow",
        "brandArchetypeDetail", "roiMetrics", "adDiagnostics"
    ];

    const missingKeys = requiredKeys.filter(key => !(key in data));
    if (missingKeys.length > 0) {
        throw new AIOutputError(`Missing required keys in AnalysisResult: ${missingKeys.join(", ")}`);
    }

    if (!Array.isArray(data.adDiagnostics)) {
        throw new AIOutputError("adDiagnostics must be an array.");
    }

    return data as AnalysisResult;
};

const validateCampaignStrategy = (data: any): CampaignStrategy => {
    const requiredKeys = [
        "keyPillars", "keyMessages", "channelSelection",
        "timeline", "budgetAllocation", "successMetrics"
    ];

    const missingKeys = requiredKeys.filter(key => !(key in data));
    if (missingKeys.length > 0) {
        throw new AIOutputError(`Missing required keys in CampaignStrategy: ${missingKeys.join(", ")}`);
    }

    return data as CampaignStrategy;
};

// --- RUNTIME WRAPPER ---
const generateRequestId = () => Math.random().toString(36).substring(7);

const safeGenerate = async <T>(
    operationName: string,
    generatorFn: () => Promise<any>,
    validatorFn: (data: any) => T,
    maxRetries: number = 1
): Promise<T> => {
    const reqId = generateRequestId();
    console.info(`[${reqId}] START op=${operationName}`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const rawResponse = await generatorFn();

            if (!rawResponse || !rawResponse.text) {
                throw new AIOutputError("Empty response from AI model.");
            }

            let parsedData;
            try {
                parsedData = JSON.parse(rawResponse.text);
            } catch (e) {
                throw new AIOutputError("Malformed JSON received from AI.");
            }

            const result = validatorFn(parsedData);
            console.info(`[${reqId}] SUCCESS op=${operationName}`);
            return result;

        } catch (error) {
            if (error instanceof ValidationError) {
                console.warn(`[${reqId}] REJECT validation error: ${error.message}`);
                throw error;
            }

            lastError = error as Error;
            const errorMsg = lastError.message || String(lastError);

            // Check for quota/rate limit errors
            if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
                console.error(`[${reqId}] QUOTA ERROR: ${errorMsg}`);
                throw new AIRuntimeError("API quota exceeded. Please wait a minute and try again, or check your Gemini API billing.");
            }

            if (attempt < maxRetries) {
                console.warn(`[${reqId}] RETRY op=${operationName} attempt=${attempt + 1} reason=${errorMsg}`);
                continue;
            }
        }
    }

    console.error(`[${reqId}] FAIL op=${operationName} error=${lastError?.name}`);

    if (lastError instanceof AIOutputError) throw lastError;

    throw new AIRuntimeError("System encountered an internal generation error. Please try again.");
};

// --- KNOWLEDGE BASE ---
const BASE_KNOWLEDGE = `
You are StrataPilot, an expert AI Creative Analyst.
Your role is to analyze observable creative assets (images/videos) and provide a diagnostic based strictly on visible evidence and established marketing principles.

**EPISTEMIC GUARDRAILS (CRITICAL):**
1.  **OBSERVABLES ONLY**: You must describe ONLY what is visible or audible in the provided asset.
2.  **NO EXTERNAL DATA**: Do not reference real-time market data, specific competitor ad spend, CPA, known conversion rates, private campaign metrics, or "industry secrets". You do not have access to this data.
3.  **NO INVENTION**: If a strategic insight cannot be inferred from the creative itself, state "Cannot be determined from the creative alone." Do not bridge gaps with guesses.
4.  **QUALITATIVE SCORES ONLY**: All scores (0-100) are qualitative assessments of creative execution against best practices, NOT statistical predictions of future performance.

**LANGUAGE CONTROL:**
- REPLACE "will convert" WITH "likely to resonate".
- REPLACE "drives sales" WITH "aligns with conversion best practices".
- REPLACE "predicted CTR" WITH "engagement potential".
- USE "suggests", "indicates", "appears designed to".
- AVOID "certainly", "guaranteed", "proven to".

**PROJECT SPECIFIC CONTEXT:**
- If the creative is for **Casagrand Casablanca**, note that the architecture and theme are strictly **ROMAN**.

**DIAGNOSTIC CRITERIA:**
You will evaluate the creative against key performance parameters including immediate memory retention, brand linkage, emotional mapping, and clarity of proposition.
Provide only diagnostics that are relevant and observable in the creative.

**REQUIRED DIAGNOSTICS (MUST OUTPUT EXACTLY THESE 12 IN ORDER):**
1. Immediate Attention (Hook)
2. Creative Differentiation
3. Visual Hierarchy
4. Audio Impact / Visual Synergy
5. Call to Action (CTA) Strength
6. Message Relevance
7. Clarity of Proposition
8. Narrative Pacing
9. Emotional Resonance
10. Brand Linkage & Visibility
11. View-Through Potential
12. Overall Persuasion
`;

const STRATEGY_SYSTEM_INSTRUCTION = `
You are StrataPilot's Chief Strategist.
Based *strictly* on the provided creative analysis, propose a logical campaign strategy.

**CONSTRAINTS:**
1.  **HYPOTHETICAL ONLY**: Frame all "successMetrics" as *proposed KPIs to track*, not guaranteed outcomes.
2.  **NO GUARANTEES**: Do not promise specific ROAS or ROI figures.
3.  **LOGICAL FLOW**: Ensure budget allocation and channel selection logically follow from the creative's format and implied audience.
4.  **Output strictly valid JSON.**
`;

// --- SCHEMAS ---
const diagnosticsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            metric: { type: Type.STRING },
            score: { type: Type.INTEGER },
            benchmark: { type: Type.INTEGER },
            rubricTier: { type: Type.STRING },
            subInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "5 specific tactical observations."
            },
            commentary: { type: Type.STRING },
            whyItMatters: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            impact: { type: Type.STRING },
        },
        required: ["metric", "score", "benchmark", "rubricTier", "subInsights", "commentary", "whyItMatters", "recommendation", "impact"],
    }
};

const analysisResponseSchema = {
    type: Type.OBJECT,
    properties: {
        modelHealth: {
            type: Type.OBJECT,
            properties: {
                fairnessScore: { type: Type.INTEGER },
                biasCheckPassed: { type: Type.BOOLEAN },
                driftStatus: { type: Type.STRING, enum: ["Stable", "Drift Detected", "Retraining Needed"] },
                oodConfidence: { type: Type.INTEGER }
            },
            required: ["fairnessScore", "biasCheckPassed", "driftStatus", "oodConfidence"]
        },
        validationSuite: {
            type: Type.OBJECT,
            properties: {
                heldOutAccuracy: { type: Type.NUMBER },
                oodDrop: { type: Type.NUMBER },
                noiseStability: { type: Type.NUMBER },
                hallucinationRate: { type: Type.NUMBER },
                fairnessGap: { type: Type.NUMBER },
                calibrationEce: { type: Type.NUMBER },
                kpiCorrelation: { type: Type.NUMBER },
                abLift: { type: Type.NUMBER },
                driftPsi: { type: Type.NUMBER },
                latencyP99: { type: Type.NUMBER }
            },
            required: ["heldOutAccuracy", "oodDrop", "noiseStability", "hallucinationRate", "fairnessGap", "calibrationEce", "kpiCorrelation", "abLift", "driftPsi", "latencyP99"]
        },
        demographics: {
            type: Type.OBJECT,
            properties: {
                age: { type: Type.STRING },
                gender: { type: Type.STRING },
                location: { type: Type.STRING },
                educationLevel: { type: Type.STRING },
                incomeLevel: { type: Type.STRING },
                occupation: { type: Type.STRING },
                maritalStatus: { type: Type.STRING },
                generation: { type: Type.STRING },
                householdStructure: { type: Type.STRING },
                techLiteracy: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
            },
            required: ["age", "gender", "location", "educationLevel", "incomeLevel", "occupation", "maritalStatus", "generation", "householdStructure", "techLiteracy"],
        },
        psychographics: {
            type: Type.OBJECT,
            properties: {
                interestsAndHobbies: { type: Type.ARRAY, items: { type: Type.STRING } },
                valuesAndBeliefs: { type: Type.ARRAY, items: { type: Type.STRING } },
                lifestyleChoices: { type: Type.ARRAY, items: { type: Type.STRING } },
                personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
                brandArchetype: { type: Type.STRING },
                motivations: { type: Type.ARRAY, items: { type: Type.STRING } },
                goalsAndAspirations: { type: Type.ARRAY, items: { type: Type.STRING } },
                challengesAndPainPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["interestsAndHobbies", "valuesAndBeliefs", "lifestyleChoices", "personalityTraits", "brandArchetype", "motivations", "goalsAndAspirations", "challengesAndPainPoints"],
        },
        behavioral: {
            type: Type.OBJECT,
            properties: {
                buyingHabits: { type: Type.STRING },
                productUsageFrequency: { type: Type.STRING },
                brandLoyalty: { type: Type.STRING },
                onlineBehavior: { type: Type.STRING },
                socialMediaPlatforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentConsumption: { type: Type.STRING },
                responseToMarketing: { type: Type.STRING },
                priceSensitivity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                decisionDriver: { type: Type.STRING },
                purchaseJourney: { type: Type.STRING }
            },
            required: ["buyingHabits", "productUsageFrequency", "brandLoyalty", "onlineBehavior", "socialMediaPlatforms", "contentConsumption", "responseToMarketing", "priceSensitivity", "decisionDriver", "purchaseJourney"],
        },
        brandAnalysis: {
            type: Type.OBJECT,
            properties: {
                consumerInsight: { type: Type.STRING },
                functionalBenefit: { type: Type.STRING },
                emotionalBenefit: { type: Type.STRING },
                brandPersonality: { type: Type.STRING },
                reasonsToBelieve: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["consumerInsight", "functionalBenefit", "emotionalBenefit", "brandPersonality", "reasonsToBelieve"],
        },
        brandStrategyWindow: {
            type: Type.ARRAY,
            description: "A 10-point Brand Strategy Window breakdown.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    content: { type: Type.STRING }
                },
                required: ["title", "subtitle", "content"]
            }
        },
        brandArchetypeDetail: {
            type: Type.OBJECT,
            properties: {
                archetype: { type: Type.STRING },
                value: { type: Type.STRING },
                quote: { type: Type.STRING },
                reasoning: { type: Type.STRING }
            },
            required: ["archetype", "value", "quote", "reasoning"]
        },
        roiMetrics: {
            type: Type.OBJECT,
            properties: {
                hookScore: { type: Type.NUMBER },
                clarityScore: { type: Type.NUMBER },
                emotionCurveEngagement: { type: Type.NUMBER },
                brandVisibilityScore: { type: Type.NUMBER },
                predictedDropOff: { type: Type.NUMBER },
                predictedVtr: { type: Type.NUMBER },
                predictedCtr: { type: Type.NUMBER },
                roiUplift: { type: Type.NUMBER },
            },
            required: ["hookScore", "clarityScore", "emotionCurveEngagement", "brandVisibilityScore", "predictedDropOff", "predictedVtr", "predictedCtr", "roiUplift"],
        },
        adDiagnostics: diagnosticsSchema,
        transcript: { type: Type.STRING },
        industry: {
            type: Type.STRING,
            description: "Classify this ad into one industry: FMCG, BFSI, Auto, Health, Tech, Retail, Telecom, F&B, Entertainment, or Other"
        }
    },
    required: ["modelHealth", "validationSuite", "demographics", "psychographics", "behavioral", "brandAnalysis", "brandStrategyWindow", "brandArchetypeDetail", "roiMetrics", "adDiagnostics"],
};

const strategyResponseSchema = {
    type: Type.OBJECT,
    properties: {
        keyPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyMessages: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    headline: { type: Type.STRING },
                    subMessage: { type: Type.STRING },
                },
                required: ["headline", "subMessage"],
            }
        },
        channelSelection: { type: Type.ARRAY, items: { type: Type.STRING } },
        timeline: { type: Type.STRING },
        budgetAllocation: { type: Type.STRING },
        successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["keyPillars", "keyMessages", "channelSelection", "timeline", "budgetAllocation", "successMetrics"],
};

// --- COMPETITIVE CONTEXT GENERATOR ---
const competitiveContextGenerator = new CompetitiveContextGenerator();

/**
 * Infer industry from text context using keyword matching
 */
const inferIndustryFromContext = (textContext: string): TrackedIndustry | null => {
    if (!textContext) return null;
    const lowerContext = textContext.toLowerCase();

    for (const industry of TRACKED_INDUSTRIES) {
        const keywords = INDUSTRY_KEYWORDS[industry];
        for (const keyword of keywords) {
            if (lowerContext.includes(keyword.toLowerCase())) {
                return industry;
            }
        }
    }
    return null;
};

// --- CORE AI FUNCTIONS ---
const analyzeCollateral = async (
    textContext: string,
    analysisLabel: string,
    fileData?: string | null,
    mimeType?: string | null,
    fileUri?: string | null
): Promise<AnalysisResult> => {
    validateInputs(textContext, analysisLabel, fileData, mimeType, fileUri);

    const parts: any[] = [];

    if (fileData && mimeType) {
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: fileData
            }
        });
    }

    if (fileUri && mimeType) {
        parts.push({
            fileData: {
                mimeType: mimeType,
                fileUri: fileUri
            }
        });
    }

    // --- COMPETITIVE CONTEXT INJECTION ---
    let competitiveContextBlock = "";
    try {
        const inferredIndustry = inferIndustryFromContext(textContext);
        if (inferredIndustry) {
            console.log(`[ANALYSIS] Detected industry: ${inferredIndustry}, generating competitive context...`);
            const competitiveContext = await competitiveContextGenerator.generateContext(inferredIndustry);
            competitiveContextBlock = competitiveContextGenerator.formatForGemini(competitiveContext);
            console.log(`[ANALYSIS] Competitive context generated (sample size: ${competitiveContext.sample_size})`);
        }
    } catch (error: any) {
        console.warn('[ANALYSIS] Failed to generate competitive context:', error.message);
        // Continue without competitive context - it's enhancement, not critical
    }

    const SYSTEM_INSTRUCTION = `
${BASE_KNOWLEDGE}

${competitiveContextBlock}

Analyze this creative through the lens of: "${analysisLabel}".
Strictly follow the JSON schema provided.

**ANALYSIS PROTOCOL:**
1.  **Diagnostic Evaluation**: For each parameter, cite specific visual/textual elements as evidence.
2.  **Refusal Condition**: If the creative is blank, ambiguous, or corrupted, set scores to 0 and transparently state the issue in 'commentary'.
3.  **No Hallucinated Benchmarks**: When comparing to "benchmarks", refer to *general category best practices*, not specific external competitors.
4.  **Transcript Extraction**: If the asset contains speech or text overlays, provide a verbatim or summary transcript in the 'transcript' field. If silent/no text, return "No distinct speech or text detected."
5.  **Competitive Context**: If competitive context is provided above, use it to explain over-conformity risks, saturation patterns, and differentiation opportunities in the adDiagnostics commentary.

**OUTPUT REQUIREMENTS:**
- Be concise, objective, and analyst-toned.
- Avoid marketing fluff.
- If a field requires data you cannot observe (e.g., 'buyingHabits'), infer strictly from the *target audience implied by the creative's content*, and qualify it as an inference.
- If competitive context is present, include comparative observations in the 'commentary' fields where relevant.
`;

    parts.push({ text: `Analyze this creative. User Context: ${textContext}` });

    return safeGenerate<AnalysisResult>(
        "analyzeCollateral",
        () => getAIClient().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: parts },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: analysisResponseSchema,
                ...GENERATION_CONFIG
            }
        }),
        validateAnalysisResult
    );
};

const generateCampaignStrategy = async (analysis: AnalysisResult): Promise<CampaignStrategy> => {
    if (!analysis) {
        throw new ValidationError("Analysis result is required for strategy generation.");
    }

    const prompt = `Generate strategy for: ${JSON.stringify(analysis)}`;

    return safeGenerate<CampaignStrategy>(
        "generateCampaignStrategy",
        () => getAIClient().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                systemInstruction: STRATEGY_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: strategyResponseSchema,
                ...GENERATION_CONFIG
            }
        }),
        validateCampaignStrategy
    );
};

// --- EXPRESS SERVER ---
const app = express();

app.use(cors());
app.use(express.json({ limit: '150mb' })); // Increased for video uploads up to 100MB

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.message);

    if (err instanceof ValidationError) {
        return res.status(400).json({ success: false, error: err.message, code: err.code });
    }
    if (err instanceof AIOutputError) {
        return res.status(422).json({ success: false, error: err.message, code: err.code });
    }
    if (err instanceof AIRuntimeError) {
        return res.status(500).json({ success: false, error: err.message, code: err.code });
    }

    return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
};

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// --- FILE UTILS for URL Analysis ---
const downloadFile = async (url: string, destPath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (ytdl.validateURL(url)) {
                console.log(`[DOWNLOAD] Detected YouTube URL: ${url}`);
                const stream = ytdl(url, { quality: 'lowest' }); // 'lowest' for speed/size, typically sufficient for AI
                stream.pipe(fs.createWriteStream(destPath))
                    .on('finish', () => resolve('video/mp4'))
                    .on('error', reject);
            } else {
                console.log(`[DOWNLOAD] Detected Direct URL: ${url}`);
                const response = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream'
                });
                const mimeType = response.headers['content-type'];
                response.data.pipe(fs.createWriteStream(destPath))
                    .on('finish', () => resolve(mimeType))
                    .on('error', reject);
            }
        } catch (error) {
            reject(error);
        }
    });
};

const uploadToGemini = async (filePath: string, mimeType: string): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    // Use the old SDK file manager as it's robust
    const fileManager = new GoogleAIFileManager(apiKey);

    console.log(`[GEMINI] Uploading ${filePath} (${mimeType})...`);
    const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType,
        displayName: "StrataPilot Analysis Video",
    });

    const file = uploadResult.file;
    console.log(`[GEMINI] File uploaded: ${file.uri}`);

    // Wait for file to be active
    let state = file.state;
    while (state === "PROCESSING") {
        console.log(`[GEMINI] Processing file...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const cleanFile = await fileManager.getFile(file.name);
        state = cleanFile.state;
    }

    if (state === "FAILED") {
        throw new Error("Gemini file processing failed.");
    }

    return file.uri;
};

// POST /api/analyze-url
app.post('/api/analyze-url', async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | null = null;
    try {
        const { videoUrl, textContext, analysisLabel, googleToken, metaToken, gaPropertyId } = req.body;

        if (!videoUrl) throw new ValidationError("videoUrl is required");

        console.log(`[API] /api/analyze-url called for ${videoUrl}`);

        // Generate URL hash for cache (weekly expiry for freshness)
        const contentHash = generateUrlHash(videoUrl);

        // Check cache first
        const cacheResult = await checkCache(contentHash, analysisLabel);
        if (cacheResult.hit) {
            console.log(`[CACHE] Returning cached URL result (Industry: ${cacheResult.record?.industry})`);
            return res.json({ success: true, data: cacheResult.analysis, cached: true });
        }

        const tempFileName = `${uuidv4()}.mp4`; // Default extension, might change
        tempFilePath = path.join(os.tmpdir(), tempFileName);

        // 1. Download
        const mimeType = await downloadFile(videoUrl, tempFilePath);

        const stats = fs.statSync(tempFilePath);
        console.log(`[DOWNLOAD] File size: ${stats.size} bytes`);
        if (stats.size < 1000) {
            console.warn("[DOWNLOAD] Warning: File is suspiciously small. Download might have failed.");
        }

        // 2. Upload to Gemini
        const fileUri = await uploadToGemini(tempFilePath, mimeType || 'video/mp4');

        // 3. Fetch External Data if tokens present
        let externalDataContext = "";
        if (googleToken && gaPropertyId) {
            console.log('[DATA] Fetching GA4 Data...');
            try {
                const gaData = await fetchGA4Data(googleToken, gaPropertyId);
                externalDataContext += `\n\nREAL-WORLD PERFORMANCE DATA (Google Analytics 4):\n${JSON.stringify(gaData, null, 2)}`;
            } catch (e: any) {
                console.error("Failed to fetch GA4 data", e.message);
                externalDataContext += `\n\n(Attempted to fetch GA4 data but failed: ${e.message})`;
            }
        }

        if (metaToken) {
            console.log('[DATA] Fetching Meta Ads Data...');
            try {
                const metaData = await fetchMetaAdsData(metaToken);
                externalDataContext += `\n\nREAL-WORLD PERFORMANCE DATA (Meta Ads):\n${JSON.stringify(metaData, null, 2)}`;
            } catch (e: any) {
                console.error("Failed to fetch Meta data", e.message);
                externalDataContext += `\n\n(Attempted to fetch Meta Ads data but failed: ${e.message})`;
            }
        }

        // 4. Analyze with Context
        const fullContext = `${textContext || ''}${externalDataContext}`;
        const result = await analyzeCollateral(fullContext, analysisLabel, null, mimeType || 'video/mp4', fileUri);

        // Store in cache
        await storeInCache(contentHash, analysisLabel, result, { sourceUrl: videoUrl, mimeType: mimeType || 'video/mp4' });

        res.json({ success: true, data: result, cached: false });

    } catch (error) {
        next(error);
    } finally {
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});

// POST /api/analyze
app.post('/api/analyze', async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | null = null;
    try {
        const { textContext, analysisLabel, fileData, mimeType, googleToken, metaToken, gaPropertyId } = req.body;

        console.log(`[API] /api/analyze called with label="${analysisLabel}", hasFile=${!!fileData}, mimeType=${mimeType}`);

        // Generate content hash for cache lookup
        const contentHash = fileData ? generateFileHash(fileData) : generateFileHash(textContext || '');

        // Check cache first
        const cacheResult = await checkCache(contentHash, analysisLabel);
        if (cacheResult.hit) {
            console.log(`[CACHE] Returning cached result (Industry: ${cacheResult.record?.industry})`);
            return res.json({ success: true, data: cacheResult.analysis, cached: true });
        }

        // Fetch External Data
        let externalDataContext = "";
        if (googleToken && gaPropertyId) {
            console.log('[DATA] Fetching GA4 Data...');
            try {
                const gaData = await fetchGA4Data(googleToken, gaPropertyId);
                externalDataContext += `\n\nREAL-WORLD PERFORMANCE DATA (Google Analytics 4):\n${JSON.stringify(gaData, null, 2)}`;
            } catch (e: any) {
                console.error("Failed to fetch GA4 data", e.message);
                externalDataContext += `\n\n(Attempted to fetch GA4 data but failed: ${e.message})`;
            }
        }

        if (metaToken) {
            console.log('[DATA] Fetching Meta Ads Data...');
            try {
                const metaData = await fetchMetaAdsData(metaToken);
                externalDataContext += `\n\nREAL-WORLD PERFORMANCE DATA (Meta Ads):\n${JSON.stringify(metaData, null, 2)}`;
            } catch (e: any) {
                console.error("Failed to fetch Meta data", e.message);
                externalDataContext += `\n\n(Attempted to fetch Meta Ads data but failed: ${e.message})`;
            }
        }

        const fullContext = `${textContext || ''}${externalDataContext}`;

        let result;

        // For videos, use Gemini File API instead of inline base64 to avoid quota issues
        const isVideo = mimeType && mimeType.startsWith('video/');

        if (fileData && isVideo) {
            console.log('[UPLOAD] Video detected, using Gemini File API for efficiency...');

            // Determine file extension from mimeType
            const extMap: Record<string, string> = {
                'video/mp4': '.mp4',
                'video/mpeg': '.mpeg',
                'video/quicktime': '.mov',
                'video/webm': '.webm'
            };
            const ext = extMap[mimeType] || '.mp4';

            // Save base64 to temp file
            tempFilePath = path.join(os.tmpdir(), `${uuidv4()}${ext}`);
            const buffer = Buffer.from(fileData, 'base64');
            fs.writeFileSync(tempFilePath, buffer);
            console.log(`[UPLOAD] Saved temp file: ${tempFilePath} (${buffer.length} bytes)`);

            // Upload to Gemini File API
            const fileUri = await uploadToGemini(tempFilePath, mimeType);
            console.log(`[UPLOAD] File uploaded to Gemini: ${fileUri}`);

            // Analyze using file URI (like URL analysis)
            result = await analyzeCollateral(fullContext, analysisLabel, null, mimeType, fileUri);
        } else {
            // For images, inline base64 is fine (they're smaller)
            result = await analyzeCollateral(fullContext, analysisLabel, fileData, mimeType);
        }

        // Store result in cache
        await storeInCache(contentHash, analysisLabel, result, { mimeType });

        res.json({ success: true, data: result, cached: false });
    } catch (error) {
        next(error);
    } finally {
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`[CLEANUP] Removed temp file: ${tempFilePath}`);
        }
    }
});

// GET /api/insight-stats - Cache statistics
app.get('/api/insight-stats', (req, res) => {
    try {
        const stats = getInsightStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- AUTH ROUTES ---

// Google Auth
app.get('/api/auth/google', (req, res) => {
    const url = getGoogleAuthUrl();
    res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('No code provided');

    try {
        const tokens = await getGoogleTokens(code);
        // Send tokens back to opener
        const html = `
            <script>
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: '${tokens.access_token}' }, 'http://localhost:3000');
                window.close();
            </script>
            <h1>Authentication Successful</h1>
            <p>You can close this window now.</p>
        `;
        res.send(html);
    } catch (error) {
        console.error('Google Auth Failed:', error);
        res.status(500).send('Authentication failed');
    }
});

// Meta Auth
app.get('/api/auth/meta', (req, res) => {
    const url = getMetaAuthUrl();
    res.redirect(url);
});

app.get('/api/auth/meta/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('No code provided');

    try {
        const data = await getMetaTokens(code);
        // Send tokens back to opener
        const html = `
            <script>
                window.opener.postMessage({ type: 'META_AUTH_SUCCESS', token: '${data.access_token}' }, 'http://localhost:3000');
                window.close();
            </script>
            <h1>Authentication Successful</h1>
            <p>You can close this window now.</p>
        `;
        res.send(html);
    } catch (error) {
        console.error('Meta Auth Failed:', error);
        res.status(500).send('Authentication failed');
    }
});

// POST /api/strategy
app.post('/api/strategy', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { analysis } = req.body;

        console.log('[API] /api/strategy called');

        const result = await generateCampaignStrategy(analysis);

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Serve static files from the dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.use(errorHandler);

// Initialize Databases
initDatabase();
initCreativeMemoryDatabase();

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  StrataPilot Server Running`);
    console.log(`========================================`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`  API: /api/analyze, /api/strategy`);
    console.log(`  Health: /api/health`);
    console.log(`  Insight Cache: ENABLED`);
    console.log(`  Creative Memory: ENABLED`);
    console.log(`========================================\n`);
});
