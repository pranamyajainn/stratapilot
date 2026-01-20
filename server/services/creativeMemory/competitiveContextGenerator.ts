/**
 * Competitive Context Generator
 * Generates structured context for Gemini injection
 * 
 * This is the bridge between the Creative Memory Layer and Gemini analysis.
 * It transforms pattern distributions into structured diagnostic constraints.
 */

import {
    CompetitiveContext,
    PatternDistribution,
    CreativeSignals,
    CreativeFormat,
    TrackedIndustry,
    TRACKED_INDUSTRIES,
    INDUSTRY_KEYWORDS,
    DEFAULT_CONFIG,
} from '../../types/creativeMemoryTypes.js';
import { PatternAnalyzer } from './patternAnalyzer.js';
import {
    getPatternDistribution,
    getCreativesByIndustry,
    storePatternDistribution,
} from './creativeMemoryStore.js';
import { MetaCreativeMemory } from './metaCreativeMemory.js';
import { GoogleCreativeMemory } from './googleCreativeMemory.js';

export class CompetitiveContextGenerator {
    private patternAnalyzer: PatternAnalyzer;
    private metaSource: MetaCreativeMemory;
    private googleSource: GoogleCreativeMemory;

    constructor() {
        this.patternAnalyzer = new PatternAnalyzer();
        this.metaSource = new MetaCreativeMemory();
        this.googleSource = new GoogleCreativeMemory();
    }

    /**
     * Generate competitive context for a detected industry
     * This is the main entry point called during analysis
     */
    async generateContext(
        industry: string,
        niche: string = 'general',
        region: string = 'global'
    ): Promise<CompetitiveContext> {
        console.log(`[CompetitiveContext] Generating for: ${industry} / ${niche} / ${region}`);

        // Try to get cached pattern distribution
        let distribution = getPatternDistribution(industry, niche, region);

        if (!distribution || distribution.sampleSize === 0) {
            console.log('[CompetitiveContext] No cached distribution, building from sources...');
            distribution = await this.buildDistribution(industry as TrackedIndustry, niche, region);
        }

        return this.distributionToContext(distribution);
    }

    /**
     * Build pattern distribution from ingested creatives
     */
    private async buildDistribution(
        industry: TrackedIndustry,
        niche: string,
        region: string
    ): Promise<PatternDistribution> {
        // First check if we have creatives in the database
        let creatives = getCreativesByIndustry(industry, 500);

        // If not enough data, try to ingest from sources
        if (creatives.length < DEFAULT_CONFIG.minSampleForMediumConfidence) {
            console.log('[CompetitiveContext] Insufficient data, ingesting from sources...');

            // Ingest from available sources
            try {
                if (this.metaSource.isAvailable()) {
                    const metaCreatives = await this.metaSource.ingestByIndustry(industry, region === 'global' ? 'IN' : region);
                    creatives = [...creatives, ...metaCreatives];
                }
            } catch (error: any) {
                console.warn('[CompetitiveContext] Meta ingestion failed:', error.message);
            }

            try {
                const googleCreatives = await this.googleSource.ingestByIndustry(industry, region);
                creatives = [...creatives, ...googleCreatives];
            } catch (error: any) {
                console.warn('[CompetitiveContext] Google ingestion failed:', error.message);
            }
        }

        // Analyze the creatives
        const distribution = this.patternAnalyzer.analyzeCreatives(
            creatives,
            industry,
            niche,
            region
        );

        // Cache the distribution
        if (distribution.sampleSize > 0) {
            storePatternDistribution(distribution);
        }

        return distribution;
    }

    /**
     * Convert pattern distribution to competitive context structure
     */
    private distributionToContext(distribution: PatternDistribution): CompetitiveContext {
        const confidence = this.determineConfidence(distribution.sampleSize, distribution.tier1Percentage);

        // Extract top patterns from distributions
        const dominantHooks = this.getTopPatterns(distribution.hookDistribution, 3);
        const saturatedCTAs = this.getTopPatterns(distribution.ctaDistribution, 3, 0.3);
        const commonFormats = this.getTopPatterns(distribution.formatDistribution, 2);
        const visualConventions = this.getTopPatterns(distribution.visualStyleDistribution, 2);

        // Extract differentiation opportunities
        const underutilizedHooks = distribution.underutilizedPatterns
            .filter(p => p.startsWith('hook:'))
            .map(p => p.replace('hook:', ''))
            .slice(0, 3);

        const uncommonFormats = distribution.underutilizedPatterns
            .filter(p => p.startsWith('format:'))
            .map(p => p.replace('format:', ''))
            .slice(0, 2);

        // Build risk indicators based on saturation
        const overConformityPatterns: string[] = [];
        const saturationWarnings: string[] = [];

        for (const saturated of distribution.saturatedPatterns) {
            const [type, value] = saturated.split(':');
            if (type === 'hook') {
                overConformityPatterns.push(`"${value}" hook is used by ${Math.round(distribution.hookDistribution[value as keyof typeof distribution.hookDistribution] * 100)}% of competitors`);
            }
            if (type === 'cta') {
                saturationWarnings.push(`"${value}" CTA is saturated in this niche`);
            }
        }

        return {
            detected_industry: distribution.industry,
            detected_niche: distribution.niche,
            confidence,
            sample_size: distribution.sampleSize,

            niche_patterns: {
                dominant_hooks: dominantHooks,
                saturated_ctas: saturatedCTAs,
                common_formats: commonFormats,
                visual_conventions: visualConventions,
                messaging_patterns: distribution.dominantPatterns.slice(0, 5),
            },

            differentiation_signals: {
                underutilized_hooks: underutilizedHooks,
                uncommon_formats: uncommonFormats,
                messaging_gaps: this.inferMessagingGaps(distribution),
                visual_opportunities: this.inferVisualOpportunities(distribution),
            },

            risk_indicators: {
                over_conformity_patterns: overConformityPatterns.slice(0, 3),
                saturation_warnings: saturationWarnings.slice(0, 3),
                differentiation_risks: this.inferDifferentiationRisks(distribution),
            },

            generated_at: new Date().toISOString(),
        };
    }

    /**
     * Format competitive context for Gemini system instruction
     * This is the text that gets injected into the AI prompt
     */
    formatForGemini(context: CompetitiveContext): string {
        if (context.sample_size === 0) {
            return `
**COMPETITIVE CONTEXT:**
Industry: ${context.detected_industry}
Note: Insufficient comparative data available. Analysis will proceed without niche benchmarks.
`;
        }

        return `
**COMPETITIVE CREATIVE CONTEXT (Backend Intelligence)**
Industry: ${context.detected_industry} | Niche: ${context.detected_niche}
Confidence: ${context.confidence} (based on ${context.sample_size} competitor creatives)

━━━ NICHE SATURATION ANALYSIS ━━━
• Dominant hook patterns: ${context.niche_patterns.dominant_hooks.join(', ') || 'Varied'}
• Saturated CTAs (high usage): ${context.niche_patterns.saturated_ctas.join(', ') || 'None identified'}
• Common ad formats: ${context.niche_patterns.common_formats.join(', ') || 'Mixed'}
• Visual conventions: ${context.niche_patterns.visual_conventions.join(', ') || 'Varied'}

━━━ DIFFERENTIATION OPPORTUNITIES ━━━
• Underutilized hook types: ${context.differentiation_signals.underutilized_hooks.join(', ') || 'None identified'}
• Uncommon formats: ${context.differentiation_signals.uncommon_formats.join(', ') || 'Standard mix'}
• Messaging gaps: ${context.differentiation_signals.messaging_gaps.join(', ') || 'No clear gaps'}
• Visual opportunities: ${context.differentiation_signals.visual_opportunities.join(', ') || 'Standard approaches dominate'}

━━━ DIAGNOSTIC CONSTRAINTS ━━━
When evaluating this creative against the competitive landscape:

1. **Over-Conformity Check**: Flag if the creative's hook, CTA, or visual approach matches saturated patterns. 
   Risk patterns: ${context.risk_indicators.over_conformity_patterns.join('; ') || 'None flagged'}

2. **Differentiation Assessment**: Note if the creative leverages underutilized approaches that could stand out.
   
3. **Saturation Warnings**: ${context.risk_indicators.saturation_warnings.join('; ') || 'No current warnings'}

4. **In adDiagnostics commentary**: Include phrases like:
   - "Your [hook/CTA/format] aligns with X% of category competitors"
   - "Consider differentiation via [underutilized approach]"
   - "Risk: Creative may blend into niche noise"

Do NOT rank competitors or provide inspiration galleries. Use competitive data only to EXPLAIN why the creative may underperform or over-conform.
`;
    }

    /**
     * Determine confidence level based on sample size and tier1 percentage
     */
    private determineConfidence(
        sampleSize: number,
        tier1Percentage: number
    ): 'high' | 'medium' | 'low' {
        if (sampleSize >= DEFAULT_CONFIG.minSampleForHighConfidence && tier1Percentage >= 50) {
            return 'high';
        }
        if (sampleSize >= DEFAULT_CONFIG.minSampleForMediumConfidence) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Get top patterns from a distribution
     */
    private getTopPatterns(
        distribution: Record<string, number>,
        limit: number,
        minThreshold: number = 0.15
    ): string[] {
        return Object.entries(distribution)
            .filter(([key, value]) => value >= minThreshold && key !== 'unknown' && key !== 'none')
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([key, value]) => `${key} (${Math.round(value * 100)}%)`);
    }

    /**
     * Infer messaging gaps from distribution patterns
     */
    private inferMessagingGaps(distribution: PatternDistribution): string[] {
        const gaps: string[] = [];

        // Check for missing story/authority hooks
        if ((distribution.hookDistribution['story'] || 0) < 0.05) {
            gaps.push('Narrative/story-driven messaging');
        }
        if ((distribution.hookDistribution['authority'] || 0) < 0.05) {
            gaps.push('Authority/expert positioning');
        }
        if ((distribution.hookDistribution['question'] || 0) < 0.10) {
            gaps.push('Engagement-driving questions');
        }

        return gaps.slice(0, 3);
    }

    /**
     * Infer visual opportunities from distribution
     */
    private inferVisualOpportunities(distribution: PatternDistribution): string[] {
        const opportunities: string[] = [];

        if ((distribution.visualStyleDistribution['ugc'] || 0) < 0.10) {
            opportunities.push('User-generated content style');
        }
        if ((distribution.visualStyleDistribution['infographic'] || 0) < 0.10) {
            opportunities.push('Data visualization/infographic');
        }
        if ((distribution.visualStyleDistribution['testimonial'] || 0) < 0.15) {
            opportunities.push('Testimonial-focused visuals');
        }

        return opportunities.slice(0, 2);
    }

    /**
     * Infer differentiation risks
     */
    private inferDifferentiationRisks(distribution: PatternDistribution): string[] {
        const risks: string[] = [];

        // If multiple patterns are saturated, creative may blend in
        if (distribution.saturatedPatterns.length >= 3) {
            risks.push('High saturation across multiple dimensions - creative may fail to differentiate');
        }

        // If sample size is high but patterns are uniform
        if (distribution.sampleSize > 30) {
            const topHook = Object.values(distribution.hookDistribution).sort((a, b) => b - a)[0];
            if (topHook > 0.6) {
                risks.push('Dominant hook pattern controls 60%+ of niche - conformity is default');
            }
        }

        return risks;
    }

    /**
     * Infer industry from text context
     * Used when industry is not explicitly provided
     */
    static inferIndustryFromContext(textContext: string): TrackedIndustry | null {
        if (!textContext) return null;

        const lowerContext = textContext.toLowerCase();

        // Check each industry's keywords
        for (const industry of TRACKED_INDUSTRIES) {
            const keywords = INDUSTRY_KEYWORDS[industry];
            for (const keyword of keywords) {
                if (lowerContext.includes(keyword.toLowerCase())) {
                    return industry;
                }
            }
        }

        return null;
    }
}
