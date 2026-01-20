/**
 * Creative Memory Source Base
 * Abstract base class for all creative memory ingestion sources
 */

import {
    CreativeObject,
    CreativeSource,
    CreativeSourceTier,
    CreativeSignals,
    HookType,
    CTAType,
    VisualStyle,
    CreativeFormat,
    SOURCE_TIERS,
    TrackedIndustry,
    INDUSTRY_KEYWORDS,
} from '../../types/creativeMemoryTypes.js';

export abstract class CreativeMemorySourceBase {
    abstract readonly sourceId: CreativeSource;
    abstract readonly displayName: string;

    get tier(): CreativeSourceTier {
        return SOURCE_TIERS[this.sourceId];
    }

    /**
     * Ingest creatives for a given industry/niche
     */
    abstract ingestByIndustry(industry: TrackedIndustry, region?: string): Promise<CreativeObject[]>;

    /**
     * Check if the source is available (has credentials, is accessible)
     */
    abstract isAvailable(): boolean;

    /**
     * Get keywords for searching by industry
     */
    protected getIndustryKeywords(industry: TrackedIndustry): string[] {
        return INDUSTRY_KEYWORDS[industry] || ['general'];
    }

    /**
     * Generate a unique ID for a creative
     */
    protected generateId(originalId: string): string {
        return `${this.sourceId}:${originalId}`;
    }

    /**
     * Infer hook type from text content
     */
    protected inferHookType(text: string): HookType {
        if (!text) return 'unknown';

        const lowerText = text.toLowerCase();

        // Question hook
        if (text.includes('?') || lowerText.startsWith('did you') || lowerText.startsWith('have you') ||
            lowerText.startsWith('are you') || lowerText.startsWith('do you')) {
            return 'question';
        }

        // Statistic hook
        if (/\d+%|\d+ out of \d+|\d+x|\d+ million|\d+ billion/i.test(text)) {
            return 'statistic';
        }

        // Offer hook
        if (/\d+% off|sale|discount|free|limited time|offer|deal/i.test(lowerText)) {
            return 'offer';
        }

        // Problem hook
        if (/tired of|struggling|frustrated|problem|pain|challenge|difficult/i.test(lowerText)) {
            return 'problem';
        }

        // Benefit hook
        if (/get |save |earn |grow |boost |increase |improve |achieve /i.test(lowerText)) {
            return 'benefit';
        }

        // Testimonial hook (quoted text or review-like)
        if (text.startsWith('"') || text.startsWith("'") || /★|⭐|rating|review|said/i.test(lowerText)) {
            return 'testimonial';
        }

        // Story hook
        if (/once upon|journey|story|when i|how i|my experience/i.test(lowerText)) {
            return 'story';
        }

        // Authority hook
        if (/expert|trusted|#1|leading|award|certified|official/i.test(lowerText)) {
            return 'authority';
        }

        // Shock hook
        if (/shocking|unbelievable|you won't believe|secret|exposed|truth about/i.test(lowerText)) {
            return 'shock';
        }

        return 'benefit'; // Default to benefit as most common
    }

    /**
     * Infer CTA type from CTA text
     */
    protected inferCTAType(ctaText: string): CTAType {
        if (!ctaText) return 'none';

        const lowerCTA = ctaText.toLowerCase().replace(/[^a-z\s]/g, '');

        const ctaMap: Record<string, CTAType> = {
            'learn more': 'learn_more',
            'shop now': 'shop_now',
            'buy now': 'shop_now',
            'sign up': 'sign_up',
            'get started': 'get_started',
            'start now': 'get_started',
            'book now': 'book_now',
            'reserve': 'book_now',
            'download': 'download',
            'get app': 'download',
            'install': 'download',
            'contact us': 'contact_us',
            'contact': 'contact_us',
            'watch now': 'watch_now',
            'watch video': 'watch_now',
            'apply now': 'apply_now',
            'apply': 'apply_now',
            'subscribe': 'subscribe',
            'try free': 'try_free',
            'free trial': 'try_free',
            'start free': 'try_free',
        };

        for (const [pattern, type] of Object.entries(ctaMap)) {
            if (lowerCTA.includes(pattern)) {
                return type;
            }
        }

        return 'custom';
    }

    /**
     * Infer visual style from creative metadata
     */
    protected inferVisualStyle(metadata: {
        hasFace?: boolean;
        hasProduct?: boolean;
        isUGC?: boolean;
        hasAnimation?: boolean;
        hasChart?: boolean;
        hasQuote?: boolean;
        imageCount?: number;
    }): VisualStyle {
        if (metadata.isUGC) return 'ugc';
        if (metadata.hasAnimation) return 'animated';
        if (metadata.hasChart) return 'infographic';
        if (metadata.hasQuote && metadata.hasFace) return 'testimonial';
        if (metadata.imageCount && metadata.imageCount > 2) return 'collage';
        if (metadata.hasFace && !metadata.hasProduct) return 'lifestyle';
        if (metadata.hasProduct && !metadata.hasFace) return 'product_focus';
        if (metadata.hasFace && metadata.hasProduct) return 'lifestyle';
        return 'minimal';
    }

    /**
     * Determine message length category
     */
    protected getMessageLength(text: string): 'short' | 'medium' | 'long' {
        if (!text) return 'short';
        const length = text.length;
        if (length < 50) return 'short';
        if (length < 150) return 'medium';
        return 'long';
    }

    /**
     * Detect if text contains price information
     */
    protected hasPrice(text: string): boolean {
        if (!text) return false;
        return /[$€£₹¥][\d,]+|[\d,]+\s*(usd|eur|gbp|inr|dollar|rupee)/i.test(text);
    }

    /**
     * Detect if text contains offer/discount
     */
    protected hasOffer(text: string): boolean {
        if (!text) return false;
        return /\d+%\s*off|sale|discount|free|limited time|special offer|deal|save \d+/i.test(text);
    }

    /**
     * Create a base creative object with common properties
     */
    protected createCreativeObject(params: {
        originalId: string;
        advertiserName: string;
        advertiserId?: string;
        advertiserDomain?: string;
        industry: string;
        niche?: string;
        category?: string;
        format: CreativeFormat;
        platforms: string[];
        regions: string[];
        signals: CreativeSignals;
        sourceUrl?: string;
        firstSeen?: string;
        lastSeen?: string;
    }): CreativeObject {
        const now = new Date().toISOString();

        return {
            id: this.generateId(params.originalId),
            source: this.sourceId,
            sourceTier: this.tier,
            sourceUrl: params.sourceUrl,
            advertiserName: params.advertiserName,
            advertiserId: params.advertiserId,
            advertiserDomain: params.advertiserDomain,
            industry: params.industry,
            niche: params.niche,
            category: params.category,
            format: params.format,
            platforms: params.platforms,
            regions: params.regions,
            signals: params.signals,
            firstSeen: params.firstSeen || now,
            lastSeen: params.lastSeen || now,
            indexedAt: now,
        };
    }

    /**
     * Log with source prefix
     */
    protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const prefix = `[CreativeMemory:${this.sourceId.toUpperCase()}]`;
        if (level === 'error') {
            console.error(`${prefix} ${message}`);
        } else if (level === 'warn') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}
