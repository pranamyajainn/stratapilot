import { getMetaDb } from './metaDb.js';
import { SyncEngine } from './syncEngine.js';
import { SyncMode } from './types.js';

export class MetaScheduler {
    private engine: SyncEngine;
    private intervalId: NodeJS.Timeout | null = null;
    private CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every 1 hour

    constructor() {
        this.engine = new SyncEngine();
    }

    start() {
        if (this.intervalId) return;
        console.log('[META SCHEDULER] Started. Checking for due syncs...');
        this.checkAndRun();
        this.intervalId = setInterval(() => this.checkAndRun(), this.CHECK_INTERVAL_MS);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async checkAndRun() {
        try {
            const db = getMetaDb();
            // Find accounts enabled for sync where last_sync is null or > 24h ago
            // SQLite datetime('now', '-1 day') comparison
            const candidates = db.prepare(`
                SELECT * FROM ad_accounts 
                WHERE is_sync_enabled = 1 
                AND (last_synced_at IS NULL OR last_synced_at < datetime('now', '-1 day'))
            `).all() as any[];

            console.log(`[META SCHEDULER] Found ${candidates.length} accounts due for sync.`);

            for (const account of candidates) {
                console.log(`[META SCHEDULER] Triggering sync for ${account.name} (${account.id})`);
                const userId = account.linked_by_user_id;

                // For incremental sync, we fetch last 3 days to cover late attribution
                const dateStop = new Date().toISOString().split('T')[0];
                const startObj = new Date();
                startObj.setDate(startObj.getDate() - 3);
                const dateStart = startObj.toISOString().split('T')[0];

                try {
                    await this.engine.runSync(userId, account.id, SyncMode.SCHEDULED, dateStart, dateStop);
                } catch (err) {
                    console.error(`[META SCHEDULER] Failed sync for ${account.id}`, err);
                }
            }
        } catch (error) {
            console.error('[META SCHEDULER] Error during check loop', error);
        }
    }
}
