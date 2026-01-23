import React, { useEffect, useState } from 'react';
import { ga4Service, GA4Connection } from '../../src/services/ga4';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Calendar, TrendingUp, Users, MousePointerClick, Clock, ArrowUpRight, ArrowDownRight,
    RefreshCcw, LogOut, CheckSquare, DollarSign, Loader2
} from 'lucide-react';

interface Props {
    connection: GA4Connection;
    onDisconnect: () => void;
}

export const GA4Dashboard: React.FC<Props> = ({ connection, onDisconnect }) => {
    const [range, setRange] = useState<7 | 14 | 30 | 60>(30);
    const [activeTab, setActiveTab] = useState<'overview' | 'acquisition' | 'conversions' | 'landing-pages'>('overview');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [consent, setConsent] = useState(connection.revenue_allowed);

    useEffect(() => {
        loadData();
    }, [range, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await ga4Service.getReport(activeTab, range);
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleConsentToggle = async () => {
        const newVal = !consent;
        setConsent(newVal);
        await ga4Service.updateConsent(newVal);
        // Reload if conversions tab is active to show/hide revenue
        if (activeTab === 'conversions') loadData();
    };

    const handleDisconnect = async () => {
        if (confirm('Disconnect GA4?')) {
            await ga4Service.disconnect();
            onDisconnect();
        }
    };

    const renderMetricCard = (label: string, value: string, icon: any, trend?: number) => (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">{icon}</div>
                {trend !== undefined && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div>
                <h4 className="text-2xl font-black text-slate-800 mb-1">{value}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
        </div>
    );

    const renderOverview = () => {
        if (!data) return null;
        // Rows: 0 because overview has no dimensions, just metrics usually? 
        // Wait, requestBody had dateRanges. Data returns aggregated totals for the range unless we add date dimension.
        // My service implementation for overview uses NO dimensions, just metrics.
        // So rows[0] contains the totals.
        const row = data.rows?.[0] || {};

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderMetricCard("Total Sessions", row.sessions || "0", <Users size={20} />)}
                {renderMetricCard("Engaged Sessions", row.engagedSessions || "0", <MousePointerClick size={20} />)}
                {renderMetricCard("Engagement Rate", `${(parseFloat(row.engagementRate || '0') * 100).toFixed(1)}%`, <Activity size={20} />)}
                {renderMetricCard("Avg Engagement", `${parseFloat(row.averageEngagementTime || '0').toFixed(0)}s`, <Clock size={20} />)}
                {/* Bounce Rate is explicit metric request in my service */}
                {renderMetricCard("Bounce Rate", `${(parseFloat(row.bounceRate || '0') * 100).toFixed(1)}%`, <LogOut size={20} />)}
            </div>
        );
    };

    // Helper for Acquisition Table
    const renderTable = (headers: string[], rows: any[], colKeys: string[]) => (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-6 py-4">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                            {colKeys.map((k, j) => <td key={j} className="px-6 py-4 font-medium text-slate-700">{row[k]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-indigo-600">Google Analytics 4</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        Property: <span className="font-bold text-slate-700">{connection.property_display_name || connection.property_id}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">LIVE</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Range Selector */}
                    <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
                        {[7, 14, 30, 60].map((d) => (
                            <button
                                key={d}
                                onClick={() => setRange(d as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${range === d ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {d}D
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleDisconnect}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Disconnect"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-1 overflow-x-auto">
                {['overview', 'acquisition', 'conversions', 'landing-pages'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Consent Toggle for Conversions */}
            {activeTab === 'conversions' && (
                <div className="mb-6 flex items-center gap-3 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <DollarSign size={16} className="text-amber-600" />
                    <span className="text-xs text-amber-800 font-medium flex-1">
                        Include Revenue & Transaction data? (Requires explicit consent)
                    </span>
                    <button
                        onClick={handleConsentToggle}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${consent ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${consent ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'overview' && renderOverview()}

                    {activeTab === 'acquisition' && data?.rows && (
                        renderTable(
                            ['Source / Medium', 'Sessions', 'Engaged', 'Engagement Rate'],
                            data.rows,
                            ['sessionSourceMedium', 'sessions', 'engagedSessions', 'engagementRate']
                        )
                    )}

                    {activeTab === 'conversions' && data?.rows && (
                        <div>
                            {renderTable(
                                ['Event Name', 'Conversions', 'Rate', ...(consent ? ['Revenue', 'Transactions'] : [])],
                                data.rows,
                                ['eventName', 'conversions', 'sessionConversionRate', ...(consent ? ['totalRevenue', 'transactions'] : [])]
                            )}
                        </div>
                    )}

                    {activeTab === 'landing-pages' && data?.rows && (
                        <div>
                            {renderTable(
                                ['Landing Page', 'Sessions', 'Engagement Rate', 'Conv. Rate'],
                                data.rows,
                                ['landingPage', 'sessions', 'engagementRate', 'sessionConversionRate']
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper component for icon
const Activity = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);
