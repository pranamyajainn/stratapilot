/**
 * Model Router
 * Central routing logic implementing corrected rules for task-to-model matching
 */

import type {
    TaskIntent,
    ComplexityLevel,
    GroqModelId,
    RouterDecision,
    RouterConfig
} from './types.js';

// =====================================================
// ROUTING RULES
// =====================================================

/**
 * Correct model assignments based on senior review:
 * - Llama 3.3: Creative, narratives, ideation, general analysis
 * - DeepSeek: Structured reasoning, diagnostic scoring, critique, validation
 * - Qwen3: Summarization, long-context comprehension
 * - Llama 3.1 8B: Fast classification, simple tasks
 */

interface RoutingRule {
    models: { primary: GroqModelId; fallback: GroqModelId };
    reasoning: string;
}

/**
 * Intent + Complexity → Model mapping
 */
const ROUTING_MATRIX: Record<TaskIntent, Record<ComplexityLevel, RoutingRule>> = {
    // Creative and narrative generation → Llama 3.3
    ideation: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Simple ideation handled by fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 excels at creative generation',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'qwen/qwen3-32b' },
            reasoning: 'Complex creative tasks require Llama 3.3',
        },
    },

    // Summarization → Qwen3
    summarization: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Simple summaries handled efficiently by fast model',
        },
        medium: {
            models: { primary: 'qwen/qwen3-32b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Qwen3 has enhanced long-context understanding',
        },
        high: {
            models: { primary: 'qwen/qwen3-32b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Qwen3 optimal for compressing large documents',
        },
    },

    // Analysis → Llama 3.3
    analysis: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Basic analysis delegated to fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 for general analysis',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'qwen/qwen3-32b' },
            reasoning: 'Complex analysis uses Llama 3.3',
        },
    },

    // Classification → Llama 3.1 8B
    classification: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Classification optimized for speed',
        },
        medium: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Medium classification uses fast model',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Complex classification needs Llama 3.3',
        },
    },

    // Structured reasoning → Llama 3.3 (DeepSeek unavailable)
    reasoning: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Simple logic handled by fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 for structured reasoning',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'qwen/qwen3-32b' },
            reasoning: 'Llama 3.3 replaces unavailable DeepSeek for complex reasoning',
        },
    },

    // Critique and validation → Llama 3.3 (DeepSeek unavailable)
    critique: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Simple validation delegated to fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 for critique',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'qwen/qwen3-32b' },
            reasoning: 'Llama 3.3 replaces unavailable DeepSeek for rigorous validation',
        },
    },
};

// =====================================================
// MODEL ROUTER
// =====================================================

export class ModelRouter {
    /**
     * Determine the best model for a given configuration
     */
    route(config: RouterConfig): RouterDecision {
        const { intent, complexity, inputTokens, priority } = config;

        // Get base routing decision from matrix
        const rule = ROUTING_MATRIX[intent]?.[complexity];

        if (!rule) {
            // Fallback for unknown combinations
            return {
                primary: 'llama-3.3-70b-versatile',
                fallback: 'llama-3.1-8b-instant',
                estimatedCost: inputTokens * 2, // Estimate output ~ input
                reasoning: 'Unknown intent/complexity combination, using versatile fallback',
                requiresTwoPass: false,
            };
        }

        // Adjust for priority
        let { primary, fallback } = rule.models;
        let reasoning = rule.reasoning;

        if (priority === 'cost') {
            // Use cheapest viable option
            if (complexity === 'medium') {
                primary = 'llama-3.1-8b-instant';
                reasoning += ' (downgraded for cost)';
            }
        }
        // priority === 'quality' uses the defaults

        // Determine if two-pass is needed
        const requiresTwoPass = this.shouldUseTwoPass(intent, complexity, config);

        return {
            primary,
            fallback,
            estimatedCost: inputTokens * 2,
            reasoning,
            requiresTwoPass,
        };
    }

    /**
     * Determine if two-pass reasoning is needed
     */
    private shouldUseTwoPass(
        intent: TaskIntent,
        complexity: ComplexityLevel,
        config: RouterConfig
    ): boolean {
        // Always two-pass for high-complexity ideation (strategy generation)
        if (intent === 'ideation' && complexity === 'high') {
            return true;
        }

        // High-complexity analysis benefits from critique
        if (intent === 'analysis' && complexity === 'high') {
            return true;
        }

        // Explicit marking from classifier would override
        return false;
    }

    /**
     * Get the draft model for two-pass reasoning
     */
    getDraftModel(intent: TaskIntent): GroqModelId {
        // Draft is always creative/generative
        if (intent === 'reasoning') {
            return 'llama-3.3-70b-versatile'; // Even reasoning drafts use Llama for initial generation
        }
        return 'llama-3.3-70b-versatile';
    }

    /**
     * Get the critique model for two-pass reasoning
     */
    getCritiqueModel(complexity: ComplexityLevel): GroqModelId {
        // Critique uses Llama 3.3 due to DeepSeek unavailability
        return 'llama-3.3-70b-versatile';
    }

    /**
     * Get model display name for logging
     */
    getModelDisplayName(modelId: GroqModelId): string {
        const names: Record<GroqModelId, string> = {
            'llama-3.3-70b-versatile': 'Llama 3.3 70B',
            'llama-3.1-8b-instant': 'Llama 3.1 8B',
            'qwen/qwen3-32b': 'Qwen3 32B',
        };
        return names[modelId] || modelId;
    }
}

// Singleton instance
let routerInstance: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
    if (!routerInstance) {
        routerInstance = new ModelRouter();
    }
    return routerInstance;
}
