/**
 * Pattern Analyzer
 * Aggregates creatives into pattern distributions and identifies saturation
 */

import {
    CreativeObject,
    CreativeSignals,
    PatternDistribution,
    HookType,
    CTAType,
    CreativeFormat,
    VisualStyle,
    DEFAULT_CONFIG,
} from '../../types/creativeMemoryTypes.js';

// All possible values for each signal type (for complete distribution maps)
const ALL_HOOK_TYPES: HookType[] = [
    'question', 'statistic', 'testimonial', 'shock', 'problem',
    'benefit', 'story', 'offer', 'authority', 'unknown'
];

const ALL_CTA_TYPES: CTAType[] = [
    'learn_more', 'shop_now', 'sign_up', 'get_started', 'book_now',
    'download', 'contact_us', 'watch_now', 'apply_now', 'subscribe',
    'try_free', 'custom', 'none'
];

const ALL_FORMATS: CreativeFormat[] = ['image', 'video', 'carousel', 'text', 'html'];

const ALL_VISUAL_STYLES: VisualStyle[] = [
    'minimal', 'bold', 'lifestyle', 'product_focus', 'ugc',
    'animated', 'testimonial', 'infographic', 'collage', 'unknown'
];

export class PatternAnalyzer {

    /**
     * Analyze a collection of creatives and generate pattern distribution
     */
    analyzeCreatives(
        creatives: CreativeObject[],
        industry: string,
        niche: string = 'general',
        region: string = 'global'
    ): PatternDistribution {
        if (creatives.length === 0) {
            return this.createEmptyDistribution(industry, niche, region);
        }

        // Count occurrences of each pattern
        const hookCounts: Record<HookType, number> = this.initializeCounts(ALL_HOOK_TYPES);
        const ctaCounts: Record<CTAType, number> = this.initializeCounts(ALL_CTA_TYPES);
        const formatCounts: Record<CreativeFormat, number> = this.initializeCounts(ALL_FORMATS);
        const visualStyleCounts: Record<VisualStyle, number> = this.initializeCounts(ALL_VISUAL_STYLES);

        let tier1Count = 0;

        // Aggregate signals from all creatives
        for (const creative of creatives) {
            hookCounts[creative.signals.hookType]++;
            ctaCounts[creative.signals.ctaType]++;
            formatCounts[creative.format]++;
            visualStyleCounts[creative.signals.visualStyle]++;

            if (creative.sourceTier === 1) {
                tier1Count++;
            }
        }

        const total = creatives.length;

        // Convert counts to percentages
        const hookDistribution = this.toPercentages(hookCounts, total);
        const ctaDistribution = this.toPercentages(ctaCounts, total);
        const formatDistribution = this.toPercentages(formatCounts, total);
        const visualStyleDistribution = this.toPercentages(visualStyleCounts, total);

        // Identify dominant patterns (>25%)
        const dominantPatterns = this.findDominantPatterns({
            hooks: hookDistribution,
            ctas: ctaDistribution,
            formats: formatDistribution,
            visuals: visualStyleDistribution,
        });

        // Identify saturated patterns (>50%)
        const saturatedPatterns = this.findSaturatedPatterns({
            hooks: hookDistribution,
            ctas: ctaDistribution,
            formats: formatDistribution,
            visuals: visualStyleDistribution,
        });

        // Identify underutilized patterns (<10%)
        const underutilizedPatterns = this.findUnderutilizedPatterns({
            hooks: hookDistribution,
            ctas: ctaDistribution,
            formats: formatDistribution,
            visuals: visualStyleDistribution,
        });

        const now = new Date().toISOString();
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + DEFAULT_CONFIG.patternTTL);

        return {
            industry,
            niche,
            region,
            sampleSize: total,
            hookDistribution,
            ctaDistribution,
            formatDistribution,
            visualStyleDistribution,
            dominantPatterns,
            saturatedPatterns,
            underutilizedPatterns,
            tier1Percentage: (tier1Count / total) * 100,
            generatedAt: now,
            expiresAt: expiryDate.toISOString(),
        };
    }

    /**
     * Compare a user's creative signals against niche patterns
     * Returns conformity analysis
     */
    analyzeConformity(
        userSignals: CreativeSignals,
        userFormat: CreativeFormat,
        distribution: PatternDistribution
    ): {
        overallConformity: number;
        hookConformity: number;
        ctaConformity: number;
        formatConformity: number;
        visualConformity: number;
        matchesSaturated: string[];
        missesOpportunities: string[];
    } {
        // Calculate how much the user's creative matches dominant patterns
        const hookConformity = (distribution.hookDistribution[userSignals.hookType] || 0) * 100;
        const ctaConformity = (distribution.ctaDistribution[userSignals.ctaType] || 0) * 100;
        const formatConformity = (distribution.formatDistribution[userFormat] || 0) * 100;
        const visualConformity = (distribution.visualStyleDistribution[userSignals.visualStyle] || 0) * 100;

        // Overall conformity is weighted average
        const overallConformity = (hookConformity * 0.3) + (ctaConformity * 0.25) +
            (formatConformity * 0.25) + (visualConformity * 0.2);

        // Find which saturated patterns the user matches
        const matchesSaturated: string[] = [];

        if (distribution.saturatedPatterns.includes(`hook:${userSignals.hookType}`)) {
            matchesSaturated.push(`Hook type "${userSignals.hookType}" is used by ${Math.round(hookConformity)}% of competitors`);
        }
        if (distribution.saturatedPatterns.includes(`cta:${userSignals.ctaType}`)) {
            matchesSaturated.push(`CTA "${userSignals.ctaType}" is saturated at ${Math.round(ctaConformity)}%`);
        }
        if (distribution.saturatedPatterns.includes(`format:${userFormat}`)) {
            matchesSaturated.push(`Format "${userFormat}" dominates at ${Math.round(formatConformity)}%`);
        }

        // Find underutilized patterns the user could leverage
        const missesOpportunities: string[] = [];

        for (const pattern of distribution.underutilizedPatterns) {
            const [type, value] = pattern.split(':');
            if (type === 'hook' && value !== userSignals.hookType) {
                missesOpportunities.push(`Consider "${value}" hook (only ${Math.round(distribution.hookDistribution[value as HookType] * 100)}% usage)`);
            }
            if (type === 'format' && value !== userFormat) {
                missesOpportunities.push(`"${value}" format is underutilized (${Math.round(distribution.formatDistribution[value as CreativeFormat] * 100)}%)`);
            }
        }

        return {
            overallConformity: Math.round(overallConformity),
            hookConformity: Math.round(hookConformity),
            ctaConformity: Math.round(ctaConformity),
            formatConformity: Math.round(formatConformity),
            visualConformity: Math.round(visualConformity),
            matchesSaturated,
            missesOpportunities: missesOpportunities.slice(0, 3), // Limit to top 3
        };
    }

    /**
     * Create an empty distribution for when no data is available
     */
    private createEmptyDistribution(
        industry: string,
        niche: string,
        region: string
    ): PatternDistribution {
        const now = new Date().toISOString();
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + DEFAULT_CONFIG.patternTTL);

        return {
            industry,
            niche,
            region,
            sampleSize: 0,
            hookDistribution: this.initializeCounts(ALL_HOOK_TYPES) as Record<HookType, number>,
            ctaDistribution: this.initializeCounts(ALL_CTA_TYPES) as Record<CTAType, number>,
            formatDistribution: this.initializeCounts(ALL_FORMATS) as Record<CreativeFormat, number>,
            visualStyleDistribution: this.initializeCounts(ALL_VISUAL_STYLES) as Record<VisualStyle, number>,
            dominantPatterns: [],
            saturatedPatterns: [],
            underutilizedPatterns: [],
            tier1Percentage: 0,
            generatedAt: now,
            expiresAt: expiryDate.toISOString(),
        };
    }

    /**
     * Initialize count object with zeros
     */
    private initializeCounts<T extends string>(keys: T[]): Record<T, number> {
        const counts = {} as Record<T, number>;
        for (const key of keys) {
            counts[key] = 0;
        }
        return counts;
    }

    /**
     * Convert counts to percentages
     */
    private toPercentages<T extends string>(counts: Record<T, number>, total: number): Record<T, number> {
        const percentages = {} as Record<T, number>;
        for (const [key, count] of Object.entries(counts)) {
            percentages[key as T] = total > 0 ? count as number / total : 0;
        }
        return percentages;
    }

    /**
     * Find patterns appearing in >25% of creatives
     */
    private findDominantPatterns(distributions: {
        hooks: Record<HookType, number>;
        ctas: Record<CTAType, number>;
        formats: Record<CreativeFormat, number>;
        visuals: Record<VisualStyle, number>;
    }): string[] {
        const dominant: string[] = [];
        const threshold = 0.25;

        for (const [hook, pct] of Object.entries(distributions.hooks)) {
            if (pct > threshold && hook !== 'unknown') {
                dominant.push(`${hook} hooks (${Math.round(pct * 100)}%)`);
            }
        }

        for (const [cta, pct] of Object.entries(distributions.ctas)) {
            if (pct > threshold && cta !== 'none' && cta !== 'custom') {
                dominant.push(`${cta} CTA (${Math.round(pct * 100)}%)`);
            }
        }

        for (const [format, pct] of Object.entries(distributions.formats)) {
            if (pct > threshold) {
                dominant.push(`${format} format (${Math.round(pct * 100)}%)`);
            }
        }

        return dominant.slice(0, 5); // Top 5
    }

    /**
     * Find patterns appearing in >50% of creatives (saturated)
     */
    private findSaturatedPatterns(distributions: {
        hooks: Record<HookType, number>;
        ctas: Record<CTAType, number>;
        formats: Record<CreativeFormat, number>;
        visuals: Record<VisualStyle, number>;
    }): string[] {
        const saturated: string[] = [];
        const threshold = 0.50;

        for (const [hook, pct] of Object.entries(distributions.hooks)) {
            if (pct > threshold) saturated.push(`hook:${hook}`);
        }

        for (const [cta, pct] of Object.entries(distributions.ctas)) {
            if (pct > threshold) saturated.push(`cta:${cta}`);
        }

        for (const [format, pct] of Object.entries(distributions.formats)) {
            if (pct > threshold) saturated.push(`format:${format}`);
        }

        for (const [visual, pct] of Object.entries(distributions.visuals)) {
            if (pct > threshold) saturated.push(`visual:${visual}`);
        }

        return saturated;
    }

    /**
     * Find patterns appearing in <10% of creatives (underutilized)
     */
    private findUnderutilizedPatterns(distributions: {
        hooks: Record<HookType, number>;
        ctas: Record<CTAType, number>;
        formats: Record<CreativeFormat, number>;
        visuals: Record<VisualStyle, number>;
    }): string[] {
        const underutilized: string[] = [];
        const threshold = 0.10;

        // Only consider meaningful patterns, not 'unknown', 'none', etc.
        const meaningfulHooks: HookType[] = ['question', 'statistic', 'testimonial', 'story', 'authority'];
        const meaningfulCTAs: CTAType[] = ['try_free', 'watch_now', 'download', 'subscribe'];
        const meaningfulFormats: CreativeFormat[] = ['carousel', 'video'];

        for (const hook of meaningfulHooks) {
            if ((distributions.hooks[hook] || 0) < threshold) {
                underutilized.push(`hook:${hook}`);
            }
        }

        for (const cta of meaningfulCTAs) {
            if ((distributions.ctas[cta] || 0) < threshold) {
                underutilized.push(`cta:${cta}`);
            }
        }

        for (const format of meaningfulFormats) {
            if ((distributions.formats[format] || 0) < threshold) {
                underutilized.push(`format:${format}`);
            }
        }

        return underutilized;
    }
}
