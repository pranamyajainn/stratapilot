# Prompt Strategy & Intelligence Yield

## Overview
StrataPilot employs a **Conditional Prompting Strategy** to maximize output quality ("yield") while minimizing hallucinations. The system assesses the "Capability" of the input signals (Text sufficiency, Visual richness, Brand context) and adjusts the prompt structure accordingly.

## Input Capability Classification
The system classifies every analysis request into one of three tiers:

### 🔴 LOW Capability
*   **Signals**: Generic text, no media, no brand context.
*   **Strategy**: "Defensive Hedges".
*   **Behavior**:
    *   Generates generic audience/category assumptions.
    *   **Explicitly Refuses** detailed Brand Strategy or Archetype sections.
    *   Returns `"available": false` with reasons ("Requires visual asset").

### 🟡 MODERATE Capability
*   **Signals**: Rich media but no brand context, OR Detailed text but no media.
*   **Strategy**: "Partial Yield".
*   **Behavior**:
    *   Generates visual-dependent sections (Sensorial Promise, Visual Hierarchy) from media.
    *   Skips brand-dependent sections (Brand Purpose, Rational Promise) if brand context is missing.
    *   Provides "Visual Hints" for archetype (e.g., "Aesthetic suggests Ruler, but need brand voice to confirm").

### 🟢 HIGH Capability
*   **Signals**: Rich media + Explicit brand context (Values, Mission).
*   **Strategy**: "Full Synthesis".
*   **Behavior**:
    *   Generates all 10 Brand Strategy cards.
    *   Assigns Brand Archetype with high confidence.
    *   Synthesizes visual and verbal signals for deep analysis.

## Signal Richness Classifier
**File:** `server/services/groqAnalyzer.ts` (Logic embedded in prompt construction)

The system detects:
1.  **Visual Feature Count**: (Objects + Colors + Text Overlays).
2.  **Brand Context**: Checks for keywords like "values", "mission", "positioning" or explicit `brandContext` input.

## Output Contract
To support this strategy, the LLM JSON schema includes `unavailable` states:

```typescript
interface SectionOutput {
  data?: any;
  unavailable?: {
    available: false;
    reason: string;
    hint?: string;
  };
}
```

This compliance ensures that the Frontend displays truthful "Insufficent Data" states rather than filling the UI with hallucinated or generic fluff.
