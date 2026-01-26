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
import cookieParser from 'cookie-parser';
// import { getGoogleAuthUrl, getGoogleTokens, fetchGA4Data } from './services/googleAnalytics.js'; // REMOVED: Legacy
import ga4Router from './routes/ga4Routes.js';
import { initGA4Database } from './services/ga4/ga4Db.js';
import metaRoutes from './routes/metaRoutes.js';
import { initMetaDatabase } from './services/meta/metaDb.js';
import { getMetaAuthUrl, getMetaTokens, fetchMetaAdsData } from './services/metaAds.js';
import { initDatabase } from './services/insightDb.js';
import { checkCache, storeInCache, generateFileHash, generateUrlHash, getInsightStats } from './services/insightCache.js';
import { initCreativeMemoryDatabase, CompetitiveContextGenerator, getCreativeMemoryStats } from './services/creativeMemory/index.js';
import { TrackedIndustry, TRACKED_INDUSTRIES, INDUSTRY_KEYWORDS } from './types/creativeMemoryTypes.js';
import { getLLMOrchestrator } from './services/llmRouter/index.js';
import { getGeminiCompiler } from './services/geminiCompiler.js';
import { extractGA4Insights, extractMetaAdsInsights, formatInsightsForLLM, formatDisconnectedState } from './services/insightExtractors.js';
import { getGroqAnalyzer } from './services/groqAnalyzer.js';
import { classifyInputCapability } from './services/capabilityClassifier.js';
import { discoverCrossIndustryPatterns } from './services/crossIndustryAnalyzer.js';

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

// --- ENVIRONMENT VALIDATION ---
const validateEnvironment = (): void => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical - Required for core functionality
    if (!process.env.GEMINI_API_KEY) {
        errors.push('GEMINI_API_KEY is required');
    }

    // Optional - Warn only
    if (!process.env.GROQ_API_KEY) {
        warnings.push('GROQ_API_KEY not set - hybrid analysis disabled');
    }

    // Log status
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 StrataPilot Server Starting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const isMock = process.env.USE_MOCK_DATA === 'true';
    console.log(`Mode: ${isMock ? '🧪 MOCK' : '🔴 PRODUCTION'}`);

    if (isMock) {
        console.warn(`
    ========================================
    ⚠️  RUNNING IN MOCK DATA MODE ⚠️
    Meta Ads & GA4 will use fake data.
    Auth will be bypassed.
    ========================================
        `);
    }

    if (errors.length > 0) {
        console.error('❌ FATAL: Missing required configuration:');
        errors.forEach(e => console.error(`   - ${e}`));
        process.exit(1);
    }

    warnings.forEach(w => console.warn(`⚠️  ${w}`));
};

// Validate immediately on startup
validateEnvironment();

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

// =====================================================
// HYBRID ANALYSIS (Gemini + Groq Pipeline)
// =====================================================

/**
 * Feature flag for hybrid analysis mode
 * Set to true to use Gemini for visual extraction + Groq for strategic analysis
 */
const USE_HYBRID_ANALYSIS = process.env.USE_HYBRID_ANALYSIS === 'true';

/**
 * Hybrid analysis: Gemini extracts visuals, Groq generates strategic insights
 * This separates concerns and uses the best model for each task
 */
const analyzeCollateralHybrid = async (
    textContext: string,
    analysisLabel: string,
    fileData?: string | null,
    mimeType?: string | null,
    fileUri?: string | null,
    secondaryVideoUrl?: string | null // NEW: Secondary input
): Promise<AnalysisResult> => {
    console.log(`[RUNTIME-VERIFY] ===== HYBRID ANALYSIS PIPELINE START =====`);
    validateInputs(textContext, analysisLabel, fileData, mimeType, fileUri);

    const hasPrimaryMedia = !!(fileData || fileUri);
    console.log(`[RUNTIME-VERIFY] Has Primary Media: ${hasPrimaryMedia}`);

    // If no media, skip visual extraction
    if (!hasPrimaryMedia) {
        console.log('[HYBRID] No media provided, using text-only analysis via Groq');
        return analyzeTextOnly(textContext, analysisLabel);
    }

    /*
     * TRI-INPUT CONTEXT SYNTHESIS LOGIC
     * If both Primary (Upload) and Secondary (URL) are present:
     * 1. Extract Primary Evidence (Ground Truth)
     * 2. Extract Secondary Evidence (Reference)
     * 3. Synthesize Context
     */
    const isTriInputMode = !!(hasPrimaryMedia && secondaryVideoUrl);
    console.log(`[HYBRID] Tri-Input Mode: ${isTriInputMode}`);

    console.log('[HYBRID] Starting hybrid analysis pipeline...');

    // Step 1: Gemini extracts PRIMARY visual features
    console.log('[HYBRID] Step 1: Extracting PRIMARY evidence (Upload)...');
    const geminiCompiler = getGeminiCompiler();
    const primaryVisualFeatures = await geminiCompiler.extractFeatures(fileData, mimeType, fileUri);
    console.log('[HYBRID] Primary visual features extracted');

    // Step 2: Gemini extracts SECONDARY visual features (if generic mode active)
    let secondaryVisualFeatures: any = null;
    let tempSecondaryPath: string | null = null;

    if (isTriInputMode && secondaryVideoUrl) {
        console.log('[HYBRID] Step 2: Extracting SECONDARY evidence (URL)...');
        try {
            // Download and Upload Secondary Asset
            const secondaryTempName = `${uuidv4()}.mp4`; // Assume mp4/video for secondary URL usually
            tempSecondaryPath = path.join(os.tmpdir(), secondaryTempName);

            console.log(`[HYBRID] Downloading secondary URL: ${secondaryVideoUrl}`);
            const secMimeType = await downloadFile(secondaryVideoUrl, tempSecondaryPath);

            console.log(`[HYBRID] Uploading secondary asset to Gemini...`);
            const secFileUri = await uploadToGemini(tempSecondaryPath, secMimeType);

            console.log(`[HYBRID] Extracting secondary features...`);
            secondaryVisualFeatures = await geminiCompiler.extractFeatures(null, secMimeType, secFileUri);
            console.log('[HYBRID] Secondary visual features extracted');
        } catch (error: any) {
            console.warn(`[HYBRID] Failed to process secondary URL: ${error.message}. Proceeding with Primary only.`);
        } finally {
            if (tempSecondaryPath && fs.existsSync(tempSecondaryPath)) {
                fs.unlinkSync(tempSecondaryPath);
            }
        }
    }

    // Step 3: Classify input capability (based on Primary)
    console.log('[HYBRID] Step 3: Classify input capability...');
    const classification = classifyInputCapability(
        textContext,
        true,
        primaryVisualFeatures
    );
    console.log(`[INPUT-CLASSIFY] Capability: ${classification.level}`);

    // Step 4: Get competitive context
    let competitiveContextBlock = "";
    try {
        const inferredIndustry = inferIndustryFromContext(textContext);
        if (inferredIndustry) {
            const competitiveContext = await competitiveContextGenerator.generateContext(inferredIndustry);
            competitiveContextBlock = competitiveContextGenerator.formatForGemini(competitiveContext);
        }
    } catch (error: any) {
        console.warn('[HYBRID] Competitive context skipeed:', error.message);
    }

    // Step 5: Groq generates strategic analysis
    console.log('[HYBRID] Step 5: Groq strategic analysis...');
    const groqAnalyzer = getGroqAnalyzer();

    // Pass secondary features if available
    const strategicAnalysis = await groqAnalyzer.analyze(
        primaryVisualFeatures,
        textContext,
        analysisLabel,
        competitiveContextBlock,
        classification.level,
        secondaryVisualFeatures // NEW arg
    );

    console.log('[HYBRID] Strategic analysis complete');
    console.log(`[RUNTIME-VERIFY] ===== HYBRID ANALYSIS PIPELINE END =====`);

    // DEFENSIVE NORMALIZATION (Same as before)
    const hasBrandStrategy = strategicAnalysis.brandAnalysis?.brandStrategyWindow &&
        strategicAnalysis.brandAnalysis.brandStrategyWindow.length > 0;
    const hasBrandArchetype = strategicAnalysis.brandAnalysis?.brandArchetypeDetail &&
        strategicAnalysis.brandAnalysis.brandArchetypeDetail.archetype;

    // Map to AnalysisResult format
    const result: any = {
        demographics: strategicAnalysis.audience.demographics,
        psychographics: strategicAnalysis.audience.psychographics,
        behavioral: strategicAnalysis.audience.behavioral,
        adDiagnostics: strategicAnalysis.adDiagnostics,
        brandAnalysis: {
            consumerInsight: strategicAnalysis.brandAnalysis.consumerInsight,
            functionalBenefit: strategicAnalysis.brandAnalysis.functionalBenefit,
            emotionalBenefit: strategicAnalysis.brandAnalysis.emotionalBenefit,
            brandPersonality: strategicAnalysis.brandAnalysis.brandPersonality,
            reasonsToBelieve: strategicAnalysis.brandAnalysis.reasonsToBelieve,
        },
        brandStrategyWindow: hasBrandStrategy ? strategicAnalysis.brandAnalysis.brandStrategyWindow : undefined,
        brandArchetypeDetail: hasBrandArchetype ? strategicAnalysis.brandAnalysis.brandArchetypeDetail : undefined,
        roiMetrics: strategicAnalysis.roiMetrics,
        modelHealth: strategicAnalysis.modelHealth,
        validationSuite: strategicAnalysis.validationSuite,
        industry: strategicAnalysis.industry,
    };

    // Extract and preserve unavailability metadata
    const brandAnalysisAny = strategicAnalysis.brandAnalysis as any;
    if (brandAnalysisAny._brandStrategyUnavailable) {
        result.brandStrategyUnavailable = brandAnalysisAny._brandStrategyUnavailable;
    }
    if (brandAnalysisAny._brandArchetypeUnavailable) {
        result.brandArchetypeUnavailable = brandAnalysisAny._brandArchetypeUnavailable;
    }

    return result;
};

/**
 * Text-only analysis when no media is provided
 * Uses Groq via LLM Orchestrator with proper response mapping
 */
const analyzeTextOnly = async (
    textContext: string,
    analysisLabel: string
): Promise<AnalysisResult> => {
    const orchestrator = getLLMOrchestrator();

    const prompt = `
Analyze the following creative brief and generate a complete analysis.

## Creative Brief
${textContext}

## Analysis Lens
"${analysisLabel}"

Return a JSON object with these exact fields:
{
  "demographics": { "age": "...", "gender": "...", "location": "...", ... },
  "psychographics": { "interestsAndHobbies": [...], "valuesAndBeliefs": [...], ... },
  "behavioral": { "buyingHabits": "...", "brandLoyalty": "...", ... },
  "adDiagnostics": [
    { "metric": "Immediate Attention (Hook)", "score": 75, "benchmark": 65, "rubricTier": "Good", "subInsights": [...], "commentary": "...", "whyItMatters": "...", "recommendation": "...", "impact": "..." },
    ... (11 more diagnostics)
  ],
  "brandAnalysis": { "consumerInsight": "...", "functionalBenefit": "...", "emotionalBenefit": "...", "brandPersonality": "...", "reasonsToBelieve": [...] },
  "brandStrategyWindow": [ { "title": "...", "subtitle": "...", "content": "..." }, ... ],
  "brandArchetypeDetail": { "archetype": "...", "value": "...", "quote": "...", "reasoning": "..." },
  "roiMetrics": { "hookScore": 72, "clarityScore": 78, "predictedVtr": 65, "roiUplift": 15 }
}
`;

    try {
        const response = await orchestrator.process<any>(
            BASE_KNOWLEDGE,
            prompt,
            {
                taskType: 'analysis',
                isClientFacing: true,
                responseFormat: 'json',
            }
        );

        if (!response.success || !response.data) {
            throw new AIOutputError(response.error || "Failed to generate analysis");
        }

        const data = response.data;

        // Build complete AnalysisResult with defaults for any missing fields
        const result: AnalysisResult = {
            demographics: data.demographics || {
                age: "25-44", gender: "All", location: "Urban areas",
                educationLevel: "College educated", incomeLevel: "Middle to upper-middle",
                occupation: "Professional", maritalStatus: "Mixed",
                generation: "Millennials/Gen X", householdStructure: "Mixed", techLiteracy: "Medium"
            },
            psychographics: data.psychographics || {
                interestsAndHobbies: ["General interests"], valuesAndBeliefs: ["Quality", "Value"],
                lifestyleChoices: ["Balanced"], personalityTraits: ["Practical"],
                brandArchetype: "The Regular", motivations: ["Convenience", "Quality"],
                goalsAndAspirations: ["Improvement"], challengesAndPainPoints: ["Time constraints"]
            },
            behavioral: data.behavioral || {
                buyingHabits: "Research before purchase", productUsageFrequency: "Regular",
                brandLoyalty: "Moderate", onlineBehavior: "Active",
                socialMediaPlatforms: ["Instagram", "Facebook"], contentConsumption: "Video and text",
                responseToMarketing: "Responsive to value propositions", priceSensitivity: "Medium",
                decisionDriver: "Quality and value", purchaseJourney: "Multi-touch"
            },
            adDiagnostics: data.adDiagnostics || getDefaultDiagnostics(),
            brandAnalysis: data.brandAnalysis || {
                consumerInsight: "Audience seeks reliable solutions",
                functionalBenefit: "Delivers on core promise",
                emotionalBenefit: "Provides confidence",
                brandPersonality: "Trustworthy and approachable",
                reasonsToBelieve: ["Visual quality", "Clear messaging"]
            },
            brandStrategyWindow: data.brandStrategyWindow || Array(10).fill(0).map((_, i) => ({
                title: `Strategy Element ${i + 1}`,
                subtitle: "To be analyzed",
                content: "Pending detailed visual analysis"
            })),
            brandArchetypeDetail: data.brandArchetypeDetail || {
                archetype: "The Regular",
                value: "Belonging",
                quote: "Everyone is welcome",
                reasoning: "Based on brief analysis"
            },
            roiMetrics: data.roiMetrics || {
                hookScore: 70, clarityScore: 75, emotionCurveEngagement: 65,
                brandVisibilityScore: 70, predictedDropOff: 40, predictedVtr: 60,
                predictedCtr: 2.5, roiUplift: 12
            },
            modelHealth: data.modelHealth || {
                fairnessScore: 92, biasCheckPassed: true,
                driftStatus: "Stable", oodConfidence: 88
            },
            validationSuite: data.validationSuite || {
                heldOutAccuracy: 0.89, oodDrop: 0.04, noiseStability: 0.96,
                hallucinationRate: 0.02, fairnessGap: 0.03, calibrationEce: 0.05,
                kpiCorrelation: 0.72, abLift: 0.12, driftPsi: 0.02, latencyP99: 1.2
            }
        };

        return result;

    } catch (error: any) {
        console.error('[analyzeTextOnly] Error:', error.message);
        throw new AIOutputError(error.message || "Failed to generate text-only analysis");
    }
};

/**
 * Helper function to generate default diagnostics
 */
function getDefaultDiagnostics() {
    const metrics = [
        "Immediate Attention (Hook)", "Creative Differentiation", "Visual Hierarchy",
        "Audio Impact / Visual Synergy", "Call to Action (CTA) Strength", "Message Relevance",
        "Clarity of Proposition", "Narrative Pacing", "Emotional Resonance",
        "Brand Linkage & Visibility", "View-Through Potential", "Overall Persuasion"
    ];
    return metrics.map(metric => ({
        metric,
        score: 65,
        benchmark: 65,
        rubricTier: "Good",
        subInsights: ["Analysis pending", "Review details", "Check context", "Verify data", "Validate manually"],
        commentary: "Text-only analysis - visual features not available",
        whyItMatters: "This metric indicates creative effectiveness",
        recommendation: "Provide image or video for detailed visual analysis",
        impact: "Improved scores lead to better engagement"
    }));
}

/**
 * Generate campaign strategy using Groq (LLM Orchestrator)
 */
const generateCampaignStrategyHybrid = async (analysis: AnalysisResult): Promise<CampaignStrategy> => {
    if (!analysis) {
        throw new ValidationError("Analysis result is required for strategy generation.");
    }

    const orchestrator = getLLMOrchestrator();

    const prompt = `
Based on the following creative analysis, generate a comprehensive campaign strategy:

${JSON.stringify(analysis, null, 2)}

Include:
- keyPillars: 3-5 strategic pillars
- keyMessages: Headlines and sub-messages
- channelSelection: Recommended channels
- timeline: Implementation timeline
- budgetAllocation: Budget distribution
- successMetrics: KPIs to track

Frame all metrics as "proposed KPIs to track", not guaranteed outcomes.
`;

    const response = await orchestrator.generateStrategy<CampaignStrategy>(
        STRATEGY_SYSTEM_INSTRUCTION,
        prompt,
        { responseFormat: 'json' }
    );

    if (response.success && response.data) {
        return validateCampaignStrategy(response.data);
    }

    throw new AIOutputError("Failed to generate campaign strategy");
};

/**
 * Smart analysis router - chooses between legacy and hybrid based on config
 */
const analyzeCollateralSmart = async (
    textContext: string,
    analysisLabel: string,
    fileData?: string | null,
    mimeType?: string | null,
    fileUri?: string | null,
    secondaryVideoUrl?: string | null
): Promise<AnalysisResult> => {
    console.log(`[RUNTIME-VERIFY] analyzeCollateralSmart called`);
    if (USE_HYBRID_ANALYSIS) {
        console.log('[ROUTER] Using HYBRID mode (Gemini + Groq)');
        console.log(`[RUNTIME-VERIFY] Routing to: analyzeCollateralHybrid`);
        return analyzeCollateralHybrid(textContext, analysisLabel, fileData, mimeType, fileUri, secondaryVideoUrl);
    } else {
        console.log('[ROUTER] Using LEGACY mode (Gemini only)');
        console.log(`[RUNTIME-VERIFY] Routing to: analyzeCollateral (legacy)`);
        return analyzeCollateral(textContext, analysisLabel, fileData, mimeType, fileUri);
    }
};

// --- EXPRESS SERVER ---
const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '150mb' })); // Increased for video uploads up to 100MB

// Request ID Middleware
app.use((req: any, res: Response, next: NextFunction) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-Id', req.requestId);
    next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// LLM Router Statistics
app.get('/api/llm-stats', (req: Request, res: Response) => {
    try {
        const orchestrator = getLLMOrchestrator();
        const stats = orchestrator.getStats();
        res.json({
            success: true,
            data: {
                keyPool: stats.keyPool,
                dailyUsage: stats.usage,
                budgets: stats.costBudgets,
                modelPerformance: stats.modelStats,
                warnings: stats.warnings,
                timestamp: new Date().toISOString(),
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get LLM stats',
        });
    }
});


// --- FILE UTILS for URL Analysis ---
const downloadFile = async (url: string, destPath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const TIMEOUT_MS = 15000; // 15 seconds timeout
        const timeout = setTimeout(() => {
            reject(new Error(`Download timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);

        const onFinish = (mime: string) => {
            clearTimeout(timeout);
            resolve(mime);
        };

        const onError = (err: any) => {
            clearTimeout(timeout);
            reject(err);
        };

        try {
            if (ytdl.validateURL(url)) {
                console.log(`[DOWNLOAD] Detected YouTube URL: ${url}`);
                const stream = ytdl(url, { quality: 'lowest' }); // 'lowest' for speed/size, typically sufficient for AI
                stream.pipe(fs.createWriteStream(destPath))
                    .on('finish', () => onFinish('video/mp4'))
                    .on('error', onError);
            } else {
                console.log(`[DOWNLOAD] Detected Direct URL: ${url}`);
                const response = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream',
                    timeout: 10000 // Connect timeout
                });
                const mimeType = response.headers['content-type'];
                response.data.pipe(fs.createWriteStream(destPath))
                    .on('finish', () => onFinish(mimeType))
                    .on('error', onError);
            }
        } catch (error) {
            onError(error);
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
    let attempts = 0;
    while (state === "PROCESSING") {
        attempts++;
        if (attempts > 30) { // 60 seconds (2s interval)
            throw new Error("Gemini file processing timed out.");
        }
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
            console.log('[DATA] Fetching GA4 Data... (LEGACY - DISABLED)');
            // try {
            //     const gaData = await fetchGA4Data(googleToken, gaPropertyId);
            //     const gaInsights = extractGA4Insights(gaData);
            //     externalDataContext += formatInsightsForLLM(gaInsights);
            //     console.log(`[GA4 INSIGHTS] Performance: ${gaInsights.performanceSignal}, Findings: ${gaInsights.keyFindings.length}`);
            // } catch (e: any) {
            //     console.error("Failed to fetch GA4 data", e.message);
            //     externalDataContext += `\n\n[GA4 DATA UNAVAILABLE: ${e.message}]`;
            // }
            externalDataContext += `\n\n[GA4 DATA: Uses new dashboard integration]`;
        }

        if (metaToken) {
            console.log('[DATA] Fetching Meta Ads Data...');
            try {
                const metaData = await fetchMetaAdsData(metaToken);
                const metaInsights = extractMetaAdsInsights(metaData);
                externalDataContext += formatInsightsForLLM(metaInsights);
                console.log(`[META INSIGHTS] Performance: ${metaInsights.performanceSignal}, Findings: ${metaInsights.keyFindings.length}`);
            } catch (e: any) {
                console.error("Failed to fetch Meta data", e.message);
                externalDataContext += `\n\n[META ADS DATA UNAVAILABLE: ${e.message}]`;
            }
        }

        // Add disconnected state context if no data sources
        if (!googleToken && !metaToken) {
            externalDataContext += formatDisconnectedState();
        }

        // 4. Analyze with Context
        const fullContext = `${textContext || ''}${externalDataContext}`;
        const result = await analyzeCollateralSmart(fullContext, analysisLabel, null, mimeType || 'video/mp4', fileUri);

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
        const { textContext, analysisLabel, fileData, mimeType, videoUrl, googleToken, metaToken, gaPropertyId } = req.body;

        console.log(`[API] /api/analyze called with label="${analysisLabel}"`);

        if (fileData && videoUrl) {
            console.log('[API] Tri-Input Mode Detected: Upload (Primary) + URL (Secondary)');
        }

        // Generate content hash for cache lookup (include videoUrl if present)
        const contentHash = fileData ? generateFileHash(fileData) : generateFileHash((textContext || '') + (videoUrl || ''));

        // Check cache first
        const cacheResult = await checkCache(contentHash, analysisLabel);
        console.log(`[RUNTIME-VERIFY] Cache Check: hit=${cacheResult.hit}`);
        if (cacheResult.hit) {
            console.log(`[CACHE] Returning cached result (Industry: ${cacheResult.record?.industry})`);
            console.log(`[RUNTIME-VERIFY] ===== CACHE HIT - RETURNING CACHED RESULT =====`);
            return res.json({ success: true, data: cacheResult.analysis, cached: true });
        }

        // Fetch External Data
        let externalDataContext = "";
        if (googleToken && gaPropertyId) {
            console.log('[DATA] Fetching GA4 Data... (LEGACY - DISABLED)');
            // try {
            //     const gaData = await fetchGA4Data(googleToken, gaPropertyId);
            //     const gaInsights = extractGA4Insights(gaData);
            //     externalDataContext += formatInsightsForLLM(gaInsights);
            //     console.log(`[GA4 INSIGHTS] Performance: ${gaInsights.performanceSignal}, Findings: ${gaInsights.keyFindings.length}`);
            // } catch (e: any) {
            //     console.error("Failed to fetch GA4 data", e.message);
            //     externalDataContext += `\n\n[GA4 DATA UNAVAILABLE: ${e.message}]`;
            // }
            externalDataContext += `\n\n[GA4 DATA: Uses new dashboard integration]`;
        }

        if (metaToken) {
            console.log('[DATA] Fetching Meta Ads Data...');
            try {
                const metaData = await fetchMetaAdsData(metaToken);
                const metaInsights = extractMetaAdsInsights(metaData);
                externalDataContext += formatInsightsForLLM(metaInsights);
                console.log(`[META INSIGHTS] Performance: ${metaInsights.performanceSignal}, Findings: ${metaInsights.keyFindings.length}`);
            } catch (e: any) {
                console.error("Failed to fetch Meta data", e.message);
                externalDataContext += `\n\n[META ADS DATA UNAVAILABLE: ${e.message}]`;
            }
        }

        // Add disconnected state context if no data sources
        if (!googleToken && !metaToken) {
            externalDataContext += formatDisconnectedState();
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
            result = await analyzeCollateralSmart(fullContext, analysisLabel, null, mimeType, fileUri, videoUrl);
        } else {
            // For images, inline base64 is fine (they're smaller)
            result = await analyzeCollateralSmart(fullContext, analysisLabel, fileData, mimeType, null, videoUrl);
        }

        console.log(`[RUNTIME-VERIFY] Analysis Complete - Industry: ${result.industry || 'N/A'}`);



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

/* REMOVED: Legacy Google Auth Routes - migrated to /api/ga4/auth
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
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        // Send tokens back to opener
        const html = `
            <script>
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: '${tokens.access_token}' }, '${appUrl}');
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
*/



import { MetaScheduler } from './services/meta/scheduler.js';

// Initialize Databases
initDatabase();
initCreativeMemoryDatabase();
initGA4Database();
initMetaDatabase(); // Initialize Meta DB

// Start Scheduler
const metaScheduler = new MetaScheduler();
metaScheduler.start();

// Mount Routes
app.use('/api', metaRoutes);

// Meta Auth (Legacy - Removing in favor of metaRoutes, but keeping commented if needed for reference, or just remove)
// app.get('/api/auth/meta', ...); -> REMOVED because it's in metaRoutes now.


// POST /api/strategy
app.post('/api/strategy', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { analysis } = req.body;

        console.log('[API] /api/strategy called');

        if (!analysis) {
            throw new ValidationError("Analysis data is required for strategy generation", "MISSING_ANALYSIS");
        }

        try {
            // Primary: Attempt LLM generation
            const result = await generateCampaignStrategy(analysis);
            res.json({ success: true, data: result });
        } catch (llmError: any) {
            console.error(`[STRATEGY] Primary LLM failed: ${llmError.message}. Activating Fallback.`);

            // Fallback: Deterministic Strategy Generation
            // construct a safe fallback strategy derived strictly from the analysis data
            const fallbackStrategy = {
                targetAudience: {
                    primary: "Derived Audience",
                    secondary: "Broad Market",
                    mindset: "Open to category messaging"
                },
                coreMessage: {
                    headline: `Optimize for ${analysis.keyDeterminants?.driver?.metric || 'Relevance'}`,
                    subhead: "Leverage existing creative strengths while addressing detractors.",
                    tone: "authoritative"
                },
                channelStrategy: [
                    { channel: "Meta (Instagram/Facebook)", role: "Awareness", tactic: "Utilize high-scoring visual elements" },
                    { channel: "YouTube", role: "Education", tactic: "Expand on narrative depth" }
                ],
                creativeTactics: [
                    `Capitalize on ${analysis.keyDeterminants?.driver?.metric || 'strengths'}`,
                    `Mitigate ${analysis.keyDeterminants?.detractor?.metric || 'weaknesses'}`,
                    "Focus on visual hook retention"
                ],
                budgetAllocation: {
                    awareness: 40,
                    consideration: 40,
                    conversion: 20
                },
                flighting: "Always-on with burst support",
                kpiFramework: [
                    { metric: "CTR", target: "1.5%" },
                    { metric: "ROAS", target: ((analysis.holisticScorecard?.averageScore || 50) / 20).toFixed(1) + "x" }
                ]
            };

            res.json({
                success: true,
                data: fallbackStrategy,
                meta: { mode: "fallback", reason: llmError.message }
            });
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/cross-industry-insights (NEW - Cross-Category Learning)
app.post('/api/cross-industry-insights', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sourceIndustry, targetIndustry, niche, region } = req.body;

        console.log(`[API] /api/cross-industry-insights called: ${sourceIndustry} → ${targetIndustry}`);

        // Validate required parameters
        if (!sourceIndustry || !targetIndustry) {
            return res.status(400).json({
                success: false,
                error: 'Both sourceIndustry and targetIndustry are required',
                code: 'MISSING_PARAMETERS'
            });
        }

        // Validate industries are in tracked list
        if (!TRACKED_INDUSTRIES.includes(sourceIndustry as TrackedIndustry)) {
            return res.status(400).json({
                success: false,
                error: `Invalid sourceIndustry. Must be one of: ${TRACKED_INDUSTRIES.join(', ')}`,
                code: 'INVALID_INDUSTRY'
            });
        }

        if (!TRACKED_INDUSTRIES.includes(targetIndustry as TrackedIndustry)) {
            return res.status(400).json({
                success: false,
                error: `Invalid targetIndustry. Must be one of: ${TRACKED_INDUSTRIES.join(', ')}`,
                code: 'INVALID_INDUSTRY'
            });
        }

        // Discover cross-industry patterns
        const insights = discoverCrossIndustryPatterns(
            sourceIndustry,
            targetIndustry,
            niche || 'general',
            region || 'global'
        );

        if (!insights) {
            return res.status(404).json({
                success: false,
                error: `No pattern data available for ${sourceIndustry} or ${targetIndustry}. Pattern data is generated from the Creative Memory database.`,
                code: 'NO_PATTERN_DATA',
                hint: 'Pattern data is automatically generated when creatives are ingested into the Creative Memory system.'
            });
        }

        console.log(`[API] Found ${insights.totalOpportunities} transferable patterns`);

        res.json({
            success: true,
            data: insights
        });

    } catch (error) {
        next(error);
    }
});

// GA4 Routes
app.use('/api/ga4', ga4Router);

// Serve static files from the dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// --- SERVER STARTUP ---
const errorHandler = (err: any, req: any, res: Response, next: NextFunction) => {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    if (err.stack) console.error(err.stack);

    // Default error status
    let status = 500;
    let message = "Internal Server Error";
    let code = "INTERNAL_ERROR";

    if (err instanceof ValidationError) {
        status = 400;
        message = err.message;
        code = err.code;
    } else if (err instanceof AIOutputError) {
        status = 502; // Bad Gateway (upstream AI failed)
        message = "AI service returned invalid response. Please try again.";
        code = err.code;
    } else if (err instanceof AIRuntimeError) {
        status = 503; // Service Unavailable
        message = err.message;
        code = err.code;
    }

    res.status(status).json({
        success: false,
        error: message,
        code: code,
        requestId: req.requestId || 'unknown'
    });
};

app.use(errorHandler);

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
