/**
 * LLM Router Types
 * Core TypeScript interfaces for the multi-LLM routing system
 */

// =====================================================
// TASK CLASSIFICATION
// =====================================================

/**
 * Intent categories for routing decisions
 */
export type TaskIntent =
    | 'analysis'        // Deep diagnostic analysis (DeepSeek for structured, Llama for narrative)
    | 'summarization'   // Compress long content (Qwen3)
    | 'ideation'        // Creative generation (Llama 3.3)
    | 'classification'  // Quick categorization (Llama 3.1 8B)
    | 'reasoning'       // Complex logic/math (DeepSeek)
    | 'critique';       // Validation pass (DeepSeek)

/**
 * Complexity levels for routing decisions
 */
export type ComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Output from the intent classifier (Stage 0)
 */
export interface ClassificationResult {
    intent: TaskIntent;
    complexity: ComplexityLevel;
    estimatedTokens: number;
    confidence: number;        // 0-1 confidence in classification
    requiresTwoPass: boolean;  // High-stakes flag for draft+critique
}

// =====================================================
// MODEL CONFIGURATION
// =====================================================

/**
 * Supported model identifiers on Groq Cloud
 */
export type GroqModelId =
    | 'llama-3.3-70b-versatile'      // Creative, narratives, general purpose
    | 'llama-3.1-8b-instant'         // Fast classification, simple tasks
    | 'deepseek-r1-distill-llama-70b' // Structured reasoning, critique
    | 'deepseek-r1-distill-qwen-32b'  // Smaller reasoning fallback
    | 'qwen/qwen3-32b'               // Summarization, long-context
    | 'gemma2-9b-it'                 // Lightweight fallback
    | 'mistral-saba-24b';            // Efficient general purpose

/**
 * Model capability profile
 */
export interface ModelProfile {
    id: GroqModelId;
    displayName: string;
    contextWindow: number;
    costClass: 'low' | 'medium' | 'high';
    bestFor: TaskIntent[];
    tokensPerMinute: number;    // Rate limit
    requestsPerDay: number;     // Daily limit (free tier)
}

/**
 * Registry of all available models with their profiles
 */
export const MODEL_REGISTRY: Record<GroqModelId, ModelProfile> = {
    'llama-3.3-70b-versatile': {
        id: 'llama-3.3-70b-versatile',
        displayName: 'Llama 3.3 70B',
        contextWindow: 128000,
        costClass: 'medium',
        bestFor: ['ideation', 'analysis'],
        tokensPerMinute: 6000,
        requestsPerDay: 14400,
    },
    'llama-3.1-8b-instant': {
        id: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        contextWindow: 128000,
        costClass: 'low',
        bestFor: ['classification'],
        tokensPerMinute: 6000,
        requestsPerDay: 14400,
    },
    'deepseek-r1-distill-llama-70b': {
        id: 'deepseek-r1-distill-llama-70b',
        displayName: 'DeepSeek R1 Distill 70B',
        contextWindow: 64000,
        costClass: 'high',
        bestFor: ['reasoning', 'critique'],
        tokensPerMinute: 6000,
        requestsPerDay: 1000,
    },
    'deepseek-r1-distill-qwen-32b': {
        id: 'deepseek-r1-distill-qwen-32b',
        displayName: 'DeepSeek R1 Distill 32B',
        contextWindow: 64000,
        costClass: 'medium',
        bestFor: ['reasoning'],
        tokensPerMinute: 6000,
        requestsPerDay: 1000,
    },
    'qwen/qwen3-32b': {
        id: 'qwen/qwen3-32b',
        displayName: 'Qwen3 32B',
        contextWindow: 32000,
        costClass: 'medium',
        bestFor: ['summarization'],
        tokensPerMinute: 6000,
        requestsPerDay: 1000,
    },
    'gemma2-9b-it': {
        id: 'gemma2-9b-it',
        displayName: 'Gemma2 9B',
        contextWindow: 8000,
        costClass: 'low',
        bestFor: ['classification'],
        tokensPerMinute: 6000,
        requestsPerDay: 14400,
    },
    'mistral-saba-24b': {
        id: 'mistral-saba-24b',
        displayName: 'Mistral Saba 24B',
        contextWindow: 32000,
        costClass: 'low',
        bestFor: ['classification', 'summarization'],
        tokensPerMinute: 6000,
        requestsPerDay: 14400,
    },
};

// =====================================================
// ROUTING DECISIONS
// =====================================================

/**
 * Result from the model router
 */
export interface RouterDecision {
    primary: GroqModelId;
    fallback: GroqModelId;
    estimatedCost: number;       // Estimated tokens
    reasoning: string;           // Why this model was chosen
    requiresTwoPass: boolean;    // Needs draft + critique
}

/**
 * Configuration for a routing request
 */
export interface RouterConfig {
    intent: TaskIntent;
    complexity: ComplexityLevel;
    inputTokens: number;
    priority: 'speed' | 'quality' | 'cost';
    hasMedia: boolean;           // Requires Gemini preprocessing
}

// =====================================================
// COST GOVERNANCE
// =====================================================

/**
 * Daily budget configuration
 */
export interface CostBudget {
    modelClass: 'low' | 'medium' | 'high';
    dailyLimit: number;          // Max requests per day
    currentUsage: number;        // Current usage count
    resetTime: Date;             // When budget resets
}

/**
 * Cost governor decision
 */
export interface CostDecision {
    allowed: boolean;
    reason: string;
    remainingBudget: number;
    suggestedDowngrade?: GroqModelId;  // Cheaper alternative if budget low
}

// =====================================================
// PROVENANCE & EVALUATION
// =====================================================

/**
 * Request provenance record for evaluation and drift detection
 */
export interface RequestProvenance {
    requestId: string;
    modelId: GroqModelId | 'gemini-2.0-flash';
    taskType: TaskIntent;
    promptHash: string;
    outputHash: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    qualityScore?: number;       // Optional human/heuristic score 0-100
    createdAt: Date;
}

/**
 * Aggregated model performance stats
 */
export interface ModelStats {
    modelId: GroqModelId;
    totalRequests: number;
    averageLatencyMs: number;
    averageQualityScore: number;
    errorRate: number;
    lastUsed: Date;
}

// =====================================================
// API RESPONSES
// =====================================================

/**
 * Unified response from any LLM call
 */
export interface LLMResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    provenance: Omit<RequestProvenance, 'createdAt'>;
}

/**
 * Two-pass response combining draft and critique
 */
export interface TwoPassResponse<T = any> {
    draft: LLMResponse<T>;
    critique?: LLMResponse<{
        validationPassed: boolean;
        gaps: string[];
        rigorScore: number;
        suggestions: string[];
    }>;
    merged: T;
}

// =====================================================
// VISUAL FEATURES (Gemini Compiler Output)
// =====================================================

/**
 * Structured output from Gemini visual extraction
 * Gemini acts as a COMPILER - extracts only, no strategic conclusions
 */
export interface VisualFeatures {
    // Scene Understanding
    objects: string[];            // Detected objects/items
    scenes: string[];             // Scene descriptions
    colors: string[];             // Dominant colors
    composition: string;          // Visual composition notes

    // Motion/Video
    pacing: 'slow' | 'medium' | 'fast' | 'variable';
    transitions: string[];        // Transition types used
    duration?: number;            // Duration in seconds

    // Text/Audio
    textOverlays: string[];       // On-screen text
    transcript: string;           // Speech transcript
    audioMood: string;            // Music/sound mood

    // Emotional Cues
    emotionalTone: string[];      // Detected emotional elements
    humanPresence: boolean;       // People in frame
    facialExpressions?: string[]; // If humans present

    // Brand Elements
    logoDetected: boolean;
    logoPosition?: string;
    brandColors: string[];
    ctaText?: string;
    ctaPlacement?: string;
}
