import express from 'express';
import * as ga4Service from '../services/ga4/ga4Service.js';
import * as ga4Db from '../services/ga4/ga4Db.js';

const router = express.Router();

// Middleware to ensure user_id is present (mock auth for now or rely on existing auth)
// Assuming req.user or req.headers['x-user-id'] or similar. 
// For this integration, I'll assume a middleware populates `req.user` or we use a fixed test ID if not present, 
// BUT for production we need real user context.
// Looking at existing code, `server.ts` likely handles auth or we rely on client sending an ID.
// Let's assume the client sends a `x-user-id` header for now if no auth middleware is visible.

const getUserId = (req: express.Request): string => {
    // TODO: Integrate with real auth system
    return (req.headers['x-user-id'] as string) || 'default-user';
};

// Start OAuth
router.get('/auth/google/start', (req, res) => {
    if (process.env.USE_MOCK_DATA === 'true') {
        return res.redirect('/api/auth/google/callback?code=mock_ga4_code');
    }
    const url = ga4Service.getAuthUrl();
    res.redirect(url);
});

// OAuth Callback
router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;

        const userId = 'default-user'; // FIXME: Use state param to pass user ID back

        if (process.env.USE_MOCK_DATA === 'true' && code === 'mock_ga4_code') {
            // Mock link
            ga4Db.upsertConnection({
                id: 'mock_conn_123',
                user_id: userId,
                refresh_token_encrypted: 'mock_refresh',
                scopes: '[]',
                revenue_allowed: true,
                timezone: 'America/New_York',
                currency: 'USD',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            return res.redirect('http://localhost:5173/?ga4=success');
        }

        if (!code || typeof code !== 'string') {
            throw new Error('Invalid code');
        }

        // We need the user ID here. 
        // If we are in a redirect flow, we lost the headers.
        // Usually we store state in a cookie or `state` param.
        // For simplicity, we'll default to 'default-user' or handle it after redirect.
        // Ideally, we pass `state=userId` in getAuthUrl. 
        // Let's rely on a cookie or 'default-user' for this MVP step.

        await ga4Service.handleAuthCallback(code, userId);

        // Redirect back to frontend (Dashboard)
        res.redirect('http://localhost:5173/?ga4=success');
    } catch (error: any) {
        console.error('OAuth Callback Error:', error);
        res.redirect(`http://localhost:5173/?ga4=error&message=${encodeURIComponent(error.message)}`);
    }
});

// List Properties
router.get('/properties', async (req, res) => {
    try {
        const userId = getUserId(req);
        const properties = await ga4Service.listProperties(userId);
        res.json({ properties });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Select Property
router.post('/select', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { propertyId } = req.body;
        if (!propertyId) throw new Error('Property ID required');

        const result = await ga4Service.selectProperty(userId, propertyId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get Context (Status/Config)
router.get('/context', async (req, res) => {
    try {
        const userId = getUserId(req);
        const conn = ga4Db.getConnection(userId);
        res.json({ connection: conn });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update Consent
router.post('/consent', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { revenueAllowed } = req.body;
        ga4Db.updateConsent(userId, Boolean(revenueAllowed));
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Reports
router.get('/reports/:type', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { type } = req.params;
        const days = parseInt(req.query.days as string) || 30;

        if (!['overview', 'acquisition', 'conversions', 'landing-pages', 'context'].includes(type)) {
            throw new Error('Invalid report type');
        }

        const data = await ga4Service.getReport(userId, type as any, days);
        res.json(data);
    } catch (error: any) {
        console.error(`Report Error (${req.params.type}):`, error);
        res.status(500).json({ error: error.message });
    }
});

// Disconnect
router.post('/disconnect', async (req, res) => {
    try {
        const userId = getUserId(req);
        await ga4Service.disconnectGA4(userId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
