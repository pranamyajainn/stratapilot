import React, { useState } from 'react';
import { Plug, X, Info, Copy, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { ga4Service } from '../src/services/ga4';

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
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConnect = () => {
        if (type === 'GA4') {
            setIsProcessing(true);
            ga4Service.startAuth(); // Redirects to Google
            return;
        }

        setError(null);
        setIsProcessing(true);

        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        // Use current origin to support both localhost and ngrok
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/auth/meta/login`;

        const popup = window.open(
            url,
            'Connect',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        if (!popup) {
            setError('Popup blocked. Please allow popups for this site.');
            setIsProcessing(false);
            return;
        }

        let popupCheckInterval: ReturnType<typeof setInterval> | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const messageHandler = (event: MessageEvent) => {
            // Security check
            if (event.origin !== baseUrl) {
                console.warn('[Meta Auth] Origin mismatch:', event.origin, 'expected:', baseUrl);
                return;
            }

            if (event.data?.type === 'META_AUTH_SUCCESS') {
                console.log('[Meta Auth] Success message received');
                window.removeEventListener('message', messageHandler);
                if (popupCheckInterval) clearInterval(popupCheckInterval);
                if (timeoutHandle) clearTimeout(timeoutHandle);
                setIsProcessing(false);
                
                if (event.data.token) {
                    (onSuccess as any)(event.data.token);
                } else {
                    setError('No token received from authentication');
                }
            }
        };

        // Monitor if popup closes without message
        popupCheckInterval = setInterval(() => {
            if (popup.closed) {
                clearInterval(popupCheckInterval);
                if (timeoutHandle) clearTimeout(timeoutHandle);
                window.removeEventListener('message', messageHandler);
                setIsProcessing(false);
                setError('Authentication window closed. Please try again.');
            }
        }, 500);

        // Timeout after 5 minutes
        timeoutHandle = setTimeout(() => {
            if (popupCheckInterval) clearInterval(popupCheckInterval);
            window.removeEventListener('message', messageHandler);
            if (!popup.closed) popup.close();
            setIsProcessing(false);
            setError('Authentication timeout. Please try again.');
        }, 5 * 60 * 1000);

        window.addEventListener('message', messageHandler);
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

                <div className="p-8">
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Securely connect your account to pull real-time performance data.
                        StrataPilot uses this to calibrate its analysis against your actual metrics.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-xs text-red-800 leading-relaxed flex items-center gap-2">
                                <span className="text-sm">⚠️</span>
                                {error}
                            </p>
                        </div>
                    )}

                    {type === 'GA4' && (
                        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <p className="text-xs text-indigo-800 leading-relaxed">
                                You will be redirected to Google to authorize access.
                                After authorization, you will be redirected back here to select your property.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={type === 'GA4' && isProcessing || isProcessing} // Disable while processing
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
};
