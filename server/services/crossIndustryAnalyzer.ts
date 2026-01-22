/**
 * Cross-Industry Analyzer
 * Enables cross-category learning by comparing pattern distributions across industries
 * 
 * Use case: "What can a BFSI brand learn from top FMCG ads?"
 */

import {
    PatternDistribution,
    HookType,
    CTAType,
    VisualStyle,
    CreativeFormat,
} from '../types/creativeMemoryTypes.js';
import { getPatternDistribution } from './creativeMemory/creativeMemoryStore.js';

// =====================================================
// TYPES
// =====================================================

export interface TransferableInsight {
    category: 'hook' | 'cta' | 'visual' | 'format';
    pattern: string;
    sourceUsage: number;        // Percentage (0-100)
    targetUsage: number;        // Percentage (0-100)
    delta: number;              // Difference
    insight: string;            // Human-readable description
    recommendation: string;     // Actionable suggestion
    impact: 'high' | 'medium' | 'low';
    transferability: 'high' | 'medium' | 'low';
}

export interface CrossIndustryInsights {
    sourceIndustry: string;
    targetIndustry: string;
    sourceSampleSize: number;
    targetSampleSize: number;
    transferableInsights: TransferableInsight[];
    totalOpportunities: number;
    summary: string;
}

// =====================================================
// PATTERN COMPARISON
// =====================================================

/**
 * Compare two industries and discover transferable patterns
 */
export function discoverCrossIndustryPatterns(
    sourceIndustry: string,
    targetIndustry: string,
    niche: string = 'general',
    region: string = 'global'
): CrossIndustryInsights | null {
    // Fetch pattern distributions
    const sourcePatterns = getPatternDistribution(sourceIndustry, niche, region);
    const targetPatterns = getPatternDistribution(targetIndustry, niche, region);

    if (!sourcePatterns) {
        console.warn(`[CrossIndustry] No pattern data for source: ${sourceIndustry}`);
        return null;
    }

    if (!targetPatterns) {
        console.warn(`[CrossIndustry] No pattern data for target: ${targetIndustry}`);
        return null;
    }

    const insights: TransferableInsight[] = [];

    // Compare Hook Types
    insights.push(...compareHooks(sourcePatterns, targetPatterns, sourceIndustry, targetIndustry));

    // Compare CTA Types
    insights.push(...compareCTAs(sourcePatterns, targetPatterns, sourceIndustry, targetIndustry));

    // Compare Visual Styles
    insights.push(...compareVisualStyles(sourcePatterns, targetPatterns, sourceIndustry, targetIndustry));

    // Compare Formats
    insights.push(...compareFormats(sourcePatterns, targetPatterns, sourceIndustry, targetIndustry));

    // Sort by impact and delta
    insights.sort((a, b) => {
        const impactScore = { high: 3, medium: 2, low: 1 };
        const scoreA = impactScore[a.impact] * a.delta;
        const scoreB = impactScore[b.impact] * b.delta;
        return scoreB - scoreA;
    });

    // Generate summary
    const summary = generateSummary(insights, sourceIndustry, targetIndustry);

    return {
        sourceIndustry,
        targetIndustry,
        sourceSampleSize: sourcePatterns.sampleSize,
        targetSampleSize: targetPatterns.sampleSize,
        transferableInsights: insights.slice(0, 10), // Top 10
        totalOpportunities: insights.length,
        summary,
    };
}

// =====================================================
// PATTERN COMPARATORS
// =====================================================

function compareHooks(
    source: PatternDistribution,
    target: PatternDistribution,
    sourceIndustry: string,
    targetIndustry: string
): TransferableInsight[] {
    const insights: TransferableInsight[] = [];
    const threshold = 0.15; // 15% difference minimum

    const meaningfulHooks: HookType[] = [
        'question', 'statistic', 'testimonial', 'problem',
        'benefit', 'story', 'offer', 'authority'
    ];

    for (const hook of meaningfulHooks) {
        const sourceUsage = (source.hookDistribution[hook] || 0) * 100;
        const targetUsage = (target.hookDistribution[hook] || 0) * 100;
        const delta = Math.abs(sourceUsage - targetUsage);

        // Only include if source uses significantly more (>15% delta) and source usage > 20%
        if (sourceUsage > targetUsage && delta >= threshold * 100 && sourceUsage >= 20) {
            insights.push({
                category: 'hook',
                pattern: hook,
                sourceUsage: Math.round(sourceUsage),
                targetUsage: Math.round(targetUsage),
                delta: Math.round(delta),
                insight: `"${hook}" hooks are common in ${sourceIndustry} (${Math.round(sourceUsage)}%) but underutilized in ${targetIndustry} (${Math.round(targetUsage)}%)`,
                recommendation: generateHookRecommendation(hook, sourceIndustry, targetIndustry),
                impact: scoreImpact(delta, sourceUsage),
                transferability: scoreTransferability(hook, 'hook'),
            });
        }
    }

    return insights;
}

function compareCTAs(
    source: PatternDistribution,
    target: PatternDistribution,
    sourceIndustry: string,
    targetIndustry: string
): TransferableInsight[] {
    const insights: TransferableInsight[] = [];
    const threshold = 0.15;

    const meaningfulCTAs: CTAType[] = [
        'learn_more', 'shop_now', 'sign_up', 'get_started',
        'book_now', 'download', 'try_free', 'subscribe'
    ];

    for (const cta of meaningfulCTAs) {
        const sourceUsage = (source.ctaDistribution[cta] || 0) * 100;
        const targetUsage = (target.ctaDistribution[cta] || 0) * 100;
        const delta = Math.abs(sourceUsage - targetUsage);

        if (sourceUsage > targetUsage && delta >= threshold * 100 && sourceUsage >= 15) {
            insights.push({
                category: 'cta',
                pattern: cta,
                sourceUsage: Math.round(sourceUsage),
                targetUsage: Math.round(targetUsage),
                delta: Math.round(delta),
                insight: `"${cta}" CTA is effective in ${sourceIndustry} (${Math.round(sourceUsage)}%) but rare in ${targetIndustry} (${Math.round(targetUsage)}%)`,
                recommendation: generateCTARecommendation(cta, sourceIndustry, targetIndustry),
                impact: scoreImpact(delta, sourceUsage),
                transferability: scoreTransferability(cta, 'cta'),
            });
        }
    }

    return insights;
}

function compareVisualStyles(
    source: PatternDistribution,
    target: PatternDistribution,
    sourceIndustry: string,
    targetIndustry: string
): TransferableInsight[] {
    const insights: TransferableInsight[] = [];
    const threshold = 0.20; // Higher threshold for visual styles (harder to transfer)

    const meaningfulStyles: VisualStyle[] = [
        'lifestyle', 'product_focus', 'ugc', 'testimonial',
        'animated', 'infographic', 'bold'
    ];

    for (const style of meaningfulStyles) {
        const sourceUsage = (source.visualStyleDistribution[style] || 0) * 100;
        const targetUsage = (target.visualStyleDistribution[style] || 0) * 100;
        const delta = Math.abs(sourceUsage - targetUsage);

        if (sourceUsage > targetUsage && delta >= threshold * 100 && sourceUsage >= 25) {
            insights.push({
                category: 'visual',
                pattern: style,
                sourceUsage: Math.round(sourceUsage),
                targetUsage: Math.round(targetUsage),
                delta: Math.round(delta),
                insight: `"${style}" visual style dominates in ${sourceIndustry} (${Math.round(sourceUsage)}%) but is rare in ${targetIndustry} (${Math.round(targetUsage)}%)`,
                recommendation: generateVisualRecommendation(style, sourceIndustry, targetIndustry),
                impact: scoreImpact(delta, sourceUsage),
                transferability: scoreTransferability(style, 'visual'),
            });
        }
    }

    return insights;
}

function compareFormats(
    source: PatternDistribution,
    target: PatternDistribution,
    sourceIndustry: string,
    targetIndustry: string
): TransferableInsight[] {
    const insights: TransferableInsight[] = [];
    const threshold = 0.20;

    const formats: CreativeFormat[] = ['video', 'carousel', 'image'];

    for (const format of formats) {
        const sourceUsage = (source.formatDistribution[format] || 0) * 100;
        const targetUsage = (target.formatDistribution[format] || 0) * 100;
        const delta = Math.abs(sourceUsage - targetUsage);

        if (sourceUsage > targetUsage && delta >= threshold * 100 && sourceUsage >= 30) {
            insights.push({
                category: 'format',
                pattern: format,
                sourceUsage: Math.round(sourceUsage),
                targetUsage: Math.round(targetUsage),
                delta: Math.round(delta),
                insight: `"${format}" format is prevalent in ${sourceIndustry} (${Math.round(sourceUsage)}%) but underused in ${targetIndustry} (${Math.round(targetUsage)}%)`,
                recommendation: generateFormatRecommendation(format, sourceIndustry, targetIndustry),
                impact: scoreImpact(delta, sourceUsage),
                transferability: scoreTransferability(format, 'format'),
            });
        }
    }

    return insights;
}

// =====================================================
// RECOMMENDATION GENERATORS
// =====================================================

function generateHookRecommendation(hook: string, source: string, target: string): string {
    const hookAdvice: Record<string, string> = {
        question: `${target} brands could increase engagement by opening with relatable questions`,
        statistic: `Leverage data-driven hooks to build credibility and capture attention`,
        testimonial: `Customer quotes and reviews could humanize ${target} brand messaging`,
        problem: `Lead with pain points to create immediate relevance for ${target} audience`,
        benefit: `Direct benefit statements could clarify value proposition in ${target} ads`,
        story: `Narrative storytelling could create emotional connection in ${target} campaigns`,
        offer: `Promotional hooks could drive urgency in ${target} advertising`,
        authority: `Expert positioning could build trust in ${target} category`,
    };

    return hookAdvice[hook] || `Consider adopting "${hook}" hooks from ${source} playbook`;
}

function generateCTARecommendation(cta: string, source: string, target: string): string {
    const ctaAdvice: Record<string, string> = {
        learn_more: `Lower barrier to entry with educational CTAs`,
        shop_now: `Drive direct conversions with commerce-focused CTAs`,
        sign_up: `Build email lists and lead nurturing with signup CTAs`,
        get_started: `Reduce friction in onboarding with action-oriented CTAs`,
        book_now: `Enable immediate scheduling for service-based offerings`,
        download: `Promote app adoption or content downloads`,
        try_free: `Remove commitment anxiety with free trial CTAs`,
        subscribe: `Build recurring engagement with subscription CTAs`,
    };

    return ctaAdvice[cta] || `Test "${cta}" CTAs to align with ${source} effectiveness`;
}

function generateVisualRecommendation(style: string, source: string, target: string): string {
    const visualAdvice: Record<string, string> = {
        lifestyle: `Humanize messaging with real people in authentic contexts`,
        product_focus: `Highlight product features with clean hero shots`,
        ugc: `Build authenticity with user-generated content style`,
        testimonial: `Feature customer faces and quotes for social proof`,
        animated: `Capture attention with dynamic motion graphics`,
        infographic: `Simplify complex information with data visualizations`,
        bold: `Stand out with high-contrast, typography-driven design`,
    };

    return visualAdvice[style] || `Adopt "${style}" visual approach from ${source} success`;
}

function generateFormatRecommendation(format: string, source: string, target: string): string {
    const formatAdvice: Record<string, string> = {
        video: `Leverage video storytelling for higher engagement and emotional impact`,
        carousel: `Use multi-slide carousels to showcase features or tell stories`,
        image: `Optimize single-image clarity for quick message delivery`,
    };

    return formatAdvice[format] || `Test "${format}" format based on ${source} adoption`;
}

// =====================================================
// SCORING FUNCTIONS
// =====================================================

function scoreImpact(delta: number, sourceUsage: number): 'high' | 'medium' | 'low' {
    // High impact: Large delta (>30) and strong source usage (>40%)
    if (delta >= 30 && sourceUsage >= 40) return 'high';
    // Medium impact: Moderate delta (>20) or good source usage (>30%)
    if (delta >= 20 || sourceUsage >= 30) return 'medium';
    // Low impact: Small delta or weak source usage
    return 'low';
}

function scoreTransferability(pattern: string, category: string): 'high' | 'medium' | 'low' {
    // Visual styles are harder to transfer across industries
    if (category === 'visual') {
        if (['lifestyle', 'testimonial', 'ugc'].includes(pattern)) return 'high';
        if (['animated', 'infographic'].includes(pattern)) return 'medium';
        return 'low';
    }

    // CTAs are generally easy to transfer
    if (category === 'cta') {
        if (['learn_more', 'try_free', 'get_started'].includes(pattern)) return 'high';
        return 'medium';
    }

    // Hooks depend on messaging style
    if (category === 'hook') {
        if (['benefit', 'problem', 'question'].includes(pattern)) return 'high';
        if (['statistic', 'testimonial'].includes(pattern)) return 'medium';
        return 'low';
    }

    // Formats are generally transferable
    return 'high';
}

// =====================================================
// SUMMARY GENERATION
// =====================================================

function generateSummary(
    insights: TransferableInsight[],
    source: string,
    target: string
): string {
    if (insights.length === 0) {
        return `${source} and ${target} have similar creative patterns with no significant transferable opportunities.`;
    }

    const highImpact = insights.filter(i => i.impact === 'high').length;
    const categories = [...new Set(insights.map(i => i.category))];

    const topInsight = insights[0];

    return `${source} shows ${insights.length} transferable pattern${insights.length > 1 ? 's' : ''} for ${target} (${highImpact} high-impact). ` +
        `Key opportunity: ${topInsight.insight}. Differences span ${categories.join(', ')} strategies.`;
}

// =====================================================
// EXPORT
// =====================================================

export default {
    discoverCrossIndustryPatterns,
};
