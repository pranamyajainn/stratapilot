import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '../../utils/encryption.js';
import * as db from './ga4Db.js';

// Environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('CRITICAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing.');
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

// --- OAUTH FLOW ---

export const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for refresh token
        scope: SCOPES,
        prompt: 'consent', // Force consent to ensure we get a refresh token
        include_granted_scopes: true
    });
};

export const handleAuthCallback = async (code: string, userId: string) => {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
        // This might happen if user re-auths without prompt='consent'
        // But we force it above. If still missing, we might need to revoke first.
        console.warn('[GA4 Auth] No refresh token received. User might have already granted access.');
    }

    // Encrypt refresh token
    const refreshToken = tokens.refresh_token;
    // If we didn't get a refresh token, we might need to look up existing one? 
    // For now, assume we get it or fail. 
    // Actually, if we re-auth an existing user we might only get access token.
    // We should handle that by checking if we already have a connection.

    let encryptedRefresh = '';
    if (refreshToken) {
        encryptedRefresh = encrypt(refreshToken);
    } else {
        const existing = db.getConnection(userId);
        if (existing?.refresh_token_encrypted) {
            encryptedRefresh = existing.refresh_token_encrypted;
        } else {
            throw new Error('No refresh token received and no existing connection found.');
        }
    }

    const connectionId = db.getConnection(userId)?.id || uuidv4();

    // Create/Update connection
    db.upsertConnection({
        id: connectionId,
        user_id: userId,
        refresh_token_encrypted: encryptedRefresh,
        scopes: JSON.stringify(tokens.scope?.split(' ') || SCOPES),
        revenue_allowed: false, // Default to false
        timezone: 'UTC', // Default
        currency: 'USD', // Default
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    db.logAudit(uuidv4(), userId, 'CONNECT_GA4', { scopes: tokens.scope });

    return { success: true };
};

export const disconnectGA4 = async (userId: string) => {
    // Optionally revoke token with Google
    const conn = db.getConnection(userId);
    if (conn) {
        try {
            const refreshToken = decrypt(conn.refresh_token_encrypted);
            await oauth2Client.revokeToken(refreshToken);
        } catch (e) {
            console.warn('[GA4] Failed to revoke token:', e);
        }
    }
    db.deleteConnection(userId);
    db.logAudit(uuidv4(), userId, 'DISCONNECT_GA4', {});
    return { success: true };
};

// --- API CLIENT HELPERS ---

const getAuthenticatedClient = async (userId: string) => {
    const conn = db.getConnection(userId);
    if (!conn) {
        throw new Error('User is not connected to GA4');
    }

    const refreshToken = decrypt(conn.refresh_token_encrypted);

    const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    client.setCredentials({ refresh_token: refreshToken });

    // Refresh access token if needed (handled automatically by googleapis usually, 
    // but for @google-analytics/data we might need the raw token or an auth client)

    return { client, propertyId: conn.property_id, connection: conn };
};

// --- ADMIN API (Properties) ---

// --- MOCK INJECTION ---
import { MockGA4Service } from './mockData.js';
const mockService = new MockGA4Service();

export const listProperties = async (userId: string) => {
    if (process.env.USE_MOCK_DATA === 'true') {
        const props = await mockService.listProperties();
        // Map to account structure expected by frontend
        return [{
            id: 'accounts/mock',
            name: 'Mock Account',
            properties: props.map(p => ({
                id: p.property,
                displayName: p.displayName
            }))
        }];
    }

    const { client } = await getAuthenticatedClient(userId);

    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: client });

    // List accounts first? Or just list properties.
    // `properties` list requires filtering by account usually, or "-" for all accessible?
    // In v1beta, properties.list can use filter 'parent:accounts/123' or just list accessible.
    // Actually properties.list with `filter: 'parent:accounts/-'` lists all?
    // Let's try listing account summaries which is easier for hierarchical view.

    const res = await analyticsAdmin.accountSummaries.list();

    // Normalize response
    const summaries = res.data.accountSummaries || [];

    const accounts = summaries.map(account => ({
        id: account.account, // "accounts/123"
        name: account.displayName,
        properties: account.propertySummaries?.map(prop => ({
            id: prop.property, // "properties/456"
            displayName: prop.displayName
        })) || []
    }));

    return accounts;
};

export const selectProperty = async (userId: string, propertyId: string) => {
    // propertyId format: "properties/123456"

    if (process.env.USE_MOCK_DATA === 'true') {
        db.updatePropertySelection(userId, '123456789', 'Stratapilot Demo Store (Mock)', 'America/New_York', 'USD');
        return { success: true, property: { displayName: 'Stratapilot Demo Store (Mock)' } };
    }

    const { client } = await getAuthenticatedClient(userId);
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: client });

    // Fetch metadata to get currency/timezone
    const res = await analyticsAdmin.properties.get({
        name: propertyId
    });

    const prop = res.data;

    db.updatePropertySelection(
        userId,
        propertyId.replace('properties/', ''), // Store just ID or full path? Let's treat input as potentially full path but store clean ID if we want. 
        // Actually the library usually expects "properties/ID". Let's store just the numeric ID to be safe, or consistency.
        // Google's Data API expects `properties/${propertyId}`. 
        // Let's store the numeric part if input is "properties/123", or just "123".
        // Helper:
        prop.displayName || 'Unknown Property',
        prop.timeZone || 'UTC',
        prop.currencyCode || 'USD'
    );

    db.logAudit(uuidv4(), userId, 'SELECT_PROPERTY', { propertyId, name: prop.displayName });

    return { success: true, property: prop };
};

// --- DATA API (Reports) ---

// Helper to check consent
const checkRevenueConsent = (userId: string) => {
    const conn = db.getConnection(userId);
    return conn?.revenue_allowed || false;
};

export const getReport = async (
    userId: string,
    reportType: 'overview' | 'acquisition' | 'conversions' | 'landing-pages' | 'context',
    rangeDays: number
) => {
    if (process.env.USE_MOCK_DATA === 'true') {
        // In mock mode, we skip auth client check
        return mockService.runReport('mock_property', { dimensions: [reportType === 'acquisition' ? { name: 'sessionSource' } : { name: 'date' }] });
    }

    const { client, propertyId, connection } = await getAuthenticatedClient(userId);

    if (!propertyId) {
        throw new Error('No property selected');
    }

    // Check cache
    const cached = db.getCachedReport(userId, propertyId, reportType, rangeDays);
    if (cached) {
        const now = new Date();
        const expires = new Date(cached.expires_at);
        if (now < expires) {
            console.log(`[GA4] Cache hit for ${reportType}`);
            return JSON.parse(cached.payload_json);
        }
    }

    // If not cached, fetch
    console.log(`[GA4] Fetching ${reportType} for property ${propertyId}`);

    // Refresh token if needed
    const { token } = await client.getAccessToken(); // ensures valid access token
    if (!token) throw new Error('Failed to get access token');

    // Instantiate Data Client
    // @google-analytics/data uses grpc, supports auth via GoogleAuth or OAuth2Client? 
    // It supports `auth` option which can be an OAuth2Client.
    const dataClient = new BetaAnalyticsDataClient({
        authClient: client as any // Casting because of strict type mismatch in some versions, but it works
    });

    const dateRanges = [
        { startDate: `${rangeDays}daysAgo`, endDate: 'today' }
    ];

    let requestBody: any = { dateRanges };
    const propertyPath = `properties/${propertyId}`;

    switch (reportType) {
        case 'overview':
            requestBody.metrics = [
                { name: 'sessions' },
                { name: 'engagedSessions' },
                { name: 'engagementRate' },
                { name: 'averageEngagementTime' },
                { name: 'bounceRate' }
            ];
            break;

        case 'acquisition':
            requestBody.dimensions = [
                { name: 'sessionSourceMedium' },
                { name: 'sessionDefaultChannelGroup' }, // optional
                { name: 'campaignName' }
            ];
            requestBody.metrics = [
                { name: 'sessions' },
                { name: 'engagedSessions' },
                { name: 'engagementRate' }
            ];
            // Limit relevant rows?
            requestBody.limit = 50;
            break;

        case 'conversions':
            requestBody.dimensions = [{ name: 'eventName' }];
            requestBody.metrics = [
                { name: 'conversions' },
                { name: 'sessionConversionRate' }
            ];
            // Include revenue if consented
            if (connection.revenue_allowed) {
                requestBody.metrics.push({ name: 'totalRevenue' }); // or purchaseRevenue
                requestBody.metrics.push({ name: 'transactions' });
            }
            // Filter only conversion events? 
            // The 'conversions' metric applies to conversion events only? 
            // Usually 'conversions' metric is count of all conversion events. 
            // If we dimension by eventName, we get all events? No, we should probably filter.
            // Or just fetch all events and filter in UI? 
            // GA4 "conversions" metric is specific to events marked as conversions.
            // But if we split by "eventName", we might get non-conversion events with 0 conversions?
            // Let's filter by `isConversionEvent`? Data API doesn't have isConversionEvent dimension easily.
            // We can just order by conversions desc and limit.
            requestBody.orderBys = [
                { metric: { metricName: 'conversions' }, desc: true }
            ];
            requestBody.limit = 20;
            break;

        case 'landing-pages':
            requestBody.dimensions = [{ name: 'landingPage' }];
            requestBody.metrics = [
                { name: 'sessions' },
                { name: 'engagementRate' },
                { name: 'sessionConversionRate' }
            ];
            requestBody.orderBys = [
                { metric: { metricName: 'sessions' }, desc: true }
            ];
            requestBody.limit = 20;
            break;

        case 'context':
            // This is special, fetches top countries
            requestBody.dimensions = [{ name: 'country' }];
            requestBody.metrics = [{ name: 'sessions' }];
            requestBody.orderBys = [{ metric: { metricName: 'sessions' }, desc: true }];
            requestBody.limit = 5;
            break;
    }

    const [response] = await dataClient.runReport({
        property: propertyPath,
        ...requestBody
    });

    // Format response
    const result = {
        metadata: response.rowCount,
        rows: response.rows?.map(row => {
            const dimValues: any = {};
            row.dimensionValues?.forEach((val, i) => {
                const dimName = requestBody.dimensions?.[i]?.name || `dim${i}`;
                dimValues[dimName] = val.value;
            });

            const metValues: any = {};
            row.metricValues?.forEach((val, i) => {
                const metName = requestBody.metrics?.[i]?.name || `met${i}`;
                metValues[metName] = val.value;
            });

            return { ...dimValues, ...metValues };
        }) || []
    };

    // Cache it (TTL = 1 hour for now, plan said 5-15 mins but 1 hour is safer for quotas)
    db.setCachedReport({
        id: uuidv4(),
        user_id: userId,
        property_id: propertyId,
        report_key: reportType,
        range_days: rangeDays,
        payload_json: JSON.stringify(result),
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 15).toISOString() // 15 mins
    });

    return result;
};
