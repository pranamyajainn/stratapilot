# Cross-Category Learning

## Overview
Cross-Category Learning allows StrataPilot to answer questions like *"What can a bank learn from a beauty brand?"*. By standardizing ad analysis into [Creative DNA](./creative-dna.md) stored by industry, the system can identify transferrable patterns.

## Architecture

### 1. Industry-Segmented Storage
Insights and Creatives are strictly indexed by `industry` (e.g., 'FMCG', 'BFSI', 'SaaS').
*   **File:** `server/services/insightDb.ts` (`getInsightsByIndustry`)
*   **File:** `server/services/creativeMemory/creativeMemoryStore.ts` (`getCreativesByIndustry`)

### 2. Pattern Comparison Logic
The system compares the **Pattern Distribution** of a Source Industry vs. a Target Industry.

**Logic:**
1.  Calculate `Distribution A` (Source) and `Distribution B` (Target).
2.  Find attributes (Hooks, Styles, CTAs) that are **Dominant in Source** (>30%) but **Rare in Target** (<10%).
3.  Flag these as **Transferable Insights**.

**Example:**
*   **Source (FMCG)**: 55% use `lifestyle` visuals.
*   **Target (BFSI)**: 5% use `lifestyle` visuals.
*   **Insight**: BFSI has an opportunity to humanize messaging by adopting FMCG-style lifestyle visuals.

## Implementation Status
*   **Backend**: Fully implemented. Query functions and Pattern Analyzers exist.
*   **API**: Ready for exposure (internal functions `discoverCrossIndustryPatterns`).
*   **Data**: Relies on sufficient volume of "Creative Memory" data to be statistically significant.
