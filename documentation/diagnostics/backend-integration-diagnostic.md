# StrataPilot Backend Integration Diagnostic Report
**Generated:** 2026-01-20T20:23:00+05:30  
**Auditor:** Antigravity Systems Debugger  
**Scope:** End-to-end frontend-backend integration trace

---

## Executive Summary

**Verdict:** Frontend and backend ARE technically connected and correctly wired at the code level. The integration appears structurally sound. However, there is a critical temporal mismatch: the frontend build artifact (`dist/`) was compiled approximately **1 hour before** the backend server was started. This means the compiled frontend bundle may not reflect recent backend changes, OR the backend logic changes are semantically identical in output, resulting in no observable difference in user-facing behavior.

---

## Connection Status

**Status:** ✅ **Connected** (with caveats)

**Justification:**
- Frontend service layer (`services/geminiService.ts`) correctly imports and calls backend API routes
- Backend server (`server/server.ts`) exposes matching endpoints on port 3000
- Compiled frontend bundle (`dist/assets/index-BMiOGtbi.js`) contains API call references to `/api/analyze`, `/api/analyze-url`, `/api/strategy`
- Backend server is actively serving the compiled frontend from the `dist` directory
- Health check endpoint `/api/health` responds correctly with HTTP 200
- Runtime process confirmed: Node.js (PID 39898) listening on port 3000

**Caveats:**
- Frontend was built at **2026-01-20 19:42:37**
- Backend server started at runtime (approximately 20:21 based on terminal session)
- This ~40-minute gap may contain backend code changes that the compiled frontend doesn't reflect

---

## Frontend Trace Findings

### 1. User Action Entry Points

**Primary Entry:** `pages/Dashboard.tsx` (lines 119-160)

```typescript
const runAnalysis = async (presetOverride?: string) => {
    // ... validation and context building ...
    
    if (urlInput) {
        const { analyzeUrl } = await import('../services/geminiService');
        data = await analyzeUrl(urlInput, combinedContext, activeLabel, { 
            googleToken, metaToken, gaPropertyId 
        });
    } else {
        data = await analyzeCollateral(combinedContext, activeLabel, file || undefined, { 
            googleToken, metaToken, gaPropertyId 
        });
    }
    
    setResult({ ...data, auditId: newAuditId });
    setLoadingState('success');
}
```

**File:** `/Users/pranamyajain/stratapilot/pages/Dashboard.tsx`  
**Lines:** 119-160

**Strategy Generation:**  
**File:** `/Users/pranamyajain/stratapilot/pages/Dashboard.tsx`  
**Lines:** 168-179

```typescript
const handleStrategy = async () => {
    setLoadingState('strategizing');
    const strategy = await generateCampaignStrategy(result);
    setResult({ ...result, campaignStrategy: strategy });
}
```

### 2. Network/API Call Implementation

**Service Layer:** `/Users/pranamyajain/stratapilot/services/geminiService.ts`

**Base URL Configuration:**
```typescript
const API_BASE_URL = '/api';  // Line 3
```

**Endpoint Mapping:**
- **Analysis (with file):** `POST /api/analyze`  
  - File: `geminiService.ts:33`
  - Payload: `{ textContext, analysisLabel, fileData, mimeType, googleToken, metaToken, gaPropertyId }`

- **Analysis (URL):** `POST /api/analyze-url`  
  - File: `geminiService.ts:62`
  - Payload: `{ videoUrl, textContext, analysisLabel, googleToken, metaToken, gaPropertyId }`

- **Strategy:** `POST /api/strategy`  
  - File: `geminiService.ts:87`
  - Payload: `{ analysis }`

### 3. Evidence of Compilation

**Compiled artifact:** `/Users/pranamyajain/stratapilot/dist/assets/index-BMiOGtbi.js`

**Confirmed API references in compiled code** (line 475):
```javascript
VB="/api"
AN=async(e,t,r,n)=>{...fetch(`${VB}/analyze`,...)}
JP=async(e,t,r,n)=>{...fetch(`${VB}/analyze-url`,...)}
iN=async e=>{...fetch(`${VB}/strategy`,...)}
```

**Build timestamp:** 2026-01-20 19:42:37

### 4. Mock Data / Hardcoded Responses

**Finding:** ❌ **No mock data or client-side fallbacks detected**

- No hardcoded `AnalysisResult` objects found in frontend code
- No conditional logic bypassing API calls
- All data flows through async service functions
- No `localStorage`, `sessionStorage`, or static JSON imports

---

## Backend Reachability Findings

### 1. Exposed Endpoints

**Server File:** `/Users/pranamyajain/stratapilot/server/server.ts`

| Endpoint | Method | Handler Line | Purpose |
|----------|--------|--------------|---------|
| `/api/health` | GET | 890 | Health check |
| `/api/analyze` | POST | 1058 | File/image analysis |
| `/api/analyze-url` | POST | 980 | URL-based video analysis |
| `/api/strategy` | POST | 1219 | Campaign strategy generation |
| `/api/llm-stats` | GET | 895 | LLM router statistics |
| `/api/insight-stats` | GET | 1151 | Cache statistics |
| `/api/auth/google` | GET | 1163 | Google OAuth |
| `/api/auth/meta` | GET | 1191 | Meta OAuth |

### 2. Backend Logic Paths

**Smart Analysis Router** (line 850):
```typescript
const analyzeCollateralSmart = async (...) => {
    if (USE_HYBRID_ANALYSIS) {
        return analyzeCollateralHybrid(...);  // Gemini + Groq
    } else {
        return analyzeCollateral(...);  // Legacy Gemini-only
    }
}
```

**Hybrid Analysis Flag:**  
**File:** `server/server.ts:592`  
**Value:** `process.env.USE_HYBRID_ANALYSIS === 'true'`

**Environment Value:**  
**File:** `.env:35`  
**Value:** `USE_HYBRID_ANALYSIS=true`

**Conclusion:** Backend is configured to use **HYBRID mode** (Gemini visual extraction + Groq strategic analysis)

### 3. Unused/Dead Code

**Potentially Dead Paths:**
- **Legacy Gemini-only analysis** (`analyzeCollateral`, lines 477-559) — bypassed when `USE_HYBRID_ANALYSIS=true`
- **Legacy strategy generation** (`generateCampaignStrategy`, lines 561-582) — replaced by `generateCampaignStrategyHybrid` (lines 811-845)
  
**Note:** These are not technically "dead" — they're fallback paths activated when hybrid mode is disabled.

### 4. Reachability Verification

**Runtime Test Results:**
```bash
$ curl http://localhost:3000/api/health
{"status":"ok","timestamp":"2026-01-20T14:53:38.239Z"}
```

✅ Backend is **reachable and responsive**

---

## Configuration Mismatches

### 1. Environment Variables

**Frontend:** ❌ **No access to environment variables**  
Vite serves frontend as static assets. No `.env` access at runtime.

**Backend:** ✅ **All environment variables loaded**  
File: `.env`

Key configurations:
- `GEMINI_API_KEY` — Set
- `GROQ_API_KEY_1` — Set  
- `USE_HYBRID_ANALYSIS=true` — Enabled

### 2. Base URL Alignment

**Frontend Service:**  
```typescript
const API_BASE_URL = '/api';  // Relative path
```

**Backend Endpoint Prefix:**  
All routes use `/api/*` prefix (confirmed in `server.ts`)

**Vite Proxy (Development):**  
File: `vite.config.ts:9-14`
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

**Note:** This proxy is only active in **development mode** (`npm run dev`). In production, the backend serves the frontend from `dist/`, so relative `/api` paths resolve directly to the backend.

**Current Runtime:** Backend server (`npm run server`) serves both frontend static files (from `dist/`) and API routes. ✅ No mismatch.

### 3. Port Configuration

| Component | Port | File |
|-----------|------|------|
| Backend Server | 3000 | `server.ts:54` |
| Vite Dev Server | 3000 | `vite.config.ts:7` |
| Runtime Server | 3000 | Confirmed via `lsof` |

✅ No port conflicts. Backend is the only process running.

---

## Wiring Verification

### 1. Import Chain

**Frontend → Service Layer → Backend**

```
pages/Dashboard.tsx
  ↓ import { analyzeCollateral } from '../services/geminiService'
services/geminiService.ts
  ↓ fetch('/api/analyze', { method: 'POST', body: ... })
[Network Request]
  ↓
server/server.ts:1058
  ↓ app.post('/api/analyze', async (req, res) => { ... })
server/server.ts:1129
  ↓ analyzeCollateralSmart(...)
server/server.ts:859
  ↓ analyzeCollateralHybrid(...) [if USE_HYBRID_ANALYSIS=true]
server/services/geminiCompiler.ts + groqAnalyzer.ts
  ↓ [Business Logic Execution]
```

✅ **Wiring is intact and traceable**

### 2. Build vs. Runtime State

**Critical Observation:**

- **Frontend build time:** 2026-01-20 19:42:37
- **Backend server start:** ~2026-01-20 20:21 (38 minutes later)
- **Current audit time:** 2026-01-20 20:23

**Implication:** Any backend code changes made **after 19:42** are NOT reflected in the compiled frontend (`dist/`). However, since the service layer only makes HTTP calls to endpoints, and the backend endpoint structure hasn't changed, the frontend should still successfully call the backend — they just communicate via the same stable API contract.

### 3. Static File Serving

**Backend Configuration:**  
File: `server/server.ts:1234-1240`

```typescript
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});
```

✅ Backend correctly serves `dist/index.html` for all non-API routes.

---

## Root Cause Hypothesis

### Primary Hypothesis: **Semantically Identical Backend Output**

The backend infrastructure is connected and functional. The most likely explanation for "effectively identical outputs" is:

1. **Backend logic changes are incremental, not transformative**  
   Even though you've implemented:
   - Hybrid LLM routing (Gemini + Groq)
   - Creative memory layer
   - Insight caching
   - Competitive context injection
   
   ...the **final JSON structure returned to the frontend** (`AnalysisResult`) may still conform to the same schema and contain similar data. The improvements might be:
   - Internal optimizations (cost, speed)
   - Subtle content enhancements (better descriptions, marginally different scores)
   - Not visually striking when rendered in the UI

2. **Cache Hits**  
   File: `server/server.ts:1069-1073`
   
   ```typescript
   const cacheResult = await checkCache(contentHash, analysisLabel);
   if (cacheResult.hit) {
       return res.json({ success: true, data: cacheResult.analysis, cached: true });
   }
   ```
   
   If the user is testing with the same file/URL/context repeatedly, the insight cache returns **pre-backend-change results**. The new backend logic never executes.

3. **Legacy Model Fallback**  
   If `USE_HYBRID_ANALYSIS` environment variable was recently set to `true`, but the user's browser still has cached results from older sessions, or if there's an error in the hybrid pipeline causing silent fallback to legacy Gemini-only mode.

4. **Invisible Improvements**  
   Changes like "creative memory context injection" or "LLM provenance tracking" might be working perfectly but don't produce **visually different UI outputs**. The frontend may display the same analysis fields regardless of whether competitive context is present in the backend's prompt.

### Secondary Hypothesis: **Stale Frontend Build**

The `dist/` directory was built ~40 minutes before the current server session. If:
- The backend API contract (endpoint paths, request/response schemas) changed **recently**
- The frontend service layer (`geminiService.ts`) was updated to match
- BUT the `dist/` was not rebuilt

...then the compiled frontend is still calling **old API endpoints** or sending malformed requests.

**Likelihood:** ❌ Low — because:
- Grep confirms `/api/analyze` exists in compiled `dist/` bundle
- Health check works, indicating backend is serving the correct dist
- User described outputs as "effectively identical," not "broken" or "error-prone"

---

## Fix Readiness Notes

Since you forbade fixes, here's what the next iteration should address:

### 1. Cache Invalidation

**File:** `server/creative_memory.db`, `server/llm_provenance.db`, `server/services/insightDb.ts`

**Action Required:**  
- Clear insight cache database
- Test with fresh, uncached inputs
- Verify cache hit/miss logs in server output

**Command:**
```bash
rm server/creative_memory.db server/llm_provenance.db
# Restart server
```

### 2. Frontend Rebuild

**Action Required:**  
Rebuild frontend to ensure latest service layer code is compiled:

```bash
npm run build
```

**File to Monitor:** `dist/index.html` modification timestamp

### 3. Runtime Verification

**Add Observability:**

In `server/server.ts:1040` (analyze-url endpoint) and `server/server.ts:1129` (analyze endpoint), add console logs:

```typescript
console.log('[RUNTIME] Hybrid mode:', USE_HYBRID_ANALYSIS);
console.log('[RUNTIME] Cache hit:', cacheResult.hit);
console.log('[RUNTIME] Analysis result industry:', result.industry);
```

Re-test and confirm logs appear in server console.

### 4. Frontend-Backend Contract Verification

**Test:**
1. Open browser DevTools → Network tab
2. Trigger analysis
3. Inspect `/api/analyze` request payload and response
4. Verify response matches `AnalysisResult` TypeScript interface
5. Check for `cached: true` in response

### 5. UI Output Comparison

**Action:**  
Capture and compare:
- Pre-backend version UI screenshots
- Post-backend version UI screenshots
- Focus on sections that *should* differ:
  - `adDiagnostics[].commentary` (should mention competitive context if present)
  - `industry` field (should be set)
  - `roiMetrics` (may have different values)

### 6. Environment Consistency Check

**Verify:**
```bash
grep USE_HYBRID_ANALYSIS .env
# Should output: USE_HYBRID_ANALYSIS=true
```

If false or unset, backend is using legacy Gemini-only mode.

### 7. Code Change Archaeology

**Action:**  
Review Git history to determine **when** the following were added:
- Hybrid analysis pipeline (`analyzeCollateralHybrid`)
- Creative memory layer injection
- Groq integration

Compare against `dist/` build timestamp (2026-01-20 19:42:37).

If changes were committed **after** this timestamp, the frontend CAN call the backend, but it's calling a backend that still has the new code. The "identical output" might just be cache.

---

## Diagnostic Conclusion

**Frontend and backend are connected.**  
**The integration is structurally correct.**  
**Outputs appear identical likely due to:**
1. Cache hits returning old results
2. Incremental backend changes that don't produce visually distinct outputs
3. Possible silent errors in hybrid pipeline causing fallback to legacy mode

**Recommended immediate action:**  
Clear databases, rebuild frontend (`npm run build`), restart server, test with new inputs while monitoring server logs for `[HYBRID]`, `[CACHE]`, and `[ROUTER]` prefixes.

**No code edits required for connection.**  
**The wiring works. Behavior analysis requires runtime observation.**

---

**End of Diagnostic Report**
