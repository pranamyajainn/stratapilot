import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, FileText, BarChart3, ShieldCheck, Database, BrainCircuit, PlayCircle } from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">

            {/* --- Navbar --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 select-none bg-slate-900 px-3 py-2 rounded-xl shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
                            <div className="flex items-center justify-center font-bold text-red-500 text-xl tracking-tighter"> &lt;/&gt; </div>
                            {/* <span className="font-bold text-white tracking-widest text-sm">STRATAPILOT</span> */}
                        </div>
                        <span className="font-black text-xl tracking-tighter text-slate-900 hidden sm:block">STRATAPILOT</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link to="/app" className="hidden md:block text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                            Client Login
                        </Link>
                        <a
                            href="https://cal.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-slate-900 flex items-center gap-2"
                        >
                            Book Strategy Call <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <section className="pt-40 pb-20 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

                    <div className="relative z-10 space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 duration-700">
                            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs font-black uppercase tracking-wider">New: Enterprise Prediction Engine v2.5</span>
                        </div>

                        <h1 className="text-6xl sm:text-7xl font-black leading-[0.95] tracking-tight text-slate-900 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                            Stop Presenting <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Guesswork.</span>
                        </h1>

                        <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-xl animate-in slide-in-from-bottom-8 duration-700 delay-200">
                            StrataPilot turns your creative chaos into boardroom-ready science. Analyze 30 ads in 24 hours—and prove what works before you spend.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                            <a
                                href="https://cal.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                            >
                                Get The Edge
                            </a>
                            <Link to="/app" className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(200,200,200,1)] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] transition-all flex items-center justify-center gap-2">
                                <PlayCircle size={20} /> View Sample Audit
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-4 opacity-80 animate-in fade-in duration-1000 delay-500">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm font-bold text-slate-600">
                                Used by <span className="text-indigo-600">150+ Strategy Leads</span> <br /> to win the boardroom.
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 perspective-1000 animate-in fade-in slide-in-from-right-16 duration-1000 delay-200 hidden lg:block">
                        <div className="relative w-full aspect-[4/5] bg-white rounded-3xl border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out">
                            {/* Simulated App UI */}
                            <div className="absolute inset-0 bg-slate-50 flex flex-col">
                                <div className="h-12 border-b-2 border-slate-200 bg-white flex items-center px-4 gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400 border border-black/10"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black/10"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400 border border-black/10"></div>
                                    <div className="flex-1 text-center text-[10px] font-mono text-slate-400">stratapilot_v2_report.pdf</div>
                                </div>
                                <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                                    {/* Fake Content */}
                                    <div className="w-32 h-8 bg-slate-200 rounded animate-pulse"></div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 h-32 bg-indigo-50 rounded-xl border-2 border-indigo-100 p-4">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 mb-2"></div>
                                            <div className="w-16 h-4 bg-indigo-200 rounded mb-2"></div>
                                            <div className="w-full h-8 bg-slate-200 rounded"></div>
                                        </div>
                                        <div className="flex-1 h-32 bg-purple-50 rounded-xl border-2 border-purple-100 p-4">
                                            <div className="w-8 h-8 rounded-full bg-purple-500 mb-2"></div>
                                            <div className="w-16 h-4 bg-purple-200 rounded mb-2"></div>
                                            <div className="w-full h-8 bg-slate-200 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="w-full h-40 bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3 shadow-sm">
                                        <div className="w-1/3 h-6 bg-slate-200 rounded"></div>
                                        <div className="space-y-2">
                                            <div className="w-full h-3 bg-slate-100 rounded"></div>
                                            <div className="w-5/6 h-3 bg-slate-100 rounded"></div>
                                            <div className="w-4/6 h-3 bg-slate-100 rounded"></div>
                                        </div>
                                    </div>

                                    {/* Floating Badge */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-4 rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(99,102,241,1)] z-20 flex flex-col items-center">
                                        <div className="text-4xl font-black text-indigo-600 mb-1">94/100</div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-900">Performance Score</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Background Blobs */}
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    </div>
                </div>
            </section>

            {/* --- Mechanism Section --- */}
            <section className="py-24 bg-white border-y-2 border-slate-900 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">The 10-Step <span className="text-indigo-600 italic">Neural Autopsy.</span></h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                        We don't use generic GPT wrappers. We pipe your data through a forensics lab designed to find the truth in your ad spend.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-y-1/2 hidden md:block"></div>

                    <div className="grid md:grid-cols-3 gap-8 relative z-10">
                        {[
                            { icon: Database, title: "1. Forensic Ingestion", desc: "We pull raw ads from Meta, TikTok, and YouTube." },
                            { icon: BrainCircuit, title: "2. Pattern Decoding", desc: "Our models map 200+ creative variables per second." },
                            { icon: BarChart3, title: "3. ROI Prediction", desc: "We correlate patterns to ROAS & CTR outcomes." }
                        ].map((step, i) => (
                            <div key={i} className="bg-[#FDFBF7] p-8 rounded-3xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left hover:-translate-y-1 transition-transform">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white border-2 border-black mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                    <step.icon size={28} />
                                </div>
                                <h3 className="text-xl font-black mb-3">{step.title}</h3>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Bento Grid Proof Points --- */}
            <section className="py-24 px-6 bg-[#FDFBF7]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block px-4 py-1.5 rounded-full border-2 border-slate-900 bg-white text-xs font-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Why Marketers Switch
                        </div>
                        <h2 className="text-4xl font-black text-slate-900">Boardroom Quality. Machine Speed.</h2>
                    </div>

                    <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[800px]">
                        {/* Card 1: The Report - Large */}
                        <div className="md:col-span-2 md:row-span-2 bg-white rounded-3xl border-2 border-black p-8 relative overflow-hidden group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6 text-red-600 border-2 border-red-200">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-3xl font-black mb-4">The End of "I Think".</h3>
                                <p className="text-slate-600 font-medium max-w-sm mb-6">
                                    Don't walk into the boardroom with feelings. Walk in with a forensic breakdown of the top 1% of creatives in your niche, delivered as a PDF you can present immediately.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    {['Executive Summary', 'Visual Hooks Analysis', 'Copywriting Psychology', 'Competitor Spend Estimates'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 font-bold text-slate-800">
                                            <CheckCircle2 size={18} className="text-indigo-600" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="absolute right-0 bottom-0 w-1/2 h-3/4 bg-slate-100 rounded-tl-3xl border-l-2 border-t-2 border-black p-4 translate-x-12 translate-y-12 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform">
                                {/* Fake Report Preview */}
                                <div className="w-full h-full bg-white rounded-xl shadow-sm p-4 space-y-4">
                                    <div className="w-1/2 h-6 bg-slate-200 rounded"></div>
                                    <div className="space-y-2">
                                        <div className="w-full h-32 bg-indigo-50 rounded"></div>
                                        <div className="w-full h-3 bg-slate-100 rounded"></div>
                                        <div className="w-full h-3 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Speed */}
                        <div className="bg-yellow-50 rounded-3xl border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
                            <h3 className="text-6xl font-black text-slate-900 mb-2">30<span className="text-3xl text-slate-500">ads</span></h3>
                            <div className="h-1 w-full bg-black/10 my-4 relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-yellow-400 w-3/4 animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <p className="font-bold text-lg">One Coffee.</p>
                            <p className="text-sm text-slate-500 mt-2">Your agency takes 2 weeks. We do it while you sleep.</p>
                        </div>

                        {/* Card 3: Safety */}
                        <div className="bg-indigo-600 rounded-3xl border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <ShieldCheck size={40} className="mb-4 text-indigo-200" />
                                <h3 className="text-2xl font-black mb-2">Zero Data Retention.</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed">
                                    We process your data in ephemeral verified enclaves. We don't train on your ads. Your secrets stay yours.
                                </p>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto text-center bg-white rounded-[3rem] border-2 border-black p-12 sm:p-20 shadow-[12px_12px_0px_0px_rgba(79,70,229,1)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_2px,transparent_2px)] [background-size:24px_24px] opacity-50"></div>

                    <div className="relative z-10">
                        <h2 className="text-5xl sm:text-6xl font-black text-slate-900 mb-8 tracking-tight">
                            Ready to see the <br /><span className="text-indigo-600">matrix?</span>
                        </h2>
                        <p className="text-xl text-slate-600 font-medium mb-10 max-w-xl mx-auto">
                            Join the waitlist for Enterprise Access. We onboard 5 new partners each week to ensure compute availability.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <input
                                type="email"
                                placeholder="cmos@fortune500.com"
                                className="w-full sm:w-auto min-w-[300px] px-6 py-4 rounded-xl border-2 border-slate-300 focus:border-indigo-600 focus:ring-0 outline-none text-lg font-medium transition-colors bg-slate-50"
                            />
                            <button className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all border-2 border-black">
                                Request Access
                            </button>
                        </div>
                        <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            No credit card required • SOC2 Compliant
                        </p>
                    </div>
                </div>

                <div className="mt-20 text-center flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Fake Partner Logos */}
                    {['Acme Corp', 'Global Dynamics', 'Massive Dynamic', 'Soylent Corp'].map((logo, i) => (
                        <span key={i} className="text-xl font-black text-slate-300 select-none">{logo}</span>
                    ))}
                </div>
            </section>

        </div>
    );
};
