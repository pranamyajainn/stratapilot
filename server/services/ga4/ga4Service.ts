import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { v4 as uuidv4 } from 'uuid';
import * as db from './ga4Db.js';

// Environment variables
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Initialize GoogleAuth client (Service Account)
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    keyFile: CREDENTIALS_PATH
});

// --- SERVICE ACCOUNT FLOW ---

export const verifyPropertyAccess = async (propertyId: string, userId: string) => {
    try {
        // 1. Create client
        const client = await auth.getClient();

        // 2. Try to list metadata for the property to verify access
        const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: client as any });

        // Ensure propertyId format "properties/123"
        const formattedPropertyId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

        const res = await analyticsAdmin.properties.get({
            name: formattedPropertyId
        });

        const prop = res.data;

        // 3. If successful, save connection
        const connectionId = db.getConnection(userId)?.id || uuidv4();

        db.upsertConnection({
            id: connectionId,
            user_id: userId,
            property_id: formattedPropertyId.replace('properties/', ''), // Store generic ID
            timezone: prop.timeZone || 'UTC',
            currency: prop.currencyCode || 'USD',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        db.logAudit(uuidv4(), userId, 'CONNECT_GA4_SA', { propertyId: formattedPropertyId });

        return { success: true, property: prop };

    } catch (error: any) {
        console.error('[GA4 Verify] Access denied or error:', error.message);
        throw new Error(`Service Account cannot access Property ID ${propertyId}. Ensure you've added the service email to GA4 Property Access.`);
    }
};


export const disconnectGA4 = async (userId: string) => {
    // Just delete the DB record, no token to revoke
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

    const client = await auth.getClient();
    return { client, propertyId: conn.property_id, connection: conn };
};

// --- ADMIN API (Properties) ---

export const listProperties = async (userId: string) => {
    // Service Accounts cannot easily "list all properties" they have access to 
    // unless they are part of an org or we use account summaries.
    // For SA, it's better to rely on user providing the specific ID.
    // But we can try to list account summaries.

    try {
        const client = await auth.getClient();
        const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: client as any });
        const res = await analyticsAdmin.accountSummaries.list();
        return res.data.accountSummaries || [];
    } catch (e) {
        console.warn('Failed to list properties for SA:', e);
        return [];
    }
};

export const selectProperty = async (userId: string, propertyId: string) => {
    // Re-use verify logic essentially, or just update selection if we allow multiple
    // In this simpler SA flow, "Connecting" IS "Selecting".
    // Use verifyPropertyAccess instead.
    return verifyPropertyAccess(propertyId, userId);
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

    // --- REQUIRED LOGGING FOR EMPTY-DATA AWARENESS ---
    const rowCount = result.rows.length;
    const status = rowCount > 0 ? 'SUCCESS_WITH_DATA' : 'SUCCESS_NO_DATA';
    console.log(`[GA4] Fetch completed | propertyId=${propertyId} | status=${status} | rows=${rowCount}`);

    // PERSIST STATUS
    try {
        db.updateConnectionStatus(userId, status);
    } catch (e) {
        console.warn('[GA4] Failed to persist connection status:', e);
    }

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
