import React from 'react';
import { Archive, Search, Shuffle, Zap, Brain, Scale, CheckSquare, ShieldAlert, RefreshCcw, BarChart3, RefreshCw, Database, Cpu, BrainCircuit, Server, BarChart } from 'lucide-react';

export const TechLayerLoader: React.FC<{ step: number }> = ({ step }) => {
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
