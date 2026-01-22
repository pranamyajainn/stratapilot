import React, { useState } from 'react';
import { ArrowRight, Lightbulb, TrendingUp, AlertCircle, CheckCircle2, Loader2, ArrowLeftRight, Target, Sparkles, Info } from 'lucide-react';

const TRACKED_INDUSTRIES = [
    'FMCG', 'BFSI', 'Auto', 'Health', 'Tech', 'Retail', 'Telecom', 'F&B',
    'Entertainment', 'Real Estate', 'Education', 'Travel', 'Fashion', 'Beauty', 'Other'
];

interface TransferableInsight {
    category: 'hook' | 'cta' | 'visual' | 'format';
    pattern: string;
    sourceUsage: number;
    targetUsage: number;
    delta: number;
    insight: string;
    recommendation: string;
    impact: 'high' | 'medium' | 'low';
    transferability: 'high' | 'medium' | 'low';
}

interface CrossIndustryInsights {
    sourceIndustry: string;
    targetIndustry: string;
    sourceSampleSize: number;
    targetSampleSize: number;
    transferableInsights: TransferableInsight[];
    totalOpportunities: number;
    summary: string;
}

export const CrossIndustryInsights: React.FC = () => {
    const [sourceIndustry, setSourceIndustry] = useState<string>('');
    const [targetIndustry, setTargetIndustry] = useState<string>('');
    const [insights, setInsights] = useState<CrossIndustryInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDiscoverInsights = async () => {
        if (!sourceIndustry || !targetIndustry) {
            setError('Please select both source and target industries');
            return;
        }

        if (sourceIndustry === targetIndustry) {
            setError('Please select different industries to compare');
            return;
        }

        setLoading(true);
        setError(null);
        setInsights(null);

        try {
            const response = await fetch('http://localhost:3000/api/cross-industry-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceIndustry,
                    targetIndustry
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch insights');
            }

            if (data.success) {
                setInsights(data.data);
            } else {
                throw new Error(data.error || 'Unexpected response format');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to discover insights. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'low': return 'bg-slate-50 text-slate-600 border-slate-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'hook': return '🎯';
            case 'cta': return '👆';
            case 'visual': return '🎨';
            case 'format': return '📐';
            default: return '💡';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-900 flex flex-col font-sans">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="flex items-center gap-3 select-none bg-[#2F5C5C] px-5 py-3 rounded-xl shadow-lg shadow-[#2F5C5C]/20 transform hover:scale-[1.02] transition-transform duration-300 border border-[#234b4b]">
                            <div className="flex items-center justify-center font-bold text-red-500 text-3xl tracking-tighter filter drop-shadow-sm">&lt;/&gt;</div>
                            <div className="flex flex-col -space-y-0.5">
                                <h1 className="text-xl font-serif font-bold tracking-widest text-white">STRATAPILOT</h1>
                                <span className="text-[8px] font-bold tracking-[0.25em] text-slate-200 uppercase">Predict. Optimise. Succeed</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 text-[10px] font-bold text-violet-700 uppercase tracking-wider shadow-sm">Cross-Industry Intelligence</div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">SP</div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py=10 space-y-8">
                <div className="pt-6 pb-4 text-center animate-in fade-in slide-in-from-top-4 duration-700">
                    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 tracking-tight mb-4 font-serif">Cross-Category Learning</h2>
                    <p className="text-base leading-relaxed max-w-3xl mx-auto text-slate-600 font-light">
                        Discover transferable patterns across industries. Learn what makes top performers successful in one category and apply those insights to your brand.
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-900/10 border border-white/50 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500"></div>
                    <div className="p-6 md:p-10">
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <label className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <div className="p-1.5 bg-violet-100 text-violet-600 rounded-md"><Lightbulb size={14} /></div>
                                    Learn From (Source)
                                </label>
                                <select
                                    value={sourceIndustry}
                                    onChange={(e) => setSourceIndustry(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none transition-shadow"
                                >
                                    <option value="">Select industry...</option>
                                    {TRACKED_INDUSTRIES.map(industry => (
                                        <option key={industry} value={industry}>{industry}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">Industry with successful patterns to analyze</p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><Target size={14} /></div>
                                    Apply To (Target)
                                </label>
                                <select
                                    value={targetIndustry}
                                    onChange={(e) => setTargetIndustry(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-shadow"
                                >
                                    <option value="">Select industry...</option>
                                    {TRACKED_INDUSTRIES.map(industry => (
                                        <option key={industry} value={industry}>{industry}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">Your industry to receive recommendations</p>
                            </div>
                        </div>

                        <button
                            onClick={handleDiscoverInsights}
                            disabled={loading || !sourceIndustry || !targetIndustry}
                            className="w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Analyzing Patterns...
                                </>
                            ) : (
                                <>
                                    <ArrowLeftRight size={20} />
                                    Discover Transferable Insights
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-5 bg-amber-50 text-amber-800 rounded-xl flex items-start gap-3 border border-amber-200 animate-in fade-in slide-in-from-top-2">
                        <Info size={20} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold mb-1">Information</p>
                            <p className="text-sm">{error}</p>
                            {error.includes('No pattern data') && (
                                <p className="text-xs mt-2 text-amber-700">
                                    💡 Pattern data is generated from the Creative Memory database. Once competitor ads are ingested, cross-industry insights will become available.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {insights && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <Sparkles className="text-violet-600" size={20} />
                                        Analysis Summary
                                    </h3>
                                    <p className="text-sm text-slate-600">{insights.summary}</p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-white px-4 py-2 rounded-xl border border-violet-200 shadow-sm">
                                        <p className="text-2xl font-bold text-violet-600">{insights.totalOpportunities}</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Opportunities</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white/50 p-3 rounded-xl border border-violet-100">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Source</p>
                                    <p className="font-bold text-violet-700">{insights.sourceIndustry}</p>
                                    <p className="text-xs text-slate-500">Sample: {insights.sourceSampleSize} ads</p>
                                </div>
                                <div className="bg-white/50 p-3 rounded-xl border border-indigo-100">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Target</p>
                                    <p className="font-bold text-indigo-700">{insights.targetIndustry}</p>
                                    <p className="text-xs text-slate-500">Sample: {insights.targetSampleSize} ads</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-indigo-600" size={24} />
                                Transferable Patterns
                            </h3>
                            <div className="grid gap-4">
                                {insights.transferableInsights.map((insight, index) => (
                                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-3xl">{getCategoryIcon(insight.category)}</div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{insight.category}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getImpactColor(insight.impact)}`}>
                                                            {insight.impact} Impact
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800">{insight.pattern}</h4>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-rose-600">+{insight.delta}%</div>
                                                <p className="text-xs text-slate-500">Opportunity Gap</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl mb-4">
                                            <p className="text-sm text-slate-700 leading-relaxed">{insight.insight}</p>
                                        </div>

                                        <div className="flex items-center gap-8 text-sm mb-4">
                                            <div>
                                                <span className="text-slate-500">Source Usage:</span>
                                                <span className="font-bold text-violet-600 ml-2">{insight.sourceUsage}%</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Target Usage:</span>
                                                <span className="font-bold text-indigo-600 ml-2">{insight.targetUsage}%</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Transferability:</span>
                                                <span className={`font-bold ml-2 ${insight.transferability === 'high' ? 'text-emerald-600' : insight.transferability === 'medium' ? 'text-amber-600' : 'text-slate-600'}`}>
                                                    {insight.transferability}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Recommendation</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{insight.recommendation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <footer className="mt-20 py-12 border-t border-slate-200 text-center space-y-3">
                    <p className="text-xs text-slate-500 font-bold">© 2025 StrataPilot AI — Cross-Industry Intelligence Module</p>
                    <p className="text-[11px] text-slate-400 max-w-4xl mx-auto leading-relaxed">
                        Pattern discovery powered by Creative DNA analysis across 15 tracked industries
                    </p>
                </footer>
            </main>
        </div>
    );
};
