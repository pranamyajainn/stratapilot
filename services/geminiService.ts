
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, CampaignStrategy } from "../types";

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/mpeg", "video/quicktime"];

// DETERMINISM CONFIG
const GENERATION_CONFIG = {
  temperature: 0.2, // Low temperature for consistent, analyst-like output
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

// Always use named parameter for apiKey
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("CRITICAL: API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
const validateInputs = (textContext: string, analysisLabel: string, mediaFile?: File) => {
  // 1. Text Context Validation
  const hasText = textContext && textContext.trim().length > 0;

  if (!hasText && !mediaFile) {
    throw new ValidationError("Input required: Provide 'textContext' or upload a 'mediaFile'.");
  }

  if (textContext.length > 5000) {
    throw new ValidationError("'textContext' exceeds 5000 characters.");
  }

  // 2. Analysis Label Validation
  if (!analysisLabel || analysisLabel.trim().length === 0) {
    throw new ValidationError("'analysisLabel' cannot be empty.");
  }

  // 3. Media Validation (if present)
  if (mediaFile) {
    if (!SUPPORTED_MIME_TYPES.includes(mediaFile.type)) {
      throw new ValidationError(`Unsupported MIME type '${mediaFile.type}'. Supported: ${SUPPORTED_MIME_TYPES.join(", ")}`);
    }

    const fileSizeMB = mediaFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new ValidationError(`File size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE_MB}MB.`);
    }

    if (mediaFile.size === 0) {
      throw new ValidationError("File is empty (0 bytes).");
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

  // Deep check for Diagnostics (must be array)
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

// --- RUNTIME WRAPPER (Logs, Errors, Determinism) ---
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
      // Passthrough validation errors (input issues)
      if (error instanceof ValidationError) {
        console.warn(`[${reqId}] REJECT validation error: ${error.message}`);
        throw error;
      }

      lastError = error as Error;

      // Retry logic for Transient/Output errors
      if (attempt < maxRetries) {
        console.warn(`[${reqId}] RETRY op=${operationName} attempt=${attempt + 1} reason=${lastError.message}`);
        continue;
      }
    }
  }

  // Harden Final Error Boundary
  console.error(`[${reqId}] FAIL op=${operationName} error=${lastError?.name}`);

  // Ensure we only leak known error types
  if (lastError instanceof AIOutputError) throw lastError;

  // Opaque Runtime Error
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

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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

export const analyzeCollateral = async (textContext: string, analysisLabel: string, mediaFile?: File): Promise<AnalysisResult> => {
  // 1. FAIL FAST: Validate Inputs First
  validateInputs(textContext, analysisLabel, mediaFile);

  const parts: any[] = [];

  if (mediaFile) {
    const base64Data = await fileToGenerativePart(mediaFile);
    parts.push({
      inlineData: {
        mimeType: mediaFile.type,
        data: base64Data
      }
    });
  }

  const SYSTEM_INSTRUCTION = `
${BASE_KNOWLEDGE}
Analyze this creative through the lens of: "${analysisLabel}".
Strictly follow the JSON schema provided.

**ANALYSIS PROTOCOL:**
1.  **Diagnostic Evaluation**: For each parameter, cite specific visual/textual elements as evidence.
2.  **Refusal Condition**: If the creative is blank, ambiguous, or corrupted, set scores to 0 and transparently state the issue in 'commentary'.
3.  **No Hallucinated Benchmarks**: When comparing to "benchmarks", refer to *general category best practices*, not specific external competitors.

**OUTPUT REQUIREMENTS:**
- Be concise, objective, and analyst-toned.
- Avoid marketing fluff.
- If a field requires data you cannot observe (e.g., 'buyingHabits'), infer strictly from the *target audience implied by the creative's content*, and qualify it as an inference.
`;

  parts.push({ text: `Analyze this creative. User Context: ${textContext}` });

  // WRAPPER: Retry Logic + Schema Validation + Determinism
  return safeGenerate<AnalysisResult>(
    "analyzeCollateral",
    () => getAIClient().models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        // LOCK PARAMETERS FOR DETERMINISM
        ...GENERATION_CONFIG
      }
    }),
    validateAnalysisResult
  );
};

export const generateCampaignStrategy = async (analysis: AnalysisResult): Promise<CampaignStrategy> => {
  if (!analysis) {
    throw new ValidationError("Analysis result is required for strategy generation.");
  }

  const prompt = `Generate strategy for: ${JSON.stringify(analysis)}`;

  // WRAPPER: Retry Logic + Schema Validation + Determinism
  return safeGenerate<CampaignStrategy>(
    "generateCampaignStrategy",
    () => getAIClient().models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: STRATEGY_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: strategyResponseSchema,
        // LOCK PARAMETERS FOR DETERMINISM
        ...GENERATION_CONFIG
      }
    }),
    validateCampaignStrategy
  );
};
