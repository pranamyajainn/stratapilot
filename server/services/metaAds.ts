import axios from 'axios';
import { updateAccountFetchStatus } from './meta/metaDb.js';


export const verifyToken = async (accessToken: string) => {
    try {
        // 1. Validate Token & Get User
        // Note: Graph API 'me' call verifies the token is valid
        const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
            params: { access_token: accessToken, fields: 'id,name' }
        });

        // 2. Fetch Ad Accounts (to verify scopes/assets)
        const accountsRes = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', {
            params: {
                access_token: accessToken,
                fields: 'id,name,account_id,currency,account_status'
            }
        });

        return {
            valid: true,
            user: meRes.data,
            accounts: accountsRes.data.data
        };
    } catch (error: any) {
        console.error('Meta Token Verification Failed:', error.response?.data || error.message);
        throw new Error('Invalid Meta Access Token or Insufficient Permissions');
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

        const metrics = insightsRes.data.data?.[0] || {};
        const hasData = Object.keys(metrics).length > 0;
        const status = hasData ? 'SUCCESS_WITH_DATA' : 'SUCCESS_NO_DATA';

        console.log(`[META] Fetch completed | accountId=${accountId} | status=${status}`);

        try {
            updateAccountFetchStatus(accountId, status);
        } catch (e) {
            console.warn('[META] Failed to persist status:', e);
        }

        return {
            source: 'Meta Ads',
            account: accountName,
            period: 'Last 30 Days',
            metrics: metrics
        };

    } catch (error: any) {
        console.error('Meta Data Fetch Error:', error.response?.data || error.message);
        throw new Error(`Meta Ads API Failure: ${error.response?.data?.error?.message || error.message}`);
    }
};
