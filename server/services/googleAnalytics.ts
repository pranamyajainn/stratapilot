import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force refresh token
    });
};

export const getGoogleTokens = async (code: string) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

export const fetchGA4Data = async (accessToken: string, propertyId: string) => {
    const analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth: accessToken
    });

    // Determine date range (e.g., last 28 days)
    const dateRanges = [{ startDate: '28daysAgo', endDate: 'today' }];
    // Metrics to fetch
    const metrics = [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'engagementRate' }
    ];

    try {
        const response = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges,
                metrics
            },
            // We need to set the oauth2Client credentials locally for this request
            // Or simpler: pass the access token in headers? 
            // The googleapis library usually prefers the auth client. 
            // Let's create a temp client or set credentials on the main one if we are stateless.
            // Since we are stateless, we can just use the OAuth2Client with the token.
        } as any);

        // Wait, standard way with googleapis:
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const authedAnalytics = google.analyticsdata({
            version: 'v1beta',
            auth: auth
        });

        const res = await authedAnalytics.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges,
                metrics
            }
        });

        return {
            source: 'Google Analytics 4',
            period: 'Last 28 Days',
            metrics: res.data.rows?.[0]?.metricValues?.map((mv, i) => ({
                name: metrics[i].name,
                value: mv.value
            })) || []
        };

    } catch (error: any) {
        console.error('Error fetching GA4 data:', error.message);
        throw new Error(`Failed to fetch GA4 data: ${error.message}`);
    }
};
