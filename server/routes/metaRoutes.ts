import express from 'express';
import { TokenManager } from '../services/meta/tokenManager.js';
import { MetaService } from '../services/meta/metaService.js';
import { SyncEngine } from '../services/meta/syncEngine.js';
import { SyncMode } from '../services/meta/types.js';
import { getMetaDb } from '../services/meta/metaDb.js';

const router = express.Router();
let syncEngine: SyncEngine | null = null;

const getSyncEngine = () => {
    if (!syncEngine) {
        syncEngine = new SyncEngine();
    }
    return syncEngine;
};

// -- AUTH --

router.get('/auth/meta/login', (req, res) => {
    if (process.env.USE_MOCK_DATA === 'true') {
        // Redirect directly to callback with a fake code
        return res.redirect('/api/auth/meta/callback?code=mock_auth_code_123');
    }
    const url = TokenManager.getAuthUrl();
    res.redirect(url);
});

router.get('/auth/meta/callback', async (req, res) => {
    const code = req.query.code as string;
    const userId = 'default_user'; // TODO: Get from session/auth middleware

    if (process.env.USE_MOCK_DATA === 'true' && code === 'mock_auth_code_123') {
        // Mock success flow
        const appUrl = process.env.APP_URL || 'http://localhost:5173'; // Frontend URL needs to be correct. Usually 5173 for Vite dev
        // In server.ts the appUrl default was 3000 but the frontend is on 5173? 
        // The previous code had 3000. Let's use what the user likely has or config.
        // The user request context shows "http://localhost:5173/?ga4=success" in ga4Routes.
        // So I should use 5173 for postMessage targetOrigin.

        // Also simulate storing token
        TokenManager.storeUserToken(userId, 'mock_access_token', 3600);

        // Link mock account
        const db = getMetaDb();
        db.prepare(`
            INSERT OR REPLACE INTO ad_accounts (id, account_id, name, currency, timezone_name, timezone_id, account_status, disable_reason, linked_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('act_mock_123', 'mock_123', 'Mock Ad Account (US)', 'USD', 'America/Los_Angeles', 1, 1, 0, userId);

        return res.send(`
            <script>
                window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '*'); // Allow * for dev convenience or 'http://localhost:5173'
                window.close();
            </script>
            <h1>Connected (Mock Mode)!</h1>
        `);
    }

    if (!code) return res.status(400).send('No code provided');

    try {
        // Exchange Code
        const tokenData = await TokenManager.exchangeCodeForToken(code);

        // Upgrade to Long-Lived
        const longToken = await TokenManager.getLongLivedToken(tokenData.access_token);

        // Store
        TokenManager.storeUserToken(userId, longToken, tokenData.expires_in);

        // Discover Ad Accounts immediately
        const service = new MetaService(longToken);
        const accounts = await service.getAdAccounts();

        const db = getMetaDb();
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO ad_accounts (id, account_id, name, currency, timezone_name, timezone_id, account_status, disable_reason, linked_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertTx = db.transaction((accs) => {
            for (const acc of accs) {
                stmt.run(acc.id, acc.account_id, acc.name, acc.currency, acc.timezone_name, acc.timezone_id, acc.account_status, acc.disable_reason, userId);
            }
        });
        insertTx(accounts);

        // Send success page that closes itself
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        res.send(`
            <script>
                window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '${appUrl}');
                window.close();
            </script>
            <h1>Connected!</h1>
        `);

    } catch (error) {
        console.error('Meta Callback Error:', error);
        res.status(500).send('Authentication failed');
    }
});

// -- API --

// Middleware to ensure token validity?
// For now, assume 'default_user' has token if this is called.

router.get('/meta/adaccounts', (req, res) => {
    const userId = 'default_user'; // TODO
    const db = getMetaDb();

    // Check if we have a token first
    const token = TokenManager.getAccessToken(userId);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Not connected to Meta' });
    }

    const accounts = db.prepare('SELECT * FROM ad_accounts WHERE linked_by_user_id = ?').all(userId);
    res.json({ success: true, data: accounts });
});

router.post('/meta/consents', (req, res) => {
    const { accountId, allowSpend, allowConversions } = req.body;
    const db = getMetaDb();

    // Validations...

    const stmt = db.prepare(`
        INSERT OR REPLACE INTO consents (account_id, allow_spend, allow_conversions, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(accountId, allowSpend ? 1 : 0, allowConversions ? 1 : 0);

    res.json({ success: true });
});

router.post('/meta/sync/on-demand', async (req, res) => {
    const { accountId, dateStart, dateStop } = req.body;
    const userId = 'default_user'; // TODO

    if (!accountId || !dateStart || !dateStop) {
        return res.status(400).json({ error: 'Missing required params' });
    }

    try {
        const runId = await getSyncEngine().runSync(userId, accountId, SyncMode.ON_DEMAND, dateStart, dateStop);
        res.json({ success: true, runId });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/meta/sync/schedule', (req, res) => {
    const { accountId, enabled } = req.body;
    const db = getMetaDb();

    // Toggle sync
    const stmt = db.prepare('UPDATE ad_accounts SET is_sync_enabled = ? WHERE id = ?');
    const result = stmt.run(enabled ? 1 : 0, accountId);

    if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({ success: true, enabled: !!enabled });
});

router.post('/meta/sync/backfill', async (req, res) => {
    const { accountId, days = 30 } = req.body;
    const userId = 'default_user';

    try {
        const dateStop = new Date().toISOString().split('T')[0];
        const dateStartObj = new Date();
        dateStartObj.setDate(dateStartObj.getDate() - days);
        const dateStart = dateStartObj.toISOString().split('T')[0];

        const runId = await getSyncEngine().runSync(userId, accountId, SyncMode.BACKFILL, dateStart, dateStop);

        res.json({ success: true, runId });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/meta/sync/runs/:id', (req, res) => {
    const db = getMetaDb();
    const row = db.prepare('SELECT * FROM sync_runs WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: row });
});

router.post('/meta/disconnect', (req, res) => {
    const userId = 'default_user';
    TokenManager.deleteToken(userId);
    // Optionally clear ad accounts linked to this user
    // db.prepare('DELETE FROM ad_accounts WHERE linked_by_user_id = ?').run(userId);
    res.json({ success: true });
});

export default router;
