import React, { useEffect, useState } from 'react';
import { ga4Service, GA4Account, GA4Property } from '../../src/services/ga4';
import { Loader2, CheckCircle2, ChevronDown, Building2 } from 'lucide-react';

interface Props {
    onSelect: (property: GA4Property) => void;
}

export const GA4PropertyPicker: React.FC<Props> = ({ onSelect }) => {
    const [accounts, setAccounts] = useState<GA4Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedProperty, setSelectedProperty] = useState<string>('');

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        try {
            setLoading(true);
            const data = await ga4Service.listProperties();
            setAccounts(data);
            if (data.length > 0) {
                setSelectedAccount(data[0].id);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedProperty) return;

        try {
            setLoading(true);
            const result = await ga4Service.selectProperty(selectedProperty);
            // Result.property has displayName etc.
            // Find the property object
            const account = accounts.find(a => a.id === selectedAccount);
            const prop = account?.properties.find(p => p.id === selectedProperty);

            if (prop) {
                onSelect(prop);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to set property');
        } finally {
            setLoading(false);
        }
    };

    if (loading && accounts.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>;
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-4">
                <p className="text-sm">{error}</p>
                <button onClick={loadProperties} className="text-xs font-bold underline mt-2">Retry</button>
            </div>
        );
    }

    const currentAccount = accounts.find(a => a.id === selectedAccount);

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full mx-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="text-indigo-600" size={20} />
                Select GA4 Property
            </h3>

            {/* Account Selector */}
            <div className="mb-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Account</label>
                <div className="relative">
                    <select
                        value={selectedAccount}
                        onChange={(e) => {
                            setSelectedAccount(e.target.value);
                            setSelectedProperty('');
                        }}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-indigo-500"
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                        <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {/* Property Selector */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Property</label>
                <div className="relative">
                    <select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        disabled={!selectedAccount}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-50"
                    >
                        <option value="">Select a property...</option>
                        {currentAccount?.properties.map(prop => (
                            <option key={prop.id} value={prop.id}>{prop.displayName}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                        <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            <button
                onClick={handleConfirm}
                disabled={!selectedProperty || loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Selection'}
            </button>
        </div>
    );
};
