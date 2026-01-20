/**
 * Creative Memory Types
 * Core type definitions for the Comparative Creative Memory Layer
 * 
 * This is a backend-only intelligence system that ingests competitor ads
 * and generates structured context for Gemini analysis.
 */

// =============================================================================
// SOURCE DEFINITIONS
// =============================================================================

/**
 * Tier 1: Official platform libraries (authoritative, influences scoring)
 * Tier 2: Open archives (contextual breadth, does NOT influence scoring)
 */
export type CreativeSourceTier = 1 | 2;

export type CreativeSource =
    // Tier 1: Official Platform Libraries
    | 'meta'      // Meta Ad Library (Facebook + Instagram)
    | 'google'    // Google Ads Transparency Center
    | 'tiktok'    // TikTok Creative Center
    | 'linkedin'  // LinkedIn Ad Library
    | 'snapchat'  // Snapchat Ads Library
    | 'pinterest' // Pinterest Ads Library (EU)
    // Tier 2: Open Archives
    | 'adsspot'         // AdsSpot India
    | 'digitaltripathi' // Digital Tripathi
    | 'advigator'       // Advigator Library
    | 'adforum'         // AdForum
    | 'adsoftheworld';  // Ads of the World

export const SOURCE_TIERS: Record<CreativeSource, CreativeSourceTier> = {
    meta: 1,
    google: 1,
    tiktok: 1,
    linkedin: 1,
    snapchat: 1,
    pinterest: 1,
    adsspot: 2,
    digitaltripathi: 2,
    advigator: 2,
    adforum: 2,
    adsoftheworld: 2,
};

// =============================================================================
// CREATIVE SIGNALS (Observable Only - No Performance Inference)
// =============================================================================

export type HookType =
    | 'question'      // "Did you know...?"
    | 'statistic'     // "9 out of 10 customers..."
    | 'testimonial'   // Quote from customer
    | 'shock'         // Surprising/unexpected opener
    | 'problem'       // Pain point focus
    | 'benefit'       // Direct benefit statement
    | 'story'         // Narrative opening
    | 'offer'         // Deal/discount lead
    | 'authority'     // Expert/brand authority
    | 'unknown';

export type CTAType =
    | 'learn_more'
    | 'shop_now'
    | 'sign_up'
    | 'get_started'
    | 'book_now'
    | 'download'
    | 'contact_us'
    | 'watch_now'
    | 'apply_now'
    | 'subscribe'
    | 'try_free'
    | 'custom'
    | 'none';

export type VisualStyle =
    | 'minimal'       // Clean, whitespace-heavy
    | 'bold'          // Strong typography, high contrast
    | 'lifestyle'     // People in context
    | 'product_focus' // Product hero shot
    | 'ugc'           // User-generated content style
    | 'animated'      // Motion graphics
    | 'testimonial'   // Face/quote focus
    | 'infographic'   // Data visualization
    | 'collage'       // Multiple images
    | 'unknown';

export type CreativeFormat = 'image' | 'video' | 'carousel' | 'text' | 'html';

/**
 * Observable creative signals extracted from ads
 * NO performance metrics (spend, impressions, conversions)
 */
export interface CreativeSignals {
    hookType: HookType;
    hookText?: string;           // First 100 chars of hook
    ctaType: CTAType;
    ctaText?: string;
    visualStyle: VisualStyle;
    messageLength: 'short' | 'medium' | 'long';  // <50, 50-150, >150 chars
    hasPrice: boolean;
    hasOffer: boolean;           // Discount, sale, limited time
    hasFace: boolean;            // Human face present
    hasProduct: boolean;         // Product image present
    colorDominant?: string;      // Primary color (hex or name)
    colorScheme?: 'light' | 'dark' | 'colorful' | 'monochrome';
    hasLogo: boolean;
    logoPosition?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
    aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9' | 'other';
}

// =============================================================================
// CREATIVE OBJECT (Normalized from any source)
// =============================================================================

export interface CreativeObject {
    id: string;                  // Unique ID (source:originalId)
    source: CreativeSource;
    sourceTier: CreativeSourceTier;
    sourceUrl?: string;          // Link to original ad (for reference only)

    // Advertiser info
    advertiserName: string;
    advertiserId?: string;
    advertiserDomain?: string;

    // Classification
    industry: string;            // FMCG, BFSI, Auto, Health, Tech, etc.
    niche?: string;              // More specific: "luxury cars", "fintech apps"
    category?: string;           // Product category

    // Format and distribution
    format: CreativeFormat;
    platforms: string[];         // Where it ran: ['facebook', 'instagram']
    regions: string[];           // Country codes: ['IN', 'US']

    // Observable signals
    signals: CreativeSignals;

    // Timing (for recurrence analysis)
    firstSeen: string;           // ISO date
    lastSeen: string;            // ISO date

    // Internal tracking
    indexedAt: string;           // When we ingested it
    hash?: string;               // Content hash for deduplication
}

// =============================================================================
// PATTERN DISTRIBUTIONS (Aggregated Intelligence)
// =============================================================================

export interface PatternDistribution {
    industry: string;
    niche: string;
    region: string;              // 'global' or country code
    sampleSize: number;          // Number of creatives analyzed

    // Distribution maps (pattern -> percentage)
    hookDistribution: Record<HookType, number>;
    ctaDistribution: Record<CTAType, number>;
    formatDistribution: Record<CreativeFormat, number>;
    visualStyleDistribution: Record<VisualStyle, number>;

    // Derived insights
    dominantPatterns: string[];      // Top 3-5 most common patterns
    saturatedPatterns: string[];     // Patterns appearing >50%
    underutilizedPatterns: string[]; // Patterns appearing <10%

    // Quality signals
    tier1Percentage: number;         // % of sample from authoritative sources

    // Timestamps
    generatedAt: string;
    expiresAt: string;
}

// =============================================================================
// COMPETITIVE CONTEXT (Structured injection for Gemini)
// =============================================================================

export interface CompetitiveContext {
    detected_industry: string;
    detected_niche: string;
    confidence: 'high' | 'medium' | 'low';
    sample_size: number;

    niche_patterns: {
        dominant_hooks: string[];        // ["question hooks", "benefit statements"]
        saturated_ctas: string[];        // CTAs used by >40% of competitors
        common_formats: string[];        // Most used formats
        visual_conventions: string[];    // Common visual approaches
        messaging_patterns: string[];    // Common messaging themes
    };

    differentiation_signals: {
        underutilized_hooks: string[];   // Hook types rarely used
        uncommon_formats: string[];      // Formats competitors avoid
        messaging_gaps: string[];        // Messaging angles not covered
        visual_opportunities: string[];  // Underused visual styles
    };

    risk_indicators: {
        over_conformity_patterns: string[];  // "Your hook matches 78% of competitors"
        saturation_warnings: string[];       // "This CTA type is saturated"
        differentiation_risks: string[];     // "May blend into niche noise"
    };

    generated_at: string;
}

// =============================================================================
// STORAGE TYPES
// =============================================================================

export interface CreativeMemoryRecord {
    id: string;
    creative: CreativeObject;
    industryHash: string;        // For quick industry lookups
    nicheHash?: string;          // For quick niche lookups
    createdAt: string;
    expiresAt: string;           // TTL for cleanup
}

export interface PatternDistributionRecord {
    id: string;
    industry: string;
    niche: string;
    region: string;
    distribution: PatternDistribution;
    createdAt: string;
    expiresAt: string;
}

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

export interface CreativeMemoryConfig {
    // TTL settings (in hours)
    creativeTTL: number;         // Default: 168 (7 days)
    patternTTL: number;          // Default: 24 (1 day)

    // Ingestion settings
    maxCreativesPerNiche: number;  // Default: 500
    maxCreativesPerIngest: number; // Default: 100

    // Analysis settings
    minSampleForHighConfidence: number;  // Default: 50
    minSampleForMediumConfidence: number; // Default: 20

    // Source priorities
    enabledSources: CreativeSource[];
}

export const DEFAULT_CONFIG: CreativeMemoryConfig = {
    creativeTTL: 168,
    patternTTL: 24,
    maxCreativesPerNiche: 500,
    maxCreativesPerIngest: 100,
    minSampleForHighConfidence: 50,
    minSampleForMediumConfidence: 20,
    enabledSources: ['meta', 'google', 'tiktok', 'linkedin', 'snapchat', 'pinterest'],
};

// =============================================================================
// TRACKED INDUSTRIES
// =============================================================================

export const TRACKED_INDUSTRIES = [
    'FMCG',
    'BFSI',
    'Auto',
    'Health',
    'Tech',
    'Retail',
    'Telecom',
    'F&B',
    'Entertainment',
    'Real Estate',
    'Education',
    'Travel',
    'Fashion',
    'Beauty',
    'Other'
] as const;

export type TrackedIndustry = typeof TRACKED_INDUSTRIES[number];

// Industry to niche keyword mappings for search
export const INDUSTRY_KEYWORDS: Record<TrackedIndustry, string[]> = {
    'FMCG': ['consumer goods', 'packaged goods', 'household', 'personal care', 'food products'],
    'BFSI': ['banking', 'finance', 'insurance', 'fintech', 'investment', 'loans', 'credit'],
    'Auto': ['automobile', 'cars', 'vehicles', 'automotive', 'motorcycles', 'EV'],
    'Health': ['healthcare', 'pharma', 'medical', 'wellness', 'fitness', 'hospital'],
    'Tech': ['technology', 'software', 'SaaS', 'apps', 'gadgets', 'electronics'],
    'Retail': ['shopping', 'ecommerce', 'online store', 'marketplace', 'retail'],
    'Telecom': ['telecom', 'mobile', 'internet', 'broadband', '5G', 'connectivity'],
    'F&B': ['food', 'beverage', 'restaurant', 'delivery', 'cafe', 'dining'],
    'Entertainment': ['streaming', 'gaming', 'movies', 'music', 'media', 'OTT'],
    'Real Estate': ['property', 'real estate', 'housing', 'apartments', 'construction'],
    'Education': ['education', 'edtech', 'learning', 'courses', 'university', 'school'],
    'Travel': ['travel', 'tourism', 'hotels', 'flights', 'vacation', 'booking'],
    'Fashion': ['fashion', 'clothing', 'apparel', 'accessories', 'lifestyle'],
    'Beauty': ['beauty', 'cosmetics', 'skincare', 'makeup', 'grooming'],
    'Other': ['general', 'miscellaneous'],
};
