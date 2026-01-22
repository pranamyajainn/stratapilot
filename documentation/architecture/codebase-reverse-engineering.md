# StrataPilot Technical Analysis Report

## 1. Application Intent & Product Overview

**What it is:** StrataPilot is an enterprise-grade **Creative Intelligence & Ad Diagnostic Platform**.
**Core Problem:** Marketing teams spend budget on creatives without knowing if they will perform. Subjective feedback leads to inefficient ad spend.
**Solution:** A "Pre-flight" diagnostic tool that uses AI (Google Gemini) to analyze ad creatives (video/image) against marketing frameworks, providing objective scores, audience profiling, and strategic optimization *before* media buying.
**User Journey:**
1.  **Ingest:** User uploads a video/image or pastes a URL (YouTube/TikTok/Meta).
2.  **Context:** User optionally adds strategic context (voice/text) or connects real data sources (GA4, Meta Ads).
3.  **Process:** System analyzes the asset, identifying industry patterns and "Creative Memory" (what worked before).
4.  **Result:** A comprehensive dashboard showing "Ad Health," "Psychographic Profile," "Strategic Recommendations," and "ROI Uplift" predictions.

---

## 2. High-Level Architecture

The system follows a **Modern Monolithic** architecture, optimized for rapid iteration but structured for modularity in the backend.

### **Frontend (Client)**
*   **Framework:** React 19 + Vite.
*   **Language:** TypeScript.
*   **Styling:** Tailwind CSS (via CDN in `index.html` and local classes).
*   **Key Libraries:** `lucide-react` (Icons), `recharts` (Visualization), `react-router-dom` (Routing).
*   **Architecture pattern:** "Smart" Page Components (`Dashboard.tsx`) managing state for "Dumb" Presentational Components (`AnalysisView.tsx`).

### **Backend (Server)**
*   **Runtime:** Node.js with Express.
*   **Language:** TypeScript (`tsx` for execution).
*   **Core AI:** Google Gemini 2.0 Flash (optimized for multimodal interactions like Video+Text).
*   **Data Layer:** SQLite (`better-sqlite3`).
    *   **Insights DB:** Caches analysis results (`insights.db`).
    *   **Creative Memory DB:** Stores competitive patterns and historic norms (`creative_memory.db`).

### **Integration Layer**
*   **Google Gemini:** Primary reasoning engine.
*   **Google Analytics 4 & Meta Ads:** (Optional) OAuth integrations to fetch real calibration data.
*   **YouTube/Video Fetching:** `ytdl-core` and direct `axios` streams.

---

## 3. Frontend Analysis

**Component Structure:**
*   **Monolithic Entry:** `Dashboard.tsx` (~600 lines) serves as the controller. It handles file selection, drag-and-drop, voice input (`webkitSpeechRecognition`), and API orchestration.
*   **Visualization:** `AnalysisView.tsx` is the heavy lifter for rendering complex JSON results into usable charts and scores.
*   **Routing:** Simple Hash-like routing via `react-router-dom` (`/`, `/landing`, `/app`).

**State Management:**
*   **Local State:** Heavy use of `useState` in `Dashboard.tsx`. No global store (Redux/Zustand) observed. This is appropriate for the current scale but a bottleneck for future complexity (e.g., comparing multiple ads).

**Rendering Lifecycle:**
1.  **Idle:** Landing state with value propositions.
2.  **Profiling:** `TechLayerLoader.tsx` provides a "fake" progress visualization (0-100%) while the backend processes, keeping the user engaged during the 10-30s AI latency.
3.  **Result:** `AnalysisView` mounts with the full data payload.

---

## 4. Backend Analysis & "Creative Memory"

The backend is surprisingly sophisticated, implementing a **RAG-lite (Retrieval Augmented Generation)** pattern tailored for creativity.

**The "Creative Memory" Subsystem:**
Located in `server/services/creativeMemory/`, this is the system's "Brain."
*   **Ingestion:** It can "watch" industries and learn patterns (e.g., "SaaS ads usually use blue layouts").
*   **Pattern Injection:** When a user uploads a SaaS ad, the backend injects these learned patterns into the Gemini prompt: *"You are analyzing a SaaS ad. Context: SaaS ads typically suffer from generic stock footage. Critique this ad against that knowledge."*
*   **Implementation:** Stored in `creative_memory.db` (SQLite) with tables for `pattern_distributions` and `creatives`.

**Services:**
*   **`geminiService.ts`:** Wrapper around Google GenAI SDK. Handles `uploadToGemini` (File API) for large videos to avoid base64 limits.
*   **`insightCache.ts`:** Content-addressable storage. It hashes the file content (checksum) to prevent re-analyzing the same video twice, saving API costs.
*   **`server.ts`:** Main Express application. Configures CORS, request limits (150MB for videos), and error handling.

---

## 5. Data Flow

1.  **Input:** User uploads `video.mp4` to Frontend.
2.  **Transfer:** Frontend POSTs to `/api/analyze` (form-data or JSON with base64/URL).
3.  **Hash & Cache Check:** Backend generates `SHA-256` of content. Checks `insights.db`. If distinct, returns cached JSON immediately.
4.  **Contextualization:**
    *   Backend identifies industry (Regex/Keywords).
    *   Fetches "Competitive Context" from `creative_memory.db`.
    *   Formats system prompt with `BASE_KNOWLEDGE` + `COMPETITIVE_CONTEXT`.
5.  **Processing:**
    *   Backend uploads video to Gemini File API (`uploadFile`).
    *   Waits for processing state.
    *   Sends `generateContent` request with schema-enforced JSON output.
6.  **Response:** Gemini returns structured JSON.
7.  **Persistence:** Backend saves result to `insights.db` and returns JSON to Frontend.

---

## 6. Configuration & Environment

*   **Build:** Vite handles the frontend build. `tsx` handles backend runtime.
*   **Environment Variables:**
    *   `GEMINI_API_KEY` (Critical)
    *   `PORT` (Default 3000)
    *   `GOOGLE_CLIENT_ID` / `META_ACCESS_TOKEN` (For optional integrations)
*   **Deployment Assumptions:** Currently optimized for **Single-Server Deployment** (e.g., VPS, Railway, Render) due to local SQLite files. Scaling to serverless (Vercel/Lambda) would require migrating SQLite behavior to an external DB (Postgres/Turso).

---

## 7. Design Decisions & Trade-offs

*   **SQLite vs. Postgres:**
    *   *Decision:* Used SQLite (`better-sqlite3`).
    *   *Why:* Zero-config, extremely fast, no separate process needed.
    *   *Trade-off:* Harder to scale horizontally; filesystem persistence required.
*   **Gemini vs. OpenAI:**
    *   *Decision:* Google Gemini 2.0 Flash.
    *   *Why:* Superior video understanding (multimodal native) and larger context window at lower cost compared to GPT-4o.
*   **Monolithic Frontend Component:**
    *   *Decision:* Everything in `Dashboard.tsx`.
    *   *Why:* Development speed. Easy to share state (file -> result).
    *   *Trade-off:* Hard to test individual pieces; file is getting large (maintainability risk).

---

## 8. Hidden Assumptions & Risks

1.  **Video Upload Size:** The server limits body size to ~100MB-150MB (`server.ts`). Users uploading 4K raw footage will fail.
2.  **Determinism:** AI is non-deterministic by nature. The system tries to enforce structure via JSON Schema (`responseSchema`), but "Scores" (0-100) will vary slightly between runs.
3.  **YouTube Blocking:** `ytdl-core` is cat-and-mouse game with YouTube. The URL analysis feature is fragile and will break frequently.
4.  **Temp Files:** The server writes temp files to disk. On high concurrency, disk I/O could bottleneck, and cleanup must be robust to prevent storage exhaustion.

---

## 9. Extension Readiness

**Ready for:**
*   **New Analysis Types:** Adding a new "Preset" is easy (add prompt to `Dashboard` -> `server`).
*   **New Data Connectors:** The `IntegrationType` pattern is established.

**Needs Work before:**
*   **User Accounts/Auth:** There is NO user authentication. Everyone is Admin.
*   **History:** There is no UI to "See my past analyses" (though the DB stores them).
*   **Comparing Ads:** The UI is designed for single-file focus.

---

### **Executive Summary**
StrataPilot is a high-potential, technically sound MVP. It leverages cutting-edge Multimodal AI patterns (Video-to-Text-to-JSON) effectively. The "Creative Memory" architecture differentiates it from generic wrappers, giving it a "long-term memory" of industry trends. The immediate technical debt lies in the frontend monolith and the single-server dependency of SQLite, but these are acceptable constraints for the current stage.
