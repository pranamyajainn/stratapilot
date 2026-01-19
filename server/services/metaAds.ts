import axios from 'axios';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = 'http://localhost:3000/api/auth/meta/callback';

export const getMetaAuthUrl = () => {
    const scopes = ['ads_read', 'read_insights']; // Permissions needed
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${META_REDIRECT_URI}&state=meta_auth&scope=${scopes.join(',')}`;
};

export const getMetaTokens = async (code: string) => {
    try {
        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                client_id: META_APP_ID,
                redirect_uri: META_REDIRECT_URI,
                client_secret: META_APP_SECRET,
                code: code
            }
        });
        return response.data; // { access_token, ... }
    } catch (error: any) {
        console.error('Meta Token Exchange Error:', error.response?.data || error.message);
        throw new Error('Failed to exchange Meta token');
    }
};

export const fetchMetaAdsData = async (accessToken: string) => {
    try {
        // 1. Get Ad Accounts
        const accountsRes = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
            params: {
                access_token: accessToken,
                fields: 'id,name,account_id'
            }
        });

        const accounts = accountsRes.data.data;
        if (!accounts || accounts.length === 0) {
            return { source: 'Meta Ads', info: 'No Ad Accounts found' };
        }

        // 2. For the first account, fetch insights
        const accountId = accounts[0].id; // e.g., act_12345678
        const accountName = accounts[0].name;

        const insightsRes = await axios.get(`https://graph.facebook.com/v18.0/${accountId}/insights`, {
            params: {
                access_token: accessToken,
                date_preset: 'last_30d',
                fields: 'spend,impressions,clicks,cpc,cpm,ctr,actions'
            }
        });

        return {
            source: 'Meta Ads',
            account: accountName,
            period: 'Last 30 Days',
            metrics: insightsRes.data.data?.[0] || {}
        };

    } catch (error: any) {
        console.error('Meta Data Fetch Error:', error.response?.data || error.message);
        // Return empty or error object instead of crashing
        return { source: 'Meta Ads', error: 'Failed to fetch insights' };
    }
};
