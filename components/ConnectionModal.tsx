import React, { useState } from 'react';
import { Plug, X, Info, Copy, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export type IntegrationType = 'GA4' | 'Meta';

interface ConnectionModalProps {
    type: IntegrationType;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (token: string, extraId?: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ type, isOpen, onClose, onSuccess }) => {
    const [propertyId, setPropertyId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConnect = () => {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const url = type === 'GA4'
            ? 'http://localhost:3000/api/auth/google'
            : 'http://localhost:3000/api/auth/meta';

        const popup = window.open(
            url,
            'Connect',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        const messageHandler = (event: MessageEvent) => {
            if (event.origin !== 'http://localhost:3000') return; // Security check

            if (type === 'GA4' && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                window.removeEventListener('message', messageHandler);
                // We got the token. Now we need the Property ID.
                // We'll store the token in a temp state or pass it to onSuccess if the modal handles Property ID input *after* auth or *before*.
                // User requirement: "client can login... data... fetch"
                // Usually property ID is needed. 
                // Let's assume we capture the token here.
                // Since this modal was asking for property ID manually, let's keep asking for it, 
                // but ALSO require the OAuth token.
                // So, 1. Connect (OAuth) -> get token. 2. Enter Property ID. 3. Confirm.

                // But wait, the previous UI had manual instructions. Now we replace it.
                // Let's modify the state to store the token.
                onSuccessWithToken(event.data.token);
            } else if (type === 'Meta' && event.data.type === 'META_AUTH_SUCCESS') {
                window.removeEventListener('message', messageHandler);
                onSuccessWithToken(event.data.token);
            }
        };

        window.addEventListener('message', messageHandler);
    };

    // We need to change the signature of onSuccess in the parent if we want to pass data back.
    // Or we can just use a local callback prop if we can't change the interface easily (but I can change the interface).
    // Let's cast for now or update the interface. I'll update the interface in the file.

    // Actually, looking at the previous code: `onSuccess: () => void;`
    // I should update it to `onSuccess: (token: string, extraId?: string) => void;`
    // But I will stick to the existing interface partially, but passing data is crucial.
    // Let's assume for now I will modify the internal logic to handle the "Connect" button click.

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

                <div className="p-8">
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Securely connect your account to pull real-time performance data.
                        StrataPilot uses this to calibrate its analysis against your actual metrics.
                    </p>

                    {type === 'GA4' && (
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">GA4 Property ID</label>
                            <input
                                type="text"
                                value={propertyId}
                                onChange={(e) => setPropertyId(e.target.value)}
                                placeholder="e.g. 123456789"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">Found in Admin &gt; Property Settings</p>
                        </div>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={type === 'GA4' && !propertyId}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-lg disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : `Log in with ${type === 'GA4' ? 'Google' : 'Facebook'}`}
                    </button>

                    <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <Info size={16} className="text-blue-500 mt-0.5" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                            Access is strictly <strong>Read-Only</strong>. We do not store your data for training.
                            Tokens are used for this session only.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    function onSuccessWithToken(token: string) {
        setIsProcessing(true);
        // We call the parent's onSuccess, but we need to pass the token.
        // I will attach it to the parent handler via a custom event or argument.
        // For type safety, I should update the interface. I'll do that in a separate `multi_replace`.
        // Wait, I am replacing the whole component here.
        // I'll define a new helper inside to cast the prop if needed, or just update the Props definition above.
        // I will update the Props definition at the top of the file in the replacement content.

        // Actually, to make it cleaner, let's just assume passed onSuccess handles the "closing" part,
        // but we need to pass data.
        // I will use a custom callback passed in props: `onConnect: (token: string, id?: string) => void`
        // But the props are `onSuccess: () => void`. 
        // I will overload it or add a new prop.
        // Let's modify the Props interface in the replacement content.
        // But I need to allow the parent to update its state.

        // Let's use `(window as any).postMessage` or similar? No.
        // I'll update the parent `Dashboard.tsx` to handle the new signature.

        (onSuccess as any)(token, propertyId);
    }
};
