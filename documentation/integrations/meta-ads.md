# Meta Ads Integration

## Overview
The Meta Ads integration enables StrataPilot to fetch, synchronize, and analyze advertising performance data. It creates a feedback loop where quantitative performance metrics informed the qualitative creative analysis.

**Core Capabilities:**
*   **Auth & Token Management**: Long-lived token exchange and persistence.
*   **Sync Engine**: On-demand and scheduled synchronization of ad account data.
*   **Insight Extraction**: Transforming raw metrics into strategic performance signals.

## Architecture

### 1. Authentication & Connection
**File:** `server/routes/metaRoutes.ts`

The system uses a direct token flow:
1.  **Verification**: Frontend sends a user access token (`POST /api/meta/verify-access`).
2.  **Validation**: Backend verifies the token with Meta Graph API and fetches accessible ad accounts.
3.  **Persistence**: Valid tokens are stored in the local SQLite database (`authorized_users` table) with expiration tracking.
4.  **Account Linking**: Ad accounts are linked to the user for sync operations.

### 2. Synchronization Engine
**File:** `server/services/meta/syncEngine.ts`

Data synchronization operates in two modes:
*   **On-Demand**: Triggered by user analysis requests for specific date ranges.
*   **Backfill**: Retrospective fetching of 30-day history for trend analysis.

### 3. Insight Extraction
**File:** `server/services/insightExtractors.ts`

Beofre passing data to the LLM, raw metrics are processed into **Extracted Insights**. This prevents token waste and "garbage-in" hallucinations.

**Derived Signals:**
*   **Performance Signal**: `STRONG` | `MODERATE` | `WEAK` | `UNKNOWN` (calculated from CTR, CPC, and Spend scores).
*   **Anomalies**: Detects statistical deviations (e.g., "CPC > 2x benchmark").
*   **Strategic Recommendations**: Rule-based advice (e.g., "High CPC → Refine targeting").

**Context Injection:**
The formatter (`formatInsightsForLLM`) generates a text block injection for the LLM System Prompt:
```text
[MetaAds INSIGHTS - Last 30 Days]
Status: SUCCESS_WITH_DATA
Performance Signal: STRONG
Key Findings:
• CTR of 2.1% outperforms 0.9% industry average
• Efficient CPC at $0.45
Anomalies:
⚠ Spend velocity dropped 40% in last 7 days
```

## Data Benchmarks
The system uses hardcoded industry baselines (configurable in `server/types/insightTypes.ts`) to evaluate performance:
*   **CTR Benchmark**: 0.90%
*   **CPC Benchmark**: $1.72
*   **CPM Benchmark**: $14.40

## Limitation & Constraints
*   **Read-Only**: The integration does not publish ads or modify campaigns.
*   **Token Expiry**: Tokens are assumed valid for ~60 days; manual re-connection is required upon expiry.
*   **Attribution**: Optimization goals (Purchases, Leads) are prioritized over vanity metrics (Likes) when scoring performance.
