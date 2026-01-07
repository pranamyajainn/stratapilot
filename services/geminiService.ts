
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, CampaignStrategy } from "../types";

// Always use named parameter for apiKey and use process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- KNOWLEDGE BASE ---
const BASE_KNOWLEDGE = `
You are StrataPilot, an Agentic AI Creative Intelligence Platform.

**PROJECT SPECIFIC KNOWLEDGE:**
- If the creative is for **Casagrand Casablanca**, note that the architecture and theme are strictly **ROMAN**, not Moroccan. Ensure all descriptions of visual aesthetics, sensorial promises, and creative diagnostics reflect Roman architectural grandeur (e.g., pillars, arches, classical sculptures).

**UNIFIED DATA ARCHITECTURE & ROBUSTNESS PROTOCOL:**
You operate on a 'Unified Data Lake' integrating benchmarks from Global Ad Intelligence.
You are engineered for Out-of-Distribution (OOD) Stability.

**GOVERNANCE & ETHICS GUARDRAILS:**
- Fairness Check: Actively scan for bias.
- Drift Detection: Monitor confidence.
- Brand Safety: Flag reputational risk.

**SCORING RIGOR & CRITICAL AUDIT:**
- Be critical, rigorous, and highly realistic with your scoring. 
- Do not give 'fancy' or overly generous scores. 
- A score above 85 is extremely rare and reserved only for world-class, flawless creative.
- Most average-to-good creative should fall in the 45-70 range.
- Ensure scores reflect an honest delta against category benchmarks; if an ad is underperforming, the score must clearly reflect that.

**12 PARAMETER DIAGNOSTIC PARAMETERS (MANDATORY):**
1. Immediate Outcome Prediction + Memory Retention Uplift
2. Top-of-Mind Creative Recall
3. Brand Visibility Timing + Link Strength
4. Emotional Curve Mapping
5. Predicted CTR + Purchase Uplift Score
6. Creative Differentiation Benchmark
7. Clarity of Proposition Score
8. Emotional Arc (Frame-by-Frame)
9. Sensory & Product Appeal Score
10. First 5 Seconds Branding Score
11. CTA Timing & Clarity Score
12. Virality & Social Potential Score
`;

const STRATEGY_SYSTEM_INSTRUCTION = `
You are StrataPilot's Chief Strategist. 
Based on the provided persona analysis and ad diagnostics, create a comprehensive Campaign Strategy.
Focus on actionable steps, clear messaging, and measurable KPIs.
You must output strictly valid JSON matching the schema provided.
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
        description: "Exactly 7 tactical creative COMMANDS. For each command, follow this structure: '[time]s - [Action Command]. Rationale: [why point is made]. Impact: [what lift it creates].' Use lowercase for the action text."
      },
      commentary: { type: Type.STRING, description: "A high-depth, comprehensive deep-dive analysis. Provide DOUBLE the usual detail, exploring visual nuances, narrative pacing, and specific sensory triggers present in the collateral." },
      whyItMatters: { type: Type.STRING, description: "The strategic consequence of this issue on audience behavior or brand perception." },
      recommendation: { type: Type.STRING, description: "A concrete, practical fix (e.g., 'Increase contrast in CTA', 'Add 2s hold on product shot')." },
      impact: { type: Type.STRING, description: "The expected positive outcome or uplift from implementing the fix." },
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
      description: "A 10-point Brand Strategy Window breakdown. Each card must have title, subtitle, and content.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "One of: RATIONAL PROMISE, EMOTIONAL PROMISE, SENSORIAL PROMISE, REASON TO BELIEVE, BRAND PURPOSE, BRAND PERSONALITY, VALUE PROPOSITION, DISTINCTIVE ASSETS, MEMORY STRUCTURE, STRATEGIC ROLE" },
          subtitle: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["title", "subtitle", "content"]
      }
    },
    brandArchetypeDetail: {
      type: Type.OBJECT,
      properties: {
        archetype: { type: Type.STRING, description: "One of: The Innocent, The Sage, The Explorer, The Outlaw, The Magician, The Hero, The Lover, The Jester, The Everyman, The Caregiver, The Ruler, The Creator" },
        value: { type: Type.STRING, description: "The core value associated with the archetype (e.g., SAFETY, KNOWLEDGE, FREEDOM, etc.)" },
        quote: { type: Type.STRING, description: "A short, catchy summary quote for the brand persona." },
        reasoning: { type: Type.STRING, description: "Detailed AI reasoning for why this archetype fits the creative." }
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
Ensure all 12 diagnostic parameters are evaluated.
For each diagnostic item:
1. Provide a highly detailed 'commentary' (Deep Analysis). This must be DOUBLE the standard length.
2. For 'subInsights', provide EXACTLY 7 imperative COMMANDS in lowercase. Include Rationale and Impact for each.
Format: '[time]s - [action command in lowercase]. Rationale: [why]. Impact: [result].'

Also generate a 10-point Brand Strategy Window (brandStrategyWindow) that decodes the brand intent for:
1. RATIONAL PROMISE (Functional Value)
2. EMOTIONAL PROMISE (Feeling Owned)
3. SENSORIAL PROMISE (Visuals/Audio/Texture)
4. REASON TO BELIEVE (Evidence & Claims)
5. BRAND PURPOSE (The 'Why')
6. BRAND PERSONALITY (Human Traits)
7. VALUE PROPOSITION (Competitive Advantage)
8. DISTINCTIVE ASSETS (Logos/Codes/Mascots)
9. MEMORY STRUCTURE (Desired Recall)
10. STRATEGIC ROLE (Funnel Objective)

Finally, identify the Brand Archetype (brandArchetypeDetail) from the standard 12: Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator.
`;

  parts.push({ text: `Analyze this creative. User Context: ${textContext}` });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
      temperature: 0.3, 
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as AnalysisResult;
};

export const generateCampaignStrategy = async (analysis: AnalysisResult): Promise<CampaignStrategy> => {
  const prompt = `Generate strategy for: ${JSON.stringify(analysis)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction: STRATEGY_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: strategyResponseSchema,
      temperature: 0.5, 
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as CampaignStrategy;
};
