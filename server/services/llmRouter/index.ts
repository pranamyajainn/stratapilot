/**
 * LLM Orchestrator
 * Unified interface combining all routing, governance, and logging components
 * Implements the multi-LLM architecture with two-pass reasoning
 */

import { getGroqClient, GroqClient } from './groqClient.js';
import { getIntentClassifier, IntentClassifier } from './intentClassifier.js';
import { getCostGovernor, CostGovernor } from './costGovernor.js';
import { getModelRouter, ModelRouter } from './modelRouter.js';
import { getProvenanceLogger, ProvenanceLogger } from './provenanceLogger.js';
import type {
    TaskIntent,
    ClassificationResult,
    RouterDecision,
    LLMResponse,
    TwoPassResponse,
    GroqModelId,
    VisualFeatures
} from './types.js';

// =====================================================
// ORCHESTRATOR PROMPTS
// =====================================================

const CRITIQUE_SYSTEM_PROMPT = `You are a critical reviewer validating AI-generated content for quality and completeness.

Analyze the provided draft and output a JSON evaluation:
{
  "validationPassed": <boolean>,
  "rigorScore": <1-100>,
  "gaps": ["list of identified gaps or issues"],
  "suggestions": ["specific improvement suggestions"],
  "logicalFlaws": ["any logical inconsistencies found"],
  "overallAssessment": "<brief overall assessment>"
}

Be thorough but fair. Flag real issues, not nitpicks.`;

// =====================================================
// LLM ORCHESTRATOR
// =====================================================

export class LLMOrchestrator {
    private groqClient: GroqClient;
    private classifier: IntentClassifier;
    private costGovernor: CostGovernor;
    private router: ModelRouter;
    private logger: ProvenanceLogger;
    private twoPassEnabled: boolean;

    constructor() {
        this.groqClient = getGroqClient();
        this.classifier = getIntentClassifier();
        this.costGovernor = getCostGovernor();
        this.router = getModelRouter();
        this.logger = getProvenanceLogger();
        this.twoPassEnabled = process.env.LLM_TWO_PASS_ENABLED !== 'false';

        console.log('[LLMOrchestrator] Initialized');
        console.log(`[LLMOrchestrator] Two-pass reasoning: ${this.twoPassEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Main entry point for text-based LLM requests
     * Handles classification, routing, cost governance, and logging
     */
    async process<T = any>(
        systemPrompt: string,
        userPrompt: string,
        options: {
            taskType?: TaskIntent;           // Override auto-classification
            priority?: 'speed' | 'quality' | 'cost';
            isClientFacing?: boolean;        // Forces two-pass
            isStrategyRequest?: boolean;     // Forces two-pass
            responseFormat?: 'json' | 'text';
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<LLMResponse<T>> {
        const startTime = Date.now();

        // Stage 0: Classify intent (or use override)
        let classification: ClassificationResult;
        if (options.taskType) {
            classification = {
                intent: options.taskType,
                complexity: 'medium',
                estimatedTokens: Math.ceil(userPrompt.length / 4),
                confidence: 1.0,
                requiresTwoPass: options.isClientFacing || options.isStrategyRequest || false,
            };
        } else {
            classification = await this.classifier.classify(userPrompt, {
                isStrategyRequest: options.isStrategyRequest,
                isClientFacing: options.isClientFacing,
            });
        }

        console.log(`[LLMOrchestrator] Classified: ${classification.intent} (${classification.complexity}), two-pass: ${classification.requiresTwoPass}`);

        // Stage 1: Route to model
        const routingDecision = this.router.route({
            intent: classification.intent,
            complexity: classification.complexity,
            inputTokens: classification.estimatedTokens,
            priority: options.priority || 'quality',
            hasMedia: false,
        });

        console.log(`[LLMOrchestrator] Routing to: ${this.router.getModelDisplayName(routingDecision.primary)}`);

        // Stage 2: Check cost budget
        const costCheck = this.costGovernor.checkBudget(routingDecision.primary);

        let selectedModel = routingDecision.primary;
        if (!costCheck.allowed) {
            if (costCheck.suggestedDowngrade) {
                console.warn(`[LLMOrchestrator] Budget exceeded, downgrading to ${costCheck.suggestedDowngrade}`);
                selectedModel = costCheck.suggestedDowngrade;
            } else {
                // Return budget exceeded error
                return {
                    success: false,
                    error: costCheck.reason,
                    provenance: {
                        requestId: `budget_${Date.now()}`,
                        modelId: routingDecision.primary,
                        taskType: classification.intent,
                        promptHash: '',
                        outputHash: '',
                        inputTokens: 0,
                        outputTokens: 0,
                        latencyMs: Date.now() - startTime,
                    },
                };
            }
        }

        // Stage 3: Execute (single pass or two-pass)
        let response: LLMResponse<T>;

        if (this.twoPassEnabled && classification.requiresTwoPass) {
            const twoPassResult = await this.executeTwoPass<T>(
                systemPrompt,
                userPrompt,
                classification,
                options
            );
            response = {
                success: twoPassResult.draft.success,
                data: twoPassResult.merged,
                provenance: twoPassResult.draft.provenance,
            };
        } else {
            response = await this.groqClient.chatCompletion<T>(
                selectedModel,
                systemPrompt,
                userPrompt,
                {
                    temperature: options.temperature,
                    maxTokens: options.maxTokens,
                    responseFormat: options.responseFormat,
                }
            );
        }

        // Stage 4: Record usage and log provenance
        if (response.success) {
            this.costGovernor.recordUsage(selectedModel);
        }

        this.logger.logRequest({
            ...response.provenance,
            taskType: classification.intent,
            error: response.success ? undefined : response.error,
        });

        return response;
    }

    /**
     * Execute two-pass reasoning: Draft (Llama 3.3) → Critique (DeepSeek)
     */
    private async executeTwoPass<T>(
        systemPrompt: string,
        userPrompt: string,
        classification: ClassificationResult,
        options: {
            responseFormat?: 'json' | 'text';
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<TwoPassResponse<T>> {
        console.log('[LLMOrchestrator] Executing two-pass reasoning...');

        // Draft pass: Llama 3.3 generates initial response
        const draftModel = this.router.getDraftModel(classification.intent);
        const draft = await this.groqClient.chatCompletion<T>(
            draftModel,
            systemPrompt,
            userPrompt,
            {
                temperature: options.temperature ?? 0.3,
                maxTokens: options.maxTokens,
                responseFormat: options.responseFormat,
            }
        );

        this.costGovernor.recordUsage(draftModel);

        if (!draft.success || !draft.data) {
            return {
                draft,
                merged: draft.data as T,
            };
        }

        // Critique pass: DeepSeek validates and scores
        const critiqueModel = this.router.getCritiqueModel(classification.complexity);

        const critiquePrompt = `Review this draft output for quality, completeness, and logical consistency:

DRAFT OUTPUT:
${typeof draft.data === 'string' ? draft.data : JSON.stringify(draft.data, null, 2)}

ORIGINAL REQUEST:
${userPrompt.substring(0, 1000)}`;

        const critique = await this.groqClient.chatCompletion<{
            validationPassed: boolean;
            gaps: string[];
            rigorScore: number;
            suggestions: string[];
        }>(
            critiqueModel,
            CRITIQUE_SYSTEM_PROMPT,
            critiquePrompt,
            {
                temperature: 0.1,
                maxTokens: 1024,
                responseFormat: 'json',
            }
        );

        this.costGovernor.recordUsage(critiqueModel);

        console.log(`[LLMOrchestrator] Critique complete: rigor=${critique.data?.rigorScore}, passed=${critique.data?.validationPassed}`);

        // For now, return the draft (merging logic can be enhanced)
        // In production, you might want to re-run if validation fails
        return {
            draft,
            critique,
            merged: draft.data,
        };
    }

    /**
     * Quick classification shortcut (uses fast model)
     */
    async classify<T = string>(
        prompt: string,
        options?: { responseFormat?: 'json' | 'text' }
    ): Promise<LLMResponse<T>> {
        return this.process<T>(
            'You are a classifier. Respond concisely.',
            prompt,
            {
                taskType: 'classification',
                priority: 'speed',
                ...options,
            }
        );
    }

    /**
     * Summarization shortcut (uses Qwen3)
     */
    async summarize(content: string, maxLength?: number): Promise<LLMResponse<string>> {
        const systemPrompt = maxLength
            ? `Summarize the following content in ${maxLength} words or less.`
            : 'Provide a concise summary of the following content.';

        return this.process<string>(
            systemPrompt,
            content,
            {
                taskType: 'summarization',
                priority: 'quality',
            }
        );
    }

    /**
     * Strategy/ideation shortcut (uses Llama 3.3 with two-pass)
     */
    async generateStrategy<T = any>(
        systemPrompt: string,
        context: string,
        options?: { responseFormat?: 'json' | 'text' }
    ): Promise<LLMResponse<T>> {
        return this.process<T>(
            systemPrompt,
            context,
            {
                taskType: 'ideation',
                isStrategyRequest: true,
                priority: 'quality',
                ...options,
            }
        );
    }

    /**
     * Structured analysis shortcut
     */
    async analyzeStructured<T = any>(
        systemPrompt: string,
        content: string,
        schema?: object
    ): Promise<LLMResponse<T>> {
        return this.process<T>(
            systemPrompt,
            content,
            {
                taskType: 'analysis',
                priority: 'quality',
                responseFormat: 'json',
            }
        );
    }

    /**
     * Get current system statistics
     */
    getStats(): {
        keyPool: { total: number; available: number; rateLimited: number };
        usage: { totalRequests: number; perKey: number[] };
        costBudgets: ReturnType<CostGovernor['getUsageStats']>;
        modelStats: ReturnType<ProvenanceLogger['getAllModelStats']>;
        warnings: string[];
    } {
        return {
            keyPool: this.groqClient.getKeyPoolStatus(),
            usage: this.groqClient.getDailyUsage(),
            costBudgets: this.costGovernor.getUsageStats(),
            modelStats: this.logger.getAllModelStats(),
            warnings: this.costGovernor.getWarnings(),
        };
    }
}

// Singleton instance
let orchestratorInstance: LLMOrchestrator | null = null;

export function getLLMOrchestrator(): LLMOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new LLMOrchestrator();
    }
    return orchestratorInstance;
}
