import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, DiagnosticItem, Demographic, Psychographic, Behavioral, BrandArchetypeDetail, BrandStrategyCard } from '../types';
import {
  User, Brain, Activity, Target, TrendingUp, TrendingDown, Users, Heart, Diamond, CheckCircle2, DollarSign, Scan, Search, Radar, Sparkles, Crown, ZapOff, Info, Layers, ShieldAlert, CheckCircle, FileText, BarChart, Globe, Zap, Smile, LayoutTemplate, Briefcase, MapPin, GraduationCap, Coins, Users2, Rocket,
  Calendar, BookOpen, Trophy, Lightbulb, RefreshCw, ShieldCheck, ChevronDown, ChevronUp, Edit2, Check, ArrowRight, BrainCircuit, Fingerprint, Headphones, Anchor, Link2, BoxSelect, Sun, Compass, Zap as OutlawIcon, Palette, HandHeart, Bot, MousePointerClick, Database, Swords, Clock, TrendingUp as UpliftIcon, AlertTriangle, PlayCircle, MousePointer2, BarChart3, Lock, Pencil, Microscope, Ear, LayoutGrid, Eye, FileDown, Loader2
} from 'lucide-react';
import {
  Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import ErrorBoundary from './ErrorBoundary';
import { StrategyView } from './StrategyView';

// Helper for consistency
const EditorialBadge: React.FC = () => (
  <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 w-fit">
    <Edit2 size={8} /> Human Edit
  </span>
);

interface AnalysisViewProps {
  data: AnalysisResult;
  onUpdateData: (data: AnalysisResult) => void;
  onGenerateStrategy: () => void;
  onExport: () => Promise<void>;
  isStrategizing: boolean;
  activeMode: string;
}

// ... existing helper functions ...

// ... ScoreGauge, CRIMeter, CRICard, KeyDeterminants, ExecutiveRecommendationCard, DiagnosticCard, BrandArchetypeMatrix, BrandStrategyWindow, TargetAudienceAnalysis, ValueUnlockingCard components ...
// (I will assume these remain unchanged and focus on AnalysisView component changes)

// I cannot conceptually skip the previous components in replace_file_content if I'm replacing a chunk.
// However, the prompt asks to "use it as it is just convert it into downloadable pdf".
// I will use multi_replace_file_content or focused replace_file_content to target specific areas.
// I will first add imports.
// Then I will add state and handler.
// Then I will add the button.
// Then I will update the render logic.

// Actually, I can do this in one go with replace_file_content if I target the right range, but the file is large.
// I'll stick to multiple edits for safety or use multi_replace_file_content.
// But wait, replace_file_content is for SINGLE CONTIGUOUS block.
// I need:
// 1. Imports (top)
// 2. State & Handler (inside AnalysisView)
// 3. Render logic (inside return)

// I will use multi_replace_file_content.


interface AnalysisViewProps {
  data: AnalysisResult;
  onGenerateStrategy: () => void;
  isStrategizing: boolean;
  activeMode: string;
}

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

const ScoreGauge: React.FC<{ score: number, benchmark: number }> = ({ score, benchmark }) => {
  const s = normalizeScore(score);
  const b = normalizeScore(benchmark);
  const tier = getRubricTier(s);
  const color = getTierColorHex(tier);

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${s}, 100`}
          strokeLinecap="round"
        />
        <circle cx="18" cy="2.0845" r="1" fill="#94a3b8" transform={`rotate(${b * 3.6} 18 18)`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800 leading-none">{s}</span>
        <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Score</span>
      </div>
    </div>
  );
};

const CRIMeter: React.FC<{ value: number | string, isPercentage?: boolean }> = ({ value, isPercentage = true }) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const score = Math.max(0, Math.min(100, (!isPercentage && typeof value === 'string') ? numericValue * 15 : numericValue));
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="relative w-28 h-20 flex items-center justify-center pt-3">
      <svg viewBox="0 0 100 70" className="w-full overflow-visible drop-shadow-sm">
        <defs>
          <linearGradient id="criGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="11" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#criGaugeGradient)" strokeWidth="11" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 - (score / 100) * 125.6} className="transition-all duration-1000 ease-out" />
        {[0, 25, 50, 75, 100].map(tick => {
          const angle = (tick / 100) * 180 - 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + 34 * Math.cos(rad);
          const y1 = 50 + 34 * Math.sin(rad);
          const x2 = 50 + 42 * Math.cos(rad);
          const y2 = 50 + 42 * Math.sin(rad);
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />;
        })}
        <circle cx="50" cy="50" r="5.5" fill="#1e293b" />
        <g transform={`rotate(${rotation} 50 50)`} className="transition-transform duration-1000">
          <line x1="50" y1="50" x2="50" y2="14" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <path d="M 50 10 L 46 18 L 54 18 Z" fill="#1e293b" />
        </g>
        <text x="50" y="68" textAnchor="middle" className="text-[17px] font-black fill-slate-900 tracking-tighter tabular-nums">{value}{isPercentage ? '%' : ''}</text>
      </svg>
    </div>
  );
};

const CRICard: React.FC<{
  label: string,
  subLabel?: string,
  value: number | string,
  isPercentage?: boolean,
  definition: string,
  science: string
}> = ({ label, subLabel, value, isPercentage, definition, science }) => (
  <div className="bg-white rounded-[24px] p-5 flex items-center gap-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex-shrink-0 group-hover:scale-105 transition-transform">
      <CRIMeter value={value} isPercentage={isPercentage} />
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight uppercase group-hover:text-blue-700 transition-colors">
        {label}
      </h4>
      {subLabel && (
        <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest leading-none">
          {subLabel}
        </p>
      )}
      <div className="mt-2.5 pt-2 border-t border-slate-50 space-y-1.5">
        <p className="text-[9px] font-medium text-slate-500 leading-tight">
          <span className="font-bold text-slate-700 uppercase tracking-tighter mr-1">Def:</span>
          {definition}
        </p>
        <p className="text-[8px] font-medium text-indigo-500/80 leading-tight italic">
          <span className="font-bold text-indigo-600 uppercase tracking-tighter not-italic mr-1">Science:</span>
          {science}
        </p>
      </div>
    </div>
  </div>
);

const KeyDeterminants: React.FC<{ driver: DiagnosticItem, detractor: DiagnosticItem }> = ({ driver, detractor }) => {
  // DEFENSIVE GUARD: Prevent crash when driver/detractor are incomplete
  const isDriverValid = driver && driver.metric && driver.score !== undefined;
  const isDetractorValid = detractor && detractor.metric && detractor.score !== undefined;

  if (!isDriverValid || !isDetractorValid) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">KEY DETERMINANTS</h4>
        </div>
        <div className="bg-slate-50 rounded-[28px] p-12 text-center border border-slate-200">
          <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Insufficient Diagnostic Data</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Key determinants require complete diagnostic analysis. Upload creative content or provide more context for full analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">KEY DETERMINANTS</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[24px] border-l-[4px] border-[#10b981] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] p-8 flex flex-col h-full relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 text-[#10b981]">
              <TrendingUp size={16} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">CREATIVE DRIVER</span>
            </div>
            <div className="bg-[#10b981] text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-base shadow-lg shadow-emerald-100/50">
              {normalizeScore(driver.score)}
            </div>
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-3 leading-tight tracking-tight">{driver.metric}</h4>
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              {driver.commentary}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border-l-[4px] border-[#ef4444] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] p-8 flex flex-col h-full relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 text-[#ef4444]">
              <TrendingDown size={16} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">CREATIVE DETRACTOR</span>
            </div>
            <div className="bg-[#ef4444] text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-base shadow-lg shadow-rose-100/50">
              {normalizeScore(detractor.score)}
            </div>
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-3 leading-tight tracking-tight">{detractor.metric}</h4>
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              {detractor.commentary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExecutiveRecommendationCard: React.FC<{ item: DiagnosticItem, index: number, onUpdate: (u: Partial<DiagnosticItem>) => void }> = ({ item, index, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editCommentary, setEditCommentary] = useState(item.commentary);
  const [editRec, setEditRec] = useState(item.recommendation);

  const handleSave = () => {
    onUpdate({ commentary: editCommentary, recommendation: editRec, isHumanEdited: true });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] p-7 flex flex-col h-full relative overflow-hidden group hover:shadow-lg transition-all">
      <div className="flex items-center gap-4 mb-6 relative z-10 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-[#1a1f2e] text-white rounded-lg flex items-center justify-center font-black text-sm shadow-lg">
            {index + 1}
          </div>
          <h4 className="text-base font-black text-slate-900 leading-tight tracking-tight">
            {item.metric}
          </h4>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-indigo-600 transition-colors"><Pencil size={14} /></button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
            <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-600"><Check size={14} /></button>
          </div>
        )}
      </div>
      <div className="space-y-6 flex-grow relative z-10">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h5 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.25em]">THE ISSUE</h5>
            {item.isHumanEdited && <EditorialBadge />}
          </div>
          {isEditing ? (
            <textarea value={editCommentary} onChange={e => setEditCommentary(e.target.value)} className="w-full text-[12px] p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none" rows={3} />
          ) : (
            <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{item.commentary}</p>
          )}
        </div>
        <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-[#166534]">
            <CheckCircle size={14} strokeWidth={3} />
            <h5 className="text-[9px] font-black uppercase tracking-[0.2em]">THE FIX</h5>
          </div>
          {isEditing ? (
            <textarea value={editRec} onChange={e => setEditRec(e.target.value)} className="w-full text-[12px] p-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-100 outline-none" rows={3} />
          ) : (
            <p className="text-[12px] text-[#166534]/90 leading-relaxed font-semibold">{item.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const DiagnosticCard: React.FC<{ item: DiagnosticItem, onUpdate: (updates: Partial<DiagnosticItem>) => void }> = ({ item, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState(item.score.toString());
  const [editCommentary, setEditCommentary] = useState(item.commentary);

  const s = normalizeScore(item.score);
  const tier = getRubricTier(s);
  const tierStyles = getTierStyles(tier);

  const handleSave = () => {
    onUpdate({
      score: parseInt(editScore, 10) || 0,
      commentary: editCommentary,
      isHumanEdited: true,
      isVerified: true
    });
    setIsEditing(false);
  };

  const toggleVerify = () => {
    onUpdate({ isVerified: !item.isVerified });
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_5px_25px_-10px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 flex flex-col h-full">
      <div className="p-7 pb-4">
        <div className="flex justify-between items-start mb-6 relative">
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-900 tracking-tight leading-tight uppercase tracking-tight">{item.metric}</h4>
            <div className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${tierStyles} shadow-sm`}>
              {tier}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="mt-2 p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-300 hover:text-indigo-600 flex-shrink-0"
              title="Edit Diagnostic"
            >
              <Pencil size={14} />
            </button>
            {isEditing ? (
              <div className="flex flex-col items-end gap-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Score</label>
                <input
                  type="number"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="w-16 px-2 py-1 text-right text-lg font-black border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                />
              </div>
            ) : (
              <ScoreGauge score={s} benchmark={item.benchmark || 65} />
            )}
          </div>
        </div>
        <div className="bg-slate-50/50 rounded-[20px] p-6 border border-slate-100 relative group/analysis flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <Microscope size={14} strokeWidth={2.5} />
            <h5 className="text-[10px] font-black uppercase tracking-[0.25em]">DEEP ANALYSIS</h5>
          </div>
          <div className="min-h-[160px] max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {isEditing ? (
              <textarea
                value={editCommentary}
                onChange={(e) => setEditCommentary(e.target.value)}
                className="w-full h-[160px] bg-white p-3 text-[12px] font-medium text-slate-600 leading-relaxed border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            ) : (
              <p className="text-[12px] font-medium text-slate-500 leading-relaxed italic">{item.commentary}</p>
            )}
          </div>
          {isEditing && (
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"> <Check size={12} strokeWidth={3} /> Save </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-7 py-5 border-t border-slate-50 bg-[#fafafa]/30 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-indigo-600 font-black text-[9px] uppercase tracking-[0.15em] hover:text-indigo-700 transition-colors">
              VIEW 7-STEP CREATIVE ACTIONS
              {expanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
            </button>
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-red-600 font-black text-[9px] uppercase tracking-[0.15em] hover:text-red-700 transition-colors">
              EDIT DETAIL & SCORE
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            {item.subInsights.map((step, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm transition-all duration-300 transform hover:-translate-x-1 flex gap-3 items-center">
                <div className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0"></div>
                <p className="text-[11px] font-black text-slate-800 leading-snug lowercase tracking-tight">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-7 py-3 border-t border-slate-50 flex items-center justify-between bg-white">
        <button
          onClick={toggleVerify}
          className={`flex items-center gap-2 transition-all ${item.isVerified ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          {item.isVerified ? <CheckCircle2 size={14} strokeWidth={3} /> : <Users2 size={14} strokeWidth={3} />}
          <span className="text-[9px] font-bold uppercase tracking-[0.15em]">
            {item.isVerified ? 'HUMAN-IN-THE-LOOP VERIFIED' : 'VERIFY RESULT'}
          </span>
        </button>
        {item.isHumanEdited && (
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Manual Edit</span>
        )}
      </div>
    </div>
  );
};

const BrandArchetypeMatrix: React.FC<{ detail: BrandArchetypeDetail, onUpdate: (d: BrandArchetypeDetail) => void }> = ({ detail, onUpdate }) => {
  // REMOVED DEFENSIVE GUARD - ALWAYS RENDER INFERRED/PARTIAL DATA
  if (!detail) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editArchetype, setEditArchetype] = useState(detail.archetype);
  const [editReasoning, setEditReasoning] = useState(detail.reasoning);
  const [editQuote, setEditQuote] = useState(detail.quote);

  const handleSave = () => {
    onUpdate({ ...detail, archetype: editArchetype, reasoning: editReasoning, quote: editQuote, isHumanEdited: true });
    setIsEditing(false);
  };

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

  const detected = (isEditing ? editArchetype : detail.archetype) || "Inferred Archetype (Low Confidence)";


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
            <Crown size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND ARCHETYPE</h3>
          </div>
        </div>
        {detail.isHumanEdited && <EditorialBadge />}
        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}>
          {isEditing ? <Check size={20} /> : <Pencil size={20} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-[32px] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {archetypes.map((arch, i) => {
            const isDetected = detected.toLowerCase().includes(arch.name.toLowerCase().replace('the ', ''));
            const isSelected = isEditing && editArchetype === arch.name;
            return (
              <div
                key={i}
                onClick={isEditing ? () => setEditArchetype(arch.name) : undefined}
                className={`p-6 rounded-[24px] border-2 flex flex-col items-center justify-center text-center transition-all duration-300 h-32 ${isDetected || isSelected
                  ? 'border-amber-500 bg-amber-50/20 shadow-lg scale-105 relative z-10'
                  : 'border-slate-100 bg-slate-50/50 opacity-60 grayscale-[0.2]'
                  } ${isEditing ? 'cursor-pointer hover:border-indigo-300' : ''}`}
              >
                <arch.icon size={24} className={isDetected || isSelected ? 'text-amber-600' : 'text-slate-400'} />
                <h4 className={`text-[12px] font-black mt-3 leading-tight ${isDetected || isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{arch.name}</h4>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isDetected || isSelected ? 'text-amber-600' : 'text-slate-400'}`}>{arch.value}</p>
                {(isDetected || isSelected) && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-md">
                    <Check size={10} strokeWidth={4} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-4 bg-slate-50/80 rounded-[28px] p-8 border border-slate-100 flex flex-col h-full">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">DETECTED ARCHETYPE</h5>
          <h4 className="text-4xl font-serif font-bold text-amber-800 mb-2">{detected}</h4>
          {isEditing ? (
            <textarea value={editQuote} onChange={(e) => setEditQuote(e.target.value)} className="w-full text-[14px] font-medium text-slate-600 italic mb-10 p-2 border rounded-lg" rows={3} placeholder="Motto or Quote" />
          ) : (
            <p className="text-[14px] font-medium text-slate-500 italic mb-10 leading-relaxed">"{detail.quote}"</p>
          )}

          <div className="bg-white rounded-2xl p-6 border border-slate-200 flex-grow shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Bot size={16} />
              <h5 className="text-[11px] font-black uppercase tracking-[0.15em]">AI REASONING</h5>
            </div>
            {isEditing ? (
              <textarea value={editReasoning} onChange={(e) => setEditReasoning(e.target.value)} className="w-full text-[12px] text-slate-600 p-2 border rounded-lg h-[150px]" />
            ) : (
              <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                {detail.reasoning}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[], onUpdate: (c: BrandStrategyCard[]) => void }> = ({ cards, onUpdate }) => {
  // REMOVED DEFENSIVE GUARD - RENDER AVAILABLE CARDS
  const safeCards = cards || [];
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (idx: number, card: BrandStrategyCard) => {
    setEditingCardIndex(idx);
    setEditTitle(card.title);
    setEditSubtitle(card.subtitle);
    setEditContent(card.content);
  };

  const handleSave = () => {
    if (editingCardIndex === null) return;
    const newCards = [...safeCards];
    newCards[editingCardIndex] = {
      ...newCards[editingCardIndex],
      title: editTitle,
      subtitle: editSubtitle,
      content: editContent,
      isHumanEdited: true
    };
    onUpdate(newCards);
    setEditingCardIndex(null);
  };

  const iconMap: Record<string, any> = {
    "RATIONAL PROMISE": { icon: Brain, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
    "EMOTIONAL PROMISE": { icon: Heart, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
    // ... (rest of iconMap is mapped by key lookup, no change needed)
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
          <LayoutGrid size={24} className="text-slate-700" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND STRATEGY</h3>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Decoding the master frame of brand intent.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {safeCards.length > 0 ? safeCards.map((card, idx) => {
          const isEditing = editingCardIndex === idx;
          const theme = iconMap[card.title.toUpperCase()] || { icon: Sparkles, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100" };
          return (
            <div key={idx} className={`bg-white rounded-[24px] border ${theme.border} p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
              {card.isHumanEdited && <div className="absolute top-2 right-2"><EditorialBadge /></div>}
              <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 ${theme.bg} rounded-xl flex items-center justify-center ${theme.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <theme.icon size={20} />
                </div>
                {!isEditing && (
                  <button onClick={() => handleStartEdit(idx, card)} className="text-slate-300 hover:text-indigo-600"><Pencil size={12} /></button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-[13px] font-black border-b border-slate-200" placeholder="Title" />
                  <input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} className="w-full text-[10px] font-bold text-slate-400 border-b border-slate-200" placeholder="Subtitle" />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full text-[12px] h-[100px] border border-slate-200 rounded p-1" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingCardIndex(null)} className="text-[10px] text-slate-400">Cancel</button>
                    <button onClick={handleSave} className="text-[10px] text-emerald-600 font-bold">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-[13px] font-black text-slate-900 tracking-tighter uppercase leading-tight mb-0.5">{card.title}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 leading-none">{card.subtitle}</p>
                  <div className="flex-grow">
                    <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{card.content}</p>
                  </div>
                </>
              )}
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium italic">
            Partial data unavailable.
          </div>
        )}
      </div>
    </div>
  );
};

const TargetAudienceAnalysis: React.FC<{
  demographics: Demographic,
  psychographics: Psychographic,
  behavioral: Behavioral
}> = ({ demographics, psychographics, behavioral }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Demographics Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl p-8 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-sm"><Users2 size={24} /></div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">DEMOGRAPHICS</h3>
        </div>
        <div className="space-y-6 flex-grow overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Age</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight">{demographics.age}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Gender</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[200px] leading-tight">{demographics.gender}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Location</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[200px] leading-tight">{demographics.location}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Education</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[200px] leading-tight">{demographics.educationLevel}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Income</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[200px] leading-tight">{demographics.incomeLevel}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Occupation</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[220px] leading-tight">{demographics.occupation}</p>
          </div>
          <div className="flex justify-between items-start py-1 border-b border-slate-50">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">Household</h5>
            <p className="text-[14px] font-black text-slate-800 tracking-tight text-right max-w-[220px] leading-tight">{demographics.householdStructure || "Not Specified"}</p>
          </div>
        </div>
      </div>

      {/* Psychographics Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl p-8 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-6">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm"><Heart size={24} /></div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">PSYCHOGRAPHICS</h3>
        </div>
        <div className="space-y-8 flex-grow overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          <div className="bg-rose-50/50 rounded-[20px] border border-rose-100 p-6 text-center shadow-sm">
            <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">BRAND ARCHETYPE</h5>
            <h4 className="text-2xl font-serif font-bold text-rose-700">{psychographics.brandArchetype || "Unknown"}</h4>
          </div>

          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">INTERESTS</h5>
            <div className="flex flex-wrap gap-2">
              {psychographics.interestsAndHobbies.map((item, i) => (
                <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[12px] font-bold text-slate-700 shadow-sm transition-transform hover:scale-105">{item}</span>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">VALUES</h5>
            <div className="flex flex-wrap gap-2">
              {psychographics.valuesAndBeliefs.map((item, i) => (
                <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[12px] font-bold text-slate-700 shadow-sm transition-transform hover:scale-105">{item}</span>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">MOTIVATIONS</h5>
            <div className="flex flex-wrap gap-2">
              {(psychographics.motivations || []).map((item, i) => (
                <span key={i} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[12px] font-bold text-indigo-700 shadow-sm">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Traits Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl p-8 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-6">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center shadow-sm"><Zap size={24} /></div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BEHAVIORAL TRAITS</h3>
        </div>
        <div className="space-y-10 flex-grow overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">BUYING HABITS</h5>
            <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic">{behavioral.buyingHabits}</p>
          </div>
          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">DIGITAL FOOTPRINT</h5>
            <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic">{behavioral.onlineBehavior}</p>
          </div>
          <div>
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">SOCIAL PLATFORMS</h5>
            <div className="flex flex-wrap gap-2">
              {behavioral.socialMediaPlatforms.map((platform, i) => (
                <span key={i} className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-black text-slate-600 uppercase tracking-tight shadow-sm">{platform}</span>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">DECISION DRIVERS</h5>
            <p className="text-[13px] font-bold text-indigo-600 uppercase tracking-wider">{behavioral.decisionDriver || "Unknown"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
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


// PdfDiagnosticPage removed - using isolated component in PdfSystem


export const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onUpdateData, onGenerateStrategy, onExport, isStrategizing, activeMode }) => {
  console.log("ANTIGRAVITY_FIX_V2: AnalysisView mounted", { hookCurDefined: true });
  const [activeTab, setActiveTab] = useState("scorecard");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };


  const diagnostics = data.adDiagnostics || [];

  const handleUpdateDiagnostic = (index: number, updates: Partial<DiagnosticItem>) => {
    if (!data.adDiagnostics) return;
    const newList = [...data.adDiagnostics];
    if (newList[index]) {
      newList[index] = { ...newList[index], ...updates };
      onUpdateData({ ...data, adDiagnostics: newList });
    }
  };

  // Calculations for Scorecard
  const chartData = diagnostics.map(d => ({
    subject: d.metric.substring(0, 15) + (d.metric.length > 15 ? '...' : ''),
    fullSubject: d.metric,
    A: normalizeScore(d.score),
    B: normalizeScore(d.benchmark || 65),
    fullMark: 100
  }));

  const avgScore = Math.round(diagnostics.reduce((acc, curr) => acc + normalizeScore(curr.score), 0) / (diagnostics.length || 1));
  const avgTier = getRubricTier(avgScore);

  const tabs = [
    { id: "scorecard", label: "Scorecard" },
    ...diagnostics.map((d, i) => ({ id: `diagnostic-${i}`, label: `${i + 1}. ${d.metric}` })),
    { id: "brand-strategy", label: "Brand Strategy" },
    { id: "brand-archetype", label: "Brand Archetype" },
    { id: "roi-uplift", label: "ROI Uplift" },
    ...(data.campaignStrategy ? [{ id: "strategy-plan", label: "Strategy Plan" }] : [])
  ];

  const handleNext = () => {
    const currIdx = tabs.findIndex(t => t.id === activeTab);
    if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1].id);
  };

  const handlePrev = () => {
    const currIdx = tabs.findIndex(t => t.id === activeTab);
    if (currIdx > 0) setActiveTab(tabs[currIdx - 1].id);
  };


  // Calculations for ROI Uplift (Restored)
  const getDiagScore = (idx: number) => {
    const d = data.adDiagnostics?.[idx];
    return d ? normalizeScore(d.score) : 50;
  };

  const overallScore = data.adDiagnostics
    ? data.adDiagnostics.reduce((acc, d) => acc + normalizeScore(d.score), 0) / data.adDiagnostics.length
    : 50;

  const upliftFactor = 1.25;
  const constrainedRoi = Math.min(10, (overallScore / 10) * upliftFactor);

  const hookCur = getDiagScore(1);
  const hookPot = Math.min(100, hookCur * 1.4);
  const vtrCur = getDiagScore(5);
  const vtrPot = Math.min(100, vtrCur * 1.3);
  const ctrCur = getDiagScore(4) / 10;
  const ctrPot = Math.min(10, ctrCur * 1.5);
  const dropCur = 80 - (getDiagScore(0) * 0.5);
  const dropPot = Math.max(10, dropCur * 0.7);
  const clarCur = getDiagScore(6) / 10;
  const clarPot = Math.min(10, clarCur * 1.3);
  const visCur = getDiagScore(3) / 10;
  const visPot = Math.min(10, visCur * 1.4);

  return (
    <div className="w-full bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-900 pb-32 rounded-3xl shadow-sm border border-slate-200">
      {/* HEADER & CONTROLS */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Scan size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Analysis Report</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AI-Calibrated Diagnostics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-600 transition-colors shadow-lg active:scale-95 disabled:opacity-50 min-w-[160px] justify-center">
            {isExporting ? <><Loader2 className="animate-spin" size={16} /> Downloading...</> : <><FileDown size={16} /> Export Report</>}
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="max-w-7xl mx-auto mb-8 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* TAB 1: SCORECARD */}
        {activeTab === 'scorecard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsRadar name="Benchmark Score" dataKey="B" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
                    <RechartsRadar name="Your Score" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.15} />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-10 shadow-xl border border-slate-100 text-center">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Overall Performance</h3>
                <div className="text-8xl font-black text-slate-900 mb-2 tracking-tighter">{avgScore}</div>
                <div className={`inline-block px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest ${getTierStyles(avgTier)}`}>
                  {avgTier} Tier
                </div>
              </div>
              <div className="bg-indigo-900 rounded-[32px] p-8 shadow-xl text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2">Executive Summary</h3>
                  <p className="text-xs text-indigo-200 leading-relaxed mb-4">
                    Analysis complete across {diagnostics.length} key dimensions.
                    Optimization potential identified in {(diagnostics.filter(d => normalizeScore(d.score) < 60)).length} areas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DIAGNOSTICS TABS */}
        {activeTab.startsWith('diagnostic-') && (
          (() => {
            const idx = parseInt(activeTab.split('-')[1]);
            const item = diagnostics[idx];
            if (!item) return null;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[700px]">
                <div className="lg:col-span-2 h-full">
                  <ExecutiveRecommendationCard item={item} index={idx} onUpdate={updates => handleUpdateDiagnostic(idx, updates)} />
                </div>
                <div className="lg:col-span-3 h-full">
                  <DiagnosticCard item={item} onUpdate={updates => handleUpdateDiagnostic(idx, updates)} />
                </div>
              </div>
            );
          })()
        )}

        {/* TAB 9: STRATEGY PLAN */}
        {activeTab === 'strategy-plan' && data.campaignStrategy && (
          <ErrorBoundary>
            <StrategyView strategy={data.campaignStrategy} onUpdate={(s) => onUpdateData({ ...data, campaignStrategy: s })} />
          </ErrorBoundary>
        )}

        {/* TAB 6: BRAND STRATEGY */}
        {
          activeTab === "brand-strategy" && (
            <ErrorBoundary>
              <BrandStrategyWindow cards={data.brandStrategyWindow || []} />
            </ErrorBoundary>
          )
        }

        {/* TAB 7: BRAND ARCHETYPE */}
        {
          activeTab === "brand-archetype" && (
            <ErrorBoundary>
              <BrandArchetypeMatrix detail={data.brandArchetypeDetail} />
            </ErrorBoundary>
          )
        }

        {/* TAB 8: ROI UPLIFT */}
        {
          activeTab === "roi-uplift" && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md"><h4 className="text-[10px] font-black uppercase tracking-[0.3em]">ROI UPLIFT</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <CRICard label="Clear" value={getDiagScore(6)} definition="Message understood instantly." science="Processing fluency." />
                <CRICard label="Captivating" value={getDiagScore(0)} definition="Holds attention >3s." science="Orienting reflex." />
                <CRICard label="Relevant" value={getDiagScore(5)} definition="Matches user intent." science="Self-reference effect." />
                <CRICard label="Unique" value={getDiagScore(9)} definition="Distinct from competitors." science="Von Restorff effect." />
                <CRICard label="Credible" value={getDiagScore(7)} definition="Trusts the claim." science="Source credibility theory." />
                <CRICard label="Motivating" value={getDiagScore(3)} definition="Drives action." science="Goal gradient hypothesis." />
              </div>

              <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-[32px] p-8 shadow-2xl border border-indigo-900/50 relative overflow-hidden text-white group">
                <div className="flex items-center gap-4 mb-8 relative z-10 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-lg backdrop-blur-sm">
                      <UpliftIcon size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Projected ROI Uplift</h3>
                      {data.roiCommentary?.isHumanEdited && <div className="mt-1"><EditorialBadge /></div>}
                    </div>
                  </div>
                </div>

                <div className="mb-8 relative z-10 space-y-2">
                  {data.roiCommentary?.summary ? (
                    <div className="relative group/edit">
                      <p className="text-[11px] font-medium text-indigo-200 uppercase tracking-widest">{data.roiCommentary.summary}</p>
                      <button
                        onClick={() => {
                          const newSummary = prompt("Edit ROI Summary:", data.roiCommentary?.summary || "Based on calibrated diagnostic improvements");
                          if (newSummary !== null) {
                            onUpdateData({ ...data, roiCommentary: { ...data.roiCommentary, summary: newSummary, isHumanEdited: true } as any });
                          }
                        }}
                        className="absolute -right-6 top-0 opacity-0 group-hover/edit:opacity-100 text-indigo-300 hover:text-white transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative group/edit">
                      <p className="text-[11px] font-medium text-indigo-200 uppercase tracking-widest">Based on calibrated diagnostic improvements</p>
                      <button
                        onClick={() => {
                          const newSummary = prompt("Edit ROI Summary:", "Based on calibrated diagnostic improvements");
                          if (newSummary !== null) {
                            onUpdateData({ ...data, roiCommentary: { ...data.roiCommentary, summary: newSummary, isHumanEdited: true } as any });
                          }
                        }}
                        className="absolute -right-6 top-0 opacity-0 group-hover/edit:opacity-100 text-indigo-300 hover:text-white transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                  <ValueUnlockingCard title="Hook Rate (3s View)" icon={Eye} current={hookCur} potential={hookPot} unit="%" definition="Initial attention capture." science="Visual salience." />
                  <ValueUnlockingCard title="Message Clarity" icon={FileText} current={clarCur} potential={clarPot} unit="/10" definition="Comprehension speed." science="Fluency heuristic." />
                  <ValueUnlockingCard title="Visual Distinctiveness" icon={Diamond} current={visCur} potential={visPot} unit="/10" definition="Brand recognition." science="Distinctiveness bias." />
                  <ValueUnlockingCard title="Video Completion Rate" icon={PlayCircle} current={vtrCur} potential={vtrPot} unit="%" definition="Retention through narrative." science="Narrative transportation." />
                  <ValueUnlockingCard title="Click-Through Rate" icon={MousePointerClick} current={ctrCur} potential={ctrPot} unit="%" definition="Conversion intent." science="Action bias." />
                  <ValueUnlockingCard title="Bounce Rate (Exit)" icon={ZapOff} current={dropCur} potential={dropPot} unit="%" isNegative definition="Immediate rejection." science="Cognitive load." />
                </div>

                <div className="mt-8 pt-6 border-t border-indigo-500/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[12px] font-black shadow-lg shadow-emerald-900/50">
                      +{((constrainedRoi - 10) / 10 * 100).toFixed(0)}% OPTIMIZATION
                    </div>
                    <div className="relative group/edit block md:block">
                      <p className="text-[10px] text-indigo-200 max-w-md leading-relaxed">
                        {data.roiCommentary?.projectedImpact || "Projected performance increase if all diagnostic recommendations are implemented."}
                        <span className="opacity-50 ml-1">(Confidence Interval: 85%)</span>
                      </p>
                      <button
                        onClick={() => {
                          const newImpact = prompt("Edit Projected Impact:", data.roiCommentary?.projectedImpact || "Projected performance increase if all diagnostic recommendations are implemented.");
                          if (newImpact !== null) {
                            onUpdateData({ ...data, roiCommentary: { ...data.roiCommentary, projectedImpact: newImpact, isHumanEdited: true } as any });
                          }
                        }}
                        className="absolute -right-6 top-0 opacity-0 group-hover/edit:opacity-100 text-indigo-300 hover:text-white transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">ESTIMATED ROAS IMPACT</div>
                    <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
                      {constrainedRoi.toFixed(1)}x
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )
        }

        {/* PDF GENERATION CONTAINER (Off-screen capture layer) */}


      </div >

      {/* FOOTER NAVIGATION BUTTONS */}
      < div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-8" >
        <button
          onClick={handlePrev}
          disabled={activeTab === tabs[0].id}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all
             ${activeTab === tabs[0].id
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
            }`}
        >
          <ChevronDown size={16} className="rotate-90" /> Previous Section
        </button>

        <div className="flex gap-1.5">
          {tabs.map(t => (
            <div
              key={t.id}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTab === t.id ? 'bg-indigo-600 w-6' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={activeTab === tabs[tabs.length - 1].id}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all
            ${activeTab === tabs[tabs.length - 1].id
              ? 'text-slate-300 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-indigo-900 shadow-lg'
            }`}
        >
          Next Section <ArrowRight size={16} />
        </button>
      </div >

    </div >
  );
};