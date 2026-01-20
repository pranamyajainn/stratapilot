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
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Simple ideation handled by fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'mistral-saba-24b' },
            reasoning: 'Llama 3.3 excels at creative generation and human preference alignment',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'qwen/qwen3-32b' },
            reasoning: 'Complex creative tasks require Llama 3.3 full capability',
        },
    },

    // Summarization → Qwen3
    summarization: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Simple summaries handled efficiently by fast model',
        },
        medium: {
            models: { primary: 'qwen/qwen3-32b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Qwen3 has enhanced long-context understanding for summarization',
        },
        high: {
            models: { primary: 'qwen/qwen3-32b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Qwen3 optimal for compressing large documents',
        },
    },

    // Analysis → Llama 3.3 for narrative, DeepSeek only if highly structured
    analysis: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Basic analysis delegated to fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'mistral-saba-24b' },
            reasoning: 'Llama 3.3 for general analysis with narrative elements',
        },
        high: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Complex analysis uses Llama 3.3; fast fallback for simpler components',
        },
    },

    // Classification → Llama 3.1 8B (fastest)
    classification: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Classification optimized for speed with Llama 3.1 8B',
        },
        medium: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'mistral-saba-24b' },
            reasoning: 'Even medium classification uses fast model',
        },
        high: {
            models: { primary: 'mistral-saba-24b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Complex classification may need more capability',
        },
    },

    // Structured reasoning → DeepSeek
    reasoning: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Simple logic handled by fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 for structured reasoning tasks (DeepSeek deprecated)',
        },
        high: {
            models: { primary: 'deepseek-r1-distill-llama-70b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Full DeepSeek R1 70B for complex reasoning; Llama fallback',
        },
    },

    // Critique and validation → DeepSeek
    critique: {
        low: {
            models: { primary: 'llama-3.1-8b-instant', fallback: 'gemma2-9b-it' },
            reasoning: 'Simple validation delegated to fast model',
        },
        medium: {
            models: { primary: 'llama-3.3-70b-versatile', fallback: 'llama-3.1-8b-instant' },
            reasoning: 'Llama 3.3 for gap analysis and structured critique',
        },
        high: {
            models: { primary: 'deepseek-r1-distill-llama-70b', fallback: 'llama-3.3-70b-versatile' },
            reasoning: 'Full DeepSeek for rigorous validation; Llama fallback',
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

        if (priority === 'speed') {
            // Downgrade to faster models
            if (primary === 'deepseek-r1-distill-llama-70b') {
                primary = 'llama-3.3-70b-versatile';
                reasoning += ' (downgraded for speed)';
            } else if (primary === 'llama-3.3-70b-versatile' && complexity !== 'high') {
                primary = 'mistral-saba-24b';
                reasoning += ' (downgraded for speed)';
            }
        } else if (priority === 'cost') {
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
        // Critique always uses DeepSeek for structured validation
        if (complexity === 'high') {
            return 'deepseek-r1-distill-llama-70b';
        }
        return 'llama-3.3-70b-versatile'; // Use Llama for critique (DeepSeek 32B deprecated)
    }

    /**
     * Get model display name for logging
     */
    getModelDisplayName(modelId: GroqModelId): string {
        const names: Record<GroqModelId, string> = {
            'llama-3.3-70b-versatile': 'Llama 3.3 70B',
            'llama-3.1-8b-instant': 'Llama 3.1 8B',
            'deepseek-r1-distill-llama-70b': 'DeepSeek R1 70B',
            'deepseek-r1-distill-qwen-32b': 'DeepSeek R1 32B',
            'qwen/qwen3-32b': 'Qwen3 32B',
            'gemma2-9b-it': 'Gemma2 9B',
            'mistral-saba-24b': 'Mistral Saba 24B',
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
