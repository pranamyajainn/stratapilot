import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, AlertCircle, Sparkles, Video, Link as LinkIcon, ArrowRight, Plus, Mic, AudioLines, LayoutTemplate, Lightbulb, Users, Settings2, Trophy, TrendingUp, Globe, Database, ShieldCheck, Scan, Binary, BrainCircuit, LineChart, Target, Bot, CheckCircle2, Layers, Cpu, Server, RefreshCw, BookOpen, Search, Fingerprint, Zap, FileDown, Diamond, Gavel, Eye, BarChart, Workflow, ShieldAlert, GitBranch, Lock, ServerCog, Scale, FileCheck2, HardDrive, Activity, Plug, Shuffle, Smile, Check, ChevronRight, Loader2, Copy, Info, Archive, Brain, CheckSquare, RefreshCcw, BarChart3 } from 'lucide-react';
import { AnalysisResult, LoadingState } from '../types';
import { analyzeCollateral, generateCampaignStrategy } from '../services/geminiService';
import { AnalysisView } from '../components/AnalysisView';
import { StrategyView } from '../components/StrategyView';
import { PdfSystem, PdfSystemHandle } from '../components/pdf/PdfSystem';

type IntegrationType = 'GA4' | 'Meta';

interface ConnectionModalProps {
    type: IntegrationType;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ type, isOpen, onClose, onSuccess }) => {
    const [propertyId, setPropertyId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleComplete = () => {
        if (type === 'GA4' && !propertyId) {
            alert("Please provide your GA4 Property ID");
            return;
        }
        // WARNING: This is a simulation. No actual GA4/Meta connection is made.
        setIsProcessing(true);
        setTimeout(() => {
            onSuccess();
            onClose();
            setIsProcessing(false);
        }, 1500);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === 'GA4' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Plug size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Connect {type === 'GA4' ? 'Google Analytics 4' : 'Meta Ads Manager'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info size={14} className="text-indigo-500" /> Instructions for Client
                            </h4>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                To enable StrataPilot’s {type === 'GA4' ? 'Audience, ROI & Performance' : 'Creative Diagnostics & Ad Performance'} analysis, please provide access:
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                {type === 'GA4' ? (
                                    <>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">1</div>
                                            <p className="text-xs text-slate-600">Go to <strong>GA4 → Admin → Property Access Management</strong></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">2</div>
                                            <p className="text-xs text-slate-600">Click <strong>“Add user”</strong></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">3</div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 mb-2">Add this email:</p>
                                                <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg group">
                                                    <code className="text-[10px] text-indigo-600 font-mono flex-1">service@stratapilot-api.iam.gserviceaccount.com</code>
                                                    <button onClick={() => copyToClipboard('service@stratapilot-api.iam.gserviceaccount.com')} className="p-1 hover:bg-slate-100 rounded">
                                                        <Copy size={12} className="text-slate-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">4</div>
                                            <p className="text-xs text-slate-600">Assign role: <strong>Viewer (or Analyst)</strong></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">5</div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 mb-2">Share your <strong>GA4 Property ID</strong> in the text box below</p>
                                                <input
                                                    type="text"
                                                    value={propertyId}
                                                    onChange={(e) => setPropertyId(e.target.value)}
                                                    placeholder="Enter Property ID (e.g. 123456789)"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-100 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">1</div>
                                            <p className="text-xs text-slate-600">Open <strong>Meta Business Settings → Users → Partners</strong></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">2</div>
                                            <p className="text-xs text-slate-600">Click <strong>“Add Partner”</strong></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">3</div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 mb-2">Enter our BM ID:</p>
                                                <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg group">
                                                    <code className="text-[10px] text-indigo-600 font-mono flex-1">192837465001</code>
                                                    <button onClick={() => copyToClipboard('192837465001')} className="p-1 hover:bg-slate-100 rounded">
                                                        <Copy size={12} className="text-slate-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px] font-bold border border-slate-200 flex-shrink-0 mt-0.5">4</div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 mb-1">Grant access to:</p>
                                                <ul className="text-[11px] text-slate-500 list-disc ml-4 space-y-0.5">
                                                    <li>Ad Accounts → View Performance</li>
                                                    <li>Page Insights (optional)</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data we will pull:</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                {(type === 'GA4' ? [
                                    'Website traffic & audience breakup',
                                    'Engagement & user behavior',
                                    'Top pages and drop-offs',
                                    'Ad-to-landing performance',
                                    'Conversion events & funnels'
                                ] : [
                                    'Ad spend, impressions, CTR, CPM, ROAS',
                                    'Audience breakdown & delivery insights',
                                    'Creative variations & performance shifts',
                                    'Benchmarking across categories'
                                ]).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <button
                            onClick={handleComplete}
                            disabled={isProcessing}
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Access Granted'}
                        </button>
                        <p className="text-[10px] text-center text-slate-400 font-medium">
                            Explicitly state: No data is stored, no data is modified, access is read-only and can be revoked anytime.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TechLayerLoader: React.FC<{ step: number }> = ({ step }) => {
    const processSteps = [
        { icon: Archive, label: "Unified Data Lake Ingestion", sub: "Aggregating Benchmarks, History & Attribution Data" },
        { icon: Search, label: "Multimodal Feature Extraction", sub: "CV + NLP Pattern Recognition & Vector Embedding" },
        { icon: Shuffle, label: "OOD Stability Testing", sub: "Perturbation Check & Noise Filtering" },
        { icon: Zap, label: "Predictive KPI Modeling", sub: "Forecasting ROAS, CTR & Conversion Probabilities" },
        { icon: Brain, label: "Agentic Intelligence Engine", sub: "Running Multi-Agent Orchestration & Reasoning" },
        { icon: Scale, label: "Bias & Fairness Audit", sub: "Ethical AI Guardrails & Drift Detection" },
        { icon: CheckSquare, label: "Running 10-Point Validation Suite", sub: "Held-out Eval, Adversarial Check & Calibration" },
        { icon: ShieldAlert, label: "Governance & Risk Control", sub: "Validating against Guardrails & QA Pipelines" },
        { icon: RefreshCcw, label: "Workflow Automation Layer", sub: "Generating Optimization Cycles & A/B Hypotheses" },
        { icon: BarChart3, label: "Explainability & Insight Layer", sub: "Rendering Heatmaps & Score Justifications" },
        { icon: RefreshCw, label: "Continuous Learning Loop", sub: "Updating Weights based on Real-time Feedback" }
    ];

    const techLayers = [
        { id: 0, label: "Input Layer", sub: "Ad Data Ingestion", icon: Database, tools: "Python + SQL" },
        { id: 1, label: "Processing Layer", sub: "Feature Engineering + Embedding", icon: Cpu, tools: "Python Core" },
        { id: 2, label: "Intelligence Layer", sub: "Model Training + Scoring Engine", icon: BrainCircuit, tools: "Python + R (statistical co-processor)" },
        { id: 3, label: "Analytics Layer", sub: "Data + Model Repository", icon: Server, tools: "SQL / NoSQL + Python APIs" },
        { id: 4, label: "Visualization Layer", sub: "Marketing Intelligence Dashboard", icon: BarChart, tools: "JavaScript + Python (Streamlit)" },
        { id: 5, label: "Feedback Layer", sub: "Continuous Learning", icon: RefreshCw, tools: "Python + YAML/JSON configuration" },
    ];

    const getActiveMacroLayer = (s: number) => {
        if (s === 0) return 0;
        if (s === 1) return 1;
        if (s >= 2 && s <= 6) return 2;
        if (s >= 7 && s <= 8) return 3;
        if (s === 9) return 4;
        if (s === 10) return 5;
        return 0;
    }

    const activeLayerIndex = getActiveMacroLayer(step);

    const Icon = ({ s, active, completed }: { s: any, active: boolean, completed: boolean }) => {
        const IconComp = s.icon;
        return <IconComp size={14} className={active ? 'animate-pulse text-white' : completed ? 'text-slate-600' : 'text-slate-400'} />;
    };

    return (
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap size={12} className="text-indigo-500" /> Live Processing Stream
                </h4>
                <div className="space-y-3 relative">
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
                    {processSteps.map((s, idx) => {
                        const isActive = step === idx;
                        const isCompleted = step > idx;

                        return (
                            <div key={idx} className={`flex items-center gap-4 transition-all duration-300 relative z-10 ${isActive ? 'scale-100 opacity-100' : isCompleted ? 'opacity-80' : 'opacity-20 blur-[1px]'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500 flex-shrink-0 ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/30' :
                                    isCompleted ? 'bg-emerald-50 border-emerald-500' :
                                        'bg-slate-50 border-slate-200'
                                    }`}>
                                    <Icon s={s} active={isActive} completed={isCompleted} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-[10px] font-bold uppercase tracking-wide truncate ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>{s.label}</h4>
                                    <p className={`text-[9px] truncate ${isActive ? 'text-indigo-500 font-medium' : 'text-slate-400'}`}>
                                        {isActive ? "Processing..." : s.sub}
                                    </p>
                                </div>
                                {isActive && (
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="border-l border-slate-100 pl-8 md:block hidden">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ServerCog size={12} className="text-emerald-500" /> Enterprise Tech Stack
                </h4>
                <div className="space-y-6 relative">
                    <div className="absolute left-[24px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-indigo-200 to-slate-200"></div>
                    {techLayers.map((layer, idx) => {
                        const isActive = activeLayerIndex === idx;
                        const isPassed = activeLayerIndex > idx;
                        return (
                            <div key={idx} className={`flex items-start gap-4 relative z-10 transition-all duration-500 ${isActive ? 'translate-x-2' : ''}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 flex-shrink-0 ${isActive ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100 scale-110' :
                                    isPassed ? 'bg-emerald-50 border-emerald-200' :
                                        'bg-slate-50 border-white'
                                    }`}>
                                    <layer.icon size={20} className={isActive ? 'text-indigo-600' : isPassed ? 'text-emerald-500' : 'text-slate-300'} />
                                </div>
                                <div>
                                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-indigo-700' : isPassed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {layer.label}
                                    </h4>
                                    <p className={`text-[10px] font-medium mb-1.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                                        {layer.sub}
                                    </p>
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                        <span className="text-[9px] font-mono text-slate-600 tracking-tight">{layer.tools}</span>
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="absolute -left-12 top-6 w-8 h-px bg-indigo-500 animate-pulse hidden md:block"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [textContext, setTextContext] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [userQuery, setUserQuery] = useState('');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loadingState, setLoadingState] = useState<LoadingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [processingStep, setProcessingStep] = useState(0);
    const [activeVoiceField, setActiveVoiceField] = useState<'context' | 'query' | null>(null);
    const [auditCounter, setAuditCounter] = useState(1);
    const [ga4Connected, setGa4Connected] = useState(false);
    const [metaConnected, setMetaConnected] = useState(false);
    const [activeModal, setActiveModal] = useState<IntegrationType | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const pdfRef = useRef<PdfSystemHandle>(null);

    useEffect(() => {
        let interval: any;
        if (loadingState === 'analyzing') {
            setProcessingStep(0);
            interval = setInterval(() => {
                setProcessingStep(prev => (prev < 10 ? prev + 1 : prev));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loadingState]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const validateAndSetFile = (uploadedFile: File) => {
        if (uploadedFile.size > 25 * 1024 * 1024) {
            setError("File size exceeds 25MB limit for this demo.");
            return;
        }
        setFile(uploadedFile);
        setError(null);
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleVoiceInput = (target: 'context' | 'query') => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }
        if (activeVoiceField === target) {
            try { recognitionRef.current?.stop(); } catch (e) { }
            setActiveVoiceField(null);
            return;
        }
        if (activeVoiceField !== null) {
            try { recognitionRef.current?.stop(); } catch (e) { }
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = target === 'context';
        recognition.onstart = () => { setActiveVoiceField(target); setError(null); };
        recognition.onend = () => { setActiveVoiceField(null); };
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript; }
                else { interimTranscript += event.results[i][0].transcript; }
            }
            if (target === 'query') { setUserQuery(finalTranscript || interimTranscript); }
            else if (target === 'context') {
                if (finalTranscript) {
                    setTextContext(prev => {
                        const trimmed = prev.trim();
                        return trimmed ? trimmed + " " + finalTranscript : finalTranscript;
                    });
                }
            }
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setActiveVoiceField(null);
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {
            console.error('Failed to start recognition:', e);
            setActiveVoiceField(null);
        }
    };

    const runAnalysis = async (presetOverride?: string) => {
        const contextParts = [];
        if (urlInput) contextParts.push(`Analysis Target URL: ${urlInput}`);
        if (textContext) contextParts.push(`Context/Description: ${textContext}`);
        if (userQuery) contextParts.push(`User Question: ${userQuery}`);
        const combinedContext = contextParts.join('\n\n');
        const activeLabel = presetOverride || selectedPreset || "Balanced Analysis";
        if (!file && !urlInput && !combinedContext.trim() && !presetOverride) {
            setError("Please upload a file, provide a link, or select an analysis focus.");
            return;
        }
        setLoadingState('analyzing');
        setError(null);
        setResult(null);
        if (presetOverride) { setSelectedPreset(presetOverride); }
        try {
            const data = await analyzeCollateral(combinedContext, activeLabel, file || undefined);
            const newAuditId = `SP-${String(auditCounter).padStart(5, '0')}`;
            setAuditCounter(prev => prev + 1);
            setResult({ ...data, auditId: newAuditId });
            setLoadingState('success');
        } catch (err: any) {
            setError(err.message || "Failed to analyze collateral. Please try again.");
            setLoadingState('error');
        }
    };

    const handlePresetClick = (label: string) => {
        setSelectedPreset(label);
        // Auto-run if context exists
        if (file || urlInput || textContext || userQuery) { runAnalysis(label); }
    };

    const handleStrategy = async () => {
        if (!result) return;
        setLoadingState('strategizing');
        try {
            const strategy = await generateCampaignStrategy(result);
            setResult({ ...result, campaignStrategy: strategy });
            setLoadingState('success');
        } catch (err: any) {
            setError("Failed to generate strategy. Try again.");
            setLoadingState('success');
        }
    };

    const analysisPresets = [
        { text: "Analyze this ad and suggest a persona profile.", theme: "blue", label: "Persona Profile" },
        { text: "Generate a campaign strategy for this product.", theme: "violet", label: "Campaign Strategy" },
        { text: "Break down the demographics for this brand.", theme: "cyan", label: "Demographics" },
        { text: "Provide ad diagnostic using the Rubric score for the brands collateral", theme: "orange", label: "Rubric Diagnostics" },
        { text: "Generate detailed Insight Points with graphics", theme: "indigo", label: "Visual Insight Mining" },
        { text: "Deep analysis of Brand Window & Reasons to Believe (RTB).", theme: "pink", label: "Brand Strategy" },
        { text: "Generate ROI & Value Unlocking Dashboard.", theme: "emerald", label: "ROI Dashboard" },
        { text: "Generate Creative Optimization & A/B Testing Matrix.", theme: "rose", label: "Optimization Matrix" },
        { text: "Predict CTR, CAC & ROAS using historical data modeling.", theme: "teal", label: "Predictive Forecasting" },
        { text: "Benchmark against Category Peers & Competitor Analysis.", theme: "amber", label: "Competitive Benchmarking" },
        { text: "Analyze Emotional Resonance & Sentiment Analysis.", theme: "fuchsia", label: "Sentiment & Emotion" },
        { text: "Automate Campaign Workflow & Ops Pipeline.", theme: "lime", label: "Workflow Automation" }
    ];

    const themeStyles: Record<string, { active: string; inactive: string; text: string; labelActive: string; labelInactive: string }> = {
        blue: { active: "bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-md transform scale-95", inactive: "bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-blue-900", labelActive: "text-blue-700", labelInactive: "text-blue-600" },
        violet: { active: "bg-violet-50 border-violet-500 ring-2 ring-violet-500 shadow-md transform scale-95", inactive: "bg-white border-slate-200 hover:border-violet-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-violet-900", labelActive: "text-violet-700", labelInactive: "text-violet-600" },
        cyan: { active: "bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500 shadow-md transform scale-95", inactive: "bg-white border-slate-200 hover:border-cyan-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-cyan-900", labelActive: "text-cyan-700", labelInactive: "text-cyan-600" },
        orange: { active: "bg-orange-50 border-orange-500 ring-2 ring-orange-500 shadow-md transform scale-95", inactive: "bg-white border-orange-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-orange-900", labelActive: "text-orange-700", labelInactive: "text-orange-600" },
        indigo: { active: "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500 shadow-md transform scale-95", inactive: "bg-white border-indigo-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-indigo-900", labelActive: "text-indigo-700", labelInactive: "text-indigo-600" },
        pink: { active: "bg-pink-50 border-pink-500 ring-2 ring-pink-500 shadow-md transform scale-95", inactive: "bg-white border-pink-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-pink-900", labelActive: "text-pink-700", labelInactive: "text-pink-600" },
        emerald: { active: "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-md transform scale-95", inactive: "bg-white border-emerald-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-emerald-900", labelActive: "text-emerald-700", labelInactive: "text-emerald-600" },
        rose: { active: "bg-rose-50 border-rose-500 ring-2 ring-rose-500 shadow-md transform scale-95", inactive: "bg-white border-rose-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-rose-900", labelActive: "text-rose-700", labelInactive: "text-rose-600" },
        teal: { active: "bg-teal-50 border-teal-500 ring-2 ring-teal-500 shadow-md transform scale-95", inactive: "bg-white border-teal-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-teal-900", labelActive: "text-teal-700", labelInactive: "text-teal-600" },
        amber: { active: "bg-amber-50 border-amber-500 ring-2 ring-amber-500 shadow-md transform scale-95", inactive: "bg-white border-amber-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-amber-900", labelActive: "text-amber-700", labelInactive: "text-amber-600" },
        fuchsia: { active: "bg-fuchsia-50 border-fuchsia-500 ring-2 ring-fuchsia-500 shadow-md transform scale-95", inactive: "bg-white border-fuchsia-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-fuchsia-900", labelActive: "text-fuchsia-700", labelInactive: "text-fuchsia-600" },
        lime: { active: "bg-lime-50 border-lime-500 ring-2 ring-lime-500 shadow-md transform scale-95", inactive: "bg-white border-slate-200 hover:border-lime-300 hover:shadow-lg hover:-translate-y-1 active:scale-95", text: "text-lime-900", labelActive: "text-lime-700", labelInactive: "text-lime-600" }
    };

    const benefits = [
        { icon: LayoutTemplate, color: "text-blue-600", bg: "bg-blue-50", title: "Structured Analysis", desc: "Clear, repeatable framework for ad evaluation." },
        { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", title: "Actionable Insights", desc: "Scores come with tailored recommendations." },
        { icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", title: "Persona Alignment", desc: "Ensures creative stays audience-centric." },
        { icon: Settings2, color: "text-violet-600", bg: "bg-violet-50", title: "Optimization Tool", desc: "Refines messaging, visuals, and positioning." },
        { icon: Trophy, color: "text-rose-600", bg: "bg-rose-50", title: "Competitive Edge", desc: "Encourages differentiation and strong recall." },
        { icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50", title: "ROI Focus", desc: "Links creative scores to predicted performance." }
    ];

    const dataSources = [
        "Meta Ad Library", "Google Ads Transparency Center", "TikTok Creative Center", "LinkedIn Ad Library",
        "X (Twitter) Ads Transparency", "Snapchat Ads Library", "Pinterest Ads Gallery", "AdForum", "AdsSpot.me",
        "AdsLibrary.ai", "MyAdLibrary.com", "Socioh", "Advigator", "Coloribus", "Luerzer's Archive", "AdZyklopädie",
        "DigitalTripathi", "CAG India", "Adsoftheworld", "ReclameArsenaal", "Archive.org (Print)", "Duke/McGill Ad Access"
    ];

    const sectionDividers = [
        "Deep Dive", "Holistic Performance Score", "key Drivers and Key deterrents",
        "Executive Summary", "Diagnostic Summary", "Brand Strategy window",
        "Demographics, Psychographics and Behavioural Traits", "Brand Archetype Matrix",
        "Creative Resonance Index(CRI)", "Value Unlocking Score", "ROI Uplift score"
    ];

    const isVideo = file?.type.startsWith('video/');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-900 flex flex-col font-sans">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
                        <div className="flex items-center gap-3 select-none bg-[#2F5C5C] px-5 py-3 rounded-xl shadow-lg shadow-[#0F5C5C]/20 transform hover:scale-[1.02] transition-transform duration-300 border border-[#234b4b]">
                            <div className="flex items-center justify-center font-bold text-red-500 text-3xl tracking-tighter filter drop-shadow-sm"> &lt;/&gt; </div>
                            <div className="flex flex-col -space-y-0.5">
                                <h1 className="text-xl font-serif font-bold tracking-widest text-white">STRATAPILOT</h1>
                                <span className="text-[8px] font-bold tracking-[0.25em] text-slate-200 uppercase">Predict. Optimise. Succeed</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-[10px] font-bold text-indigo-700 uppercase tracking-wider shadow-sm"> Enterprise AI v2.5 </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold"> SP </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                <div className="pt-6 pb-4 text-center animate-in fade-in slide-in-from-top-4 duration-700">
                    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 tracking-tight mb-4 font-serif"> Predictive Creative Intelligence </h2>
                    <p className="text-base leading-relaxed max-w-3xl mx-auto text-slate-600 font-light"> Too many ads miss the mark — they fail to connect with the right audience, dilute brand impact, and waste valuable marketing spend. Without a clear way to measure effectiveness, brands risk putting out creative that looks good but doesn’t deliver results. <br className="hidden md:block" /> <span className="font-semibold text-indigo-700">StrataPilot</span> gives you the vision to fix creative before you spend making it the apt Ad diagnostic tool. </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-900/10 border border-white/50 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500"></div>
                    <div className="p-6 md:p-10">
                        <div className="grid md:col-span-2 md:grid-cols-2 gap-8 mb-10">
                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer h-full min-h-[320px] relative overflow-hidden ${file ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-inner'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => !file && fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                                {!file && <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none"></div>}
                                {file ? (
                                    <div className="relative group w-full h-full flex flex-col items-center z-10">
                                        <div className="w-full flex-1 mb-4 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center shadow-lg">
                                            {isVideo ? <video src={URL.createObjectURL(file)} controls className="w-full h-full object-contain" /> : <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />}
                                        </div>
                                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 flex items-center gap-3">
                                            <span className="font-medium text-slate-700 truncate max-w-[150px] text-xs"> {file.name} </span>
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-full transition-colors"> <X size={14} /> </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="z-10 flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-white text-indigo-600 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform duration-300"> <Video size={32} strokeWidth={1.5} /> </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Creative Asset</h3>
                                        <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">Drag & drop your video (MP4) or image (JPG, PNG) to begin the autopsy.</p>
                                        <button className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"> Browse Files </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col h-full gap-6">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"> <Globe size={14} /> </div> Analyze URL
                                    </label>
                                    <div className="relative">
                                        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="" className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-shadow" />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"> <LinkIcon size={16} /> </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"> <FileText size={14} /> </div> Strategic Context
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleVoiceInput('context')}
                                            className={`relative z-10 p-1.5 px-2.5 rounded-full transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border shadow-sm ${activeVoiceField === 'context' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-300'}`}
                                        >
                                            <Mic size={14} /> {activeVoiceField === 'context' ? 'Recording...' : 'Dictate'}
                                        </button>
                                    </div>
                                    <textarea value={textContext} onChange={(e) => setTextContext(e.target.value)} placeholder="Briefly describe the campaign goals, target audience, strategic intent, or paste ad copy here..." className="flex-1 w-full p-4 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none resize-none transition-shadow min-h-[120px]" />
                                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200 inline-block self-start"> <Sparkles size={12} className="text-amber-500" /> Context improves diagnostic accuracy by 40%. </p>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"> <Plug size={14} /> </div> Data Integration
                                        </label>

                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div
                                            onClick={() => !ga4Connected && setActiveModal('GA4')}
                                            className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="w-20 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="w-full object-contain" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-normal text-slate-800 leading-tight">Google Analytics 4</h4>
                                                {ga4Connected ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-left-2">
                                                        <CheckCircle2 size={12} /> Connected
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-indigo-600 flex items-center gap-1 mt-1"> Connect <ArrowRight size={10} /> </span>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => !metaConnected && setActiveModal('Meta')}
                                            className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="w-20 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Meta-Logo.png" alt="Meta" className="w-full object-contain" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-normal text-slate-800 leading-tight">Meta Ad manager</h4>
                                                {metaConnected ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-left-2">
                                                        <CheckCircle2 size={12} /> Connected
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-indigo-600 flex items-center gap-1 mt-1"> Connect <ArrowRight size={10} /> </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 text-center"> <span className="text-[9px] text-slate-400 font-medium bg-slate-100/50 px-2 py-1 rounded-md"> Grant access to GA4/Meta to unlock calibrated ROI & audience insights. </span> </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-4">
                                <p className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"> <Target size={16} className="text-indigo-600" /> Select Analysis Mode </p>
                                {selectedPreset && <span className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1 rounded-full shadow-md animate-in fade-in slide-in-from-right-4 flex items-center gap-1.5"> <CheckCircle2 size={12} className="text-white" /> Active: {selectedPreset} </span>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {analysisPresets.map((preset, index) => {
                                    const isSelected = selectedPreset === preset.label;
                                    const style = themeStyles[preset.theme] || themeStyles['blue'];
                                    const baseClasses = "text-left p-4 rounded-xl border flex flex-col justify-between h-full group transition-all duration-150 relative overflow-hidden select-none cursor-pointer";
                                    const classes = isSelected ? `${baseClasses} ${style.active}` : `${baseClasses} ${style.inactive}`;
                                    return (

                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                if (preset.label === "Visual Insight Mining") {
                                                    handlePresetClick(preset.label);
                                                }
                                            }}
                                            className={`${classes} ${preset.label === "Visual Insight Mining" ? 'ring-2 ring-indigo-500 shadow-2xl shadow-indigo-200 scale-110 z-50 bg-white transform-gpu' : 'cursor-default hover:shadow-none hover:translate-y-0 hover:border-slate-200 opacity-100 scale-95'}`}
                                        >
                                            {isSelected && <div className="absolute top-3 right-3 text-indigo-600 bg-white rounded-full p-0.5 shadow-sm animate-in zoom-in duration-200"> <CheckCircle2 size={16} fill="currentColor" className="text-white" /> </div>}
                                            <div className="relative z-10">
                                                <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isSelected ? style.labelActive : style.labelInactive}`}> {preset.label} </span>
                                                <span className={`text-xs font-medium leading-relaxed block ${isSelected ? style.text : 'text-slate-600'}`}> {preset.text} </span>
                                            </div>
                                            <div className={`absolute -bottom-4 -right-4 opacity-10 transform rotate-12 transition-transform group-hover:scale-125 group-hover:opacity-20 ${isSelected ? 'scale-125 opacity-20' : ''}`}>
                                                {index === 0 && <Fingerprint size={60} />}
                                                {index === 1 && <Target size={60} />}
                                                {index === 2 && <Globe size={60} />}
                                                {index === 3 && <Gavel size={60} />}
                                                {index === 4 && <Scan size={60} />}
                                                {index === 5 && <Diamond size={60} />}
                                                {index === 6 && <TrendingUp size={60} />}
                                                {index === 7 && <Zap size={60} />}
                                                {index === 8 && <LineChart size={60} />}
                                                {index === 9 && <BarChart size={60} />}
                                                {index === 10 && <Smile size={60} />}
                                                {index === 11 && <Workflow size={60} />}
                                            </div>
                                            {preset.label === "Visual Insight Mining" && (
                                                <div className={`mt-3 self-end transition-all transform ${isSelected ? `translate-x-1 ${style.labelActive}` : 'text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1'}`}> <ArrowRight size={16} /> </div>
                                            )}
                                        </button>
                                    );

                                })}
                            </div>
                        </div>

                        <div className="mt-8 flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-slate-200 shadow-sm flex-shrink-0" title="Upload Asset"> <Plus size={20} /> </button>
                            <input type="text" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Ask specific question about your creative or leave empty for auto-analysis..." className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-700 placeholder:text-slate-400" />
                            <button
                                type="button"
                                onClick={() => handleVoiceInput('query')}
                                className={`p-3 rounded-full transition-all flex-shrink-0 flex items-center gap-2 hover:bg-white relative z-10 ${activeVoiceField === 'query' ? 'bg-red-50 text-red-600 animate-pulse ring-4 ring-red-100' : 'text-slate-400 hover:text-indigo-600'}`}
                                title="Use Voice Mode"
                            >
                                {activeVoiceField === 'query' ? <AudioLines size={20} /> : <Mic size={20} />}
                                {activeVoiceField === 'query' && <span className="text-xs font-bold">Listening...</span>}
                            </button>
                            <button onClick={() => runAnalysis()} disabled={loadingState === 'analyzing'} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-indigo-900 hover:shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center text-sm"> {loadingState === 'analyzing' ? <> <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processing... </> : <> <Bot size={18} /> Run Neural Network </>} </button>
                        </div>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2"> <AlertCircle size={20} /> <p className="text-sm font-medium">{error}</p> </div>}
                {loadingState === 'analyzing' && (
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex flex-col items-center justify-center text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 relative">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-2xl animate-ping opacity-20"></div>
                                <Bot size={32} className="text-indigo-600 animate-bounce" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Creative Asset...</h3>
                            <p className="text-slate-500 text-sm max-w-md">StrataPilot is deconstructing your ad against 10M+ benchmarks.</p>
                        </div>
                        <TechLayerLoader step={processingStep} />
                    </div>
                )}

                {result && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-xl shadow-indigo-900/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2"> <Layers size={12} className="text-indigo-500" /> Quick Navigation Index </h4>
                            <div className="flex flex-wrap gap-2">
                                {sectionDividers.map((label, idx) => (<button key={idx} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-bold text-slate-600 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white hover:shadow-lg transition-all whitespace-nowrap"> {label} </button>))}
                            </div>
                        </div>
                        <AnalysisView data={result} onUpdateData={setResult} onGenerateStrategy={handleStrategy} isStrategizing={loadingState === 'strategizing'} activeMode={selectedPreset || "Balanced Analysis"} onExport={async () => { await pdfRef.current?.generate(); }} />
                        {result.campaignStrategy && <StrategyView strategy={result.campaignStrategy} />}
                        <PdfSystem ref={pdfRef} data={result} />
                    </div>
                )}

                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                        {benefits.map((b, i) => (
                            <div key={i} className={`p-3 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white transition-all hover:shadow-lg group ${b.bg}`}>
                                <div className={`w-8 h-8 rounded-lg ${b.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}> <b.icon size={16} className={b.color} /> </div>
                                <h4 className={`text-xs font-bold mb-1 ${b.title}`}>{b.title}</h4>
                                <p className="text-[10px] text-slate-500 leading-tight">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2"> <Database className="text-indigo-300" /> Overview & Methodology </h3>
                                    <p className="text-xs text-indigo-100 leading-relaxed opacity-90"> StrataPilot’s Ad Diagnostic & Persona Alignment Tool is a structured framework designed to evaluate advertisements through the lens of audience relevance, message clarity, and emotional resonance. </p>
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3">
                                        <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Ideal Use Cases:</h4>
                                        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2"> {['Pre-launch ad testing', 'Mid-campaign optimization', 'Post-campaign reviews', 'Creative brainstorming'].map((useCase, i) => (<li key={i} className="flex items-center gap-1.5 text-[10px] text-indigo-100 font-medium"> <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> {useCase} </li>))} </ul>
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2"> <Globe size={12} /> Powered by Global Ad Intelligence </h4>
                                        <div className="flex flex-wrap gap-2"> {dataSources.slice(0, 12).map((src, i) => (<span key={i} className="px-2 py-1 bg-indigo-900/50 border border-indigo-500/30 rounded text-[9px] text-indigo-200 font-medium"> {src} </span>))} <span className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded text-[9px] text-white font-bold"> +50 More </span> </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-700/50 shadow-xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2"> <ServerCog size={16} /> Enterprise Capabilities </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3"> <div className="mt-0.5"><Database size={14} className="text-indigo-400" /></div> <div> <h4 className="text-xs font-bold text-slate-200">Unified Data Architecture</h4> <p className="text-[10px] text-slate-400 leading-tight">Data lake ingestion + Attribution layer</p> </div> </li>
                                    <li className="flex items-start gap-3"> <div className="mt-0.5"><ShieldAlert size={14} className="text-indigo-400" /></div> <div> <h4 className="text-xs font-bold text-slate-200">Governance & Risk Controls</h4> <p className="text-[10px] text-slate-400 leading-tight">Audit logs & QA validation pipelines</p> </div> </li>
                                    <li className="flex items-start gap-3"> <div className="mt-0.5"><Lock size={14} className="text-indigo-400" /></div> <div> <h4 className="text-xs font-bold text-slate-200">Multi-tenant Scaling</h4> <p className="text-[10px] text-slate-400 leading-tight">Role-based access & custom guardrails</p> </div> </li>
                                </ul>
                                <div className="mt-3 pt-3 border-t border-slate-800">
                                    <div className="flex items-start gap-3"> <div className="mt-0.5"><ShieldCheck size={14} className="text-emerald-500" /></div> <div> <h4 className="text-xs font-bold text-emerald-400 mb-1">Zero Retention Architecture</h4> <p className="text-[10px] text-slate-400 leading-tight"> Enterprise-grade security. Stateless ephemeral processing. </p> </div> </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between"> <span className="text-[10px] text-slate-500 font-mono">v2.5.0-ent</span> <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-[10px] font-bold"> <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> SYSTEM OPERATIONAL </div> </div>
                        </div>
                    </div>
                </div>

                <ConnectionModal
                    type={activeModal || 'GA4'}
                    isOpen={!!activeModal}
                    onClose={() => setActiveModal(null)}
                    onSuccess={() => activeModal === 'GA4' ? setGa4Connected(true) : setMetaConnected(true)}
                />

                <footer className="mt-20 py-12 border-t border-slate-200 text-center space-y-3">
                    <p className="text-xs text-slate-500 font-bold"> © 2025 StrataPilot AI — Powered by Agentic & RAG-based Intelligence • A Strata7 Consulting LLP Product </p>
                    <p className="text-[11px] text-slate-400 max-w-4xl mx-auto leading-relaxed"> StrataPilot AI is built on advanced foundational models, leveraging Agentic AI and RAG architecture for enterprise-grade performance. </p>
                    <p className="text-xs text-slate-500 font-bold"> StrataPilot operates as the AI division of Strata7 Consulting LLP. </p>
                </footer>
            </main>
        </div>
    );
};
