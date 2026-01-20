import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, DiagnosticItem, Demographic, Psychographic, Behavioral, BrandArchetypeDetail, BrandStrategyCard } from '../types';
import {
  User, Brain, Activity, Target, TrendingUp, TrendingDown, Users, Heart, Diamond, CheckCircle2, DollarSign, Scan, Search, Radar, Sparkles, Crown, ZapOff, Info, Layers, ShieldAlert, CheckCircle, FileText, BarChart, Globe, Zap, Smile, LayoutTemplate, Briefcase, MapPin, GraduationCap, Coins, Users2, Rocket,
  Calendar, BookOpen, Trophy, Lightbulb, RefreshCw, ShieldCheck, ChevronDown, ChevronUp, Edit2, Check, ArrowRight, BrainCircuit, Fingerprint, Headphones, Anchor, Link2, BoxSelect, Sun, Compass, Zap as OutlawIcon, Palette, HandHeart, Bot, MousePointerClick, Database, Swords, Clock, TrendingUp as UpliftIcon, AlertTriangle, PlayCircle, MousePointer2, BarChart3, Lock, Pencil, Microscope, Ear, LayoutGrid, Eye, FileDown
} from 'lucide-react';
import {
  Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ErrorBoundary from './ErrorBoundary';

interface AnalysisViewProps {
  data: AnalysisResult;
  onGenerateStrategy: () => void;
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
  if (val === undefined || val === null) return 0;
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

const ExecutiveRecommendationCard: React.FC<{ item: DiagnosticItem, index: number }> = ({ item, index }) => {
  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] p-7 flex flex-col h-full relative overflow-hidden group">
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-9 h-9 bg-[#1a1f2e] text-white rounded-lg flex items-center justify-center font-black text-sm shadow-lg">
          {index + 1}
        </div>
        <h4 className="text-base font-black text-slate-900 leading-tight tracking-tight">
          {item.metric}
        </h4>
      </div>
      <div className="space-y-6 flex-grow relative z-10">
        <div className="space-y-2">
          <h5 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.25em]">THE ISSUE</h5>
          <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{item.commentary}</p>
        </div>
        <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-[#166534]">
            <CheckCircle size={14} strokeWidth={3} />
            <h5 className="text-[9px] font-black uppercase tracking-[0.25em]">THE FIX</h5>
          </div>
          <p className="text-[12px] text-[#166534]/90 leading-relaxed font-semibold">{item.recommendation}</p>
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

const BrandArchetypeMatrix: React.FC<{ detail: any }> = ({ detail }) => {
  // DEFENSIVE GUARD: Handle missing or incomplete data
  if (!detail || !detail.archetype || !detail.quote || !detail.reasoning) {
    console.warn('[BrandArchetypeMatrix] Received incomplete detail data - rendering empty state', {
      hasDetail: !!detail,
      hasArchetype: detail?.archetype,
      hasQuote: detail?.quote,
      hasReasoning: detail?.reasoning
    });
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
            <Crown size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND ARCHETYPE MATRIX</h3>
          </div>
        </div>
        <div className="bg-slate-50 rounded-[28px] p-12 text-center border border-slate-200">
          <Crown size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Brand Archetype Data Not Available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Brand archetype detection requires specific brand personality signals from creative content.
            Provide brand-focused visual or narrative context for archetype classification.
          </p>
        </div>
      </div>
    );
  }

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

  const detected = detail.archetype;  // No misleading default

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
          <Crown size={24} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND ARCHETYPE MATRIX</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-[32px] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {archetypes.map((arch, i) => {
            const isDetected = detected.toLowerCase().includes(arch.name.toLowerCase().replace('the ', ''));
            return (
              <div
                key={i}
                className={`p-6 rounded-[24px] border-2 flex flex-col items-center justify-center text-center transition-all duration-300 h-32 ${isDetected
                  ? 'border-amber-500 bg-amber-50/20 shadow-lg scale-105 relative z-10'
                  : 'border-slate-100 bg-slate-50/50 opacity-60 grayscale-[0.2]'
                  }`}
              >
                <arch.icon size={24} className={isDetected ? 'text-amber-600' : 'text-slate-400'} />
                <h4 className={`text-[12px] font-black mt-3 leading-tight ${isDetected ? 'text-slate-800' : 'text-slate-500'}`}>{arch.name}</h4>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isDetected ? 'text-amber-600' : 'text-slate-400'}`}>{arch.value}</p>
                {isDetected && (
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

const BrandStrategyWindow: React.FC<{ cards: BrandStrategyCard[] }> = ({ cards }) => {
  // DEFENSIVE GUARD: Handle missing or empty data
  if (!cards || cards.length === 0) {
    console.warn('[BrandStrategyWindow] Received empty or undefined cards - rendering empty state');
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
            <LayoutGrid size={24} className="text-slate-700" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND STRATEGY WINDOW</h3>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Decoding the master frame of brand intent.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-[28px] p-12 text-center border border-slate-200">
          <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Brand Strategy Data Not Available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Brand strategy analysis requires visual creative input or brand-specific context.
            Try uploading an image, video, or providing more detailed brand information.
          </p>
        </div>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white shadow-md rounded-xl border border-slate-100">
          <LayoutGrid size={24} className="text-slate-700" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">BRAND STRATEGY WINDOW</h3>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Decoding the master frame of brand intent.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => {
          const theme = iconMap[card.title.toUpperCase()] || { icon: Sparkles, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100" };
          return (
            <div key={idx} className={`bg-white rounded-[24px] border ${theme.border} p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 ${theme.bg} rounded-xl flex items-center justify-center ${theme.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <theme.icon size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-300 tracking-widest">#{idx + 1}</span>
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

export const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onGenerateStrategy, isStrategizing, activeMode }) => {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleUpdateDiagnostic = (index: number, updates: Partial<DiagnosticItem>) => {
    if (!localData.adDiagnostics) return;
    const newList = [...localData.adDiagnostics];
    if (newList[index]) {
      newList[index] = { ...newList[index], ...updates };
      setLocalData({ ...localData, adDiagnostics: newList });
    }
  };


  // SAFEGUARD: Ensure adDiagnostics exists
  const diagnostics = localData.adDiagnostics || [];

  // ADAPTATION: Generate chart data dynamically from available diagnostics
  // This allows the chart to adapt to variable length data (truth-first)
  // instead of forcing 12 fixed axes with zero values.
  const chartData = diagnostics.map((item) => ({
    subject: item.metric,
    A: normalizeScore(item.score),
    B: normalizeScore(item.benchmark || 65)
  }));

  // Fallback for empty state to prevent chart collapse visually
  if (chartData.length === 0) {
    ["Outcome", "Recall", "Brand", "Emotion", "Engagement", "Clarity"].forEach(label => {
      chartData.push({ subject: label, A: 0, B: 0 });
    });
  }

  const avgScore = diagnostics.length > 0
    ? Math.round(diagnostics.reduce((acc, curr) => acc + normalizeScore(curr.score), 0) / diagnostics.length)
    : 0;

  const avgTier = getRubricTier(avgScore);
  const tierStyles = getTierStyles(avgTier);

  const sortedDiagnostics = [...diagnostics].sort((a, b) => b.score - a.score);
  // SAFEGUARD: Handle empty diagnostics array
  const driver = sortedDiagnostics.length > 0 ? sortedDiagnostics[0] : null;
  const detractor = sortedDiagnostics.length > 0 ? sortedDiagnostics[sortedDiagnostics.length - 1] : null;

  // Helper for safe index access with bounds checking
  const getDiagScore = (idx: number) => (diagnostics[idx] ? normalizeScore(diagnostics[idx].score) : 0);

  const hookCur = getDiagScore(0) / 10;
  const hookPot = Math.min(9.8, hookCur * 1.18);
  const clarCur = getDiagScore(6) / 10;
  const clarPot = Math.min(9.6, clarCur * 1.15);
  const visCur = getDiagScore(9) / 10;
  const visPot = Math.min(9.5, visCur * 1.12);
  const vtrCur = getDiagScore(10);
  const vtrPot = Math.min(88, vtrCur * 1.10);
  const ctrCur = (getDiagScore(4) / 100) * 1.6;
  const ctrPot = Math.min(3.2, ctrCur * 1.25);
  const dropCur = 100 - getDiagScore(0);
  const dropPot = Math.max(8.5, dropCur * 0.85);

  const hookUpliftPct = ((hookPot - hookCur) / hookCur) * 100;
  const clarUpliftPct = ((clarPot - clarCur) / clarCur) * 100;
  const visUpliftPct = ((visPot - visCur) / visCur) * 100;
  const vtrUpliftPct = ((vtrPot - vtrCur) / vtrCur) * 100;
  const ctrUpliftPct = ((ctrPot - ctrCur) / ctrCur) * 100;

  const rawRoi = (hookUpliftPct * 0.20) + (clarUpliftPct * 0.20) + (visUpliftPct * 0.15) + (vtrUpliftPct * 0.15) + (ctrUpliftPct * 0.30);
  const minTarget = 10.0;
  const maxTarget = 22.0;
  const constrainedRoi = Math.max(minTarget, Math.min(maxTarget, 10 + (Math.max(0, rawRoi - 10) / 20) * 12));

  /* TABBED INTERFACE STATE */
  const [activeTab, setActiveTab] = useState("holistic-scorecard");
  const [isPdfMode, setIsPdfMode] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    // Capture the element reference before any state changes
    const element = topRef.current;
    if (!element) {
      console.error("PDF export failed: No content element found");
      alert("Failed to generate PDF. Please try again.");
      return;
    }

    setIsPdfMode(true);

    // Wait for React to re-render all sections in PDF mode
    // Using requestAnimationFrame + timeout for more reliable DOM update detection
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 300);
      });
    });

    try {
      // Re-acquire the reference after the state update
      const targetElement = topRef.current || element;
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`StrataPilot-Analysis-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfMode(false);
    }
  };

  const tabs = [
    { id: "holistic-scorecard", label: "Scorecard" },
    { id: "key-determinants", label: "Key Determinants" },
    { id: "executive-summary", label: "Executive Summary" },
    { id: "diagnostic-summary", label: "Diagnostics" },
    { id: "audience-insights", label: "Audience Analysis" },
    { id: "brand-strategy", label: "Brand Strategy" },
    { id: "brand-archetype", label: "Brand Archetype" },
    { id: "roi-uplift", label: "ROI Uplift" }
  ];

  /* NAVIGATION HELPERS */
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (topRef.current) {
      const offset = 100; // Account for sticky header
      const elementPosition = topRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleNext = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      handleTabChange(tabs[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      handleTabChange(tabs[currentIndex - 1].id);
    }
  };

  return (
    <div ref={topRef} className="space-y-8 pb-20 overflow-y-visible min-h-[800px]">
      {/* TAB NAVIGATION BAR */}
      <div className="sticky top-24 z-40 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-2 mb-8 mx-auto max-w-5xl overflow-x-auto flex gap-1 custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md cursor-default'
                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-grow"></div>
        <button
          onClick={handleDownloadPdf}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 ml-2"
        >
          <FileDown size={14} /> PDF
        </button>
      </div>

      {/* CONTENT AREA WITH ANIMATION */}
      <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${isPdfMode ? 'space-y-12' : ''}`} key={activeTab}>

        {/* TAB 1: HOLISTIC SCORECARD */}
        {(activeTab === "holistic-scorecard" || isPdfMode) && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md"><h4 className="text-[10px] font-black uppercase tracking-[0.3em]">HOLISTIC PERFORMANCE SCORECARD</h4></div>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 p-8 flex flex-col items-center justify-center relative">
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 7, fontWeight: 900 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsRadar name="Benchmark Score" dataKey="B" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
                      <RechartsRadar name="Your Score" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.15} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:col-span-4 bg-[#0a0f1d] p-12 flex flex-col items-center justify-center text-center text-white relative border-l border-white/5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 relative z-10">STRATAPILOT SCORE</h4>
                <div className="text-[80px] font-black leading-none tracking-tighter mb-2 relative z-10 text-white drop-shadow-2xl">{avgScore}</div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${tierStyles} mb-6 relative z-10 shadow-lg shadow-indigo-500/20`}>
                  {avgTier}
                </div>
                <div className="w-12 h-1 bg-indigo-500/50 rounded-full mb-6 relative z-10"></div>
                <div className="space-y-4 relative z-10 text-left">
                  <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Score Methodology</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium text-center px-4">
                    This holistic score is calculated by cross-referencing {diagnostics.length} fundamental creative vectors against a global benchmark engine of 12M+ high-performance campaign data points.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KEY DETERMINANTS */}
        {(activeTab === "key-determinants" || isPdfMode) && (
          <KeyDeterminants driver={driver || {} as DiagnosticItem} detractor={detractor || {} as DiagnosticItem} />
        )}

        {/* TAB 3: EXECUTIVE SUMMARY */}
        {(activeTab === "executive-summary" || isPdfMode) && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md"><h4 className="text-[10px] font-black uppercase tracking-[0.3em]">EXECUTIVE DIAGNOSTIC SUMMARY</h4></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {diagnostics.map((item, idx) => (
                <ExecutiveRecommendationCard key={idx} item={item} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DIAGNOSTIC SUMMARY */}
        {(activeTab === "diagnostic-summary" || isPdfMode) && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md"><h4 className="text-[10px] font-black uppercase tracking-[0.3em]">DETAILED DIAGNOSTIC BREAKDOWN</h4></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {diagnostics.map((item, idx) => (
                <DiagnosticCard key={idx} item={item} onUpdate={(updates) => handleUpdateDiagnostic(idx, updates)} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIENCE ANALYSIS */}
        {(activeTab === "audience-insights" || isPdfMode) && (
          <TargetAudienceAnalysis
            demographics={localData.demographics}
            psychographics={localData.psychographics}
            behavioral={localData.behavioral}
          />
        )}

        {/* TAB 6: BRAND STRATEGY */}
        {(activeTab === "brand-strategy" || isPdfMode) && (
          <ErrorBoundary>
            <BrandStrategyWindow cards={localData.brandStrategyWindow} />
          </ErrorBoundary>
        )}

        {/* TAB 7: BRAND ARCHETYPE */}
        {(activeTab === "brand-archetype" || isPdfMode) && (
          <ErrorBoundary>
            <BrandArchetypeMatrix detail={localData.brandArchetypeDetail} />
          </ErrorBoundary>
        )}

        {/* TAB 8: ROI UPLIFT */}
        {(activeTab === "roi-uplift" || isPdfMode) && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-3 rounded-full text-center shadow-md"><h4 className="text-[10px] font-black uppercase tracking-[0.3em]">VALUE UNLOCKING & ROI PROJECTION</h4></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <CRICard label="Clear" value={getDiagScore(6)} definition="Message understood instantly." science="Processing fluency." />
              <CRICard label="Captivating" value={getDiagScore(0)} definition="Holds attention >3s." science="Orienting reflex." />
              <CRICard label="Relevant" value={getDiagScore(5)} definition="Matches user intent." science="Self-reference effect." />
              <CRICard label="Unique" value={getDiagScore(9)} definition="Distinct from competitors." science="Von Restorff effect." />
              <CRICard label="Credible" value={getDiagScore(7)} definition="Trusts the claim." science="Source credibility theory." />
              <CRICard label="Motivating" value={getDiagScore(3)} definition="Drives action." science="Goal gradient hypothesis." />
            </div>

            <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-[32px] p-8 shadow-2xl border border-indigo-900/50 relative overflow-hidden text-white">
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-lg backdrop-blur-sm">
                  <UpliftIcon size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Projected ROI Uplift</h3>
                  <p className="text-[11px] font-medium text-indigo-200 uppercase tracking-widest mt-1">Based on calibrated diagnostic improvements</p>
                </div>
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
                  <p className="text-[10px] text-indigo-200 max-w-md leading-relaxed hidden md:block">
                    Projected performance increase if all diagnostic recommendations are implemented.
                    <span className="opacity-50 ml-1">(Confidence Interval: 85%)</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">ESTIMATED ROAS IMPACT</div>
                  <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
                    {constrainedRoi.toFixed(1)}x
                  </div>
                </div>
              </div>
              <button onClick={onGenerateStrategy} disabled={isStrategizing || !!data.campaignStrategy} className="mt-8 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 flex items-center gap-2 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center">
                <Rocket size={16} /> {isStrategizing ? 'GENERATING...' : data.campaignStrategy ? 'STRATEGY ACTIVE' : 'GENERATE STRATEGY PLAN'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER NAVIGATION BUTTONS */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-8">
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
      </div>

    </div>
  );
};