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
    system: `You are a Senior Strategic Marketing & Brand Consultant analyzing LIMITED CONTEXT (text-only).

**MANDATE:**
- Maintain "Senior Consultant" rigor even with limited data.
- **Minimum 150 words** for the analysis section.
- Use explicit hedged language ("likely", "suggests") but explain the STRATEGIC IMPLICATIONS of these likelihoods.
- DO NOT summarize. Expand on what *is* present.

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
Generate an array of EXACTLY 10 cards based on INFERRED intent from text.
Do not omit any cards. If evidence is weak, mark content as "Inferred based on category norms".
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
    system: `You are a Senior Strategic Marketing & Brand Consultant with MODERATE SIGNAL STRENGTH (Text + Values).

**MANDATE:**
- **Depth**: Minimum 150 words per feasible section.
- **Structure**: Context -> Interpretation -> Recommendation.
- **Tone**: Advisory, precise, C-suite level.
- **Partial Generation**: Create strict brand-independent strategy cards. Infer Archetype only if specific values align.`,


    userTemplate: (ctx) => `
## USER CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

${ctx.competitiveContext ? `## COMPETITIVE CONTEXT\n${ctx.competitiveContext}` : ''}

**BRAND STRATEGY WINDOW:**
Generate an array of EXACTLY 10 cards.
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

For visual cards (Sensorial, Assets, Memory), infer "likely" attributes based on category norms if specific visual evidence is missing.
NEVER return fewer than 10 items.
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
    system: `You are a Senior Strategic Marketing & Brand Consultant with MODERATE SIGNAL STRENGTH (Visuals Only).

**MANDATE:**
- **Depth**: Minimum 150 words per feasible section.
- **Structure**: Context -> Interpretation -> Recommendation.
- **Tone**: Advisory, precise, C-suite level.
- **Visual-First Strategy**: Derive strategy strictly from visual semiotics. Explain *why* these visuals imply this strategy.`,


    userTemplate: (ctx) => `
## VISUAL FEATURES
${ctx.visualContext}

## USER CONTEXT
${ctx.textContext}

## ANALYSIS LENS
"${ctx.analysisLabel}"

**BRAND STRATEGY WINDOW:**
Generate an array of EXACTLY 10 cards.
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

For brand-conceptual cards (Purpose, Role, Values), infer from visual narrative/semiotics.
NEVER return fewer than 10 items.
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
    system: `You are a Senior Strategic Marketing & Brand Consultant with 20+ years of experience.
Signal strength is HIGH (Visuals + Brand Context).

**GLOBAL OUTPUT STANDARD (APPLIES TO ALL SECTIONS):**
1. **Minimum length**: **200+ words per section**. No exceptions.
2. **Structure**: 3 Paragraphs (Diagnosis -> Interpretation -> Recommendation).
3. **Tone**: Board-deck ready. No fluff. No summaries.

**FULL GENERATION MODE:**
- Generate all 10 Brand Strategy cards with deep strategic rationale.
- Classify Brand Archetype with high confidence.
- Synthesize visual and text signals into a cohesive narrative.`,


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
