/**
 * Input Capability Classifier
 * Determines what sections can be reliably inferred from input signals
 */

export type CapabilityLevel = 'LOW' | 'MODERATE_TEXT' | 'MODERATE_VISUAL' | 'HIGH';

interface InputSignals {
    hasMedia: boolean;
    hasLogo: boolean;
    hasBrandName: boolean;
    hasBrandValues: boolean;
    textContextLength: number;
    visualFeatureCount: number;
    brandMentions: number;
}

interface ClassificationResult {
    level: CapabilityLevel;
    score: number;
    signals: InputSignals;
    reasoning: string;
}

/**
 * Classify input richness to determine appropriate prompt template
 */
export function classifyInputCapability(
    textContext: string,
    hasMedia: boolean,
    visualFeatures?: any
): ClassificationResult {
    const signals: InputSignals = {
        hasMedia,
        hasLogo: visualFeatures?.logoDetected || false,
        hasBrandName: detectBrandName(textContext),
        hasBrandValues: detectBrandValues(textContext),
        textContextLength: textContext.length,
        visualFeatureCount: calculateVisualFeatureCount(visualFeatures),
        brandMentions: countBrandMentions(textContext)
    };

    const score = calculateCapabilityScore(signals);
    const level = determineCapabilityLevel(score, signals);
    const reasoning = generateReasoning(level, signals);

    console.log('[INPUT-CLASSIFY] Capability:', level, `(score: ${score}/100)`);
    console.log('[INPUT-CLASSIFY] Signals:', JSON.stringify(signals));

    return { level, score, signals, reasoning };
}

/**
 * Calculate capability score (0-100)
 */
function calculateCapabilityScore(signals: InputSignals): number {
    let score = 0;

    // Visual signals (max 40 points)
    if (signals.hasMedia) score += 20;
    if (signals.hasLogo) score += 10;
    if (signals.visualFeatureCount > 10) score += 10;

    // Brand signals (max 40 points)
    if (signals.hasBrandName) score += 10;
    if (signals.hasBrandValues) score += 20;
    if (signals.brandMentions > 2) score += 10;

    // Context signals (max 20 points)
    if (signals.textContextLength > 200) score += 10;
    if (signals.textContextLength > 500) score += 10;

    return score;
}

/**
 * Determine capability level from score and signal profile
 */
function determineCapabilityLevel(score: number, signals: InputSignals): CapabilityLevel {
    // HIGH: Rich media + brand context
    if (score >= 60 && signals.hasMedia && (signals.hasBrandName || signals.hasBrandValues)) {
        return 'HIGH';
    }

    // MODERATE_VISUAL: Media without brand context
    if (signals.hasMedia && !signals.hasBrandValues) {
        return 'MODERATE_VISUAL';
    }

    // MODERATE_TEXT: No media but has brand details
    if (!signals.hasMedia && signals.hasBrandValues) {
        return 'MODERATE_TEXT';
    }

    // LOW: Sparse text only
    return 'LOW';
}

/**
 * Detect brand name in text
 */
function detectBrandName(text: string): boolean {
    // Look for explicit brand/company mentions
    const brandPatterns = [
        /brand:\s*([A-Z][a-zA-Z0-9&\s]+)/i,
        /company:\s*([A-Z][a-zA-Z0-9&\s]+)/i,
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:ad|advertisement|campaign|brand)\b/
    ];

    return brandPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect brand values/positioning in text
 */
function detectBrandValues(text: string): boolean {
    const valueKeywords = [
        'values', 'mission', 'positioning', 'brand personality',
        'tone of voice', 'brand voice', 'brand attributes',
        'target audience', 'brand promise', 'brand essence'
    ];

    const lowerText = text.toLowerCase();
    const keywordCount = valueKeywords.filter(kw => lowerText.includes(kw)).length;

    // Require at least 2 keywords and substantial context
    return keywordCount >= 2 && text.length > 150;
}

/**
 * Count brand-related mentions (weight for brand context richness)
 */
function countBrandMentions(text: string): number {
    const brandTerms = [
        'brand', 'company', 'product', 'service',
        'positioning', 'values', 'mission', 'personality'
    ];

    const lowerText = text.toLowerCase();
    return brandTerms.reduce((count, term) => {
        const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'gi'));
        return count + (matches ? matches.length : 0);
    }, 0);
}

/**
 * Calculate visual feature richness
 */
function calculateVisualFeatureCount(features: any): number {
    if (!features) return 0;

    let count = 0;
    count += features.objects?.length || 0;
    count += features.colors?.length || 0;
    count += features.textOverlays?.length || 0;
    count += features.humanPresence ? 5 : 0;
    count += features.logoDetected ? 5 : 0;
    count += features.emotionalTone?.length || 0;

    return count;
}

/**
 * Generate human-readable reasoning for classification
 */
function generateReasoning(level: CapabilityLevel, signals: InputSignals): string {
    const parts: string[] = [];

    if (signals.hasMedia) {
        parts.push(`visual features (${signals.visualFeatureCount} elements)`);
    } else {
        parts.push('no media');
    }

    if (signals.hasBrandValues) {
        parts.push('brand positioning context');
    } else if (signals.hasBrandName) {
        parts.push('brand name only');
    }

    parts.push(`text: ${signals.textContextLength} chars`);

    return `${level}: ${parts.join(', ')}`;
}
