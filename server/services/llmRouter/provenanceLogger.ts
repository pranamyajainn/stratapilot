/**
 * Provenance Logger
 * Stores per-request metadata for evaluation and drift detection
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestProvenance, ModelStats, GroqModelId, TaskIntent } from './types.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// DATABASE SETUP
// =====================================================

const DB_PATH = path.join(__dirname, '..', '..', 'llm_provenance.db');

/**
 * Initialize the provenance database
 */
function initProvenanceDb(): Database.Database {
    const db = new Database(DB_PATH);

    db.exec(`
    CREATE TABLE IF NOT EXISTS llm_provenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      model_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      output_hash TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      quality_score REAL,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_provenance_model ON llm_provenance(model_id);
    CREATE INDEX IF NOT EXISTS idx_provenance_task ON llm_provenance(task_type);
    CREATE INDEX IF NOT EXISTS idx_provenance_created ON llm_provenance(created_at);
  `);

    console.log('[ProvenanceLogger] Database initialized at', DB_PATH);
    return db;
}

// =====================================================
// PROVENANCE LOGGER
// =====================================================

export class ProvenanceLogger {
    private db: Database.Database;
    private enabled: boolean;

    constructor() {
        this.enabled = process.env.LLM_LOGGING_ENABLED !== 'false';
        this.db = initProvenanceDb();
    }

    /**
     * Log a completed request
     */
    logRequest(provenance: Omit<RequestProvenance, 'createdAt'> & { error?: string }): void {
        if (!this.enabled) return;

        try {
            const stmt = this.db.prepare(`
        INSERT INTO llm_provenance 
        (request_id, model_id, task_type, prompt_hash, output_hash, input_tokens, output_tokens, latency_ms, quality_score, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            stmt.run(
                provenance.requestId,
                provenance.modelId,
                provenance.taskType,
                provenance.promptHash,
                provenance.outputHash,
                provenance.inputTokens,
                provenance.outputTokens,
                provenance.latencyMs,
                provenance.qualityScore ?? null,
                provenance.error ?? null
            );

        } catch (error) {
            console.error('[ProvenanceLogger] Failed to log request:', error);
            // Don't throw - logging should not break the request
        }
    }

    /**
     * Update quality score for a request (post-hoc evaluation)
     */
    updateQualityScore(requestId: string, score: number): void {
        if (!this.enabled) return;

        try {
            const stmt = this.db.prepare(`
        UPDATE llm_provenance SET quality_score = ? WHERE request_id = ?
      `);
            stmt.run(score, requestId);
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to update quality score:', error);
        }
    }

    /**
     * Get statistics for a specific model
     */
    getModelStats(modelId: GroqModelId, days: number = 7): ModelStats | null {
        try {
            const stmt = this.db.prepare(`
        SELECT 
          model_id,
          COUNT(*) as total_requests,
          AVG(latency_ms) as avg_latency,
          AVG(quality_score) as avg_quality,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate,
          MAX(created_at) as last_used
        FROM llm_provenance
        WHERE model_id = ? AND created_at > datetime('now', ?)
        GROUP BY model_id
      `);

            const row = stmt.get(modelId, `-${days} days`) as any;

            if (!row) return null;

            return {
                modelId: row.model_id,
                totalRequests: row.total_requests,
                averageLatencyMs: Math.round(row.avg_latency || 0),
                averageQualityScore: row.avg_quality || 0,
                errorRate: row.error_rate || 0,
                lastUsed: new Date(row.last_used),
            };
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to get model stats:', error);
            return null;
        }
    }

    /**
     * Get all model statistics
     */
    getAllModelStats(days: number = 7): ModelStats[] {
        try {
            const stmt = this.db.prepare(`
        SELECT 
          model_id,
          COUNT(*) as total_requests,
          AVG(latency_ms) as avg_latency,
          AVG(quality_score) as avg_quality,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate,
          MAX(created_at) as last_used
        FROM llm_provenance
        WHERE created_at > datetime('now', ?)
        GROUP BY model_id
        ORDER BY total_requests DESC
      `);

            const rows = stmt.all(`-${days} days`) as any[];

            return rows.map(row => ({
                modelId: row.model_id,
                totalRequests: row.total_requests,
                averageLatencyMs: Math.round(row.avg_latency || 0),
                averageQualityScore: row.avg_quality || 0,
                errorRate: row.error_rate || 0,
                lastUsed: new Date(row.last_used),
            }));
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to get all model stats:', error);
            return [];
        }
    }

    /**
     * Get task type distribution
     */
    getTaskDistribution(days: number = 7): Record<TaskIntent, number> {
        try {
            const stmt = this.db.prepare(`
        SELECT task_type, COUNT(*) as count
        FROM llm_provenance
        WHERE created_at > datetime('now', ?)
        GROUP BY task_type
      `);

            const rows = stmt.all(`-${days} days`) as any[];

            const distribution: Record<string, number> = {};
            rows.forEach(row => {
                distribution[row.task_type] = row.count;
            });

            return distribution as Record<TaskIntent, number>;
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to get task distribution:', error);
            return {} as Record<TaskIntent, number>;
        }
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(limit: number = 10): Array<{
        requestId: string;
        modelId: string;
        error: string;
        createdAt: Date;
    }> {
        try {
            const stmt = this.db.prepare(`
        SELECT request_id, model_id, error, created_at
        FROM llm_provenance
        WHERE error IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
      `);

            const rows = stmt.all(limit) as any[];

            return rows.map(row => ({
                requestId: row.request_id,
                modelId: row.model_id,
                error: row.error,
                createdAt: new Date(row.created_at),
            }));
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to get recent errors:', error);
            return [];
        }
    }

    /**
     * Detect potential drift by comparing recent vs historical performance
     */
    detectDrift(modelId: GroqModelId): {
        driftDetected: boolean;
        recentAvgLatency: number;
        historicalAvgLatency: number;
        latencyChange: number;
        recentErrorRate: number;
        historicalErrorRate: number;
    } | null {
        try {
            // Recent = last 24 hours
            const recentStmt = this.db.prepare(`
        SELECT 
          AVG(latency_ms) as avg_latency,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate
        FROM llm_provenance
        WHERE model_id = ? AND created_at > datetime('now', '-1 day')
      `);

            // Historical = last 30 days excluding last 24 hours
            const historicalStmt = this.db.prepare(`
        SELECT 
          AVG(latency_ms) as avg_latency,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate
        FROM llm_provenance
        WHERE model_id = ? 
          AND created_at > datetime('now', '-30 days')
          AND created_at <= datetime('now', '-1 day')
      `);

            const recent = recentStmt.get(modelId) as any;
            const historical = historicalStmt.get(modelId) as any;

            if (!recent?.avg_latency || !historical?.avg_latency) {
                return null; // Not enough data
            }

            const latencyChange = ((recent.avg_latency - historical.avg_latency) / historical.avg_latency) * 100;

            // Drift detected if latency increased by >20% or error rate doubled
            const driftDetected =
                latencyChange > 20 ||
                (recent.error_rate > 0 && recent.error_rate > historical.error_rate * 2);

            return {
                driftDetected,
                recentAvgLatency: Math.round(recent.avg_latency),
                historicalAvgLatency: Math.round(historical.avg_latency),
                latencyChange: Math.round(latencyChange),
                recentErrorRate: recent.error_rate || 0,
                historicalErrorRate: historical.error_rate || 0,
            };
        } catch (error) {
            console.error('[ProvenanceLogger] Failed to detect drift:', error);
            return null;
        }
    }

    /**
     * Generate hash for prompt or output
     */
    static hash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Get total request count
     */
    getTotalRequests(): number {
        try {
            const stmt = this.db.prepare('SELECT COUNT(*) as count FROM llm_provenance');
            const row = stmt.get() as any;
            return row?.count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
    }
}

// Singleton instance
let loggerInstance: ProvenanceLogger | null = null;

export function getProvenanceLogger(): ProvenanceLogger {
    if (!loggerInstance) {
        loggerInstance = new ProvenanceLogger();
    }
    return loggerInstance;
}
