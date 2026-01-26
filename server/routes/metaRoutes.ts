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
    const state = TokenManager.generateState();

    // Store state in a secure, httpOnly cookie (valid for 5 mins)
    res.cookie('meta_auth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000
    });

    const url = TokenManager.getAuthUrl(state);
    res.redirect(url);
});

router.get('/auth/meta/callback', async (req, res) => {
    const code = req.query.code as string;
    const receivedState = req.query.state as string;
    const storedState = req.cookies?.meta_auth_state;
    const userId = 'default_user'; // TODO: Get from session/auth middleware

    // Clear state cookie
    res.clearCookie('meta_auth_state');

    // AUTH VALIDATION
    if (!code) return res.status(400).send('No code provided');

    if (!receivedState || !storedState || !TokenManager.validateState(receivedState, storedState)) {
        console.error('[META AUTH] CSRF Warning: State mismatch or missing');
        return res.status(403).send('Security check failed (CSRF)');
    }

    try {
        // Exchange Code
        const tokenData = await TokenManager.exchangeCodeForToken(code);

        // Upgrade to Long-Lived
        const longToken = await TokenManager.getLongLivedToken(tokenData.access_token);

        // Store
        // Long-lived tokens usually last ~60 days. We store expiry to schedule refreshes.
        TokenManager.storeUserToken(userId, longToken, 60 * 24 * 60 * 60); // Approx 60 days

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

        // Send success page that closes itself and notifies frontend
        const appUrl = process.env.APP_URL || 'http://localhost:5173'; // Default to Vite port
        res.send(`
            <script>
                try {
                    window.opener.postMessage({ type: 'META_AUTH_SUCCESS', token: '${longToken}' }, '${appUrl}');
                    setTimeout(() => window.close(), 500);
                } catch (e) {
                    console.error('postMessage failed:', e);
                    window.close();
                }
            </script>
            <h1>Connected!</h1>
            <p>You can close this window now.</p>
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

// DEBUG: Check token status
router.get('/meta/debug/token', async (req, res) => {
    // In prod, protect this route!
    const userId = 'default_user';
    const db = getMetaDb();
    const row = db.prepare('SELECT access_token, token_expires_at FROM authorized_users WHERE user_id = ?').get(userId) as any;

    if (!row) return res.status(404).json({ error: 'No token found' });

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

router.post('/meta/disconnect', (req, res) => {
    const userId = 'default_user';
    TokenManager.deleteToken(userId);
    // Optionally clear ad accounts linked to this user
    // db.prepare('DELETE FROM ad_accounts WHERE linked_by_user_id = ?').run(userId);
    res.json({ success: true });
});

export default router;
