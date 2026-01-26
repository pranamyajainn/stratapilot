import { v4 as uuidv4 } from 'uuid';
import { getMetaDb } from './metaDb.js';
import { MetaService } from './metaService.js';
import { TokenManager } from './tokenManager.js';
import { SyncMode, SyncRun } from './types.js';

export class SyncEngine {
    private db = getMetaDb();

    // Helper to get allowed insight fields based on consent
    private getAllowedFields(accountId: string): string {
        const row = this.db.prepare('SELECT allow_spend, allow_conversions FROM consents WHERE account_id = ?').get(accountId) as any;
        const allowSpend = row?.allow_spend === 1;
        const allowConversions = row?.allow_conversions === 1;

        const baseFields = [
            'account_id', 'campaign_id', 'adset_id', 'ad_id',
            'impressions', 'reach', 'frequency', 'clicks', 'unique_clicks', 'ctr',
            'inline_link_clicks', 'landing_page_views',
            'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_100_watched_actions',
            'video_3_sec_watched_actions', 'video_avg_time_watched_actions'
        ];

        if (allowSpend) {
            baseFields.push('spend', 'cpc', 'cpm');
        }

        if (allowConversions) {
            baseFields.push('actions', 'action_values'); // 'actions' contains purchase/lead events
        }

        return baseFields.join(',');
    }

    private async recordSyncStart(accountId: string, mode: SyncMode, params: any): Promise<string> {
        const id = uuidv4();
        const stmt = this.db.prepare(`
            INSERT INTO sync_runs (id, account_id, mode, status, started_at, params_json)
            VALUES (?, ?, ?, 'PENDING', ?, ?)
        `);
        stmt.run(id, accountId, mode, new Date().toISOString(), JSON.stringify(params));
        return id;
    }

    private updateSyncStatus(id: string, status: string, error?: string, records?: number) {
        const updates: string[] = ['status = ?'];
        const args: any[] = [status];

        if (status === 'COMPLETED' || status === 'FAILED') {
            updates.push('finished_at = ?');
            args.push(new Date().toISOString());
        }

        if (error) {
            updates.push('error_message = ?');
            args.push(error);
        }

        if (records !== undefined) {
            updates.push('records_processed = ?');
            args.push(records);
        }

        args.push(id); // Where ID

        const stmt = this.db.prepare(`UPDATE sync_runs SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...args);
    }

    // --- MAIN SYNC FUNCTION ---

    async runSync(userId: string, accountId: string, mode: SyncMode, dateStart: string, dateStop: string): Promise<string> {
        const runId = await this.recordSyncStart(accountId, mode, { dateStart, dateStop, userId });

        // Run async (fire and forget from API perspective, but here we await inside the wrapper if called directly? 
        // Usually better to not await if triggered by HTTP to avoid timeout. 
        // But for "On-Demand" usually the user waits or polls. Let's make this async execution.)

        this.executeSync(runId, userId, accountId, dateStart, dateStop).catch(err => {
            console.error(`[SYNC FAILED] Run ${runId}:`, err);
            this.updateSyncStatus(runId, 'FAILED', err.message);
        });

        return runId;
    }

    protected createService(token: string): MetaService {

        return new MetaService(token);
    }

    private async executeSync(runId: string, userId: string, accountIdReal: string, dateStart: string, dateStop: string) {
        try {
            this.updateSyncStatus(runId, 'IN_PROGRESS');

            // 1. Get Token
            const token = TokenManager.getAccessToken(userId);
            if (!token) throw new Error('No access token found for user');

            const service = this.createService(token);

            // 2. Get Account DB ID (act_{id}) to ensure we map correctly
            // The argument accountIdReal is likely "act_123" or just "123". 
            // The DB stores "act_123" in `id` column.
            const accountId = accountIdReal.startsWith('act_') ? accountIdReal : `act_${accountIdReal}`;

            // 3. Sync Entities (Hierarchy)
            // Campaigns
            const campaigns = await service.getCampaigns(accountId);
            const campStmt = this.db.prepare(`
                INSERT OR REPLACE INTO campaigns (id, account_id, name, status, objective, start_time, stop_time, effective_status, updated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertManyCamps = this.db.transaction((rows: any[]) => {
                for (const row of rows) campStmt.run(row.id, accountId, row.name, row.status, row.objective, row.start_time, row.stop_time, row.effective_status, row.updated_time);
            });
            insertManyCamps(campaigns);

            // AdSets
            const adSets = await service.getAdSets(accountId);
            const adSetStmt = this.db.prepare(`
                INSERT OR REPLACE INTO ad_sets (id, account_id, campaign_id, name, status, optimization_goal, start_time, end_time, updated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertManyAdSets = this.db.transaction((rows: any[]) => {
                for (const row of rows) adSetStmt.run(row.id, accountId, row.campaign_id, row.name, row.status, row.optimization_goal, row.start_time, row.end_time, row.updated_time);
            });
            insertManyAdSets(adSets);

            // Ads
            const ads = await service.getAds(accountId);
            const adStmt = this.db.prepare(`
                INSERT OR REPLACE INTO ads (id, account_id, campaign_id, adset_id, name, status, creative_id, updated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertManyAds = this.db.transaction((rows: any[]) => {
                for (const row of rows) adStmt.run(row.id, accountId, row.campaign_id, row.adset_id, row.name, row.status, row.creative?.id, row.updated_time);
            });
            insertManyAds(ads);

            // 4. Sync Creatives
            // Collect unique creative IDs from ads
            const creativeIds = [...new Set(ads.map(ad => ad.creative?.id).filter(Boolean))];

            // Optimization: Filter out creatives we already have
            const existingCreatives = this.db.prepare(`
                SELECT id FROM ad_creatives WHERE id IN (${creativeIds.map(() => '?').join(',')})
            `).all(creativeIds) as { id: string }[];

            const existingIds = new Set(existingCreatives.map(c => c.id));
            const newCreativeIds = creativeIds.filter(id => !existingIds.has(id));

            console.log(`[SYNC] Found ${creativeIds.length} creatives. Fetching ${newCreativeIds.length} new.`);

            const creativeStmt = this.db.prepare(`
                INSERT OR REPLACE INTO ad_creatives (id, account_id, name, object_type, thumbnail_url, image_url, video_id, title, body, call_to_action_type, link_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            // Limit concurrency for creative fetching
            const chunkSize = 5;
            for (let i = 0; i < newCreativeIds.length; i += chunkSize) {
                const chunk = newCreativeIds.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (cid) => {
                    try {
                        const c = await service.getCreativeDetails(cid);
                        creativeStmt.run(c.id, accountId, c.name, c.object_type, c.thumbnail_url, c.image_url, c.video_id, c.title, c.body, c.call_to_action_type, c.link_url);
                    } catch (e) {
                        console.warn(`Failed to fetch creative ${cid}`, e);
                    }
                }));
            }

            // 5. Sync Insights
            const allowedFields = this.getAllowedFields(accountId);
            const insights = await service.getInsights(accountId, 'ad', dateStart, dateStop, allowedFields);

            const insightStmt = this.db.prepare(`
                INSERT OR REPLACE INTO insights_daily 
                (id, scope_level, scope_id, account_id, date_start, date_stop, impressions, spend, reach, frequency, clicks, unique_clicks, ctr, cpc, cpm, inline_link_clicks, landing_page_views, actions_json, conversions_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertManyInsights = this.db.transaction((rows: any[]) => {
                for (const row of rows) {
                    const id = `ad_${row.ad_id}_${row.date_start}`;
                    insightStmt.run(
                        id,
                        'ad',
                        row.ad_id,
                        row.account_id ? `act_${row.account_id}` : accountId,
                        row.date_start,
                        row.date_stop,
                        row.impressions || 0,
                        row.spend || 0,
                        row.reach || 0,
                        row.frequency || 0,
                        row.clicks || 0,
                        row.unique_clicks || 0,
                        row.ctr || 0,
                        row.cpc || 0,
                        row.cpm || 0,
                        row.inline_link_clicks || 0,
                        row.landing_page_views || 0,
                        JSON.stringify(row.actions || []),
                        JSON.stringify(row.actions || []) // Storing same actions in conversions_json for now, logic to filter "conversions" can be app-side
                    );
                }
            });
            insertManyInsights(insights);

            // Update Account "last_synced_at"
            this.db.prepare('UPDATE ad_accounts SET last_synced_at = ? WHERE id = ?').run(new Date().toISOString(), accountId);

            this.updateSyncStatus(runId, 'COMPLETED', undefined, insights.length);

        } catch (error: any) {
            console.error('Sync execution failed:', error);
            throw error; // Caught by caller
        }
    }
}
