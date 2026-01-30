# Google Analytics 4 (GA4) Integration

## Overview
The GA4 integration connects web traffic performance data with creative analysis, allowing StrataPilot to correlate ad creative quality with post-click user behavior (bounce rate, engagement).

**Core Capabilities:**
*   **Traffic Analysis**: Active user and session tracking.
*   **Engagement Scoring**: Evaluating landing page performance.
*   **Insight Extraction**: converting metrics into natural language insights for the LLM.

## Insight Extraction Logic
**File:** `server/services/insightExtractors.ts`

The system transforms raw GA4 metrics into qualitative signals to guide the AI strategist.

### Performance Signals
The `extractGA4Insights` function calculates a composite score (0-3) to determine the `Performance Signal`:

1.  **Engagement Rate**: >= 55% (Benchmark) (+1 point)
2.  **Bounce Rate**: <= 45% (Benchmark) (+1 point)
3.  **Pages/Session**: >= 2.0 (+1 point)

**Signal Output:**
*   **STRONG**: Score 3
*   **MODERATE**: Score 2
*   **WEAK**: Score 0-1 (if data exists)
*   **UNKNOWN**: No data

### Anomaly Detection
The system flags significant deviations to alert the user:
*   **High Bounce Rate**: > 10% above benchmark (Indicates Ad-LP mismatch).
*   **Low Engagement**: < 10% below benchmark (Indicates poor traffic quality).

### LLM Context Injection
Insights are formatted as a structural block for the LLM:
```text
[GA4 INSIGHTS - Last 30 Days]
Performance: MODERATE
Key Findings:
• 1,200 active users
• High bounce rate (65%) indicates potential landing page issues
Suggested Focus: Review landing page alignment with creative messaging
```

## Configuration
**File:** `server/types/insightTypes.ts`

Default benchmarks are defined globally:
*   **Avg Engagement Rate**: 55%
*   **Avg Bounce Rate**: 45%

## Usage
Used primarily in the `analyzeCollateral` flow. If GA4 is connected, `server.ts` fetches data for the analysis period and injects the extracted insights into the `externalDataContext` variable.
