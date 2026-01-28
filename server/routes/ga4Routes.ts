import express from 'express';
import * as ga4Service from '../services/ga4/ga4Service.js';
import * as ga4Db from '../services/ga4/ga4Db.js';

const router = express.Router();

// Middleware to ensure user_id is present
// Assuming req.user or req.headers['x-user-id'] or similar. 
// For this integration, I'll assume a middleware populates `req.user` or we use a fixed test ID if not present, 
// BUT for production we need real user context.
// Looking at existing code, `server.ts` likely handles auth or we rely on client sending an ID.
// Let's assume the client sends a `x-user-id` header for now if no auth middleware is visible.

const getUserId = (req: express.Request): string => {
    // TODO: Integrate with real auth system
    return (req.headers['x-user-id'] as string) || 'default-user';
};

// Verify & Connect (Service Account Flow)
router.post('/verify-access', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { propertyId } = req.body;

        if (!propertyId) throw new Error('Property ID is required');

        const result = await ga4Service.verifyPropertyAccess(propertyId, userId);
        res.json(result);
    } catch (error: any) {
        console.error('GA4 Verification Error:', error.message);
        res.status(403).json({ error: error.message });
    }
});

// List Properties (for SA, might be limited but kept for compatibility)
router.get('/properties', async (req, res) => {
    try {
        const userId = getUserId(req);
        const properties = await ga4Service.listProperties(userId);
        res.json({ properties });
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
