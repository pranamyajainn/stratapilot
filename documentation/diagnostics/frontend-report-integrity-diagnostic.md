# StrataPilot Frontend Report Integrity Diagnostic Report
**Generated:** 2026-01-20T21:19:00+05:30  
**Auditor:** Antigravity Frontend Systems Engineer  
**Scope:** Frontend report rendering failures and data flow breaks

---

## Executive Summary

**Root Cause:** Report tabs render blank due to **missing defensive rendering guards** in React components that blindly map over potentially empty or undefined arrays. The `BrandStrategyWindow` and `BrandArchetypeMatrix` components receive data props directly from state without null/undefined checks, causing silent render failures when the backend returns incomplete data structures. The issue is NOT a connection problem or cache issue — the frontend is calling the backend correctly, but **component rendering logic assumes data is always fully populated**, which is false during text-only analysis or when the LLM fails to generate certain sections.

The tabs that render blank are:
- **Tab 6: Brand Strategy** — depends on `localData.brandStrategyWindow` (array)
- **Tab 7: Brand Archetype** — depends on `localData.brandArchetypeDetail` (object)

These sections have **no fallback UI** when data is missing, resulting in completely blank content areas.

---

## Affected Report Sections

### 1. Brand Strategy Tab (Tab 6)

**Component:** `BrandStrategyWindow` (line 456)  
**Data Dependency:** Requires `cards: BrandStrategyCard[]` prop

**File:** `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx`

**Expected Data:**
```typescript
interface BrandStrategyCard {
  title: string;
  subtitle: string;
  content: string;
}

// Expected: Array of 10 cards
```

**Actual Rendering Logic** (line 481-500):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  {cards.map((card, idx) => (
    <div key={idx} ...>
      <h4>{card.title}</h4>
      <p>{card.subtitle}</p>
      <p>{card.content}</p>
    </div>
  ))}
</div>
```

**Problem:**
- **No guard:** If `cards` is `undefined`, `null`, or `[]`, `cards.map()` either crashes or renders nothing
- **No fallback:** No "No data available" message
- **Silent failure:** Component mounts successfully but renders blank grid

**Pass-through chain:**
```
Line 977: <BrandStrategyWindow cards={localData.brandStrategyWindow} />
          ↓
Line 456: const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards })
          ↓
Line 482: {cards.map((card, idx) => ...)}
```

---

### 2. Brand Archetype Tab (Tab 7)

**Component:** `BrandArchetypeMatrix` (line 382)  
**Data Dependency:** Requires `detail` object prop

**Expected Data:**
```typescript
interface BrandArchetypeDetail {
  archetype: string;
  value: string;
  quote: string;
  reasoning: string;
}
```

**Actual Rendering Logic** (line 398-454):
```tsx
const detected = detail?.archetype || "The Ruler";  // Line 398

{/* grid of archetypes */}
{archetypes.map((arch, i) => {
  const isDetected = detected.toLowerCase().includes(arch.name.toLowerCase().replace('the ', ''));
  // ...renders archetype card
})}

{/* sidebar */}
<h4>{detected}</h4>
<p>"{detail?.quote}"</p>  // Line 439
<p>{detail?.reasoning}</p>  // Line 447
```

**Problem:**
- **Partial guard:** Optional chaining on `detail?.archetype` prevents crash
- **Default fallback:** Uses `"The Ruler"` as default, which is misleading
- **Missing data displayed as empty:** If `detail` is `undefined`, `quote` and `reasoning` render as empty strings ``
- **No explicit "missing data" UI:** Tab appears populated but with empty/default content

**Pass-through chain:**
```
Line 982: <BrandArchetypeMatrix detail={localData.brandArchetypeDetail} />
          ↓
Line 382: const BrandArchetypeMatrix: React.FC<{ detail: any }> = ({ detail })
          ↓
Line 398: const detected = detail?.archetype || "The Ruler"
Line 439: <p>"{detail?.quote}"</p>
Line 447: <p>{detail?.reasoning}</p>
```

---

## Data Flow Trace

### Complete Request-to-Render Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ACTION (Frontend)                                 │
│    Dashboard.tsx:119-160                                    │
│    User clicks "Run Neural Network"                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ analyzeCollateral(context, label, file)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE LAYER                                            │
│    services/geminiService.ts:33                             │
│                                                             │
│    fetch('POST /api/analyze', {                            │
│      body: JSON.stringify({                                │
│        textContext, analysisLabel, fileData, mimeType      │
│      })                                                     │
│    })                                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP Request
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND API ENDPOINT                                     │
│    server/server.ts:1058                                    │
│    app.post('/api/analyze', ...)                            │
│                                                             │
│    → analyzeCollateralSmart()                              │
│    → analyzeCollateralHybrid() [if hybrid mode]           │
│    → analyzeTextOnly() [if no media]                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Analysis execution
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GROQ ANALYZER                                            │
│    server/services/groqAnalyzer.ts:359                      │
│                                                             │
│    LLM Prompt includes:                                    │
│    "Also provide brandStrategyWindow (10 items)            │
│     and brandArchetypeDetail."                             │
│                                                             │
│    Expected JSON Response Schema (line 123-134):           │
│    {                                                        │
│      brandStrategyWindow: Array<{                          │
│        title, subtitle, content                            │
│      }>,                                                    │
│      brandArchetypeDetail: {                               │
│        archetype, value, quote, reasoning                  │
│      }                                                      │
│    }                                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ **FAILURE POINT**
                   │ LLM may return incomplete JSON:
                   │ - Empty arrays []
                   │ - Missing fields (undefined)
                   │ - Malformed nested objects
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND MAPPING                                          │
│    server/server.ts:668-669                                 │
│                                                             │
│    return {                                                 │
│      brandStrategyWindow:                                   │
│        strategicAnalysis.brandAnalysis.brandStrategyWindow, │
│      brandArchetypeDetail:                                  │
│        strategicAnalysis.brandAnalysis.brandArchetypeDetail │
│    }                                                        │
│                                                             │
│    ⚠️  NO VALIDATION: Directly passes LLM response          │
│    ⚠️  NO FALLBACK: If undefined, returns undefined         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ JSON Response
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND SERVICE LAYER RESPONSE                          │
│    services/geminiService.ts:40-45                          │
│                                                             │
│    const result = await response.json();                   │
│    return result.data;                                      │
│                                                             │
│    ⚠️  NO VALIDATION: Directly returns backend response     │
│    ⚠️  NO TRANSFORMATION: No defensive data mapping        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ AnalysisResult object
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. DASHBOARD STATE UPDATE                                   │
│    pages/Dashboard.tsx:156-160                              │
│                                                             │
│    const data = await analyzeCollateral(...);              │
│    setResult({ ...data, auditId: newAuditId });           │
│                                                             │
│    ⚠️  NO VALIDATION: Directly sets incomplete data         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ result prop passed to AnalysisView
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. ANALYSISVIEW COMPONENT                                   │
│    components/AnalysisView.tsx:690-695                      │
│                                                             │
│    const [localData, setLocalData] = useState(data);       │
│    useEffect(() => { setLocalData(data); }, [data]);      │
│                                                             │
│    ⚠️  NO VALIDATION: Directly copies incomplete data       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Tab rendering
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. TAB CONDITIONAL RENDERING                                │
│    components/AnalysisView.tsx:976-982                      │
│                                                             │
│    {(activeTab === "brand-strategy" || isPdfMode) && (     │
│      <BrandStrategyWindow                                   │
│        cards={localData.brandStrategyWindow}               │
│      />                                                     │
│    )}                                                       │
│                                                             │
│    {(activeTab === "brand-archetype" || isPdfMode) && (    │
│      <BrandArchetypeMatrix                                  │
│        detail={localData.brandArchetypeDetail}             │
│      />                                                     │
│    )}                                                       │
│                                                             │
│    ⚠️  PASSES undefined/empty directly to components        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Render attempt
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. COMPONENT RENDER FAILURE                                │
│                                                             │
│    BrandStrategyWindow (line 482):                         │
│      {cards.map(...)}  ← cards = undefined → CRASH         │
│      OR cards = [] → renders empty grid (BLANK)            │
│                                                             │
│    BrandArchetypeMatrix (line 398):                        │
│      detail?.archetype || "The Ruler"                      │
│      → renders default "The Ruler" even if data missing    │
│      detail?.quote → ""  (empty string displayed)          │
│                                                             │
│    RESULT: Blank tab content, no error message             │
└─────────────────────────────────────────────────────────────┘
```

---

## State & Schema Mismatches

### Mismatch 1: Optional vs Required Fields

**TypeScript Interface** (`types.ts:115-129`):
```typescript
export interface AnalysisResult {
  demographics: Demographic;       // REQUIRED
  psychographics: Psychographic;   // REQUIRED  behavioral: Behavioral;           // REQUIRED
  adDiagnostics: DiagnosticItem[]; // REQUIRED
  brandAnalysis?: BrandAnalysis;           // OPTIONAL
  brandStrategyWindow: BrandStrategyCard[]; // **REQUIRED** (no ?)
  brandArchetypeDetail?: BrandArchetypeDetail; //  OPTIONAL
  roiMetrics?: RoiMetrics;                   // OPTIONAL
  // ...
}
```

**Backend Schema** (`server.ts:429`):
```typescript
required: [
  "modelHealth", "validationSuite", "demographics", "psychographics",
  "behavioral", "brandAnalysis", "brandStrategyWindow",
  "brandArchetypeDetail", "roiMetrics", "adDiagnostics"
]
```

**CONFLICT:**
- Backend marks `brandStrategyWindow` and `brandArchetypeDetail` as **REQUIRED**
- Frontend TypeScript marks `brandStrategyWindow` as **REQUIRED** but `brandArchetypeDetail` as **OPTIONAL**
- **Runtime behavior:** Backend hybrid analysis returns these fields, but text-only analysis (no media) skips them
- **Result:** Frontend receives incomplete data, components crash/render blank

---

### Mismatch 2: Backend Response Structure

**Backend Hybrid Analysis Output** (`server.ts:665-670`):
```typescript
return {
  // ... other fields
  brandStrategyWindow: strategicAnalysis.brandAnalysis.brandStrategyWindow,
  brandArchetypeDetail: strategicAnalysis.brandAnalysis.brandArchetypeDetail,
  // ...
}
```

**Groq Analyzer Schema** (`groqAnalyzer.ts:123-134`):
```typescript
brandStrategyWindow: Array<{
  title: { type: Type.STRING },
  subtitle: { type: Type.STRING },
  content: { type: Type.STRING }
}>,
brandArchetypeDetail: {
  properties: {
    archetype: { type: Type.STRING },
    value: { type: Type.STRING },
    quote: { type: Type.STRING },
    reasoning: { type: Type.STRING }
  },
  required: ["archetype", "value", "quote", "reasoning"]
}
```

**PROBLEM:**
- LLM is **instructed** to return these fields
- But LLM output is **unpredictable** — may return partial/empty arrays
- Backend **trusts LLM output** without validation (line 668: direct assignment)
- No fallback generation for missing fields

**Evidence from logs:**
```
[RUNTIME-VERIFY] Analysis Complete - Industry: N/A
```
- `Industry: N/A` indicates LLM returned incomplete analysis
- If industry detection failed, likely other fields also incomplete

---

### Mismatch 3: Array Length Assumptions

**Frontend expectation** (`BrandStrategyWindow` line 481):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
```
- **Grid layout:** `lg:grid-cols-5` implies expectation of **10 cards** (2 rows × 5 cols)

**Backend prompt** (`groqAnalyzer.ts:359`):
```
"Also provide brandStrategyWindow (10 items) and brandArchetypeDetail."
```
- **LLM instructed to return 10 items**

**Fallback generation** (`server.ts:758-762`):
```typescript
brandStrategyWindow: data.brandStrategyWindow || Array(10).fill(0).map((_, i) => ({
  title: `Strategy ${i+1}`,
  subtitle: `Insight ${i+1}`,
  content: `Content placeholder ${i+1}.`
}))
```
- Fallback generates 10 placeholder cards... **BUT**

**CRITICAL ISSUE:**
- This fallback is in the **legacy Gemini-only path** (line 758)
- **Hybrid analysis path (line 668)** has **NO such fallback**
- Result: Hybrid mode returns empty array if LLM fails → blank tab

---

## Render Guard Failures

### Guard Failure 1: BrandStrategyWindow - No Array Check

**File:** `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx`  
**Line:** 456-503

**Current Code:**
```tsx
const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
  // ... icon map ...
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => (  // ❌ NO GUARD HERE
          <div key={idx}...>
            {/* card content */}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Problem:**
- **No check:** `if (!cards || cards.length === 0)`
- **No fallback:** No "No brand strategy data available" message
- **Blind map:** Directly calls `cards.map()` assuming array exists

**Render outcomes:**
- `cards = undefined` → **CRASH** (`Cannot read property 'map' of undefined`)
- `cards = null` → **CRASH** (`Cannot read property 'map' of null`)
- `cards = []` → **Renders blank grid** (No content, no error)

---

### Guard Failure 2: BrandArchetypeMatrix - Weak Optional Chaining

**File:** `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx`  
**Line:** 382-454

**Current Code:**
```tsx
const BrandArchetypeMatrix: React.FC<{ detail: any }> = ({ detail }) => {
  const archetypes = [/* 12 archetypes */];
  
  const detected = detail?.archetype || "The Ruler";  // ⚠️ MISLEADING DEFAULT
  
  return (
    <div className="space-y-6">
      {/* archetype grid */}
      <div className="lg:col-span-4...">
        <h4>{detected}</h4>  {/* Shows "The Ruler" even if data missing */}
        <p>"{detail?.quote}"</p>  {/* Shows empty quote: "" */}
        <p>{detail?.reasoning}</p>  {/* Shows empty reasoning */}
      </div>
    </div>
  );
};
```

**Problem:**
- **Optional chaining masks issue:** `detail?.archetype` prevents crash but hides missing data
- **Default value misleading:** Shows "The Ruler" archetype even when analysis never ran
- **Empty strings displayed:** Quote and reasoning render as blank text, not "No data"

**Render outcomes:**
- `detail = undefined` → Renders "The Ruler" with empty quote/reasoning (MISLEADING)
- `detail = {}` → Same as above (MISLEADING)
- `detail.archetype = null` → Renders "The Ruler" (MISLEADING)

---

### Guard Failure 3: No Top-Level Tab Guards

**File:** `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx`  
**Lines:** 976-982

**Current Code:**
```tsx
{/* TAB 6: BRAND STRATEGY */}
{(activeTab === "brand-strategy" || isPdfMode) && (
  <BrandStrategyWindow cards={localData.brandStrategyWindow} />
)}

{/* TAB 7: BRAND ARCHETYPE */}
{(activeTab === "brand-archetype" || isPdfMode) && (
  <BrandArchetypeMatrix detail={localData.brandArchetypeDetail} />
)}
```

**Problem:**
- **No conditional check before component mount**
- **No warning message:** "This analysis did not include brand strategy data"
- **Direct prop pass:** Passes potentially undefined/empty data without inspection

**Should be:**
```tsx
{(activeTab === "brand-strategy" || isPdfMode) && (
  localData.brandStrategyWindow && localData.brandStrategyWindow.length > 0 ? (
    <BrandStrategyWindow cards={localData.brandStrategyWindow} />
  ) : (
    <div>No brand strategy data available for this analysis.</div>
  )
)}
```

---

## Silent Failure Detection

### Silent Failure 1: Array.map() on Empty Array

**Location:** `BrandStrategyWindow component → cards.map()` (line 482)

**Behavior:**
```javascript
[].map((item) => <div>{item}</div>)  // Returns []
// React renders: (nothing)
```

- **No error thrown:** JavaScript allows mapping empty arrays
- **No console warning:** React doesn't warn about empty lists
- **No visual feedback:** Grid container renders but has no children
- **User sees:** Blank white space where content should be

**Detection in DevTools:**
```html
<!-- DOM Output -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  <!-- EMPTY - no children -->
</div>
```

---

### Silent Failure 2: Optional Chaining Masking

**Location:** `BrandArchetypeMatrix component → detail?.archetype` (line 398)

**Behavior:**
```javascript
const detected = undefined?.archetype || "The Ruler";
// Result: "The Ruler"

const quote = undefined?.quote;
// Result: undefined (rendered as empty string in JSX)
```

- **No error thrown:** Optional chaining returns `undefined`, fallback activates
- **No console warning:** This is valid JavaScript
- **Misleading output:** Shows default archetype as if analysis completed
- **User sees:** "The Ruler" archetype with blank quote/reasoning

**Evidence this is happening:**
- Tab appears to have content (archetype grid, sidebar)
- But quote section is empty: `""`
- Reasoning section is empty or shows default text
- User can't distinguish between "missing data" and "analysis chose The Ruler"

---

### Silent Failure 3: No Error Boundaries

**Search Results:**
```bash
grep -r "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" components/
# No results
```

**Finding:** No React Error Boundaries implemented

**Implication:**
- If `cards.map()` throws error, entire AnalysisView crashes
- React renders blank screen with no error message
- User has no indication what went wrong

---

### Silent Failure 4: No Console Logging

**Component render paths:**
```tsx
// BrandStrategyWindow
const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
  // ❌ NO: console.log('BrandStrategyWindow received cards:', cards);
  // ❌ NO: if (!cards) console.error('BrandStrategyWindow: cards prop is undefined');
  
  return (...);
};
```

**Result:**
- **No diagnostic breadcrumbs** in browser DevTools Console
- **No data validation warnings**
- **Silent failure** — component receives bad data and fails silently

---

## Root Cause Hypotheses

### Primary Root Cause: **Missing Defensive Rendering**

**Hypothesis:** Components assume backend **always** returns complete, well-formed data arrays/objects. When LLM fails to generate specific sections (e.g., text-only analysis without brand strategy), components receive `undefined` or `[]` and render blank content instead of fallback UI.

**Evidence:**
1. ✅ `BrandStrategyWindow` has **no guard** for `!cards || cards.length === 0` (line 482)
2. ✅ `BrandArchetypeMatrix` uses weak optional chaining that hides missing data (line 398)
3. ✅ No top-level conditional rendering at tab level (lines 976-982)
4. ✅ Backend hybrid path has no fallback data generation (line 668)

**Code References:**
- `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx:482` — Direct `cards.map()` without check
- `/Users/pranamyajain/stratapilot/components/AnalysisView.tsx:977` — Passes `localData.brandStrategyWindow` directly
- `/Users/pranamyajain/stratapilot/server/server.ts:668` — No fallback for missing LLM fields

---

### Secondary Root Cause: **LLM Output Variability**

**Hypothesis:** Groq LLM (Llama 3.3 70B) is instructed to return `brandStrategyWindow` (10 items) and `brandArchetypeDetail`, but **does not always comply**, especially for text-only analysis without visual context.

**Evidence:**
1. ✅ Runtime verification logs show `Industry: N/A` — LLM returned incomplete analysis
2. ✅ Groq analyzer prompt: "Also provide brandStrategyWindow (10 items)" (line 359) — **instruction, not guarantee**
3. ✅ Text-only analysis path (no media): `analyzeTextOnly()` may skip brand-specific sections
4. ✅ No backend validation of LLM response schema before returning to frontend

**Code References:**
- `/Users/pranamyajain/stratapilot/server/services/groqAnalyzer.ts:359` — LLM prompt instruction
- Runtime log: `[RUNTIME-VERIFY] Has Media: false` → Text-only path
- Runtime log: `[RUNTIME-VERIFY] Analysis Complete - Industry: N/A` → Incomplete output

---

### Tertiary Root Cause: **Schema Optionality Mismatch**

**Hypothesis:** Backend schema marks fields as `required`, but TypeScript frontend marks some as `optional` (`?`), creating asymmetric expectations. Components built for optional fields don't defensively handle missing data.

**Evidence:**
1. ✅ Backend schema: `required: ["brandStrategyWindow", "brandArchetypeDetail", ...]` (line 429)
2. ✅ Frontend types: `brandArchetypeDetail?: BrandArchetypeDetail` (line 123) — Optional
3. ✅ Frontend types: `brandStrategyWindow: BrandStrategyCard[]` (line 122) — **No `?` but actually optional at runtime**
4. ✅ Hybrid analysis backend directly assigns LLM output without validation (line 668)

**Code References:**
- `/Users/pranamyajain/stratapilot/types.ts:122-123` — TypeScript interface definitions
- `/Users/pranamyajain/stratapilot/server/server.ts:429` — Backend required fields
- `/Users/pranamyajain/stratapilot/server/server.ts:668-669` — Direct assignment without fallback

---

## Fix Readiness Notes

### Fix Category 1: **Add Defensive Rendering Guards**

**Required Changes:**

1. **BrandStrategyWindow component** (`AnalysisView.tsx:456-503`)
   - Add guard: `if (!cards || cards.length === 0) return <EmptyState />`
   - Provide fallback UI: "Brand strategy data not available for this analysis type."

<Fix in components/AnalysisView.tsx:456-503>
```tsx
const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
  // ADD THIS GUARD
  if (!cards || cards.length === 0) {
    return (
      <div className="bg-slate-50 rounded-[28px] p-12 text-center border border-slate-200">
        <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 mb-2">No Brand Strategy Data</h3>
        <p className="text-sm text-slate-500">
          Brand strategy analysis requires visual creative input.
          Try uploading an image or video.
        </p>
      </div>
    );
  }
  
  // Existing rendering logic...
};
```
</Fix>

2. **BrandArchetypeMatrix component** (`AnalysisView.tsx:382-454`)
   - Replace weak optional chaining with explicit check
   - Render "No data" state instead of misleading default "The Ruler"

<Fix in components/AnalysisView.tsx:382-454>
```tsx
const BrandArchetypeMatrix: React.FC<{ detail: any }> = ({ detail }) => {
  // ADD THIS GUARD
  if (!detail || !detail.archetype) {
    return (
      <div className="bg-slate-50 rounded-[28px] p-12 text-center border border-slate-200">
        <Crown size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 mb-2">No Brand Archetype Data</h3>
        <p className="text-sm text-slate-500">
          Brand archetype detection requires creative context.
          Provide brand-specific visual or textual input.
        </p>
      </div>
    );
  }
  
  const detected = detail.archetype;  // Remove misleading "|| 'The Ruler'"
  // Existing rendering logic...
};
```
</Fix>

3. **Top-level tab guards** (`AnalysisView.tsx:976-982`)
   - Wrap components in conditional checks before mounting

---

### Fix Category 2: **Backend Fallback Data Generation**

**Required Changes:**

1. **Hybrid analysis path** (`server.ts:665-670`)
   - Add fallback generation for missing fields (currently only in legacy path line 758)

<Fix in server/server.ts:665-670>
```typescript
return {
  // ... other fields ...
  brandStrategyWindow: strategicAnalysis.brandAnalysis.brandStrategyWindow || 
    Array(10).fill(0).map((_, i) => ({
      title: `Strategy Dimension ${i+1}`,
      subtitle: `Analysis pending`,
      content: `Requires more creative context for detailed brand strategy.`
    })),
  brandArchetypeDetail: strategicAnalysis.brandAnalysis.brandArchetypeDetail || {
    archetype: "Analysis Incomplete",
    value: "N/A",
    quote: "Provide brand-specific creative assets for archetype detection.",
    reasoning: "Insufficient data for archetype classification."
  }
};
```
</Fix>

2. **Add LLM response validation**
   - Check if critical fields are missing before returning to frontend
   - Log warnings when LLM returns incomplete data

---

### Fix Category 3: **TypeScript Optionality Alignment**

**Required Changes:**

1. **Update TypeScript interfaces** (`types.ts:115-129`)
   - Mark `brandStrategyWindow` and `brandArchetypeDetail` as **optional** to match runtime behavior

<Fix in types.ts:122-123>
```typescript
export interface AnalysisResult {
  // ... existing required fields ...
  brandStrategyWindow?: BrandStrategyCard[];  // ADD ? (currently missing)
  brandArchetypeDetail?: BrandArchetypeDetail;  // KEEP ? (already optional)
  // ...
}
```
</Fix>

2. **Update backend schema** (`server.ts:429`)
   - Remove `brandStrategyWindow` and `brandArchetypeDetail` from `required` array
   - These should be optional since text-only analysis doesn't generate them

---

### Fix Category 4: **Add Error Boundaries**

**Required Changes:**

1. **Create ErrorBoundary component**
   - Wrap AnalysisView or individual tab sections
   - Catch render errors and display fallback UI

<New file: components/ErrorBoundary.tsx>
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, info) {
    console.error('Report section rendering error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 p-8 rounded-xl border border-red-200">
          <h3>Rendering Error</h3>
          <p>This section failed to load. Please try refreshing or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```
</New>

2. **Wrap tab sections**
```tsx
{(activeTab === "brand-strategy" || isPdfMode) && (
  <ErrorBoundary>
    <BrandStrategyWindow cards={localData.brandStrategyWindow} />
  </ErrorBoundary>
)}
```

---

### Fix Category 5: **Add Diagnostic Logging**

**Required Changes:**

1. **Component-level logging**
   - Add console.warn when components receive empty/undefined data
   - Helps diagnose issues in production

<Fix in components/AnalysisView.tsx>
```tsx
const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
  if (!cards) {
    console.warn('[BrandStrategyWindow] Received undefined cards prop');
  } else if (cards.length === 0) {
    console.warn('[BrandStrategyWindow] Received empty cards array');
  }
  
  // Existing logic...
};
```
</Fix>

---

## Conclusion

**The frontend report tabs render blank because:**

1. ✅ **React components lack defensive rendering guards** — They blindly map over arrays/objects without checking for undefined/empty data

2. ✅ **Backend LLM output is variable** — Groq doesn't always return `brandStrategyWindow` or `brandArchetypeDetail`, especially for text-only analysis

3. ✅ **No fallback data generation in hybrid path** — Unlike legacy Gemini-only mode, hybrid analysis doesn't generate placeholder data when LLM fails

4. ✅ **Schema mismatch creates false assumptions** — Backend marks fields as required, frontend treats some as optional, components assume they're always populated

5. ✅ **No error boundaries or logging** — Silent failures go undetected, users see blank tabs with no explanation

**The fix is straightforward:**
- Add `if (!data || data.length === 0)` guards in all components that map over arrays
- Replace misleading optional chaining (`detail?.field || "default"`) with explicit empty state renders
- Add fallback data generation in backend hybrid analysis path
- Align TypeScript optionality with actual runtime behavior
- Implement error boundaries and diagnostic logging

**This is NOT a connection issue. This is NOT a cache issue. This is a missing render guard issue.**

---

**End of Frontend Report Integrity Diagnostic**
