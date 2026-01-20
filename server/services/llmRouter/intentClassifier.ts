/**
 * Intent Classifier (Stage 0 Pre-Router)
 * Uses Llama 3.1 8B to classify task intent and complexity before routing
 */

import { getGroqClient } from './groqClient.js';
import type { TaskIntent, ComplexityLevel, ClassificationResult } from './types.js';

// =====================================================
// CLASSIFICATION PROMPTS
// =====================================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are a task classifier for an AI routing system. Your job is to analyze incoming requests and classify them accurately.

OUTPUT FORMAT (strict JSON):
{
  "intent": "<one of: analysis, summarization, ideation, classification, reasoning, critique>",
  "complexity": "<one of: low, medium, high>",
  "estimatedTokens": <number>,
  "confidence": <0.0-1.0>,
  "requiresTwoPass": <boolean>
}

INTENT DEFINITIONS:
- analysis: Deep diagnostic evaluation, structured insights, brand analysis
- summarization: Compress long content, extract key points
- ideation: Creative generation, strategy proposals, messaging
- classification: Quick categorization, industry detection, simple labels
- reasoning: Complex logic, mathematical evaluation, scoring with rubrics
- critique: Validation, gap analysis, quality checks on existing content

COMPLEXITY RULES:
- low: Simple task, short input (<500 tokens), clear intent
- medium: Moderate task, medium input (500-2000 tokens), some nuance
- high: Complex task, long input (>2000 tokens), multi-step reasoning needed

TWO-PASS REQUIREMENT (requiresTwoPass = true):
- Strategy generation (high business impact)
- Final deliverable documents
- Content that will be shown to end clients

Be precise and fast. This classification determines routing efficiency.`;

// =====================================================
// INTENT CLASSIFIER
// =====================================================

export class IntentClassifier {
    private client = getGroqClient();

    /**
     * Classify a request to determine routing
     */
    async classify(
        userPrompt: string,
        contextHints?: {
            hasMedia?: boolean;
            isStrategyRequest?: boolean;
            isClientFacing?: boolean;
        }
    ): Promise<ClassificationResult> {
        // Fast path: very short prompts are low complexity classification
        if (userPrompt.length < 100 && !contextHints?.hasMedia) {
            return {
                intent: 'classification',
                complexity: 'low',
                estimatedTokens: Math.ceil(userPrompt.length / 4),
                confidence: 0.9,
                requiresTwoPass: false,
            };
        }

        // Estimate tokens roughly (4 chars per token approx)
        const estimatedInputTokens = Math.ceil(userPrompt.length / 4);

        const classificationPrompt = `Classify this request:

${userPrompt.substring(0, 2000)}${userPrompt.length > 2000 ? '... [truncated]' : ''}

Additional context:
- Has media attachment: ${contextHints?.hasMedia ?? false}
- Strategy request: ${contextHints?.isStrategyRequest ?? false}
- Client-facing output: ${contextHints?.isClientFacing ?? false}
- Estimated input tokens: ${estimatedInputTokens}`;

        try {
            const response = await this.client.chatCompletion<ClassificationResult>(
                'llama-3.1-8b-instant',
                CLASSIFICATION_SYSTEM_PROMPT,
                classificationPrompt,
                {
                    temperature: 0.1, // Low temperature for consistent classification
                    maxTokens: 256,
                    responseFormat: 'json',
                }
            );

            if (response.success && response.data) {
                // Validate and sanitize response
                return this.sanitizeResult(response.data, estimatedInputTokens, contextHints);
            }

            // Fallback on error
            console.warn('[IntentClassifier] Classification failed, using fallback');
            return this.fallbackClassification(userPrompt, contextHints);

        } catch (error) {
            console.error('[IntentClassifier] Error:', error);
            return this.fallbackClassification(userPrompt, contextHints);
        }
    }

    /**
     * Sanitize and validate classification result
     */
    private sanitizeResult(
        result: Partial<ClassificationResult>,
        estimatedTokens: number,
        contextHints?: { hasMedia?: boolean; isStrategyRequest?: boolean; isClientFacing?: boolean }
    ): ClassificationResult {
        const validIntents: TaskIntent[] = [
            'analysis', 'summarization', 'ideation', 'classification', 'reasoning', 'critique'
        ];
        const validComplexity: ComplexityLevel[] = ['low', 'medium', 'high'];

        const intent = validIntents.includes(result.intent as TaskIntent)
            ? (result.intent as TaskIntent)
            : 'analysis';

        const complexity = validComplexity.includes(result.complexity as ComplexityLevel)
            ? (result.complexity as ComplexityLevel)
            : 'medium';

        // Override two-pass requirement for strategy requests
        const requiresTwoPass =
            result.requiresTwoPass === true ||
            contextHints?.isStrategyRequest === true ||
            contextHints?.isClientFacing === true ||
            (intent === 'ideation' && complexity === 'high');

        return {
            intent,
            complexity,
            estimatedTokens: result.estimatedTokens ?? estimatedTokens,
            confidence: Math.min(1, Math.max(0, result.confidence ?? 0.7)),
            requiresTwoPass,
        };
    }

    /**
     * Fallback classification when LLM call fails
     */
    private fallbackClassification(
        userPrompt: string,
        contextHints?: { hasMedia?: boolean; isStrategyRequest?: boolean; isClientFacing?: boolean }
    ): ClassificationResult {
        const estimatedTokens = Math.ceil(userPrompt.length / 4);
        const promptLower = userPrompt.toLowerCase();

        // Simple keyword-based fallback
        let intent: TaskIntent = 'analysis';
        if (promptLower.includes('summarize') || promptLower.includes('summary')) {
            intent = 'summarization';
        } else if (promptLower.includes('generate') || promptLower.includes('create') || promptLower.includes('strategy')) {
            intent = 'ideation';
        } else if (promptLower.includes('classify') || promptLower.includes('categorize') || promptLower.includes('detect')) {
            intent = 'classification';
        } else if (promptLower.includes('validate') || promptLower.includes('review') || promptLower.includes('critique')) {
            intent = 'critique';
        } else if (promptLower.includes('calculate') || promptLower.includes('score') || promptLower.includes('reason')) {
            intent = 'reasoning';
        }

        let complexity: ComplexityLevel = 'medium';
        if (estimatedTokens < 200) complexity = 'low';
        else if (estimatedTokens > 1000) complexity = 'high';

        return {
            intent,
            complexity,
            estimatedTokens,
            confidence: 0.5, // Low confidence for fallback
            requiresTwoPass: contextHints?.isStrategyRequest ?? contextHints?.isClientFacing ?? false,
        };
    }
}

// Singleton instance
let classifierInstance: IntentClassifier | null = null;

export function getIntentClassifier(): IntentClassifier {
    if (!classifierInstance) {
        classifierInstance = new IntentClassifier();
    }
    return classifierInstance;
}
