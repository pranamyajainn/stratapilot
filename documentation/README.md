# StrataPilot Documentation

**Current State Reflection**
This documentation describes the StrataPilot system as of **January 2026**.

## 📑 Executive Reports
*   [**Stakeholder Overview**](Stakeholder%20Final.md): High-level product value, capabilities, and business risk profile.
*   [**CTO Technical Audit**](CTO%20Final.md): Architectural deep-dive, data flow, hybrid pipeline, and production risks.

## 🧠 AI Layer (`/ai-layer`)
*   [**Orchestration**](ai-layer/orchestration.md): Logic for the **Hybrid Pipeline** (Groq Strategy + Gemini Vision).
*   [**Prompt Strategy**](ai-layer/prompt-strategy.md): Conditional prompting patterns for truthful AI generation.

## 🧬 System Core (`/core`)
*   [**Creative DNA**](core/creative-dna.md): Taxonomy and inference engine for structured ad analysis.
*   [**Cross-Category Learning**](core/cross-category.md): Architecture for inter-industry pattern discovery.
*   **PDF Export Engine**: Headless Chrome rendering pipeline (`pdfService.ts`) producing consultant-grade reports.
*   **Persistence Layer**: SQLite-backed auto-save system (`insightDb.ts`) ensuring data durability.

## 🔌 Integrations (`/integrations`)
*   [**Meta Ads**](integrations/meta-ads.md): Authentication, data sync, and insight extraction.
*   [**Google Analytics 4**](integrations/ga4.md): Engagement signal extraction.

---

**Note to Contributors:**
*   **Truth in Code**: If this documentation contradicts the code, the code is right.
*   **No Speculation**: Document only what is currently implemented and running.
