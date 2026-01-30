# AI Orchestration Layer

## Overview
StrataPilot employs a **Model-Agnostic AI Orchestrator** to manage LLM interactions. Rather than relying on a single model, the system routes tasks to the optimal model based on **intent**, **complexity**, and **cost**, using a hybrid architecture of Groq (Llama/DeepSeek/Qwen) and Google Vertex AI (Gemini).

## Core Architecture

### 1. LLM Orchestrator
**File:** `server/services/llmRouter/index.ts`

The `LLMOrchestrator` is the central singleton managing all AI operations. It handles:
*   **Classification**: Determining task intent and complexity.
*   **Routing**: Selecting the best model provider and endpoint.
*   **Cost Governance**: Enforcing budgets and triggering downgrades.
*   **Two-Pass Reasoning**: Orchestrating Draft -> Critique loops.
*   **Failover**: Automatically retrying with secondary models.

### 2. Model Routing Matrix
**File:** `server/services/llmRouter/modelRouter.ts`

Models are selected dynamically based on the task:

| Intent | Complexity | Primary Model | Rationale |
|BC|---|---|---|
| **Analysis** | Medium/High | `llama-3.3-70b-versatile` | Superior narrative and creative nuance |
| **Analysis** | Low | `llama-3.1-8b-instant` | Speed and cost efficiency |
| **Reasoning** | High | `deepseek-r1-distill-llama-70b` | Structured logic and scoring |
| **Summarization**| High | `qwen/qwen3-32b` | Long-context handling (32k+) |
| **Vision** | Any | `gemini-2.0-flash` | Multimodal visual feature extraction |

### 3. Two-Pass Reasoning
**Feature Flag:** `LLM_TWO_PASS_ENABLED`

For high-stakes tasks (Strategy Generation, Client-Facing Output), the system executes a **Draft-Critique-Repair** loop:
1.  **Draft**: High-creativity model (Llama 3.3) generates the content.
2.  **Critique**: High-reasoning model (DeepSeek R1) evaluates the draft against a rubric (Logic, Depth, Formatting).
3.  **Repair**: If validation fails, the Draft model is re-prompted with specific feedback to fix the issues.

### 4. Cost Governance
**File:** `server/services/llmRouter/costGovernor.ts`

The `CostGovernor` prevents budget overruns by tracking daily usage per model tier.
*   **Low Budget**: ~$0.05/day (Small models)
*   **Medium Budget**: ~$0.50/day (70B models)
*   **High Budget**: ~$2.00/day (Reasoning models)

**Downgrade Logic:**
If a model's budget is exhausted, the system automatically downgrades to the next viable tier (e.g., Llama 70B -> Mistral 24B -> Llama 8B) to ensure uptime.

## Hybrid Analysis Pipeline
**File:** `server/server.ts`

StrataPilot uses a specialized pipeline for analyzing creative assets:
1.  **Visual Extraction (Gemini)**: Uploads image/video to Gemini Flash to extract structured JSON describing objects, colors, text, and scene composition.
2.  **Strategic Analysis (Groq)**: Feeds the extracted visual JSON + User Context into Groq (Llama/DeepSeek) to generate the strategic report.

This separation of concerns leverages Gemini's superior vision capabilities and Groq's low-latency/high-throughput text inference.

## Configuration
Managed via `.env`:
*   `GROQ_API_KEY_{1..3}`: Key pool for rate limit distribution.
*   `GEMINI_API_KEY`: For vision tasks.
*   `USE_HYBRID_ANALYSIS`: Toggle for the pipeline.
