# Creative DNA Schema

## Overview
Creative DNA is the system's taxonomy for decomposing ad creatives into structured, queryable attributes. Unlike a simple file storage, StrataPilot analyzes every asset to extract its "DNA," enabling pattern recognition and competitive intelligence.

## Schema Attributes
**File:** `server/types/creativeMemoryTypes.ts`

The schema tracks 45+ attributes across 5 dimensions:

### 1. HookType (10 Variants)
Detects the opening strategy of the ad.
*   `question`: "Did you know?"
*   `statistic`: "90% of users..."
*   `benefit`: "Get smooth skin..."
*   `problem`: "Tired of..."
*   `shock`: "You won't believe..."
*   *(and 5 others)*

### 2. CTAType (13 Variants)
Standardizes the Call to Action.
*   `shop_now`, `learn_more`, `sign_up`, `try_free`, etc.

### 3. VisualStyle (9 Variants)
Classifies the aesthetic approach.
*   `minimal`: Whitespace heavy.
*   `lifestyle`: People in context.
*   `product_focus`: Hero shots.
*   `ugc`: User-Generated Content style.
*   `infographic`: Data heavy.

### 4. Message Analysis
*   **Price Detection**: Extracts currency/price signals ($99).
*   **Offer Detection**: Identifies sales/discounts (50% Off).
*   **Message Length**: Short / Medium / Long.

### 5. Pattern Distribution
**File:** `server/services/creativeMemory/patternAnalyzer.ts`

The system aggregates DNA to calculate:
*   **Dominant Patterns**: Attributes appearing in >25% of ads in a niche.
*   **Saturated Patterns**: >50% usage (Risk of blending in).
*   **Underutilized Patterns**: <10% usage (Opportunity for differentiation).

## Inference Engine
**File:** `server/services/creativeMemory/creativeMemorySourceBase.ts`

Attributes are inferred using heuristic analysis of the extracted text and visual metadata (from Gemini):
*   **Regex Matching**: For Hooks and CTAs.
*   **Decision Tree**: For Visual Style (e.g., `if (hasFace && !hasProduct) return 'lifestyle'`).

## Database
Stored in `creative_memory.db` (`creatives` table), indexed by Industry and Niche to facilitate fast cross-category queries.
