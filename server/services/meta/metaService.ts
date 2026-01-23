import axios from 'axios';
import { getMetaDb } from './metaDb.js';
import { AdAccount, Campaign, AdSet, Ad, AdCreative, InsightDaily } from './types.js';

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export class MetaService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private async get(path: string, params: any = {}): Promise<any> {
        try {
            const response = await axios.get(`${BASE_URL}${path}`, {
                params: {
                    access_token: this.accessToken,
                    ...params
                }
            });
            return response.data;
        } catch (error: any) {
            if (error.response) {
                const { error: metaError } = error.response.data;
                console.error(`Meta API Error [${path}]:`, metaError.message);

                // Handle rate limits (code 17 or 4)
                if (metaError.code === 17 || metaError.code === 4) {
                    throw new Error('RATE_LIMIT_EXCEEDED');
                }
                // Handle token expiry (code 190)
                if (metaError.code === 190) {
                    throw new Error('TOKEN_EXPIRED');
                }
            }
            throw error;
        }
    }

    async getAdAccounts(): Promise<AdAccount[]> {
        const fields = 'id,account_id,name,currency,timezone_name,timezone_id,account_status,disable_reason';
        const data = await this.get('/me/adaccounts', { fields, limit: 100 });
        return data.data || [];
    }


    /**
     * Generic pagination helper
     */
    async fetchAllPages<T>(path: string, params: any, maxPages: number = 20): Promise<T[]> {
        let allData: T[] = [];
        let nextPage = null;
        let pageCount = 0;

        // First request
        const response = await this.get(path, params);
        if (response.data) allData = [...response.data];
        if (response.paging && response.paging.next) nextPage = response.paging.next;

        // Follow cursors
        while (nextPage && pageCount < maxPages) {
            try {
                const res = await axios.get(nextPage); // next cursor is full URL
                if (res.data.data) allData = [...allData, ...res.data.data];
                nextPage = res.data.paging?.next || null;
                pageCount++;
            } catch (e) {
                console.warn('Pagination failed, stopping early', e);
                break;
            }
        }

        return allData;
    }

    // --- Entity Fetchers ---

    async getCampaigns(accountId: string): Promise<Campaign[]> {
        return this.fetchAllPages<Campaign>(`/${accountId}/campaigns`, {
            fields: 'id,name,status,objective,start_time,stop_time,effective_status,updated_time',
            effective_status: '["ACTIVE","PAUSED","ARCHIVED"]',
            limit: 200
        });
    }

    async getAdSets(accountId: string): Promise<AdSet[]> {
        return this.fetchAllPages<AdSet>(`/${accountId}/adsets`, {
            fields: 'id,name,status,campaign_id,optimization_goal,start_time,end_time,updated_time',
            limit: 200
        });
    }

    async getAds(accountId: string): Promise<Ad[]> {
        return this.fetchAllPages<Ad>(`/${accountId}/ads`, {
            fields: 'id,name,status,adset_id,campaign_id,creative,updated_time',
            limit: 200
        });
    }

    async getCreatives(creativeIds: string[]): Promise<AdCreative[]> {
        // Creatives can be fetched individually or in batches.
        // For simplicity and to avoid huge URL lengths, let's do small batches or individual (parallelized).
        // A better approach for "sync" is to fetch creatives associated with the ads we just pulled.

        // Actually, we can list all creatives for an account:
        /* 
        WARNING: /act_ID/adcreatives can be huge. 
        Better to fetch specific IDs found in ads, but that requires a lot of calls. 
        Let's try fetching account creatives with cursor, assuming sync checks for changes.
        */

        // NOTE: Allow caller to handle ID filtering. This function fetches ONE creative.
        // Batching implementation omitted for brevity in this step, but recommended for production.
        return [];
    }

    async getCreativeDetails(creativeId: string): Promise<AdCreative> {
        const fields = 'id,name,object_type,thumbnail_url,image_url,video_id,title,body,call_to_action_type,link_url,instagram_actor_id,page_id';
        return this.get(`/${creativeId}`, { fields });
    }

    // --- Insights ---

    async getInsights(
        objectId: string, // account, campaign, etc.
        level: 'account' | 'campaign' | 'adset' | 'ad',
        dateStart: string,
        dateStop: string,
        fields?: string
    ): Promise<InsightDaily[]> {
        const defaultFields = 'account_id,campaign_id,adset_id,ad_id,impressions,spend,reach,frequency,clicks,unique_clicks,ctr,cpc,cpm,inline_link_clicks,landing_page_views,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_3_sec_watched_actions,video_avg_time_watched_actions';

        const params = {
            level,
            time_range: JSON.stringify({ since: dateStart, until: dateStop }),
            time_increment: 1, // Daily breakdown
            fields: fields || defaultFields,
            limit: 500
        };

        return this.fetchAllPages<InsightDaily>(`/${objectId}/insights`, params);
    }
}
