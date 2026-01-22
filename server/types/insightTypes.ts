/**
 * Insight Types for GA4 and Meta Ads Integration
 * 
 * These types define the structure for transforming raw API data
 * into strategic insights suitable for LLM context injection.
 */

// =====================================================
// INPUT TYPES (Raw API Response Structures)
// =====================================================

export interface GA4InsightInput {
    source: string;
    period: string;
    metrics: Array<{ name: string; value: string }>;
}

export interface MetaAdsInsightInput {
    source: string;
    account?: string;
    period?: string;  // Optional - may not be present in error/info responses
    metrics?: Record<string, any>;
    error?: string;
    info?: string;
}

// =====================================================
// OUTPUT TYPES (Extracted Insights)
// =====================================================

export type PerformanceSignal = 'strong' | 'moderate' | 'weak' | 'unknown';

export interface ExtractedInsights {
    source: 'GA4' | 'MetaAds';
    period: string;
    keyFindings: string[];           // 3-5 bullet points
    performanceSignal: PerformanceSignal;
    anomalies: string[];             // Unusual patterns detected
    recommendations: string[];       // 2-3 actionable items
    dataQuality: 'complete' | 'partial' | 'unavailable';
}

// =====================================================
// BENCHMARK TYPES
// =====================================================

export interface IndustryBenchmarks {
    avgBounceRate: number;          // e.g., 0.45 (45%)
    avgEngagementRate: number;      // e.g., 0.60 (60%)
    avgCTR: number;                 // e.g., 0.02 (2%)
    avgCPC: number;                 // e.g., 1.50 ($1.50)
}

// Default benchmarks (can be made industry-specific later)
export const DEFAULT_BENCHMARKS: IndustryBenchmarks = {
    avgBounceRate: 0.45,
    avgEngagementRate: 0.55,
    avgCTR: 0.015,
    avgCPC: 1.20
};
