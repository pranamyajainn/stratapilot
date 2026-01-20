import { v4 as uuidv4 } from 'uuid';
import {
    getInsightByHash,
    saveInsight,
    updateAccessTime,
    InsightRecord,
    getInsightsByIndustry,
    getInsightsByBrand,
    getInsightStats
} from './insightDb.js';
import { generateContentHash, generateUrlHash, generateFileHash } from './contentHash.js';

export interface CacheResult {
    hit: boolean;
    analysis: any;
    record?: InsightRecord;
}

/**
 * Check cache for existing analysis
 */
export async function checkCache(
    contentHash: string,
    analysisLabel: string
): Promise<CacheResult> {
    const record = getInsightByHash(contentHash, analysisLabel);

    if (record) {
        console.log(`[CACHE HIT] Found cached insight: ${record.id.slice(0, 8)}... (${record.industry})`);
        updateAccessTime(record.id);
        return { hit: true, analysis: record.analysis, record };
    }

    console.log(`[CACHE MISS] No cached insight for hash: ${contentHash.slice(0, 8)}...`);
    return { hit: false, analysis: null };
}

/**
 * Store analysis result in cache
 */
export async function storeInCache(
    contentHash: string,
    analysisLabel: string,
    analysis: any,
    options?: {
        sourceUrl?: string;
        mimeType?: string;
    }
): Promise<InsightRecord> {
    // Extract metadata from analysis
    const industry = analysis.industry || detectIndustryFromAnalysis(analysis);
    const genre = detectGenre(options?.mimeType);
    const brand = analysis.brandAnalysis?.brandName ||
        analysis.brandStrategyWindow?.brandName ||
        'Unknown';

    const record: InsightRecord = {
        id: uuidv4(),
        content_hash: contentHash,
        analysis_label: analysisLabel,
        industry,
        genre,
        brand,
        source_url: options?.sourceUrl,
        analysis,
        tags: [],
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        access_count: 1
    };

    saveInsight(record);
    console.log(`[CACHE STORE] Saved insight: ${record.id.slice(0, 8)}... | Industry: ${industry} | Brand: ${brand}`);

    return record;
}

/**
 * Detect genre from MIME type
 */
function detectGenre(mimeType?: string): string {
    if (!mimeType) return 'Unknown';

    if (mimeType.startsWith('video/')) return 'Video Ad';
    if (mimeType.startsWith('image/')) {
        if (mimeType.includes('gif')) return 'Animated';
        return 'Static Image';
    }
    return 'Unknown';
}

/**
 * Fallback industry detection from analysis content
 */
function detectIndustryFromAnalysis(analysis: any): string {
    const text = JSON.stringify(analysis).toLowerCase();

    const industryKeywords: Record<string, string[]> = {
        'FMCG': ['soap', 'shampoo', 'detergent', 'food', 'beverage', 'snack', 'grocery', 'consumer goods'],
        'BFSI': ['bank', 'insurance', 'loan', 'credit', 'investment', 'mutual fund', 'finance', 'trading'],
        'Auto': ['car', 'automobile', 'vehicle', 'suv', 'sedan', 'motorcycle', 'automotive'],
        'Health': ['health', 'pharma', 'medicine', 'hospital', 'wellness', 'fitness', 'medical'],
        'Tech': ['software', 'app', 'saas', 'technology', 'digital', 'ai', 'cloud', 'startup'],
        'Retail': ['shop', 'store', 'ecommerce', 'fashion', 'clothing', 'furniture', 'home'],
        'Telecom': ['mobile', 'telecom', '5g', 'network', 'broadband', 'sim'],
        'F&B': ['restaurant', 'cafe', 'food delivery', 'cuisine', 'dining'],
        'Entertainment': ['movie', 'music', 'streaming', 'gaming', 'ott', 'entertainment']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
            return industry;
        }
    }

    return 'Other';
}

// Re-export utilities for convenience
export { generateContentHash, generateUrlHash, generateFileHash };
export { getInsightsByIndustry, getInsightsByBrand, getInsightStats };
