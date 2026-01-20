<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# StrataPilot — Creative Intelligence & ROI Uplift Platform

An AI-powered creative analysis platform that transforms ad creatives (images/videos) into actionable marketing intelligence. The system leverages a **hybrid LLM architecture** (Gemini for visual extraction + Groq for strategic analysis), provides **12 diagnostic metrics**, generates campaign strategies, and enriches analysis with **competitive context** from ad libraries.

---

## Table of Contents

- [Project Purpose](#project-purpose)
- [High-Level Architecture](#high-level-architecture)
- [System Data Flow](#system-data-flow)
- [Directory Structure](#directory-structure)
- [Core Modules](#core-modules)
  - [Backend Services](#backend-services)
  - [Frontend Components](#frontend-components)
- [External Services & APIs](#external-services--apis)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Setup & Installation](#setup--installation)
- [End-to-End Workflow](#end-to-end-workflow)
- [Key Features](#key-features)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Current Limitations](#current-limitations)

---

## Project Purpose

**Problem Statement:** Marketing teams and agencies struggle to objectively evaluate ad creative performance before launch. Traditional A/B testing is slow and expensive. Subjective creative reviews lack standardized metrics and actionable recommendations.

**StrataPilot solves this by:**
1. Analyzing ad creatives (images, videos, YouTube URLs) using AI to extract visual features and generate strategic insights
2. Providing standardized diagnostics across 12 performance parameters (Hook, CTA Strength, Brand Linkage, etc.)
3. Profiling target audience demographics, psychographics, and behavioral patterns
4. Generating campaign strategies with channel recommendations and budget allocation
5. Enriching analysis with competitive intelligence from ad libraries (Meta, Google Ads Transparency Center)
6. Caching insights by industry for knowledge reuse across analyses

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                          │
│  ┌─────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ LandingPage │  │   Dashboard    │  │  AnalysisView  │  │ StrategyView │  │
│  └─────────────┘  └────────────────┘  └────────────────┘  └──────────────┘  │
│        │                  │                   │                  │          │
│        └──────────────────┴───────────────────┴──────────────────┘          │
│                                     │                                        │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │ HTTP (REST API)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express + TypeScript)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                             server.ts                                 │   │
│  │  • POST /api/analyze (file upload)   • POST /api/analyze-url (URL)  │   │
│  │  • POST /api/strategy                • GET /api/health               │   │
│  │  • GET /api/llm-stats               • GET /api/insight-stats         │   │
│  │  • GET /api/auth/google             • GET /api/auth/meta             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         │                            │                            │         │
│         ▼                            ▼                            ▼         │
│  ┌─────────────────┐    ┌───────────────────────┐    ┌────────────────────┐ │
│  │  Hybrid LLM     │    │   Insight Knowledge   │    │  Creative Memory   │ │
│  │  Pipeline       │    │   Base                │    │  Layer             │ │
│  │  ├─ Gemini      │    │  ├─ insightDb.ts      │    │  ├─ Meta AdLib     │ │
│  │  │  (Visual)    │    │  ├─ insightCache.ts   │    │  ├─ Google AdLib   │ │
│  │  └─ Groq        │    │  └─ contentHash.ts    │    │  └─ PatternAnalyzer│ │
│  │     (Strategic) │    │                       │    │                    │ │
│  └─────────────────┘    └───────────────────────┘    └────────────────────┘ │
│         │                            │                            │         │
│         ▼                            │                            │         │
│  ┌─────────────────┐                 │                            │         │
│  │  LLM Router     │                 │                            │         │
│  │  ├─ ModelRouter │                 │                            │         │
│  │  ├─ GroqClient  │                 │                            │         │
│  │  ├─ CostGovernor│                 │                            │         │
│  │  └─ Provenance  │                 │                            │         │
│  │     Logger      │                 │                            │         │
│  └─────────────────┘                 │                            │         │
│                                      │                            │         │
│                                      ▼                            ▼         │
│                          ┌───────────────────────────────────────────┐      │
│                          │            SQLite Databases               │      │
│                          │  • insights.db (Insight Knowledge Base)   │      │
│                          │  • creative_memory.db (Competitor Ads)    │      │
│                          │  • llm_provenance.db (LLM Usage Logs)     │      │
│                          └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Google Gemini   │  │  Groq Cloud   │  │ Google GA4   │  │   Meta Ads   │ │
│  │ (Visual AI)     │  │  (LLMs)       │  │ (Analytics)  │  │   Manager    │ │
│  └─────────────────┘  └───────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Data Flow

### Analysis Request Flow

```
1. User uploads image/video OR provides YouTube URL
                    ↓
2. Frontend (Dashboard.tsx) → POST /api/analyze or /api/analyze-url
                    ↓
3. Content Hashing (contentHash.ts) → Generate SHA-256 hash
                    ↓
4. Cache Check (insightCache.ts) → If HIT, return cached analysis
                    ↓ (MISS)
5. Industry Detection → Infer industry from text context (keyword matching)
                    ↓
6. Competitive Context Generation (competitiveContextGenerator.ts)
   └─ Fetches pattern distributions from Creative Memory DB
   └─ Generates structured context (dominant patterns, differentiation signals)
                    ↓
7. Hybrid Analysis (if USE_HYBRID_ANALYSIS=true):
   ├─ Step 1: Gemini Visual Compiler → Extract visual features (objects, colors, text, faces)
   └─ Step 2: Groq Strategic Analyzer → Generate diagnostics, audience profile, ROI metrics
   (Legacy mode: Gemini only for both steps)
                    ↓
8. Cache Storage → Store analysis with industry tag, content hash
                    ↓
9. Return AnalysisResult to Frontend
                    ↓
10. Frontend (AnalysisView.tsx) → Render diagnostics, radar charts, brand strategy
```

---

## Directory Structure

```
stratapilot/
├── server/                          # Backend (Express + TypeScript)
│   ├── server.ts                    # Main server entry (1259 lines)
│   ├── services/
│   │   ├── geminiCompiler.ts        # COMPILER: Visual feature extraction via Gemini
│   │   ├── groqAnalyzer.ts          # ANALYZER: Strategic insights via Groq
│   │   ├── googleAnalytics.ts       # OAuth + GA4 data fetching
│   │   ├── metaAds.ts               # OAuth + Meta Ads data fetching
│   │   ├── insightDb.ts             # SQLite: Insight Knowledge Base schema/queries
│   │   ├── insightCache.ts          # Cache lookup/storage logic
│   │   ├── contentHash.ts           # SHA-256 content hashing
│   │   ├── llmRouter/               # Multi-LLM Orchestration
│   │   │   ├── index.ts             # LLMOrchestrator (main entry)
│   │   │   ├── groqClient.ts        # Groq API client + key rotation
│   │   │   ├── modelRouter.ts       # Task→Model routing matrix
│   │   │   ├── costGovernor.ts      # Daily budget limits per tier
│   │   │   ├── intentClassifier.ts  # Classify task intent/complexity
│   │   │   ├── provenanceLogger.ts  # Log LLM usage to SQLite
│   │   │   └── types.ts             # LLM Router type definitions
│   │   ├── creativeMemory/          # Comparative Creative Memory Layer
│   │   │   ├── index.ts             # Exports + database init
│   │   │   ├── creativeMemoryDb.ts  # SQLite schema for competitor ads
│   │   │   ├── creativeMemoryStore.ts  # CRUD for creatives + patterns
│   │   │   ├── patternAnalyzer.ts   # Aggregates pattern distributions
│   │   │   ├── competitiveContextGenerator.ts  # Gemini context injection
│   │   │   ├── metaCreativeMemory.ts    # Meta Ad Library ingestion
│   │   │   ├── googleCreativeMemory.ts  # Google Ads Transparency ingestion
│   │   │   └── creativeMemorySourceBase.ts  # Abstract base class
│   │   └── adLibrary/               # Regional/global ad library data (CSV/JSON)
│   ├── types/
│   │   └── creativeMemoryTypes.ts   # All types for Creative Memory Layer
│   └── data/                        # SQLite database files location
├── components/                      # React UI Components
│   ├── AnalysisView.tsx             # Analysis results display (Recharts, PDF export)
│   ├── StrategyView.tsx             # Campaign strategy display
│   ├── ConnectionModal.tsx          # OAuth connection UI
│   └── TechLayerLoader.tsx          # Loading animation
├── pages/                           # Page-level React components
│   ├── Dashboard.tsx                # Main application page
│   └── LandingPage.tsx              # Marketing landing page
├── services/
│   └── geminiService.ts             # Frontend API utility (currently minimal)
├── App.tsx                          # React Router setup
├── index.tsx                        # React entry point
├── types.ts                         # Frontend type definitions
├── index.html                       # HTML template (Tailwind CDN)
├── vite.config.ts                   # Vite configuration
├── package.json                     # Dependencies + scripts
├── tsconfig.json                    # TypeScript configuration
└── .env                             # Environment variables
```

---

## Core Modules

### Backend Services

#### 1. **server.ts** — API Server
The main Express server (1259 lines) handling all HTTP routes.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Analyze uploaded file (image/video) with optional GA4/Meta data |
| `/api/analyze-url` | POST | Analyze video from YouTube or direct URL |
| `/api/strategy` | POST | Generate campaign strategy from analysis result |
| `/api/health` | GET | Health check endpoint |
| `/api/llm-stats` | GET | LLM Router usage statistics |
| `/api/insight-stats` | GET | Insight cache statistics |
| `/api/auth/google` | GET | Initiate Google OAuth flow |
| `/api/auth/meta` | GET | Initiate Meta OAuth flow |

**Key Functions:**
- `analyzeCollateralSmart()` — Routes between hybrid (Gemini+Groq) and legacy (Gemini-only) modes
- `analyzeCollateralHybrid()` — Two-step: Gemini visual extraction → Groq strategic analysis
- `generateCampaignStrategy()` — Creates campaign recommendations from analysis
- `downloadFile()` — Downloads videos from YouTube or direct URLs
- `uploadToGemini()` — Uploads files to Gemini File API for processing

---

#### 2. **geminiCompiler.ts** — Visual Feature Extraction
Acts as a **COMPILER** (not analyzer) — extracts only observable features from creatives.

**Output (`VisualFeatures`):**
```typescript
{
  objects: string[];       // Detected objects
  scenes: string[];        // Scene descriptions
  colors: string[];        // Dominant colors
  composition: string;     // Layout description
  textOverlays: string[];  // All visible text
  transcript: string;      // Speech transcript
  emotionalTone: string;   // Inferred mood
  humanPresence: { count, demographics, expressions };
  logoDetected: boolean;
  brandColors: string[];
  ctaText: string;
  creativeFormat: 'image' | 'video' | 'carousel';
}
```

---

#### 3. **groqAnalyzer.ts** — Strategic Analysis
Takes visual features and generates complete strategic analysis.

**Output (`StrategicAnalysisResult`):**
```typescript
{
  adDiagnostics: DiagnosticItem[];   // 12 scored diagnostic metrics
  audience: {
    demographics,                     // Age, gender, location, income, etc.
    psychographics,                   // Interests, values, motivations
    behavioral                        // Buying habits, brand loyalty
  };
  brandAnalysis: {
    consumerInsight, functionalBenefit, emotionalBenefit,
    brandStrategyWindow,              // 10-point brand strategy
    brandArchetypeDetail             // Detected archetype
  };
  roiMetrics: {
    hookScore, clarityScore, predictedVtr, roiUplift, ...
  };
  modelHealth, validationSuite, industry
}
```

---

#### 4. **LLM Router** (`llmRouter/`)
Multi-model orchestration system with task-based routing.

**Components:**
| Module | Purpose |
|--------|---------|
| `LLMOrchestrator` | Main entry point, coordinates all components |
| `IntentClassifier` | Classifies prompts into task types (ideation, analysis, reasoning, summarization, classification) |
| `ModelRouter` | Routes tasks to optimal models based on intent + complexity |
| `GroqClient` | Groq Cloud API client with key pool rotation |
| `CostGovernor` | Enforces daily budget limits per cost tier |
| `ProvenanceLogger` | Logs all LLM calls to SQLite for auditing |

**Model Selection Matrix:**

| Task Type | Low Complexity | Medium Complexity | High Complexity |
|-----------|----------------|-------------------|-----------------|
| Ideation | Llama 3.1 8B | Llama 3.3 70B | Llama 3.3 70B |
| Summarization | Llama 3.1 8B | Qwen3 | Qwen3 |
| Analysis | Llama 3.1 8B | Llama 3.3 70B | Llama 3.3 70B |
| Reasoning | Llama 3.1 8B | DeepSeek R1 | DeepSeek R1 |
| Validation | Mistral Saba | DeepSeek R1 | DeepSeek R1 |

**Two-Pass Reasoning:**
For high-stakes responses (strategy, client-facing), uses:
1. **Draft Pass**: Llama 3.3 70B generates initial response
2. **Critique Pass**: DeepSeek R1 reviews for logical flaws, hallucinations, gaps

---

#### 5. **Insight Knowledge Base** (`insightDb.ts`, `insightCache.ts`)
SQLite-based cache for storing and retrieving analysis results.

**Features:**
- Content hashing (SHA-256) for deduplication
- Industry auto-detection from analysis content
- Access counting and timestamps for cache management
- Queries by industry, brand, or content hash

---

#### 6. **Creative Memory Layer** (`creativeMemory/`)
Backend-only intelligence system for competitor ad analysis.

**Components:**
| Module | Purpose |
|--------|---------|
| `creativeMemoryStore.ts` | CRUD for competitor ads + pattern distributions |
| `metaCreativeMemory.ts` | Ingests ads from Meta Ad Library (HTML parsing) |
| `googleCreativeMemory.ts` | Ingests ads from Google Ads Transparency Center |
| `patternAnalyzer.ts` | Aggregates signals into pattern distributions |
| `competitiveContextGenerator.ts` | Generates structured context for Gemini prompts |

**Pattern Distribution Output:**
```typescript
{
  industry: "FMCG",
  hookDistribution: { question: 0.35, benefit: 0.28, offer: 0.22, ... },
  ctaDistribution: { shop_now: 0.45, learn_more: 0.30, ... },
  dominantPatterns: ["benefit hooks", "shop_now CTAs", "lifestyle visuals"],
  saturatedPatterns: ["question hooks in first 3s"],
  underutilizedPatterns: ["testimonial hooks", "carousel format"],
}
```

---

### Frontend Components

#### **Dashboard.tsx** (Main Page)
- File upload (drag-drop, click, paste)
- Video URL input (YouTube, direct links)
- Voice input for context/query
- Preset analysis buttons (CRI Analysis, Audience Mapping, etc.)
- Integration modals (Google Analytics, Meta Ads)

#### **AnalysisView.tsx** (Results Display)
- 12 diagnostic cards with scores, benchmarks, recommendations
- Radar chart visualization (Recharts)
- Target audience profiling (Demographics, Psychographics, Behavioral)
- Brand Archetype Matrix
- 10-Point Brand Strategy Window
- ROI metrics display
- PDF export functionality (html2canvas + jsPDF)
- Human-in-the-loop score editing

#### **StrategyView.tsx** (Campaign Strategy)
- Key pillars and messages
- Channel recommendations
- Budget allocation
- Timeline and success metrics

---

## External Services & APIs

| Service | Purpose | SDK/Library |
|---------|---------|-------------|
| **Google Gemini** | Visual feature extraction, legacy analysis | `@google/genai`, `@google/generative-ai` |
| **Groq Cloud** | Strategic analysis via LLMs (Llama 3.3, DeepSeek, Qwen3) | `openai` (OpenAI-compatible API) |
| **Google Analytics 4** | Real performance data injection | `googleapis` |
| **Meta Ads Manager** | Real ad performance data injection | Custom OAuth implementation |
| **YouTube** | Video download for analysis | `@distube/ytdl-core` |
| **Recharts** | Data visualization in frontend | `recharts` |
| **better-sqlite3** | Local database storage | `better-sqlite3` |

---

## Configuration & Environment Variables

Create a `.env` file in the project root:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Groq Cloud (required for hybrid analysis)
GROQ_API_KEY_1=your_primary_groq_key
GROQ_API_KEY_2=                        # Optional: additional key for rate limit rotation
GROQ_API_KEY_3=                        # Optional: additional key for rate limit rotation

# Feature Flags
USE_HYBRID_ANALYSIS=true               # Enable Gemini+Groq hybrid mode
LLM_TWO_PASS_ENABLED=true              # Enable draft→critique reasoning
LLM_LOGGING_ENABLED=true               # Enable provenance logging

# Daily Budget Limits (requests per day per cost tier)
LLM_DAILY_BUDGET_LOW=10000
LLM_DAILY_BUDGET_MEDIUM=5000
LLM_DAILY_BUDGET_HIGH=500

# Optional: Data Integrations (OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=

# Optional: Creative Memory Layer
META_AD_LIBRARY_TOKEN=                 # For competitor ad ingestion
```

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- npm

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd stratapilot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Run in development mode
npm run dev       # Frontend (Vite) on port 3000
npm run server    # Backend (Express) on port 3000

# 5. Build for production
npm run build
npm start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express backend |
| `npm run build` | Build frontend for production |
| `npm run start` | Build + start production server |

---

## End-to-End Workflow

### Example: Analyzing a Video Ad

1. **User** opens `http://localhost:3000`
2. **User** uploads a video file or pastes a YouTube URL
3. **User** enters context: "Analyze this FMCG shampoo ad for Gen Z audience"
4. **User** selects "CRI Analysis" preset
5. **Backend** generates content hash, checks cache (MISS)
6. **Backend** infers industry: "FMCG" from context keywords
7. **Backend** fetches competitive context from Creative Memory DB:
   - Dominant hooks: 35% question, 28% benefit
   - Saturated CTAs: 45% "Shop Now"
8. **Backend** runs hybrid analysis:
   - Gemini extracts: 2 human faces, bright colors, product shot at 0:15, logo at 0:28
   - Groq generates: 12 diagnostics, audience profile, brand archetype
9. **Backend** caches result tagged with industry "FMCG"
10. **Frontend** displays:
    - Radar chart with 12 metrics
    - Target audience cards
    - Brand Strategy Window
    - ROI predictions
11. **User** clicks "Generate Strategy"
12. **Backend** generates campaign recommendations
13. **User** exports to PDF

---

## Key Features

### 12 Diagnostic Metrics
Every creative is scored against:
1. Immediate Attention (Hook)
2. Creative Differentiation
3. Visual Hierarchy
4. Audio Impact / Visual Synergy
5. Call to Action (CTA) Strength
6. Message Relevance
7. Clarity of Proposition
8. Narrative Pacing
9. Emotional Resonance
10. Brand Linkage & Visibility
11. View-Through Potential
12. Overall Persuasion

### Target Audience Profiling
- **Demographics**: Age, gender, income, occupation, education
- **Psychographics**: Interests, values, lifestyle, personality traits
- **Behavioral**: Buying habits, brand loyalty, purchase journey

### Competitive Intelligence
- Ingests ads from Meta Ad Library and Google Ads Transparency
- Identifies saturated patterns ("78% of competitors use question hooks")
- Surfaces differentiation opportunities
- Adds risk warnings ("Your CTA matches 45% of competitors")

### Hybrid LLM Architecture
- Separates visual understanding (Gemini) from strategic reasoning (Groq)
- Uses task-appropriate models (DeepSeek for validation, Qwen3 for summarization)
- Two-pass reasoning for high-stakes outputs

---

## Design Decisions & Assumptions

### Inferred Design Decisions

1. **Hybrid over Monolithic LLM**: The codebase separates visual extraction (Gemini) from strategic analysis (Groq) to leverage each model's strengths and reduce API costs.

2. **Content Hashing for Deduplication**: SHA-256 hashing prevents reprocessing identical creatives, significantly reducing API costs for repeated analyses.

3. **Industry Tagging**: All insights are tagged by industry (FMCG, BFSI, Auto, etc.) to enable cross-analysis learning and competitive benchmarking.

4. **Epistemic Guardrails**: The system explicitly avoids claiming predictive certainty. Phrases like "predicted CTR" are replaced with "engagement potential" to prevent overconfidence.

5. **Two-Tier Source Trust**: Competitive intelligence distinguishes Tier 1 (official ad libraries) from Tier 2 (scraped archives), with only Tier 1 influencing scoring.

6. **Model Cost Governance**: Built-in daily budget limits per cost tier (low/medium/high) prevent runaway API expenses.

### Assumptions

1. **Gemini API Key** is always available (environment variable required)
2. **Single-tenant deployment** (no multi-user authentication)
3. **Local SQLite databases** (no cloud persistence)
4. **Frontend runs same origin as backend** (API proxy in Vite config)

---

## Current Limitations

### Intentionally Incomplete

1. **OAuth Integrations**: Google and Meta OAuth routes exist but require client credentials to function. Currently, tokens are not persisted.

2. **Creative Memory Ingestion**: The Meta and Google ad library sources have methods defined but may require API tokens or web scraping updates as platforms change.

3. **Multi-User Support**: No authentication system; designed for single-user or internal team use.

### Technical Limitations

1. **File Size**: Video uploads capped at 100MB (configurable in `server.ts`)
2. **Rate Limits**: Groq Cloud has aggressive rate limits; key rotation helps but high-volume use may hit limits
3. **Real-Time Processing**: Long videos may take 30-60 seconds for full analysis
4. **Browser Compatibility**: PDF export uses `html2canvas` which may have rendering differences across browsers

---

## License

This project is private and not licensed for redistribution.

---

## Support

For issues or questions, contact the development team.
