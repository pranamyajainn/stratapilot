# StrataPilot Documentation

**Current State Reflection**
This documentation describes the StrataPilot system as of **January 2026**.

## Documentation Map

### 🧠 AI Core (`/ai-layer`)
*   [**Orchestration**](ai-layer/orchestration.md): The multi-model routing engine (Groq + Gemini), cost governance, and two-pass reasoning architecture.
*   [**Prompt Strategy**](ai-layer/prompt-strategy.md): How the system optimizes yield and prevents hallucination using conditional prompting.

### 🧬 System Core (`/core`)
*   [**Creative DNA**](core/creative-dna.md): The taxonomy and inference engine for structured ad analysis.
*   [**Cross-Category Learning**](core/cross-category.md): Architecture for inter-industry pattern discovery.

### 🔌 Integrations (`/integrations`)
*   [**Meta Ads**](integrations/meta-ads.md): Auth, sync, and insight extraction for Meta.
*   [**Google Analytics 4**](integrations/ga4.md): Traffic and engagement signal extraction.

---

**Note to Contributors:**
*   **Truth in Code**: If this documentation contradicts the code, the code is right. Please update this documentation.
*   **No Speculation**: Document only what is currently implemented and running.
