import React from 'react';
import {
    AnalysisResult, DiagnosticItem, CampaignStrategy, BrandStrategyCard, BrandArchetypeDetail
} from '../../types';
import {
    User, Brain, Activity, Target, TrendingUp, TrendingDown, Users, Heart, Diamond, CheckCircle2, DollarSign, Scan, Search, Radar, Sparkles, Crown, ZapOff, Info, Layers, ShieldAlert, CheckCircle, FileText, BarChart, Globe, Zap, Smile, LayoutTemplate, Briefcase, MapPin, GraduationCap, Coins, Users2, Rocket,
    Calendar, BookOpen, Trophy, Lightbulb, RefreshCw, ShieldCheck, ChevronDown, ChevronUp, Edit2, Check, ArrowRight, BrainCircuit, Fingerprint, Headphones, Anchor, Link2, BoxSelect, Sun, Compass, Zap as OutlawIcon, Palette, HandHeart, Bot, MousePointerClick, Database, Swords, Clock, TrendingUp as UpliftIcon, AlertTriangle, PlayCircle, MousePointer2, BarChart3, Lock, Pencil, Microscope, Ear, LayoutGrid, Eye, FileDown, Megaphone, BarChart2
} from 'lucide-react';
import {
    Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

// --- Shared Helpers (Duplicated to avoid dependency on potentially changing UI helpers) ---
const normalizeScore = (val: number | undefined): number => {
    if (val === undefined || val === null || isNaN(val)) return 0;
    return val <= 10 ? Math.round(val * 10) : val;
};

const getRubricTier = (score: number): string => {
    const s = normalizeScore(score);
    if (s >= 90) return "Outstanding";
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Average";
    return "Poor";
};

const getTierColorHex = (tier: string): string => {
    switch (tier) {
        case "Outstanding": return "#059669";
        case "Excellent": return "#10b981";
        case "Good": return "#4f46e5";
        case "Average": return "#f59e0b";
        default: return "#ef4444";
    }
};

const getTierStyles = (tier: string): string => {
    switch (tier) {
        case "Outstanding": return "text-[#059669] bg-[#ecfdf5] border-[#d1fae5]";
        case "Excellent": return "text-[#10b981] bg-[#f0fdf4] border-[#dcfce7]";
        case "Good": return "text-[#4f46e5] bg-[#f5f3ff] border-[#ede9fe]";
        case "Average": return "text-[#f59e0b] bg-[#fffbeb] border-[#fef3c7]";
        default: return "text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]";
    }
};

const EditorialBadge: React.FC = () => (
    <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 w-fit">
        <Edit2 size={8} /> Human Edit
    </span>
);

// --- 0. PDF Cover Page ---
export const PdfCoverPage: React.FC<{ data: AnalysisResult }> = ({ data }) => {
    return (
        <div id="pdf-cover-page" className="bg-[#1e1b4b] w-full min-h-[1100px] flex flex-col items-center justify-between p-20 text-white relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

            {/* Top Branding */}
            <div className="flex flex-col items-center gap-6 relative z-10 w-full mt-20">
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <img src="/stratapilot-logo.png" alt="StrataPilot" className="h-16 object-contain" />
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
            </div>

            {/* Main Title Section */}
            <div className="text-center space-y-6 relative z-10 max-w-2xl">
                <span className="inline-block px-4 py-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-bold tracking-[0.3em] uppercase rounded-full border border-indigo-500/30">
                    Confidential Analysis
                </span>
                <h1 className="text-6xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-indigo-100 to-indigo-300">
                    CREATIVE<br />INTELLIGENCE<br />REPORT
                </h1>
                <p className="text-lg text-indigo-200 font-light max-w-md mx-auto leading-relaxed opacity-80">
                    AI-Driven Diagnostics, ROI Projection & Strategic Optimization
                </p>
            </div>

            {/* Metadata Footer */}
            <div className="w-full relative z-10">
                <div className="grid grid-cols-2 gap-8 py-8 border-t border-white/10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Generated On</p>
                        <p className="text-sm font-medium text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Audit Reference</p>
                        <p className="text-sm font-medium text-white font-mono">{data.auditId || "SP-GEN-001"}</p>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-white/5 opacity-60">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Powered by StrataPilot AI v2.5</p>
                    <p className="text-[10px] text-slate-400">Strictly Confidential &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};

// --- 1. PDF Scorecard ---
export const PdfScorecard: React.FC<{ data: AnalysisResult }> = ({ data }) => {
    const diagnostics = data.adDiagnostics || [];

    // Safety check for empty data
    if (diagnostics.length === 0) return <div className="p-10 text-center text-slate-400">No diagnostic data available.</div>;

    const chartData = diagnostics.map(d => ({
        subject: d.metric.substring(0, 15) + (d.metric.length > 15 ? '...' : ''),
        fullSubject: d.metric,
        A: normalizeScore(d.score),
        B: normalizeScore(d.benchmark || 65),
        fullMark: 100
    }));

    const avgScore = Math.round(diagnostics.reduce((acc, curr) => acc + normalizeScore(curr.score), 0) / (diagnostics.length || 1));
    const avgTier = getRubricTier(avgScore);

    return (
        <div id="pdf-scorecard" className="p-8 bg-white min-h-[1100px] flex flex-col justify-center">
            <div className="bg-slate-900 text-white p-4 rounded-full text-center shadow-md mb-8 w-full">
                <h4 className="text-sm font-black uppercase tracking-[0.3em]">SCORECARD</h4>
            </div>
            <div className="flex-grow flex items-center justify-center">
                <ResponsiveContainer width="100%" height={600}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsRadar name="Benchmark Score" dataKey="B" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
                        <RechartsRadar name="Your Score" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.15} />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center mt-8">
                <h1 className="text-6xl font-black text-slate-900">{avgScore}</h1>
                <div className="text-xl font-bold text-indigo-600 uppercase tracking-widest">{avgTier}</div>
            </div>
        </div>
    );
};

// --- 2. PDF ROI Uplift ---
const ValueUnlockingCard: React.FC<{
    title: string;
    icon: any;
    current: number;
    potential: number;
    unit: string;
    isNegative?: boolean;
    definition: string;
    science: string;
}> = ({ title, icon: Icon, current, potential, unit, isNegative, definition, science }) => {
    const absDelta = Math.abs(potential - current).toFixed(1);
    const pctDelta = (Math.abs((potential - current) / current) * 100).toFixed(1);
    const isImprovement = isNegative ? potential < current : potential > current;

    return (
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
                        <Icon size={18} />
                    </div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">{title}</h4>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${isImprovement ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {isImprovement ? '+' : '-'}{absDelta}{unit} ({isImprovement ? '+' : '-'}{pctDelta}%)
                </div>
            </div>

            <div className="flex justify-between items-end mb-4">
                <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Current</span>
                    <div className="text-sm font-black text-slate-600 tabular-nums">{current.toFixed(1)}{unit}</div>
                </div>
                <div className="space-y-0.5 text-right">
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Potential</span>
                    <div className="text-sm font-black text-emerald-600 tabular-nums">{potential.toFixed(1)}{unit}</div>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                        className="absolute inset-y-0 left-0 bg-slate-300 rounded-full z-10"
                        style={{ width: `${(unit === '%' ? current : current * 10)}%` }}
                    ></div>
                    <div
                        className={`absolute inset-y-0 left-0 rounded-full opacity-30 ${isImprovement ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${(unit === '%' ? potential : potential * 10)}%` }}
                    ></div>
                </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-50 space-y-1.5">
                <p className="text-[9px] font-medium text-slate-500 leading-tight">
                    <span className="font-bold text-slate-700 uppercase tracking-tighter mr-1">Def:</span>
                    {definition}
                </p>
                <p className="text-[8px] font-medium text-emerald-600/80 leading-tight italic">
                    <span className="font-bold text-emerald-700 uppercase tracking-tighter not-italic mr-1">Science:</span>
                    {science}
                </p>
            </div>
        </div>
    );
};

export const PdfRoiUplift: React.FC<{ data: AnalysisResult }> = ({ data }) => {
    // Helper to calculate mock "before" and "after" values based on score
    const getDiagScore = (idx: number) => {
        const d = data.adDiagnostics?.[idx];
        return d ? normalizeScore(d.score) : 50;
    };

    const overallScore = data.adDiagnostics
        ? data.adDiagnostics.reduce((acc, d) => acc + normalizeScore(d.score), 0) / data.adDiagnostics.length
        : 50;

    // Simulate uplift
    const upliftFactor = 1.25;
    const constrainedRoi = Math.min(10, (overallScore / 10) * upliftFactor);

    // Mock calculations for the cards
    const hookCur = getDiagScore(1);
    const hookPot = Math.min(100, hookCur * 1.4);

    const vtrCur = getDiagScore(5);
    const vtrPot = Math.min(100, vtrCur * 1.3);

    const ctrCur = getDiagScore(4) / 10; // Convert to roughly 0-10% range
    const ctrPot = Math.min(10, ctrCur * 1.5);

    const dropCur = 80 - (getDiagScore(0) * 0.5);
    const dropPot = Math.max(10, dropCur * 0.7);

    // Normalized to 1-10 scale for some
    const clarCur = getDiagScore(6) / 10;
    const clarPot = Math.min(10, clarCur * 1.3);

    const visCur = getDiagScore(3) / 10;
    const visPot = Math.min(10, visCur * 1.4);

    const diagnostics = data.adDiagnostics || [];

    return (
        <div id="pdf-roi" className="p-8 bg-white min-h-[1100px] flex flex-col justify-center">
            <div className="bg-slate-900 text-white p-4 rounded-full text-center shadow-md mb-12 w-full">
                <h4 className="text-sm font-black uppercase tracking-[0.3em]">ROI UPLIFT</h4>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-12">
                <ValueUnlockingCard title="Hook Rate" icon={Eye} current={hookCur} potential={hookPot} unit="%" definition="Attention capture" science="Salience" />
                <ValueUnlockingCard title="Completion" icon={PlayCircle} current={vtrCur} potential={vtrPot} unit="%" definition="Retention" science="Narrative" />
                <ValueUnlockingCard title="CTR" icon={MousePointerClick} current={ctrCur} potential={ctrPot} unit="%" definition="Conversion" science="Action Bias" />
                <ValueUnlockingCard title="Bounce Rate" icon={ZapOff} current={dropCur} potential={dropPot} unit="%" isNegative definition="Rejection" science="Cognitive Load" />
                <ValueUnlockingCard title="Message Clarity" icon={FileText} current={clarCur} potential={clarPot} unit="/10" definition="Comprehension speed." science="Fluency heuristic." />
                <ValueUnlockingCard title="Visual Distinctiveness" icon={Diamond} current={visCur} potential={visPot} unit="/10" definition="Brand recognition." science="Distinctiveness bias." />
            </div>
            <div className="bg-slate-900 text-white p-12 rounded-3xl text-center">
                <h3 className="text-lg font-black uppercase tracking-widest text-indigo-400 mb-2">Projected ROAS Impact</h3>
                <div className="text-8xl font-black text-white mb-6">{constrainedRoi.toFixed(1)}x</div>
                <p className="text-slate-400 max-w-lg mx-auto">Based on implementation of all {diagnostics.length} strategic recommendations.</p>
            </div>
        </div>
    );
};

// --- 3. PDF Diagnostic Page ---
export const PdfDiagnosticPage: React.FC<{ item: DiagnosticItem, index: number }> = ({ item, index }) => {
    const s = normalizeScore(item.score);
    const tier = getRubricTier(s);
    const color = getTierColorHex(tier);

    return (
        <div id={`pdf-diagnostic-${index}`} className="bg-white p-16 w-full max-w-4xl mx-auto mb-20 border border-slate-100 shadow-sm relative overflow-hidden" style={{ minHeight: '1100px' }}>
            {/* Background accent */}
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: color }}></div>
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: color }}></div>

            {/* Content Container */}
            <div className="space-y-10 relative z-10">

                {/* Metric Header */}
                <div className="border-b border-slate-100 pb-8 flex justify-between items-end">
                    <div className="space-y-3">
                        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                                {index + 1}
                            </span>
                            Diagnostic Metric
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                            {item.metric}
                        </h1>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-black mb-1" style={{ color: color }}>{s}<span className="text-2xl text-slate-300">/100</span></div>
                        <div className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block" style={{ color: color, backgroundColor: `${color}10` }}>
                            {tier} Performance
                        </div>
                    </div>
                </div>

                {/* Deep Analysis */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Microscope size={16} /> Analysis & Interpretation
                    </h3>
                    <p className="text-lg text-slate-700 leading-relaxed font-medium">
                        {item.commentary}
                    </p>
                </div>

                {/* Sub-Insights / Observations */}
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Eye size={16} /> Key Observations
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {item.subInsights.map((insight, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0"></div>
                                <p className="text-base text-slate-600 leading-relaxed">{insight}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Why / Fix / Impact Grid */}
                <div className="grid grid-cols-1 gap-8 pt-4">
                    {/* Why It Matters */}
                    <div className="flex gap-5">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl h-fit">
                            <Info size={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Why It Matters</h4>
                            <p className="text-base text-slate-600 leading-relaxed">
                                {item.whyItMatters}
                            </p>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="flex gap-5">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl h-fit">
                            <CheckCircle size={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-black text-emerald-700 uppercase tracking-widest">Strategic Recommendation</h4>
                            <p className="text-base text-slate-800 font-bold leading-relaxed">
                                {item.recommendation}
                            </p>
                        </div>
                    </div>

                    {/* Business Impact */}
                    <div className="flex gap-5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                            <TrendingUp size={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-black text-indigo-700 uppercase tracking-widest">Projected Business Impact</h4>
                            <p className="text-base text-slate-600 leading-relaxed italic">
                                {item.impact}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- 4. PDF Brand Strategy ---
export const PdfBrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
    const safeCards = cards || [];
    const iconMap: Record<string, any> = {
        "RATIONAL PROMISE": { icon: Brain, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
        "EMOTIONAL PROMISE": { icon: Heart, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
        "SENSORIAL PROMISE": { icon: Ear, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100" },
        "REASON TO BELIEVE": { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
        "BRAND PURPOSE": { icon: Globe, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100" },
        "BRAND PERSONALITY": { icon: Fingerprint, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
        "VALUE PROPOSITION": { icon: Diamond, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
        "DISTINCTIVE ASSETS": { icon: BoxSelect, color: "text-cyan-500", bg: "bg-cyan-50", border: "border-cyan-100" },
        "MEMORY STRUCTURE": { icon: Anchor, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-100" },
        "STRATEGIC ROLE": { icon: TrendingUp, color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-100" }
    };

    return (
        <div id="pdf-brand-strategy" className="p-8 bg-white min-h-[1100px] flex flex-col">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
                    <LayoutGrid size={24} className="text-slate-700" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND STRATEGY</h3>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Decoding the master frame of brand intent.</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {safeCards.map((card, idx) => {
                    const theme = iconMap[card.title.toUpperCase()] || { icon: Sparkles, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100" };
                    return (
                        <div key={idx} className={`bg-white rounded-[24px] border ${theme.border} p-6 shadow-sm flex flex-col h-full relative overflow-hidden`}>
                            {card.isHumanEdited && <div className="absolute top-2 right-2"><EditorialBadge /></div>}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-10 h-10 ${theme.bg} rounded-xl flex items-center justify-center ${theme.color} shadow-sm`}>
                                    <theme.icon size={20} />
                                </div>
                            </div>
                            <h4 className="text-[13px] font-black text-slate-900 tracking-tighter uppercase leading-tight mb-0.5">{card.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 leading-none">{card.subtitle}</p>
                            <div className="flex-grow">
                                <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{card.content}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 5. PDF Brand Archetype ---
export const PdfBrandArchetypeMatrix: React.FC<{ detail: BrandArchetypeDetail }> = ({ detail }) => {
    if (!detail) return null;

    const archetypes = [
        { name: "The Innocent", value: "SAFETY", icon: Sun },
        { name: "The Sage", value: "KNOWLEDGE", icon: BookOpen },
        { name: "The Explorer", value: "FREEDOM", icon: Compass },
        { name: "The Outlaw", value: "LIBERATION", icon: OutlawIcon },
        { name: "The Magician", value: "POWER", icon: Sparkles },
        { name: "The Hero", value: "MASTERY", icon: Target },
        { name: "The Lover", value: "INTIMACY", icon: Heart },
        { name: "The Jester", value: "PLEASURE", icon: Smile },
        { name: "The Everyman", value: "BELONGING", icon: Users },
        { name: "The Caregiver", value: "SERVICE", icon: HandHeart },
        { name: "The Ruler", value: "CONTROL", icon: Crown },
        { name: "The Creator", value: "INNOVATION", icon: Palette },
    ];

    const detected = detail.archetype || "Inferred Archetype";

    return (
        <div id="pdf-brand-archetype" className="p-8 bg-white min-h-[1100px] flex flex-col">
            <div className="flex items-center gap-4 justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
                        <Crown size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND ARCHETYPE</h3>
                    </div>
                </div>
                {detail.isHumanEdited && <EditorialBadge />}
            </div>

            <div className="grid grid-cols-1 gap-6 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="grid grid-cols-4 gap-4">
                    {archetypes.map((arch, i) => {
                        const isDetected = detected.toLowerCase().includes(arch.name.toLowerCase().replace('the ', ''));
                        return (
                            <div
                                key={i}
                                className={`p-4 rounded-[24px] border-2 flex flex-col items-center justify-center text-center h-32 ${isDetected
                                    ? 'border-amber-500 bg-amber-50/20'
                                    : 'border-slate-100 bg-slate-50/50 opacity-60 grayscale-[0.2]'
                                    }`}
                            >
                                <arch.icon size={24} className={isDetected ? 'text-amber-600' : 'text-slate-400'} />
                                <h4 className={`text-[12px] font-black mt-3 leading-tight ${isDetected ? 'text-slate-800' : 'text-slate-500'}`}>{arch.name}</h4>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-slate-50/80 rounded-[28px] p-8 border border-slate-100 flex flex-col mt-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">DETECTED ARCHETYPE</h5>
                    <h4 className="text-4xl font-serif font-bold text-amber-800 mb-2">{detected}</h4>
                    <p className="text-[14px] font-medium text-slate-500 italic mb-10 leading-relaxed">"{detail.quote}"</p>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 flex-grow shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-indigo-600">
                            <Bot size={16} />
                            <h5 className="text-[11px] font-black uppercase tracking-[0.15em]">AI REASONING</h5>
                        </div>
                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                            {detail.reasoning}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 6. PDF Strategy Plan ---
export const PdfStrategyView: React.FC<{ strategy: CampaignStrategy }> = ({ strategy }) => {
    return (
        <div id="pdf-strategy-plan" className="p-8 bg-[#0f172a] min-h-[1100px] flex flex-col text-white">
            {/* HEADER */}
            <div className="flex flex-col items-center mb-10 text-center relative">
                {strategy.isHumanEdited && <div className="absolute top-0 right-0"><EditorialBadge /></div>}

                <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-widest uppercase rounded-full mb-3 border border-indigo-500/30">
                    Campaign Strategy
                </span>
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight">
                    Strategic Execution Plan
                </h2>
                <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
                    A targeted roadmap to activate the identified persona effectively using data-driven creative vectors.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-10">
                {/* Key Pillars */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2.5 text-indigo-400 mb-3">
                        <Layers className="w-5 h-5" />
                        <h3 className="text-lg font-bold uppercase tracking-wider">Strategic Pillars</h3>
                    </div>
                    <div className="space-y-2.5">
                        {strategy.keyPillars.map((pillar, i) => (
                            <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs">
                                    {i + 1}
                                </span>
                                <p className="text-slate-200 font-medium text-[13px] leading-relaxed">{pillar}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Messaging */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2.5 text-pink-400 mb-3">
                        <Megaphone className="w-5 h-5" />
                        <h3 className="text-lg font-bold uppercase tracking-wider">Core Messaging</h3>
                    </div>
                    <div className="space-y-3.5">
                        {strategy.keyMessages.map((msg, i) => (
                            <div key={i} className="bg-gradient-to-br from-white/10 to-transparent p-5 rounded-xl border-l-4 border-pink-500">
                                <h4 className="font-bold text-base text-white mb-1 tracking-tight italic">"{msg.headline}"</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">{msg.subMessage}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-white/10">
                {/* Timeline */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                        <Calendar className="w-4 h-4" />
                        <h4 className="font-bold uppercase tracking-wider text-[11px]">Timeline</h4>
                    </div>
                    <p className="text-slate-300 text-[12px] leading-relaxed">{strategy.timeline}</p>
                </div>

                {/* Budget */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                        <DollarSign className="w-4 h-4" />
                        <h4 className="font-bold uppercase tracking-wider text-[11px]">Budget Allocation</h4>
                    </div>
                    <p className="text-slate-300 text-[12px] leading-relaxed">{strategy.budgetAllocation}</p>
                </div>

                {/* Channels */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                        <Target className="w-4 h-4" />
                        <h4 className="font-bold uppercase tracking-wider text-[11px]">Channels</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {strategy.channelSelection.map((ch, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] border border-blue-500/30 font-bold">
                                {ch}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="mt-10">
                <div className="flex items-center gap-2.5 text-violet-400 mb-5 justify-center">
                    <BarChart2 className="w-5 h-5" />
                    <h3 className="text-base font-bold uppercase tracking-wider">Success Metrics (KPIs)</h3>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    {strategy.successMetrics.map((kpi, i) => (
                        <div key={i} className="px-5 py-2.5 bg-violet-600/20 text-violet-200 rounded-full border border-violet-500/30 text-[13px] font-semibold">
                            {kpi}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
