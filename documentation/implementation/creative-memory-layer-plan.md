# Comparative Creative Memory Layer

## Purpose

A **backend-only intelligence layer** that silently ingests competitor ads from free official libraries, extracts creative pattern distributions, and injects structured competitive context into Gemini analysis. Users never see or browse ads—they receive diagnostic insights that explain creative risk relative to niche saturation.

---

## Hard Constraints

| Constraint | Rule |
|------------|------|
| **No paid APIs** | Only free, officially accessible ad libraries |
| **No UI changes** | Zero frontend modifications |
| **No ad browsing** | No search endpoints, no gallery views |
| **Evidence only** | Competitor data appears only as diagnostic context |
| **Tier asymmetry** | Platform libraries = authoritative; Archives = contextual breadth |

---

## Approved Free Sources

### Tier 1: Official Platform Libraries (Authoritative)
| Platform | Endpoint | Data Available |
|----------|----------|----------------|
| **Meta Ad Library** | `graph.facebook.com/ads_archive` | Active ads, spend ranges, creatives, regions |
| **Google Ads Transparency** | `adstransparency.google.com` | Advertiser ads, formats, platforms |
| **TikTok Creative Center** | `ads.tiktok.com/business/creativecenter` | Top ads, trending formats |
| **LinkedIn Ad Library** | `linkedin.com/ad-library` | Company ads, B2B formats |
| **Snapchat Ads Library** | Transparency portal | Ad creatives, targeting |
| **Pinterest Ads Library** | EU transparency (regulatory) | Promoted pins, advertiser data |

### Tier 2: Open Archives (Contextual Breadth)
| Archive | URL | Use Case |
|---------|-----|----------|
| **AdsSpot India** | adsspot.in | India market patterns |
| **Digital Tripathi** | digitaltripathi.com/ad-library | India digital campaigns |
| **Advigator** | library.advigator.com | E-commerce ad patterns |
| **AdForum** | adforum.com/creative-work | Global creative formats |
| **Ads of the World** | adsoftheworld.com | Creative archive |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPARATIVE CREATIVE MEMORY                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  Ingestion  │───▶│  Normalize  │───▶│  Pattern Clusters   │ │
│  │   Layer     │    │  & Index    │    │  (by niche/format)  │ │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘ │
│         │                                          │            │
│         ▼                                          ▼            │
│  ┌─────────────┐                        ┌─────────────────────┐ │
│  │   SQLite    │                        │  Context Generator  │ │
│  │    Cache    │                        │  (structured JSON)  │ │
│  └─────────────┘                        └──────────┬──────────┘ │
│                                                    │            │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
                                                     ▼
                    ┌────────────────────────────────────────────┐
                    │           GEMINI ANALYSIS                   │
                    │  ┌──────────────────────────────────────┐  │
                    │  │ Competitive Context Injection:       │  │
                    │  │ • Dominant hook patterns in niche    │  │
                    │  │ • CTA saturation levels              │  │
                    │  │ • Format distribution                │  │
                    │  │ • Message entropy (differentiation)  │  │
                    │  └──────────────────────────────────────┘  │
                    │                    │                        │
                    │                    ▼                        │
                    │  ┌──────────────────────────────────────┐  │
                    │  │ Diagnostic Outputs:                  │  │
                    │  │ • "Hook over-conforms to category"   │  │
                    │  │ • "CTA pattern saturated (78%)"      │  │
                    │  │ • "Visual format underrepresented"   │  │
                    │  └──────────────────────────────────────┘  │
                    └────────────────────────────────────────────┘
```

---

## Proposed Changes

### Core Types

#### [NEW] [creativeMemoryTypes.ts](file:///Users/pranamyajain/stratapilot/server/types/creativeMemoryTypes.ts)

```typescript
// Creative Object (normalized from any source)
interface CreativeObject {
  id: string;
  source: 'meta' | 'google' | 'tiktok' | 'linkedin' | 'snapchat' | 'pinterest' | 'archive';
  advertiserName: string;
  industry: string;        // Auto-detected: FMCG, BFSI, Auto, etc.
  niche: string;           // More specific: "luxury cars", "fintech apps"
  format: 'image' | 'video' | 'carousel' | 'text';
  platform: string[];      // Where it ran: ['facebook', 'instagram']
  region: string[];
  
  // Observable signals only (no performance inference)
  signals: {
    hookType: string;      // "question", "statistic", "testimonial", "shock"
    ctaText: string;
    ctaType: string;       // "learn_more", "shop_now", "sign_up"
    visualStyle: string;   // "minimal", "bold", "lifestyle", "product-focus"
    messageLength: 'short' | 'medium' | 'long';
    hasPrice: boolean;
    hasOffer: boolean;
    hasFace: boolean;
    colorDominant: string;
  };
  
  firstSeen: string;
  lastSeen: string;
  recurrenceCount: number; // How often similar pattern appears
}

// Pattern Distribution (aggregated insight)
interface PatternDistribution {
  niche: string;
  industry: string;
  sampleSize: number;
  
  hookDistribution: Record<string, number>;     // { "question": 0.35, "statistic": 0.22 }
  ctaSaturation: Record<string, number>;        // { "shop_now": 0.45, "learn_more": 0.30 }
  formatDistribution: Record<string, number>;   // { "video": 0.60, "image": 0.35 }
  visualStyleDistribution: Record<string, number>;
  
  dominantPatterns: string[];    // ["testimonial hooks", "blue color schemes"]
  saturatedPatterns: string[];   // Patterns appearing >50% of the time
  underutilizedPatterns: string[]; // Patterns appearing <10%
  
  generatedAt: string;
}

// Competitive Context (structured injection for Gemini)
interface CompetitiveContext {
  detected_industry: string;
  detected_niche: string;
  confidence: number;
  
  niche_patterns: {
    dominant_hooks: string[];
    saturated_ctas: string[];
    common_formats: string[];
    visual_conventions: string[];
  };
  
  differentiation_signals: {
    underutilized_hooks: string[];
    uncommon_formats: string[];
    messaging_gaps: string[];
  };
  
  risk_indicators: {
    over_conformity_patterns: string[];   // "Your hook matches 78% of competitors"
    saturation_warnings: string[];        // "This CTA type is saturated in niche"
  };
}
```

---

### Ingestion Services

#### [NEW] [creativeMemoryBase.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/creativeMemoryBase.ts)

Abstract base for all ingestion sources:

```typescript
export abstract class CreativeMemorySource {
  abstract readonly sourceId: string;
  abstract readonly tier: 1 | 2;  // 1=authoritative, 2=contextual
  
  abstract ingestByNiche(niche: string, region?: string): Promise<CreativeObject[]>;
  abstract isAvailable(): boolean;
  
  protected normalizeToCreativeObject(raw: any): CreativeObject;
  protected extractSignals(creative: any): CreativeObject['signals'];
}
```

---

#### [NEW] [metaCreativeMemory.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/metaCreativeMemory.ts)

Meta Ad Library ingestion (Tier 1):

```typescript
// Uses /ads_archive endpoint (free, requires app token)
// Ingests by: search terms (niche keywords), country
// Extracts: creative format, CTA, visual style, messaging patterns

export class MetaCreativeMemory extends CreativeMemorySource {
  sourceId = 'meta';
  tier = 1 as const;
  
  async ingestByNiche(niche: string, region: string = 'IN'): Promise<CreativeObject[]> {
    // GET /ads_archive?search_terms={niche}&ad_reached_countries={region}
    // fields: ad_creative_bodies, ad_creative_link_captions, ad_creative_link_titles
  }
}
```

---

#### [NEW] [googleCreativeMemory.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/googleCreativeMemory.ts)

Google Ads Transparency ingestion (Tier 1):

```typescript
// Direct scraping of adstransparency.google.com (free, public)
// No paid API - uses Puppeteer/Playwright for structured extraction
// Ingests by: advertiser domain search, category browsing

export class GoogleCreativeMemory extends CreativeMemorySource {
  sourceId = 'google';
  tier = 1 as const;
  
  async ingestByNiche(niche: string, region?: string): Promise<CreativeObject[]> {
    // Scrape transparency center for niche-related advertisers
    // Extract: ad format, platform (YouTube/Search/Display), creative patterns
  }
}
```

---

#### [NEW] [archiveCreativeMemory.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/archiveCreativeMemory.ts)

Unified ingestion for Tier 2 archives:

```typescript
// Aggregates: AdsSpot, Digital Tripathi, AdForum, Ads of the World
// Lower authority - used for contextual breadth only
// Does NOT influence scoring or confidence

export class ArchiveCreativeMemory extends CreativeMemorySource {
  sourceId = 'archive';
  tier = 2 as const;
  
  private archives = [
    { name: 'adsspot', url: 'https://www.adsspot.in', region: 'IN' },
    { name: 'digitaltripathi', url: 'https://www.digitaltripathi.com/ad-library', region: 'IN' },
    { name: 'adforum', url: 'https://www.adforum.com/creative-work', region: 'global' },
    { name: 'adsoftheworld', url: 'https://www.adsoftheworld.com', region: 'global' },
  ];
}
```

---

### Pattern Analysis

#### [NEW] [patternAnalyzer.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/patternAnalyzer.ts)

Aggregates creatives into pattern distributions:

```typescript
export class PatternAnalyzer {
  // Cluster creatives by niche and extract distributions
  analyzeNiche(creatives: CreativeObject[]): PatternDistribution;
  
  // Identify saturation (>50% occurrence)
  findSaturatedPatterns(distribution: PatternDistribution): string[];
  
  // Identify differentiation opportunities (<10% occurrence)
  findUnderutilizedPatterns(distribution: PatternDistribution): string[];
  
  // Compare user creative against niche patterns
  computeConformityScore(userSignals: CreativeObject['signals'], niche: PatternDistribution): number;
}
```

---

### Context Generator

#### [NEW] [competitiveContextGenerator.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/competitiveContextGenerator.ts)

Generates structured context for Gemini injection:

```typescript
export class CompetitiveContextGenerator {
  constructor(
    private patternAnalyzer: PatternAnalyzer,
    private memoryStore: CreativeMemoryStore
  ) {}
  
  // Generate structured context for a detected niche
  async generateContext(industry: string, niche?: string): Promise<CompetitiveContext> {
    const distribution = await this.memoryStore.getPatternDistribution(industry, niche);
    
    return {
      detected_industry: industry,
      detected_niche: niche || 'general',
      confidence: distribution.sampleSize > 50 ? 0.85 : 0.60,
      
      niche_patterns: {
        dominant_hooks: distribution.dominantPatterns.slice(0, 5),
        saturated_ctas: Object.entries(distribution.ctaSaturation)
          .filter(([_, v]) => v > 0.4)
          .map(([k]) => k),
        // ...
      },
      
      differentiation_signals: {
        underutilized_hooks: distribution.underutilizedPatterns,
        // ...
      },
      
      risk_indicators: {
        over_conformity_patterns: [],
        saturation_warnings: [],
      }
    };
  }
  
  // Format context as structured text for Gemini system instruction
  formatForGemini(context: CompetitiveContext): string {
    return `
**COMPETITIVE CREATIVE CONTEXT (Industry: ${context.detected_industry})**
Sample Size: ${context.confidence > 0.8 ? 'High confidence' : 'Moderate confidence'}

NICHE SATURATION ANALYSIS:
- Dominant hook patterns: ${context.niche_patterns.dominant_hooks.join(', ')}
- Saturated CTAs (>40% usage): ${context.niche_patterns.saturated_ctas.join(', ')}
- Common formats: ${context.niche_patterns.common_formats.join(', ')}

DIFFERENTIATION OPPORTUNITIES:
- Underutilized approaches: ${context.differentiation_signals.underutilized_hooks.join(', ')}
- Messaging gaps: ${context.differentiation_signals.messaging_gaps.join(', ')}

DIAGNOSTIC CONSTRAINTS:
When evaluating this creative, flag:
1. Over-conformity to saturated patterns (creative blends in)
2. Missed differentiation opportunities
3. Niche-inappropriate format choices
`;
  }
}
```

---

### Storage

#### [NEW] [creativeMemoryStore.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/creativeMemoryStore.ts)

SQLite-backed storage for cached patterns:

```typescript
// Tables:
// - creatives: Raw creative objects (TTL: 7 days)
// - pattern_distributions: Aggregated patterns by niche (TTL: 24 hours)
// - niche_mappings: Industry → niche keyword mappings

export class CreativeMemoryStore {
  async storeCreatives(creatives: CreativeObject[]): Promise<void>;
  async getCreativesByNiche(niche: string): Promise<CreativeObject[]>;
  async getPatternDistribution(industry: string, niche?: string): Promise<PatternDistribution>;
  async refreshPatternDistribution(industry: string): Promise<void>;
}
```

---

### Server Integration

#### [MODIFY] [server.ts](file:///Users/pranamyajain/stratapilot/server/server.ts)

Inject competitive context into Gemini analysis:

```diff
+ import { CompetitiveContextGenerator } from './services/creativeMemory/competitiveContextGenerator.js';
+ import { CreativeMemoryStore } from './services/creativeMemory/creativeMemoryStore.js';

+ const memoryStore = new CreativeMemoryStore();
+ const contextGenerator = new CompetitiveContextGenerator(new PatternAnalyzer(), memoryStore);

  const analyzeCollateral = async (...) => {
+   // After initial analysis, detect industry and inject competitive context
+   let competitiveContextBlock = "";
+   
+   // Industry will be detected by Gemini in first pass
+   // For now, attempt to infer from textContext or use "general"
+   const inferredIndustry = inferIndustryFromContext(textContext);
+   if (inferredIndustry) {
+     const competitiveContext = await contextGenerator.generateContext(inferredIndustry);
+     competitiveContextBlock = contextGenerator.formatForGemini(competitiveContext);
+   }

    const SYSTEM_INSTRUCTION = `
    ${BASE_KNOWLEDGE}
    
+   ${competitiveContextBlock}
+   
+   **COMPETITIVE DIAGNOSIS PROTOCOL:**
+   When competitive context is provided:
+   1. Evaluate if the creative's hook pattern is saturated in the niche
+   2. Flag over-conformity risks (creative may fail to differentiate)
+   3. Identify missed differentiation opportunities
+   4. Note format/CTA choices relative to niche norms
+   5. Add "Competitive Risk" commentary to relevant diagnostics
    
    Analyze this creative through the lens of: "${analysisLabel}".
    `;
```

---

### Background Ingestion

#### [NEW] [creativeMemoryScheduler.ts](file:///Users/pranamyajain/stratapilot/server/services/creativeMemory/creativeMemoryScheduler.ts)

Background job to refresh creative memory:

```typescript
// Runs on server startup and periodically (every 6 hours)
// Ingests from all sources for tracked industries
// Updates pattern distributions

export class CreativeMemoryScheduler {
  private trackedIndustries = [
    'FMCG', 'BFSI', 'Auto', 'Health', 'Tech', 
    'Retail', 'Telecom', 'F&B', 'Entertainment', 'Real Estate'
  ];
  
  async runIngestion(): Promise<void> {
    for (const industry of this.trackedIndustries) {
      await this.ingestForIndustry(industry);
    }
  }
}
```

---

## Verification Plan

### Automated Tests
```bash
# Test pattern distribution generation
npm run test -- --grep "PatternAnalyzer"

# Test context generation
npm run test -- --grep "CompetitiveContext"

# Test Gemini integration (context appears in system instruction)
npm run test -- --grep "analyzeCollateral competitive"
```

### Manual Verification
1. Upload a creative in a known niche (e.g., fintech)
2. Verify diagnostic output includes competitive context signals
3. Check for statements like "Hook pattern matches 65% of category competitors"
4. Confirm NO ad browsing UI appears
5. Verify no external API costs incurred

---

## Success Criteria

| Criterion | Validation |
|-----------|------------|
| ❌ Exposes ad library UI | **FAILURE** |
| ❌ Enables competitor browsing | **FAILURE** |
| ❌ Uses paid APIs | **FAILURE** |
| ✅ Silently ingests competitor patterns | **SUCCESS** |
| ✅ Injects structured context to Gemini | **SUCCESS** |
| ✅ Explains over-conformity/saturation risks | **SUCCESS** |
| ✅ Zero frontend modifications | **SUCCESS** |

---

## Implementation Priority

| Order | Component | Why |
|-------|-----------|-----|
| 1 | Type definitions | Foundation |
| 2 | CreativeMemoryStore (SQLite) | Persistent cache |
| 3 | MetaCreativeMemory | Primary authoritative source |
| 4 | GoogleCreativeMemory | Secondary authoritative source |
| 5 | PatternAnalyzer | Core intelligence |
| 6 | CompetitiveContextGenerator | Gemini integration |
| 7 | Server integration | Connect to analysis flow |
| 8 | Background scheduler | Autonomous refresh |
| 9 | Tier 2 archives | Contextual breadth |
