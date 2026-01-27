# PHASE 6A — CONTEXT FIDELITY AUDIT REPORT

**Date:** 2026-01-27
**Auditor:** Antigravity Agent
**System:** StrataPilot v1.0 (Audit Mode)

---

## 1. Context Inventory

The following user inputs currently enter the system via `/api/analyze` and `/api/analyze-url`:

| Input Type | Entry Point | Injection Variable | Format |
| :--- | :--- | :--- | :--- |
| **Creative (File/URL)** | `server.ts` (lines 1122, 1227) | `fileData` / `fileUri` | Binary / URI |
| **Strategy Text** | `server.ts` (lines 1125, 1230) | `textContext` | Raw String |
| **GAAuth Token** | `server.ts` (lines 1125, 1230) | `googleToken` | Bearer Token |
| **MetaAuth Token** | `server.ts` (lines 1125, 1230) | `metaToken` | Bearer Token |

---

## 2. Context Loss Map

Significant data loss occurs during transformation before reaching the LLM.

### A. Analytics Context (Heavy Compression)
**Location:** `server/services/insightExtractors.ts`
*   **Input:** Raw JSON reports from GA4 (Pageviews, Sessions, Demographics) and Meta Ads (Spend, CPR, CTR breakdown).
*   **Transformation:** Function `formatInsightsForLLM`.
*   **Loss:**
    *   **Data Granularity:** All time-series data is discarded.
    *   **Dimensionality:** Audience breakdowns (Age, Gender, Region) from analytics are **ignored**.
    *   **Output:** Compressed into a simple text block with max **5 Key Findings** and **3 Recommendations**.
    *   **Result:** The LLM never sees "Conversion Rate dropped 50% on weekends" or "Females 25-34 have highest CTR". It only sees "Strong Engagement".

### B. Strategy Context (Total Severance in Strategy Module)
**Location:** `server/server.ts` -> `generateCampaignStrategy`
*   **Problem:** The `generateCampaignStrategy` function (line 614) accepts *only* the `AnalysisResult` JSON.
*   **Critical Fault:** The original `textContext` (containing User Goals, Target Audience, Campaign Objectives) is **NOT passed** to this function.
*   **Result:** The "Campaign Strategy" is generated purely from the *Creative Analysis*, completely ignoring what the user actually asked for.
    *   *User Input:* "Optimizing for sales." -> *Analysis Check:* "Good visuals." -> *Strategy Gen:* "Focus on Brand Awareness" (Generic default).

---

## 3. Prompt-Level Findings

### A. Diagnostic Analysis Prompt (`groqAnalyzer.ts`)
*   **Prompt Name:** `ANALYSIS_SYSTEM_PROMPT`
*   **Observation:** The prompt contains a **"CORE MANDATE"** to focus *only* on observable evidence ("If you cannot prove it... lower the confidence").
*   **Conflict:** While this prevents hallucinations, it effectively de-weights the `User Context`. If the user says "Targeting Wealthy Investors" (`textContext`) but the ad is a simple cartoon, the LLM is forced by the prompt to ignore the mismatch or simply rate visuals generally, rather than flagging the strategic misalignment.
*   **Analytics Handling:** Analytics context is provided as a simplified text block. The prompt instruction "Use these signals to validate" is weak compared to the "OBSERVABLES ONLY" mandate.

### B. Strategy Generation Prompt (`server.ts`)
*   **Prompt Name:** `STRATEGY_SYSTEM_INSTRUCTION`
*   **Observation:** The prompt receives `JSON.stringify(analysis)` but **zero** strategic context.
*   **Result:** It blindly generates a strategy for "an ad" matching that analysis, having no knowledge of the campaign's actual constrained budget, timeline, or specific KPIs provided by the user in the initial text.

---

## 4. Output Drift Examples

### Example 1: Generic Strategy
**Drift Type:** Context Missing (Total)
*   **User Input:** "We are launching a Q4 flash sale for existing customers using email retention."
*   **System Output:** "Recommended Channels: TikTok, Instagram Reels. Focus on brand awareness."
*   **Root Cause:** The `generateCampaignStrategy` function never received the "Q4 flash sale" or "email retention" string. It defaulted to "Video Ad = TikTok" logic.

### Example 2: Weak Analytics Correlation
**Drift Type:** Context Diluted
*   **User Input:** (Via Meta API) "CTR is 0.2% (Very Low), CPC is $5.00 (High)."
*   **System Output:** "Engagement score: 75/100. Good visuals."
*   **Root Cause:** `insightExtractors.ts` might summarize this as "Performance: Weak". The `ANALYSIS_SYSTEM_PROMPT` prioritizes visual detection ("Nice colors") over the weak performance signal because the "Validation" instruction is secondary to the "Observables" mandate.

---

## 5. Consistency Findings
*   **Diagnostics vs. Strategy:** High inconsistency. Diagnostics are derived from the creative (visuals), while Strategy is derived from the Diagnostics *without* the original intent. This leads to strategies that fit the *creative* but not the *business goal*.
*   **Tone:** Stable, but "Analyst Tone" in diagnostics prevents actionable marketing advice, which is pushed to the Strategy section—where the context is missing—resulting in a "Generic Corporate Strategy" tone.

---

## 6. Diagnosis Summary

The system produces generic outputs for three specific reasons:

1.  **Context Severance (Strategy Phase):** The Strategy Generation module is completely disconnected from the user's input text (Goals/Audience). It operates in a vacuum, seeing only the creative analysis.
2.  **Over-Summarization (Analytics):** Rich performance data (granular metrics, demographics) is stripped away before the LLM sees it, leaving only vague "High/Low" summaries that prevent nuanced correlation.
3.  **Conflicting Mandates (Diagnostics Phase):** The strict "Visual Evidence Only" rule in the analysis prompt discourages the model from calling out *strategic misalignments* (e.g., "Visuals don't match the stated High Net Worth audience") because it prioritizes describing the pixels over evaluating the fit.
