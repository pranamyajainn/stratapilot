/**
 * Cost Governor
 * Manages daily budgets and prevents silent throttling
 */

import type { GroqModelId, CostBudget, CostDecision, MODEL_REGISTRY } from './types.js';

// =====================================================
// BUDGET CONFIGURATION
// =====================================================

interface BudgetConfig {
    low: number;     // Requests per day for low-cost models
    medium: number;  // Requests per day for medium-cost models
    high: number;    // Requests per day for high-cost models
}

/**
 * Model to cost class mapping
 */
const MODEL_COST_CLASS: Record<GroqModelId, 'low' | 'medium' | 'high'> = {
    'llama-3.1-8b-instant': 'low',
    'gemma2-9b-it': 'low',
    'mistral-saba-24b': 'low',
    'llama-3.3-70b-versatile': 'medium',
    'qwen/qwen3-32b': 'medium',
    'deepseek-r1-distill-qwen-32b': 'medium',
    'deepseek-r1-distill-llama-70b': 'high',
};

/**
 * Default downgrade paths when budget is low
 */
const DOWNGRADE_PATHS: Partial<Record<GroqModelId, GroqModelId>> = {
    'deepseek-r1-distill-llama-70b': 'deepseek-r1-distill-qwen-32b',
    'deepseek-r1-distill-qwen-32b': 'llama-3.3-70b-versatile',
    'llama-3.3-70b-versatile': 'mistral-saba-24b',
    'qwen/qwen3-32b': 'llama-3.1-8b-instant',
};

// =====================================================
// COST GOVERNOR
// =====================================================

export class CostGovernor {
    private usage: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
    };
    private budgets: BudgetConfig;
    private lastReset: Date;

    constructor() {
        this.budgets = this.loadBudgetsFromEnv();
        this.lastReset = new Date();
        this.lastReset.setHours(0, 0, 0, 0); // Start of today

        console.log('[CostGovernor] Initialized with budgets:', this.budgets);
    }

    /**
     * Load budget configuration from environment variables
     */
    private loadBudgetsFromEnv(): BudgetConfig {
        return {
            low: parseInt(process.env.LLM_DAILY_BUDGET_LOW || '10000', 10),
            medium: parseInt(process.env.LLM_DAILY_BUDGET_MEDIUM || '5000', 10),
            high: parseInt(process.env.LLM_DAILY_BUDGET_HIGH || '500', 10),
        };
    }

    /**
     * Check if a new day has started and reset usage
     */
    private checkAndResetDaily(): void {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        if (todayStart > this.lastReset) {
            console.log('[CostGovernor] New day detected, resetting usage counters');
            this.usage = { low: 0, medium: 0, high: 0 };
            this.lastReset = todayStart;
        }
    }

    /**
     * Check if a model request is allowed under current budget
     */
    checkBudget(modelId: GroqModelId): CostDecision {
        this.checkAndResetDaily();

        const costClass = MODEL_COST_CLASS[modelId];
        const currentUsage = this.usage[costClass];
        const limit = this.budgets[costClass];
        const remaining = limit - currentUsage;

        // Allow if within budget
        if (currentUsage < limit) {
            return {
                allowed: true,
                reason: `Budget available: ${remaining} requests remaining for ${costClass} tier`,
                remainingBudget: remaining,
            };
        }

        // Budget exceeded - suggest downgrade if available
        const downgrade = DOWNGRADE_PATHS[modelId];
        if (downgrade) {
            const downgradeCostClass = MODEL_COST_CLASS[downgrade];
            const downgradeRemaining = this.budgets[downgradeCostClass] - this.usage[downgradeCostClass];

            if (downgradeRemaining > 0) {
                return {
                    allowed: false,
                    reason: `Daily budget exceeded for ${costClass} tier (${limit} requests). Consider using ${downgrade} instead.`,
                    remainingBudget: 0,
                    suggestedDowngrade: downgrade,
                };
            }
        }

        // No budget and no downgrade available
        return {
            allowed: false,
            reason: `Daily budget exceeded for ${costClass} tier (${limit} requests). No downgrade available. Please wait until tomorrow.`,
            remainingBudget: 0,
        };
    }

    /**
     * Record a model usage
     */
    recordUsage(modelId: GroqModelId): void {
        this.checkAndResetDaily();

        const costClass = MODEL_COST_CLASS[modelId];
        this.usage[costClass]++;

        console.log(`[CostGovernor] Usage recorded: ${modelId} (${costClass}) - Total: ${this.usage[costClass]}/${this.budgets[costClass]}`);
    }

    /**
     * Get current usage statistics
     */
    getUsageStats(): {
        budgets: BudgetConfig;
        usage: Record<string, number>;
        remaining: Record<string, number>;
        percentUsed: Record<string, number>;
    } {
        this.checkAndResetDaily();

        const remaining: Record<string, number> = {};
        const percentUsed: Record<string, number> = {};

        for (const tier of ['low', 'medium', 'high'] as const) {
            remaining[tier] = Math.max(0, this.budgets[tier] - this.usage[tier]);
            percentUsed[tier] = Math.round((this.usage[tier] / this.budgets[tier]) * 100);
        }

        return {
            budgets: this.budgets,
            usage: { ...this.usage },
            remaining,
            percentUsed,
        };
    }

    /**
     * Get proactive warnings if budget is running low
     */
    getWarnings(): string[] {
        this.checkAndResetDaily();

        const warnings: string[] = [];

        for (const tier of ['low', 'medium', 'high'] as const) {
            const percentUsed = (this.usage[tier] / this.budgets[tier]) * 100;

            if (percentUsed >= 90) {
                warnings.push(`CRITICAL: ${tier} tier budget is ${percentUsed.toFixed(0)}% used`);
            } else if (percentUsed >= 75) {
                warnings.push(`WARNING: ${tier} tier budget is ${percentUsed.toFixed(0)}% used`);
            }
        }

        return warnings;
    }

    /**
     * Estimate if a request can be completed within budget
     * Returns false if likely to exceed mid-request
     */
    canCompleteRequest(
        modelId: GroqModelId,
        estimatedCalls: number = 1
    ): boolean {
        this.checkAndResetDaily();

        const costClass = MODEL_COST_CLASS[modelId];
        const projected = this.usage[costClass] + estimatedCalls;

        return projected <= this.budgets[costClass];
    }

    /**
     * Force reset (for testing or manual override)
     */
    forceReset(): void {
        this.usage = { low: 0, medium: 0, high: 0 };
        console.log('[CostGovernor] Usage force reset');
    }

    /**
     * Update budgets dynamically
     */
    updateBudgets(newBudgets: Partial<BudgetConfig>): void {
        this.budgets = { ...this.budgets, ...newBudgets };
        console.log('[CostGovernor] Budgets updated:', this.budgets);
    }
}

// Singleton instance
let governorInstance: CostGovernor | null = null;

export function getCostGovernor(): CostGovernor {
    if (!governorInstance) {
        governorInstance = new CostGovernor();
    }
    return governorInstance;
}
