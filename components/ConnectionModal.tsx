import React, { useState } from 'react';
import { Plug, X, Info, Copy, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export type IntegrationType = 'GA4' | 'Meta';

interface ConnectionModalProps {
    type: IntegrationType;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ type, isOpen, onClose, onSuccess }) => {
    const [propertyId, setPropertyId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleComplete = () => {
        if (type === 'GA4' && !propertyId) {
            alert("Please provide your GA4 Property ID");
            return;
        }
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
