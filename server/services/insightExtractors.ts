/**
 * Insight Extractors for GA4 and Meta Ads
 * 
 * Transforms raw API data into strategic insights suitable for LLM context.
 * This ensures we pass actionable signals, not raw data dumps.
 */

import {
    GA4InsightInput,
    MetaAdsInsightInput,
    ExtractedInsights,
    PerformanceSignal,
    DEFAULT_BENCHMARKS
} from '../types/insightTypes.js';

// =====================================================
// GA4 INSIGHT EXTRACTION
// =====================================================

export function extractGA4Insights(data: GA4InsightInput): ExtractedInsights {
    const keyFindings: string[] = [];
    const anomalies: string[] = [];
    const recommendations: string[] = [];
    let performanceSignal: PerformanceSignal = 'unknown';

    if (!data.metrics || data.metrics.length === 0) {
        return {
            source: 'GA4',
            period: data.period || 'Unknown',
            fetchStatus: 'SUCCESS_NO_DATA',
            keyFindings: ['GA4 connected, but no traffic data available for this period'],
            performanceSignal: 'unknown',
            anomalies: [],
            recommendations: ['Check date range or tag installation'],
            dataQuality: 'unavailable'
        };
    }

    // Parse metrics into numeric values
    const metricsMap: Record<string, number> = {};
    for (const m of data.metrics) {
        metricsMap[m.name] = parseFloat(m.value) || 0;
    }

    const activeUsers = metricsMap['activeUsers'] || 0;
    const sessions = metricsMap['sessions'] || 0;
    const pageViews = metricsMap['screenPageViews'] || 0;
    const bounceRate = metricsMap['bounceRate'] || 0;
    const engagementRate = metricsMap['engagementRate'] || 0;

    // Check for "Zero Data" despite successful fetch (e.g. all zeros)
    if (activeUsers === 0 && sessions === 0) {
        return {
            source: 'GA4',
            period: data.period,
            fetchStatus: 'SUCCESS_NO_DATA',
            keyFindings: ['GA4 connected, but 0 active users recorded'],
            performanceSignal: 'unknown',
            anomalies: [],
            recommendations: ['Verify tracking code installation', 'Check date range selection'],
            dataQuality: 'unavailable'
        };
    }

    // Calculate derived metrics
    const pagesPerSession = sessions > 0 ? pageViews / sessions : 0;

    // Build key findings
    if (activeUsers > 0) {
        keyFindings.push(`${activeUsers.toLocaleString()} active users over ${data.period}`);
    }

    if (engagementRate > 0) {
        const engagementPct = (engagementRate * 100).toFixed(1);
        const benchmark = (DEFAULT_BENCHMARKS.avgEngagementRate * 100).toFixed(1);
        if (engagementRate >= DEFAULT_BENCHMARKS.avgEngagementRate) {
            keyFindings.push(`Strong engagement rate at ${engagementPct}% (above ${benchmark}% benchmark)`);
        } else {
            keyFindings.push(`Engagement rate at ${engagementPct}% (below ${benchmark}% benchmark)`);
        }
    }

    if (bounceRate > 0) {
        const bouncePct = (bounceRate * 100).toFixed(1);
        if (bounceRate > DEFAULT_BENCHMARKS.avgBounceRate + 0.1) {
            anomalies.push(`High bounce rate (${bouncePct}%) indicates potential landing page issues`);
        } else if (bounceRate < DEFAULT_BENCHMARKS.avgBounceRate - 0.1) {
            keyFindings.push(`Low bounce rate (${bouncePct}%) suggests strong content relevance`);
        }
    }

    if (pagesPerSession > 0) {
        keyFindings.push(`Average ${pagesPerSession.toFixed(1)} pages per session`);
    }

    // Determine performance signal
    let score = 0;
    if (engagementRate >= DEFAULT_BENCHMARKS.avgEngagementRate) score++;
    if (bounceRate <= DEFAULT_BENCHMARKS.avgBounceRate) score++;
    if (pagesPerSession >= 2) score++;

    if (score >= 3) {
        performanceSignal = 'strong';
    } else if (score >= 2) {
        performanceSignal = 'moderate';
    } else if (activeUsers > 0) {
        performanceSignal = 'weak';
    }

    // Generate recommendations based on signals
    if (bounceRate > DEFAULT_BENCHMARKS.avgBounceRate) {
        recommendations.push('Review landing page alignment with ad creative messaging');
    }
    if (engagementRate < DEFAULT_BENCHMARKS.avgEngagementRate) {
        recommendations.push('Strengthen content engagement hooks in first 5 seconds');
    }
    if (pagesPerSession < 2 && sessions > 100) {
        recommendations.push('Add clearer CTAs to guide users deeper into the site');
    }

    // Ensure at least one recommendation
    if (recommendations.length === 0) {
        recommendations.push('Current metrics indicate healthy audience engagement');
    }

    return {
        source: 'GA4',
        period: data.period,
        fetchStatus: 'SUCCESS_WITH_DATA',
        keyFindings: keyFindings.slice(0, 5),
        performanceSignal,
        anomalies,
        recommendations: recommendations.slice(0, 3),
        dataQuality: 'complete'
    };
}

// =====================================================
// META ADS INSIGHT EXTRACTION
// =====================================================

export function extractMetaAdsInsights(data: MetaAdsInsightInput): ExtractedInsights {
    const keyFindings: string[] = [];
    const anomalies: string[] = [];
    const recommendations: string[] = [];
    let performanceSignal: PerformanceSignal = 'unknown';

    // Handle error/info states
    if (data.error || data.info) {
        // Distinguish Auth/API Error from Empty Info
        const isError = !!data.error;
        return {
            source: 'MetaAds',
            period: data.period || 'Unknown',
            fetchStatus: isError ? 'FAILED' : 'SUCCESS_NO_DATA',
            keyFindings: [data.info || data.error || 'Unable to retrieve Meta Ads data'],
            performanceSignal: 'unknown',
            anomalies: [],
            recommendations: ['Verify Meta Ads account permissions and data availability'],
            dataQuality: 'unavailable'
        };
    }

    const metrics = data.metrics || {};

    // Extract key metrics
    const spend = parseFloat(metrics.spend) || 0;
    const impressions = parseInt(metrics.impressions) || 0;
    const clicks = parseInt(metrics.clicks) || 0;

    // Check for Zero Data
    if (spend === 0 && impressions === 0) {
        return {
            source: 'MetaAds',
            period: data.period || 'Unknown',
            fetchStatus: 'SUCCESS_NO_DATA',
            keyFindings: ['Meta Ads connected, but no spend/impressions recorded'],
            performanceSignal: 'unknown',
            anomalies: [],
            recommendations: ['Check campaign status', 'Verify date range'],
            dataQuality: 'unavailable'
        };
    }

    const ctr = parseFloat(metrics.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const cpc = parseFloat(metrics.cpc) || (clicks > 0 ? spend / clicks : 0);
    const cpm = parseFloat(metrics.cpm) || (impressions > 0 ? (spend / impressions) * 1000 : 0);

    // Build key findings
    if (spend > 0) {
        keyFindings.push(`$${spend.toLocaleString(undefined, { minimumFractionDigits: 2 })} total ad spend over ${data.period}`);
    }

    if (impressions > 0) {
        keyFindings.push(`${impressions.toLocaleString()} impressions delivered`);
    }

    if (ctr > 0) {
        const ctrPct = ctr.toFixed(2);
        const benchmarkPct = (DEFAULT_BENCHMARKS.avgCTR * 100).toFixed(2);
        if (ctr >= DEFAULT_BENCHMARKS.avgCTR * 100) {
            keyFindings.push(`CTR of ${ctrPct}% outperforms ${benchmarkPct}% industry average`);
        } else {
            keyFindings.push(`CTR at ${ctrPct}% (below ${benchmarkPct}% benchmark)`);
        }
    }

    if (cpc > 0) {
        const cpcDisplay = cpc.toFixed(2);
        if (cpc <= DEFAULT_BENCHMARKS.avgCPC) {
            keyFindings.push(`Efficient CPC at $${cpcDisplay} (below $${DEFAULT_BENCHMARKS.avgCPC} benchmark)`);
        } else {
            keyFindings.push(`CPC at $${cpcDisplay} (above $${DEFAULT_BENCHMARKS.avgCPC} industry avg)`);
        }
    }

    // Detect anomalies
    if (ctr < DEFAULT_BENCHMARKS.avgCTR * 100 * 0.5) {
        anomalies.push('CTR significantly below average - creative may not resonate with target audience');
    }
    if (cpc > DEFAULT_BENCHMARKS.avgCPC * 2) {
        anomalies.push('CPC is double the benchmark - consider audience or bid optimization');
    }

    // Determine performance signal
    let score = 0;
    if (ctr >= DEFAULT_BENCHMARKS.avgCTR * 100) score++;
    if (cpc <= DEFAULT_BENCHMARKS.avgCPC) score++;
    if (impressions > 1000) score++;  // Meaningful reach

    if (score >= 3) {
        performanceSignal = 'strong';
    } else if (score >= 2) {
        performanceSignal = 'moderate';
    } else if (spend > 0) {
        performanceSignal = 'weak';
    }

    // Generate recommendations
    if (ctr < DEFAULT_BENCHMARKS.avgCTR * 100) {
        recommendations.push('Test alternative creative hooks to improve click-through rate');
    }
    if (cpc > DEFAULT_BENCHMARKS.avgCPC) {
        recommendations.push('Refine audience targeting to reduce cost per click');
    }
    if (anomalies.length === 0 && performanceSignal === 'strong') {
        recommendations.push('Current campaigns performing well - consider scaling budget');
    }

    if (recommendations.length === 0) {
        recommendations.push('Monitor campaign metrics and iterate on top performers');
    }

    // Extract actions data if present
    if (metrics.actions && Array.isArray(metrics.actions)) {
        const conversions = metrics.actions.find((a: any) =>
            a.action_type === 'purchase' || a.action_type === 'lead' || a.action_type === 'complete_registration'
        );
        if (conversions) {
            keyFindings.push(`${conversions.value} ${conversions.action_type.replace('_', ' ')} conversions recorded`);
        }
    }

    return {
        source: 'MetaAds',
        period: data.period || 'Unknown',
        fetchStatus: 'SUCCESS_WITH_DATA',
        keyFindings: keyFindings.slice(0, 5),
        performanceSignal,
        anomalies,
        recommendations: recommendations.slice(0, 3),
        dataQuality: spend > 0 ? 'complete' : 'partial'
    };
}

// =====================================================
// LLM CONTEXT FORMATTING
// =====================================================

export function formatInsightsForLLM(insights: ExtractedInsights): string {
    const lines: string[] = [];

    lines.push(`\n\n[${insights.source} INSIGHTS - ${insights.period}]`);
    lines.push(`Status: ${insights.fetchStatus}`);
    lines.push(`Performance Signal: ${insights.performanceSignal.toUpperCase()}`);

    if (insights.fetchStatus === 'SUCCESS_NO_DATA') {
        lines.push(`NOTE: Account connected but NO DATA AVAILABLE. Do not infer performance.`);
        return lines.join('\n');
    }

    if (insights.fetchStatus === 'FAILED') {
        lines.push(`NOTE: Data fetch failed.`);
        return lines.join('\n');
    }

    // REHYDRATION: Pass raw findings without truncation
    if (insights.keyFindings.length > 0) {
        lines.push(`\nKey Findings (Detailed):`);
        insights.keyFindings.forEach(f => lines.push(`• ${f}`));
    }

    if (insights.anomalies.length > 0) {
        lines.push(`\nAnomalies & Deviations:`);
        insights.anomalies.forEach(a => lines.push(`⚠ ${a}`));
    }

    if (insights.recommendations.length > 0) {
        lines.push(`\nStrategic Implications:`);
        insights.recommendations.forEach(r => lines.push(`→ ${r}`));
    }

    return lines.join('\n');
}

// =====================================================
// DISCONNECTED STATE HANDLER
// =====================================================

export function formatDisconnectedState(): string {
    return `\n\n[DATA CONTEXT: No external data sources connected. Analysis based on visual and textual inputs only. Connect GA4 or Meta Ads for performance-calibrated insights.]`;
}
