/**
 * Meta Creative Memory
 * Ingestion from Meta Ad Library (Facebook + Instagram)
 * 
 * Uses the official /ads_archive endpoint (free, requires app token)
 * Tier 1: Authoritative source
 */

import axios from 'axios';
import { CreativeMemorySourceBase } from './creativeMemorySourceBase.js';
import {
    CreativeObject,
    CreativeSignals,
    TrackedIndustry,
    CreativeFormat,
} from '../../types/creativeMemoryTypes.js';

// Meta Ad Library API configuration
const META_GRAPH_VERSION = 'v18.0';
const META_AD_LIBRARY_ENDPOINT = `https://graph.facebook.com/${META_GRAPH_VERSION}/ads_archive`;

// Fields to request from the API
const AD_FIELDS = [
    'id',
    'ad_creation_time',
    'ad_creative_bodies',
    'ad_creative_link_captions',
    'ad_creative_link_descriptions',
    'ad_creative_link_titles',
    'ad_delivery_start_time',
    'ad_delivery_stop_time',
    'ad_snapshot_url',
    'bylines',
    'currency',
    'delivery_by_region',
    'languages',
    'page_id',
    'page_name',
    'publisher_platforms',
    'spend',
    'target_ages',
    'target_gender',
    'target_locations',
].join(',');

interface MetaAdResponse {
    id: string;
    ad_creation_time?: string;
    ad_creative_bodies?: string[];
    ad_creative_link_captions?: string[];
    ad_creative_link_descriptions?: string[];
    ad_creative_link_titles?: string[];
    ad_delivery_start_time?: string;
    ad_delivery_stop_time?: string;
    ad_snapshot_url?: string;
    bylines?: string;
    page_id?: string;
    page_name?: string;
    publisher_platforms?: string[];
    spend?: { lower_bound?: string; upper_bound?: string };
    target_ages?: string;
    target_gender?: string;
    target_locations?: { name: string; type: string }[];
}

export class MetaCreativeMemory extends CreativeMemorySourceBase {
    readonly sourceId = 'meta' as const;
    readonly displayName = 'Meta Ad Library';

    private accessToken: string | null;

    constructor() {
        super();
        // Use the existing META credentials or a dedicated Ad Library token
        this.accessToken = process.env.META_AD_LIBRARY_TOKEN || process.env.META_ACCESS_TOKEN || null;
    }

    isAvailable(): boolean {
        return !!this.accessToken;
    }

    /**
     * Ingest creatives for a given industry
     */
    async ingestByIndustry(industry: TrackedIndustry, region: string = 'IN'): Promise<CreativeObject[]> {
        if (!this.isAvailable()) {
            this.log('Meta Ad Library token not configured', 'warn');
            return [];
        }

        const keywords = this.getIndustryKeywords(industry);
        const allCreatives: CreativeObject[] = [];

        // Search for each keyword
        for (const keyword of keywords.slice(0, 3)) { // Limit to top 3 keywords
            try {
                const creatives = await this.searchAds(keyword, region, industry);
                allCreatives.push(...creatives);

                // Rate limiting - wait between requests
                await this.delay(500);
            } catch (error: any) {
                this.log(`Error searching for "${keyword}": ${error.message}`, 'error');
            }
        }

        this.log(`Ingested ${allCreatives.length} creatives for industry: ${industry}`);
        return allCreatives;
    }

    /**
     * Search ads by keyword
     */
    private async searchAds(
        searchTerms: string,
        country: string,
        industry: string,
        limit: number = 50
    ): Promise<CreativeObject[]> {
        try {
            const response = await axios.get(META_AD_LIBRARY_ENDPOINT, {
                params: {
                    access_token: this.accessToken,
                    search_terms: searchTerms,
                    ad_reached_countries: country,
                    ad_active_status: 'ALL',
                    ad_type: 'ALL',
                    fields: AD_FIELDS,
                    limit: limit,
                },
                timeout: 30000,
            });

            const ads: MetaAdResponse[] = response.data?.data || [];

            return ads.map(ad => this.normalizeAd(ad, industry, country));
        } catch (error: any) {
            if (error.response?.data?.error) {
                const metaError = error.response.data.error;
                this.log(`Meta API Error: ${metaError.message} (code: ${metaError.code})`, 'error');

                // Handle rate limiting
                if (metaError.code === 4 || metaError.code === 17) {
                    this.log('Rate limited - backing off', 'warn');
                    await this.delay(5000);
                }
            }
            throw error;
        }
    }

    /**
     * Normalize a Meta ad to CreativeObject format
     */
    private normalizeAd(ad: MetaAdResponse, industry: string, region: string): CreativeObject {
        // Extract text content
        const bodyText = ad.ad_creative_bodies?.join(' ') || '';
        const headline = ad.ad_creative_link_titles?.join(' ') || '';
        const caption = ad.ad_creative_link_captions?.join(' ') || '';
        const description = ad.ad_creative_link_descriptions?.join(' ') || '';

        const fullText = `${headline} ${bodyText} ${description}`.trim();

        // Extract signals from creative content
        const signals: CreativeSignals = {
            hookType: this.inferHookType(headline || bodyText.substring(0, 100)),
            hookText: (headline || bodyText).substring(0, 100),
            ctaType: this.inferCTAType(caption),
            ctaText: caption,
            visualStyle: 'unknown', // Would need image analysis
            messageLength: this.getMessageLength(fullText),
            hasPrice: this.hasPrice(fullText),
            hasOffer: this.hasOffer(fullText),
            hasFace: false, // Would need image analysis
            hasProduct: false, // Would need image analysis
            hasLogo: true, // Assume branded content has logo
        };

        // Determine format (default to image, video would need API enrichment)
        let format: CreativeFormat = 'image';
        // Note: Meta Ad Library doesn't directly expose format, would need snapshot analysis

        // Extract platforms
        const platforms = ad.publisher_platforms || ['facebook'];

        return this.createCreativeObject({
            originalId: ad.id,
            advertiserName: ad.page_name || 'Unknown',
            advertiserId: ad.page_id,
            industry,
            format,
            platforms,
            regions: [region],
            signals,
            sourceUrl: ad.ad_snapshot_url,
            firstSeen: ad.ad_creation_time || ad.ad_delivery_start_time,
            lastSeen: ad.ad_delivery_stop_time || new Date().toISOString(),
        });
    }

    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
