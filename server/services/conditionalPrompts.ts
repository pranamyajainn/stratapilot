/**
 * Conditional Prompt Templates
 * Each capability level has specific prompt instructions
 */

import type { CapabilityLevel } from './capabilityClassifier.js';

export interface PromptTemplate {
    system: string;
    userTemplate: (context: PromptContext) => string;
    allowedSections: string[];
}

interface PromptContext {
    visualContext?: string;
    textContext: string;
    analysisLabel: string;
    competitiveContext?: string;
}

/**
 * LOW Capability: Text-only, no brand details
 * - Generate core sections with hedged language
 * - Skip Brand Strategy & Archetype with explicit unavailable objects
 */
const LOW_CAPABILITY_BRAND_PROMPT: PromptTemplate = {
    system: `You are a brand strategist analyzing LIMITED CONTEXT (text-only, no visual creative).

**EPISTEMIC CONSTRAINTS:**
- Base analysis ONLY on text provided
- Use hedged language: "likely", "typical for category", "suggests"
- DO NOT infer brand strategy without visual brand identity
- DO NOT assign archetype without personality signals

**OUTPUT RULES:**
For sections requiring visual/brand signals, return structured unavailability objects.`,

    userTemplate: (ctx) => `
## USER CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

${ctx.competitiveContext ? `## COMPETITIVE CONTEXT\n${ctx.competitiveContext}` : ''}

**GENERATE:**
- brandAnalysis (basic fields): consumerInsight, functionalBenefit, emotionalBenefit, brandPersonality, reasonsToBelieve
  (Use hedged language: "likely", "suggests", "typical")

**BRAND STRATEGY WINDOW:**
Generate 10 cards based on INFERRED intent from text.
Mark confidence as "low" for visual-dependent cards (Sensorial, Distinctive Assets).
Return: { "brandStrategyWindow": [array of 10 cards] }

**BRAND ARCHETYPE:**
Infer archetype from text tone and competitive context.
{ "brandArchetypeDetail": {
    "archetype": "...",
    "value": "...",
    "quote": "[Representative quote from text]",
    "reasoning": "Inferred from verbal tone and category norms (Low Confidence)",
    "confidence": "low"
  }
}

Output valid JSON.`,

    allowedSections: ['brandAnalysis', 'brandStrategyWindow', 'brandArchetypeDetail']
};

/**
 * MODERATE_TEXT: Text with brand values, no media
 * - Generate partial Brand Strategy (positioning cards)
 * - Infer Archetype with moderate confidence if values are explicit
 */
const MODERATE_TEXT_BRAND_PROMPT: PromptTemplate = {
    system: `You are a brand strategist with MODERATE SIGNAL STRENGTH: text with stated brand values, NO visual creative.

**PARTIAL GENERATION RULES:**
- Generate brand-independent strategy cards ONLY
- Infer archetype IF brand personality explicitly stated (otherwise unavailable)
- Mark visual-dependent sections as unavailable`,

    userTemplate: (ctx) => `
## USER CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

${ctx.competitiveContext ? `## COMPETITIVE CONTEXT\n${ctx.competitiveContext}` : ''}

**BRAND STRATEGY WINDOW:**
Generate ONLY these 5 positioning-focused cards:
1. Brand Purpose (from stated mission/values)
2. Rational Promise (from stated functional benefits)
3. Emotional Promise (from stated emotional benefits)
4. Reason to Believe (from stated proof points)
5. Strategic Role (from stated market position)

Return as: { "brandStrategyWindow": [array of 5 cards] }

**BRAND STRATEGY WINDOW:**
Generate ALL 10 cards.
For visual cards (Sensorial, Assets), infer "likely" attributes based on category norms.
Return: { "brandStrategyWindow": [array of 10 cards] }

**BRAND ARCHETYPE:**
Infer archetype from stated values and tone.
{ "brandArchetypeDetail": {
    "archetype": "...",
    "value": "...",
    "quote": "...",
    "reasoning": "Based on STATED values. Inferred from verbal signals (Moderate Confidence).",
    "confidence": "moderate"
  }
}

Output valid JSON.`,

    allowedSections: ['brandAnalysis', 'brandStrategyWindow (partial)', 'brandArchetypeDetail (conditional)']
};

/**
 * MODERATE_VISUAL: Media without brand context
 * - Generate visual-dependent Strategy cards (6 cards)
 * - Skip Archetype (needs brand personality)
 */
const MODERATE_VISUAL_BRAND_PROMPT: PromptTemplate = {
    system: `You are a brand strategist with MODERATE SIGNAL STRENGTH: rich visual features, NO explicit brand context.

**VISUAL-FIRST RULES:**
- Generate visual-dependent strategy cards ONLY
- DO NOT infer brand purpose/values without stated context
- DO NOT classify archetype from visuals alone`,

    userTemplate: (ctx) => `
## VISUAL FEATURES
${ctx.visualContext}

## USER CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

**BRAND STRATEGY WINDOW:**
Generate ONLY visual-dependent cards (6 cards):
1. Sensorial Promise (colors, imagery, aesthetic mood from visuals)
2. Emotional Promise (inferred from visual narrative, expressions, scene)
3. Distinctive Assets (visible unique elements: layout, composition, motifs)
4. Memory Structure (memorable visual hooks: colors, symbols, patterns)
5. Visual Hierarchy (how message is prioritized visually)
6. Brand Linkage (logo placement, size, frequency)

Return as: { "brandStrategyWindow": [array of 6 cards] }

**BRAND STRATEGY WINDOW:**
Generate ALL 10 cards.
For brand-conceptual cards (Purpose, Role), infer from visual narrative/semiotics.
Return: { "brandStrategyWindow": [array of 10 cards] }

**BRAND ARCHETYPE:**
Infer archetype from visual mood, color psychology, and composition.
{ "brandArchetypeDetail": {
    "archetype": "...",
    "value": "...",
    "quote": "[Visual description]",
    "reasoning": "Inferred from visual semiotics and aesthetic codes (Moderate Confidence).",
    "confidence": "moderate"
  }
}

Output valid JSON.`,

    allowedSections: ['brandAnalysis', 'brandStrategyWindow (visual cards)']
};

/**
 * HIGH Capability: Media + Brand Context
 * - Generate ALL sections with high confidence
 */
const HIGH_CAPABILITY_BRAND_PROMPT: PromptTemplate = {
    system: `You are a brand strategist with HIGH SIGNAL STRENGTH: visual features + explicit brand context.

**FULL GENERATION MODE:**
- Generate all 10 Brand Strategy cards
- Classify Brand Archetype with high confidence
- Use definitive language (sufficient evidence for authoritative analysis)`,

    userTemplate: (ctx) => `
## VISUAL FEATURES
${ctx.visualContext}

## BRAND CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

${ctx.competitiveContext ? `## COMPETITIVE CONTEXT\n${ctx.competitiveContext}` : ''}

**BRAND STRATEGY WINDOW:**
Generate ALL 10 cards:
1. Brand Purpose
2. Rational Promise
3. Emotional Promise
4. Sensorial Promise
5. Reason to Believe
6. Brand Personality
7. Distinctive Assets
8. Memory Structure
9. Strategic Role
10. Value Proposition

Synthesize BOTH visual evidence and stated brand values.

**BRAND ARCHETYPE:**
Classify based on:
- Visual personality cues (color psychology, imagery, composition)
- Stated brand values/mission
- Verbal tone (if transcript available)
- Consistent patterns across visual + verbal

Return:
{ "brandArchetypeDetail": {
    "archetype": "...",
    "value": "...",
    "quote": "...",
    "reasoning": "Visual: [cues]. Brand values: [stated]. Classification reflects convergence of signals.",
    "confidence": "high"
  }
}

Output valid JSON with complete BrandAnalysis object.`,

    allowedSections: ['brandAnalysis', 'brandStrategyWindow (10 cards)', 'brandArchetypeDetail']
};

/**
 * Select prompt template based on capability level
 */
export function selectPromptTemplate(level: CapabilityLevel): PromptTemplate {
    console.log('[PROMPT-SELECT] Using template:', level);

    switch (level) {
        case 'LOW':
            return LOW_CAPABILITY_BRAND_PROMPT;
        case 'MODERATE_TEXT':
            return MODERATE_TEXT_BRAND_PROMPT;
        case 'MODERATE_VISUAL':
            return MODERATE_VISUAL_BRAND_PROMPT;
        case 'HIGH':
            return HIGH_CAPABILITY_BRAND_PROMPT;
        default:
            console.warn('[PROMPT-SELECT] Unknown capability level, defaulting to LOW');
            return LOW_CAPABILITY_BRAND_PROMPT;
    }
}
