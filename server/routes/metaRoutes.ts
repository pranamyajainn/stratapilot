import express from 'express';
import { TokenManager } from '../services/meta/tokenManager.js';
import { MetaService } from '../services/meta/metaService.js';
import { verifyToken } from '../services/metaAds.js';
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

// Verify & Connect (Direct Token Flow)
router.post('/meta/verify-access', async (req, res) => {
    try {
        const { token } = req.body;
        const userId = 'default_user'; // TODO: Get from session/auth middleware

        if (!token) return res.status(400).json({ error: 'Token is required' });

        // 1. Verify Token
        const verification = await verifyToken(token);

        // 2. Store User Token
        // Expiry logic: Long-lived tokens are ~60 days. Assume it's new or valid for at least 30 days.
        // We could fetch debug_token to get expiry, but for now, let's assume valid.
        TokenManager.storeUserToken(userId, token, 60 * 24 * 60 * 60);

        // 3. Store Ad Accounts
        const db = getMetaDb();
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO ad_accounts (id, account_id, name, currency, account_status, linked_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        // Note: verifyToken returns list of accounts from /me/adaccounts
        const insertTx = db.transaction((accs) => {
            for (const acc of accs) {
                // acc is like { id: 'act_123', account_id: '123', name: '...', ... }
                // We map to our schema
                stmt.run(acc.id, acc.account_id, acc.name, acc.currency, acc.account_status, userId);
            }
        });
        insertTx(verification.accounts);

        res.json({ success: true, accounts: verification.accounts });

    } catch (error: any) {
        console.error('Meta Verification Error:', error.message);
        res.status(403).json({ error: error.message });
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

// Status Endpoint
router.get('/auth/meta/status', (req, res) => {
    const userId = 'default_user';
    const db = getMetaDb();
    const row = db.prepare('SELECT * FROM authorized_users WHERE user_id = ?').get(userId) as any;

    if (!row) {
        return res.json({ hasToken: false });
    }

    const now = Math.floor(Date.now() / 1000);
    const isValid = row.token_expires_at ? row.token_expires_at > now : true;
    const daysRemaining = row.token_expires_at ? ((row.token_expires_at - now) / 86400).toFixed(1) : 'Unknown';

    res.json({
        hasToken: true,
        isValid,
        expiresAt: row.token_expires_at ? new Date(row.token_expires_at * 1000).toISOString() : 'Never',
        daysRemaining: `${daysRemaining} days`
    });
});

// GET /meta/context - Single Source of Truth for Frontend
router.get('/meta/context', (req, res) => {
    const userId = 'default_user';
    const db = getMetaDb();

    // 1. Check Auth
    const tokenRow = db.prepare('SELECT access_token FROM authorized_users WHERE user_id = ?').get(userId) as any;
    const isConnected = !!tokenRow?.access_token;

    if (!isConnected) {
        return res.json({
            connection: {
                isConnected: false,
                accounts: []
            }
        });
    }

    // 2. Get Accounts & Status
    const accounts = db.prepare(`
        SELECT id, account_id, name, last_fetch_status, last_fetch_at 
        FROM ad_accounts 
        WHERE linked_by_user_id = ?
    `).all(userId);

    // 3. Determine Aggregate Status
    // If any account has SUCCESS_WITH_DATA -> SUCCESS_WITH_DATA
    // Else if any has SUCCESS_NO_DATA -> SUCCESS_NO_DATA
    // Else -> UNKNOWN/FAILED

    // Actually, let's just return the accounts and let frontend decide, 
    // OR return a summary 'last_fetch_status' for the connection badge.

    // Let's pick the "best" status.
    let aggregateStatus = 'FAILED';
    if (accounts.some((a: any) => a.last_fetch_status === 'SUCCESS_WITH_DATA')) {
        aggregateStatus = 'SUCCESS_WITH_DATA';
    } else if (accounts.some((a: any) => a.last_fetch_status === 'SUCCESS_NO_DATA')) {
        aggregateStatus = 'SUCCESS_NO_DATA';
    } else if (accounts.length > 0) {
        // Connected but no fetch yet
        aggregateStatus = 'PENDING';
    }

    res.json({
        connection: {
            isConnected: true,
            aggregateStatus,
            accounts
        }
    });
});

router.post('/meta/disconnect', (req, res) => {
    const userId = 'default_user';
    TokenManager.deleteToken(userId);
    // Optionally clear ad accounts linked to this user
    // db.prepare('DELETE FROM ad_accounts WHERE linked_by_user_id = ?').run(userId);
    res.json({ success: true });
});

export default router;
