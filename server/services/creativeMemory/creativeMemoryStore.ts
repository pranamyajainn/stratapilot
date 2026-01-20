/**
 * Creative Memory Store
 * CRUD operations for the Creative Memory Layer
 */

import crypto from 'crypto';
import {
    CreativeObject,
    PatternDistribution,
    CreativeSource,
    TrackedIndustry,
    DEFAULT_CONFIG,
    HookType,
    CTAType,
    CreativeFormat,
    VisualStyle,
} from '../../types/creativeMemoryTypes.js';
import { getCreativeMemoryDb } from './creativeMemoryDb.js';

/**
 * Generate a content hash for deduplication
 */
function generateContentHash(creative: Partial<CreativeObject>): string {
    const content = JSON.stringify({
        advertiserName: creative.advertiserName,
        signals: creative.signals,
        format: creative.format,
    });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Calculate expiry date based on TTL hours
 */
function getExpiryDate(ttlHours: number): string {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + ttlHours);
    return expiry.toISOString();
}

// =============================================================================
// CREATIVE OPERATIONS
// =============================================================================

/**
 * Store a creative object in the database
 */
export function storeCreative(creative: CreativeObject): boolean {
    const db = getCreativeMemoryDb();
    const hash = creative.hash || generateContentHash(creative);

    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO creatives (
        id, source, source_tier, advertiser_name, advertiser_id, advertiser_domain,
        industry, niche, category, format, platforms, regions, signals,
        first_seen, last_seen, source_url, content_hash, indexed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            creative.id,
            creative.source,
            creative.sourceTier,
            creative.advertiserName,
            creative.advertiserId || null,
            creative.advertiserDomain || null,
            creative.industry,
            creative.niche || null,
            creative.category || null,
            creative.format,
            JSON.stringify(creative.platforms),
            JSON.stringify(creative.regions),
            JSON.stringify(creative.signals),
            creative.firstSeen,
            creative.lastSeen,
            creative.sourceUrl || null,
            hash,
            creative.indexedAt,
            getExpiryDate(DEFAULT_CONFIG.creativeTTL)
        );

        return true;
    } catch (error: any) {
        // Duplicate hash is expected, not an error
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return false;
        }
        console.error('[CreativeMemory] Error storing creative:', error.message);
        return false;
    }
}

/**
 * Store multiple creatives in a batch
 */
export function storeCreatives(creatives: CreativeObject[]): { stored: number; duplicates: number } {
    let stored = 0;
    let duplicates = 0;

    for (const creative of creatives) {
        if (storeCreative(creative)) {
            stored++;
        } else {
            duplicates++;
        }
    }

    return { stored, duplicates };
}

/**
 * Get creatives by industry
 */
export function getCreativesByIndustry(
    industry: string,
    limit: number = 500
): CreativeObject[] {
    const db = getCreativeMemoryDb();

    const rows = db.prepare(`
    SELECT * FROM creatives 
    WHERE industry = ? AND expires_at > datetime('now')
    ORDER BY indexed_at DESC
    LIMIT ?
  `).all(industry, limit) as any[];

    return rows.map(rowToCreativeObject);
}

/**
 * Get creatives by industry and niche
 */
export function getCreativesByNiche(
    industry: string,
    niche: string,
    limit: number = 500
): CreativeObject[] {
    const db = getCreativeMemoryDb();

    const rows = db.prepare(`
    SELECT * FROM creatives 
    WHERE industry = ? AND niche = ? AND expires_at > datetime('now')
    ORDER BY indexed_at DESC
    LIMIT ?
  `).all(industry, niche, limit) as any[];

    return rows.map(rowToCreativeObject);
}

/**
 * Get creatives by source
 */
export function getCreativesBySource(
    source: CreativeSource,
    limit: number = 500
): CreativeObject[] {
    const db = getCreativeMemoryDb();

    const rows = db.prepare(`
    SELECT * FROM creatives 
    WHERE source = ? AND expires_at > datetime('now')
    ORDER BY indexed_at DESC
    LIMIT ?
  `).all(source, limit) as any[];

    return rows.map(rowToCreativeObject);
}

/**
 * Convert database row to CreativeObject
 */
function rowToCreativeObject(row: any): CreativeObject {
    return {
        id: row.id,
        source: row.source as CreativeSource,
        sourceTier: row.source_tier,
        sourceUrl: row.source_url,
        advertiserName: row.advertiser_name,
        advertiserId: row.advertiser_id,
        advertiserDomain: row.advertiser_domain,
        industry: row.industry,
        niche: row.niche,
        category: row.category,
        format: row.format as CreativeFormat,
        platforms: JSON.parse(row.platforms),
        regions: JSON.parse(row.regions),
        signals: JSON.parse(row.signals),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        indexedAt: row.indexed_at,
        hash: row.content_hash,
    };
}

// =============================================================================
// PATTERN DISTRIBUTION OPERATIONS
// =============================================================================

/**
 * Store or update a pattern distribution
 */
export function storePatternDistribution(distribution: PatternDistribution): void {
    const db = getCreativeMemoryDb();
    const id = `${distribution.industry}:${distribution.niche}:${distribution.region}`;

    const stmt = db.prepare(`
    INSERT OR REPLACE INTO pattern_distributions (
      id, industry, niche, region, sample_size,
      hook_distribution, cta_distribution, format_distribution, visual_style_distribution,
      dominant_patterns, saturated_patterns, underutilized_patterns,
      tier1_percentage, generated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(
        id,
        distribution.industry,
        distribution.niche,
        distribution.region,
        distribution.sampleSize,
        JSON.stringify(distribution.hookDistribution),
        JSON.stringify(distribution.ctaDistribution),
        JSON.stringify(distribution.formatDistribution),
        JSON.stringify(distribution.visualStyleDistribution),
        JSON.stringify(distribution.dominantPatterns),
        JSON.stringify(distribution.saturatedPatterns),
        JSON.stringify(distribution.underutilizedPatterns),
        distribution.tier1Percentage,
        distribution.generatedAt,
        getExpiryDate(DEFAULT_CONFIG.patternTTL)
    );
}

/**
 * Get pattern distribution for an industry/niche
 */
export function getPatternDistribution(
    industry: string,
    niche: string = 'general',
    region: string = 'global'
): PatternDistribution | null {
    const db = getCreativeMemoryDb();

    const row = db.prepare(`
    SELECT * FROM pattern_distributions 
    WHERE industry = ? AND niche = ? AND region = ? AND expires_at > datetime('now')
  `).get(industry, niche, region) as any;

    if (!row) return null;

    return {
        industry: row.industry,
        niche: row.niche,
        region: row.region,
        sampleSize: row.sample_size,
        hookDistribution: JSON.parse(row.hook_distribution),
        ctaDistribution: JSON.parse(row.cta_distribution),
        formatDistribution: JSON.parse(row.format_distribution),
        visualStyleDistribution: JSON.parse(row.visual_style_distribution),
        dominantPatterns: JSON.parse(row.dominant_patterns),
        saturatedPatterns: JSON.parse(row.saturated_patterns),
        underutilizedPatterns: JSON.parse(row.underutilized_patterns),
        tier1Percentage: row.tier1_percentage,
        generatedAt: row.generated_at,
        expiresAt: row.expires_at,
    };
}

/**
 * Check if a pattern distribution exists and is valid
 */
export function hasValidPatternDistribution(
    industry: string,
    niche: string = 'general',
    region: string = 'global'
): boolean {
    const db = getCreativeMemoryDb();

    const row = db.prepare(`
    SELECT 1 FROM pattern_distributions 
    WHERE industry = ? AND niche = ? AND region = ? AND expires_at > datetime('now')
  `).get(industry, niche, region);

    return !!row;
}

// =============================================================================
// INGESTION LOG OPERATIONS
// =============================================================================

/**
 * Log the start of an ingestion run
 */
export function logIngestionStart(
    source: CreativeSource,
    industry: string,
    niche?: string,
    region?: string
): number {
    const db = getCreativeMemoryDb();

    const result = db.prepare(`
    INSERT INTO ingestion_log (source, industry, niche, region, creatives_ingested, started_at, status)
    VALUES (?, ?, ?, ?, 0, datetime('now'), 'running')
  `).run(source, industry, niche || null, region || null);

    return result.lastInsertRowid as number;
}

/**
 * Log the completion of an ingestion run
 */
export function logIngestionComplete(
    logId: number,
    creativesIngested: number,
    error?: string
): void {
    const db = getCreativeMemoryDb();

    db.prepare(`
    UPDATE ingestion_log 
    SET completed_at = datetime('now'), 
        creatives_ingested = ?,
        status = ?,
        error_message = ?
    WHERE id = ?
  `).run(
        creativesIngested,
        error ? 'failed' : 'completed',
        error || null,
        logId
    );
}

/**
 * Get recent ingestion logs
 */
export function getRecentIngestionLogs(limit: number = 20): any[] {
    const db = getCreativeMemoryDb();

    return db.prepare(`
    SELECT * FROM ingestion_log 
    ORDER BY started_at DESC 
    LIMIT ?
  `).all(limit);
}
