import { SyncEngine } from '../server/services/meta/syncEngine.js';
import { MetaService } from '../server/services/meta/metaService.js';
import { initMetaDatabase, getMetaDb } from '../server/services/meta/metaDb.js';
import { TokenManager } from '../server/services/meta/tokenManager.js';
import { SyncMode, Campaign, AdSet, Ad, AdCreative, InsightDaily } from '../server/services/meta/types.js';

// --- MOCK SERVICE ---
class MockMetaService extends MetaService {
    async getCampaigns(accountId: string): Promise<Campaign[]> {
        return [{
            id: 'camp_1', name: 'Test Campaign', status: 'ACTIVE', objective: 'CONVERSIONS',
            effective_status: 'ACTIVE', updated_time: new Date().toISOString()
        } as Campaign];
    }

    async getAdSets(accountId: string): Promise<AdSet[]> {
        return [{
            id: 'adset_1', campaign_id: 'camp_1', name: 'Test AdSet', status: 'ACTIVE',
            optimization_goal: 'OFFSITE_CONVERSIONS', updated_time: new Date().toISOString()
        } as AdSet];
    }

    async getAds(accountId: string): Promise<Ad[]> {
        return [{
            id: 'ad_1', adset_id: 'adset_1', campaign_id: 'camp_1', name: 'Test Ad', status: 'ACTIVE',
            creative: { id: 'creative_1' }, updated_time: new Date().toISOString()
        } as Ad];
    }

    async getCreativeDetails(creativeId: string): Promise<AdCreative> {
        return {
            id: creativeId, name: 'Test Creative', object_type: 'SHARE',
            title: 'Great Ad', body: 'Buy now'
        } as AdCreative;
    }

    async getInsights(objId: string, level: string, start: string, stop: string): Promise<InsightDaily[]> {
        return [{
            date_start: start, date_stop: stop,
            account_id: '123', campaign_id: 'camp_1', adset_id: 'adset_1', ad_id: 'ad_1',
            impressions: '1000', spend: '10.50', clicks: '50'
        } as InsightDaily];
    }
}

// --- MOCK ENGINE ---
class TestSyncEngine extends SyncEngine {
    protected createService(token: string): MetaService {
        console.log('Creating MockMetaService...');
        return new MockMetaService(token);
    }
}

// --- MAIN TEST ---
async function runTest() {
    console.log('Initializing DB...');
    initMetaDatabase();

    const db = getMetaDb();

    // Setup User & Token
    console.log('Setting up test user...');
    TokenManager.storeUserToken('test_user', 'fake_token_123', 3600);

    // Setup Account
    db.prepare(`
        INSERT OR REPLACE INTO ad_accounts (id, account_id, name, linked_by_user_id) 
        VALUES ('act_123', '123', 'Test Account', 'test_user')
    `).run();

    // Grant Consents (so we fetch spend)
    db.prepare(`
        INSERT OR REPLACE INTO consents (account_id, allow_spend, allow_conversions)
        VALUES ('act_123', 1, 1)
    `).run();

    console.log('Running Sync...');
    const engine = new TestSyncEngine();
    const runId = await engine.runSync('test_user', 'act_123', SyncMode.ON_DEMAND, '2023-01-01', '2023-01-01');

    console.log('Sync triggered, Run ID:', runId);

    // Wait for async execution
    await new Promise(r => setTimeout(r, 2000));

    // Verify
    const run = db.prepare('SELECT * FROM sync_runs WHERE id = ?').get(runId) as any;
    console.log('Sync Run Status:', run.status);
    console.log('Records Processed:', run.records_processed);

    if (run.status !== 'COMPLETED') {
        console.error('Test Failed: Sync did not complete.', run.error_message);
        process.exit(1);
    }

    const camps = db.prepare('SELECT * FROM campaigns').all();
    console.log('Campaigns synced:', camps.length);

    const insights = db.prepare('SELECT * FROM insights_daily').all();
    console.log('Insights synced:', insights.length);
    console.log('Insight Spend:', insights[0]?.spend);

    if (camps.length === 1 && insights.length === 1 && insights[0].spend === 10.5) {
        console.log('TEST PASSED');
    } else {
        console.error('TEST FAILED: Data mismatch');
        process.exit(1);
    }
}

runTest().catch(console.error);
