/**
 * Groq Cloud API Client
 * OpenAI-compatible client for Groq Cloud with rate limit handling
 */

import OpenAI from 'openai';
import * as crypto from 'crypto';
import type { GroqModelId, LLMResponse, RequestProvenance } from './types.js';

// =====================================================
// CONFIGURATION
// =====================================================

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * API Key pool for rotation
 */
interface KeyPoolEntry {
    key: string;
    rateLimitedUntil: Date | null;
    usageToday: number;
    lastUsed: Date;
}

// =====================================================
// GROQ CLIENT
// =====================================================

export class GroqClient {
    private keyPool: KeyPoolEntry[] = [];
    private currentKeyIndex: number = 0;

    constructor() {
        this.initializeKeyPool();
    }

    /**
     * Initialize API key pool from environment variables
     */
    private initializeKeyPool(): void {
        const keys: string[] = [];

        // Support up to 3 API keys
        for (let i = 1; i <= 3; i++) {
            const key = process.env[`GROQ_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }

        // Fallback to single key
        if (keys.length === 0) {
            const singleKey = process.env.GROQ_API_KEY;
            if (singleKey) {
                keys.push(singleKey);
            }
        }

        if (keys.length === 0) {
            console.warn('[GroqClient] No GROQ_API_KEY found. Groq calls will fail.');
        }

        this.keyPool = keys.map(key => ({
            key,
            rateLimitedUntil: null,
            usageToday: 0,
            lastUsed: new Date(),
        }));

        console.log(`[GroqClient] Initialized with ${this.keyPool.length} API key(s)`);
    }

    /**
     * Get the next available API key, rotating if rate limited
     */
    private getAvailableKey(): KeyPoolEntry | null {
        const now = new Date();

        // Try current key first
        for (let i = 0; i < this.keyPool.length; i++) {
            const index = (this.currentKeyIndex + i) % this.keyPool.length;
            const entry = this.keyPool[index];

            // Check if rate limit has expired
            if (entry.rateLimitedUntil && entry.rateLimitedUntil > now) {
                continue;
            }

            // Clear expired rate limit
            if (entry.rateLimitedUntil && entry.rateLimitedUntil <= now) {
                entry.rateLimitedUntil = null;
            }

            this.currentKeyIndex = index;
            return entry;
        }

        return null;
    }

    /**
     * Mark a key as rate limited
     */
    private markRateLimited(entry: KeyPoolEntry, retryAfterSeconds: number = 60): void {
        entry.rateLimitedUntil = new Date(Date.now() + retryAfterSeconds * 1000);
        console.warn(`[GroqClient] Key rate limited until ${entry.rateLimitedUntil.toISOString()}`);
    }

    /**
     * Create an OpenAI client instance for the given key
     */
    private createClient(apiKey: string): OpenAI {
        return new OpenAI({
            apiKey,
            baseURL: GROQ_BASE_URL,
        });
    }

    /**
     * Generate a hash for provenance tracking
     */
    private hashContent(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Generate a unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Main chat completion method with provenance tracking
     */
    async chatCompletion<T = any>(
        modelId: GroqModelId,
        systemPrompt: string,
        userPrompt: string,
        options: {
            temperature?: number;
            maxTokens?: number;
            responseFormat?: 'json' | 'text';
        } = {}
    ): Promise<LLMResponse<T>> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        const promptHash = this.hashContent(systemPrompt + userPrompt);

        const keyEntry = this.getAvailableKey();
        if (!keyEntry) {
            return {
                success: false,
                error: 'All API keys are rate limited. Please wait and try again.',
                provenance: {
                    requestId,
                    modelId,
                    taskType: 'classification', // Will be updated by caller
                    promptHash,
                    outputHash: '',
                    inputTokens: 0,
                    outputTokens: 0,
                    latencyMs: Date.now() - startTime,
                },
            };
        }

        const client = this.createClient(keyEntry.key);

        try {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];

            const response = await client.chat.completions.create({
                model: modelId,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 4096,
                response_format: options.responseFormat === 'json'
                    ? { type: 'json_object' }
                    : undefined,
            });

            const content = response.choices[0]?.message?.content || '';
            const outputHash = this.hashContent(content);
            const latencyMs = Date.now() - startTime;

            // Update usage tracking
            keyEntry.usageToday++;
            keyEntry.lastUsed = new Date();

            // Parse JSON if requested
            let data: T;
            if (options.responseFormat === 'json') {
                try {
                    data = JSON.parse(content) as T;
                } catch (e) {
                    return {
                        success: false,
                        error: `Failed to parse JSON response: ${content.substring(0, 100)}...`,
                        provenance: {
                            requestId,
                            modelId,
                            taskType: 'classification',
                            promptHash,
                            outputHash,
                            inputTokens: response.usage?.prompt_tokens || 0,
                            outputTokens: response.usage?.completion_tokens || 0,
                            latencyMs,
                        },
                    };
                }
            } else {
                data = content as unknown as T;
            }

            console.log(`[GroqClient] ${modelId} completed in ${latencyMs}ms (${response.usage?.total_tokens || 0} tokens)`);

            return {
                success: true,
                data,
                provenance: {
                    requestId,
                    modelId,
                    taskType: 'classification', // Will be updated by caller
                    promptHash,
                    outputHash,
                    inputTokens: response.usage?.prompt_tokens || 0,
                    outputTokens: response.usage?.completion_tokens || 0,
                    latencyMs,
                },
            };

        } catch (error: any) {
            const latencyMs = Date.now() - startTime;

            // Handle rate limiting
            if (error?.status === 429 || error?.message?.includes('rate_limit')) {
                const retryAfter = parseInt(error?.headers?.['retry-after'] || '60', 10);
                this.markRateLimited(keyEntry, retryAfter);

                // Try with next key
                if (this.keyPool.length > 1) {
                    console.log('[GroqClient] Retrying with next key...');
                    return this.chatCompletion(modelId, systemPrompt, userPrompt, options);
                }

                return {
                    success: false,
                    error: 'LLM service temporarily unavailable due to high demand. Please try again in a few seconds.',
                    errorCode: 'RATE_LIMITED',
                    provenance: {
                        requestId,
                        modelId,
                        taskType: 'classification',
                        promptHash,
                        outputHash: '',
                        inputTokens: 0,
                        outputTokens: 0,
                        latencyMs,
                    },
                };
            }

            console.error(`[GroqClient] Error: ${error?.message || error}`);

            return {
                success: false,
                error: error?.message || 'Unknown error occurred',
                provenance: {
                    requestId,
                    modelId,
                    taskType: 'classification', // Will be updated by caller
                    promptHash,
                    outputHash: '',
                    inputTokens: 0,
                    outputTokens: 0,
                    latencyMs,
                },
            };
        }
    }

    /**
     * Get current key pool status (for monitoring)
     */
    getKeyPoolStatus(): { total: number; available: number; rateLimited: number } {
        const now = new Date();
        const rateLimited = this.keyPool.filter(
            k => k.rateLimitedUntil && k.rateLimitedUntil > now
        ).length;

        return {
            total: this.keyPool.length,
            available: this.keyPool.length - rateLimited,
            rateLimited,
        };
    }

    /**
     * Get daily usage statistics
     */
    getDailyUsage(): { totalRequests: number; perKey: number[] } {
        return {
            totalRequests: this.keyPool.reduce((sum, k) => sum + k.usageToday, 0),
            perKey: this.keyPool.map(k => k.usageToday),
        };
    }

    /**
     * Reset daily usage (call at midnight)
     */
    resetDailyUsage(): void {
        this.keyPool.forEach(k => {
            k.usageToday = 0;
        });
        console.log('[GroqClient] Daily usage reset');
    }
}

// Singleton instance
let groqClientInstance: GroqClient | null = null;

export function getGroqClient(): GroqClient {
    if (!groqClientInstance) {
        groqClientInstance = new GroqClient();
    }
    return groqClientInstance;
}
