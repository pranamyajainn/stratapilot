import { MetaService } from './metaService.js';
import { Campaign, AdSet, Ad, AdCreative, InsightDaily, AdAccount } from './types.js';

export class MockMetaService extends MetaService {
    constructor(token: string) {
        super(token);
    }

    async getAdAccounts(): Promise<AdAccount[]> {
        return [
            {
                id: 'act_mock_123',
                account_id: 'mock_123',
                name: 'Mock Ad Account (US)',
                currency: 'USD',
                timezone_name: 'America/Los_Angeles',
                timezone_id: 1,
                account_status: 1,
                disable_reason: 0
            }
        ];
    }

    async getCampaigns(accountId: string): Promise<Campaign[]> {
        return [
            { id: 'camp_1', name: 'Spring Sale 2024', status: 'ACTIVE', objective: 'CONVERSIONS', effective_status: 'ACTIVE', updated_time: new Date().toISOString() },
            { id: 'camp_2', name: 'Brand Awareness Q1', status: 'PAUSED', objective: 'BRAND_AWARENESS', effective_status: 'PAUSED', updated_time: new Date().toISOString() }
        ];
    }

    async getAdSets(accountId: string): Promise<AdSet[]> {
        return [
            { id: 'adset_1', campaign_id: 'camp_1', name: 'US - 25-45 - Interests', status: 'ACTIVE', optimization_goal: 'OFFSITE_CONVERSIONS', updated_time: new Date().toISOString() },
            { id: 'adset_2', campaign_id: 'camp_1', name: 'Retargeting - Visitors', status: 'ACTIVE', optimization_goal: 'OFFSITE_CONVERSIONS', updated_time: new Date().toISOString() }
        ];
    }

    async getAds(accountId: string): Promise<Ad[]> {
        return [
            { id: 'ad_1', adset_id: 'adset_1', campaign_id: 'camp_1', name: 'Creative A - Video', status: 'ACTIVE', creative: { id: 'cre_1' }, updated_time: new Date().toISOString() },
            { id: 'ad_2', adset_id: 'adset_1', campaign_id: 'camp_1', name: 'Creative B - Image', status: 'ACTIVE', creative: { id: 'cre_2' }, updated_time: new Date().toISOString() },
            { id: 'ad_3', adset_id: 'adset_2', campaign_id: 'camp_1', name: 'Creative A - Video (Retargeting)', status: 'ACTIVE', creative: { id: 'cre_1' }, updated_time: new Date().toISOString() }
        ];
    }

    async getCreativeDetails(creativeId: string): Promise<AdCreative> {
        if (creativeId === 'cre_1') {
            return {
                id: 'cre_1', name: 'Promo Video - Main', object_type: 'VIDEO',
                thumbnail_url: 'https://via.placeholder.com/150',
                title: 'Unleash Your Potential', body: 'Get 50% off this week only!',
                call_to_action_type: 'SHOP_NOW', link_url: 'https://example.com/shop'
            };
        } else {
            return {
                id: 'cre_2', name: 'Static Image - Lifestyle', object_type: 'PHOTO',
                thumbnail_url: 'https://via.placeholder.com/150',
                title: 'Lifestyle Upgrade', body: 'Join the movement.',
                call_to_action_type: 'LEARN_MORE', link_url: 'https://example.com/about'
            };
        }
    }

    async getInsights(objId: string, level: string, start: string, stop: string): Promise<InsightDaily[]> {
        // Generate pseudo-random data based on date range
        const days = Math.ceil((new Date(stop).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const results: InsightDaily[] = [];

        let currentDate = new Date(start);

        for (let i = 0; i < days; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Generate for Ad 1
            if (level === 'ad' || level === 'account') {
                results.push(this.generateDailyStat(dateStr, 'ad_1', 'adset_1', 'camp_1', 1000, 1500));
                results.push(this.generateDailyStat(dateStr, 'ad_2', 'adset_1', 'camp_1', 800, 1200));
                results.push(this.generateDailyStat(dateStr, 'ad_3', 'adset_2', 'camp_1', 400, 600));
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return results;
    }

    private generateDailyStat(date: string, adId: string, adSetId: string, campId: string, minImp: number, maxImp: number): InsightDaily {
        const impressions = Math.floor(Math.random() * (maxImp - minImp + 1)) + minImp;
        const cpm = 15 + Math.random() * 5; // $15-$20 CPM
        const spend = (impressions / 1000) * cpm;
        const ctr = 0.01 + Math.random() * 0.02; // 1-3% CTR
        const clicks = Math.floor(impressions * ctr);

        return {
            date_start: date,
            date_stop: date,
            account_id: 'mock_123',
            campaign_id: campId,
            adset_id: adSetId,
            ad_id: adId,
            impressions: impressions.toString(),
            spend: spend.toFixed(2),
            reach: Math.floor(impressions * 0.8).toString(),
            frequency: '1.2',
            clicks: clicks.toString(),
            unique_clicks: Math.floor(clicks * 0.9).toString(),
            ctr: (ctr * 100).toFixed(2),
            cpc: clicks > 0 ? (spend / clicks).toFixed(2) : '0',
            cpm: cpm.toFixed(2),
            inline_link_clicks: Math.floor(clicks * 0.8).toString(),
            landing_page_views: Math.floor(clicks * 0.6).toString(),
            actions: [
                { action_type: 'purchase', value: Math.floor(clicks * 0.05).toString() },
                { action_type: 'offsite_conversion.fb_pixel_purchase', value: (Math.floor(clicks * 0.05) * 50).toString() } // Revenue
            ]
        };
    }
}
