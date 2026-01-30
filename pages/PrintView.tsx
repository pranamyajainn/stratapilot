import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnalysisView } from '../components/AnalysisView';
import { StrategyView } from '../components/StrategyView';
import type { AnalysisResult } from '../types';

/**
 * PrintView - Executive PDF Export Renderer
 * 
 * This component renders the report for PDF export with:
 * - Explicit section-level pagination
 * - Deterministic section ordering
 * - Proper margin isolation for headers/footers
 */
export default function PrintView() {
    const [searchParams] = useSearchParams();
    const [snapshot, setSnapshot] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setError('Missing print token');
            return;
        }

        // Fetch snapshot from server
        fetch(`/api/reports/snapshot/${token}`)
            .then(res => {
                if (!res.ok) throw new Error('Invalid or expired token');
                return res.json();
            })
            .then(data => {
                setSnapshot(data);
                // Longer delay to ensure all content renders
                setTimeout(() => {
                    (window as any).printReady = true;
                }, 3000);
            })
            .catch(err => {
                setError(err.message);
            });
    }, [searchParams]);

    if (error) {
        return <div className="p-8 text-red-500">Print Error: {error}</div>;
    }

    if (!snapshot) {
        return <div className="p-8 bg-white h-screen flex items-center justify-center text-slate-400">Loading print artifacts...</div>;
    }

    const { analysis, strategy } = snapshot;
    const auditId = analysis?.auditId || "GEN-000";
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="print-document">
            <style>{`
                /* ═══════════════════════════════════════════════════════════════
                   EXECUTIVE PDF PRINT STYLES - FORTUNE 500 GRADE
                   ═══════════════════════════════════════════════════════════════ */
                
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                /* ═══════════════════════════════════════════════════════════════
                   A4 PAGE SETUP
                   Margins are controlled by Puppeteer's page.pdf() options
                   DO NOT set margin here as it conflicts with Puppeteer
                   ═══════════════════════════════════════════════════════════════ */
                @page {
                    size: A4 portrait;
                    /* margin is controlled by Puppeteer - do not set here */
                }

                /* Color Preservation */
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    box-sizing: border-box;
                }

                /* Base Reset */
                html, body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .print-document {
                    background: white;
                    color: #1e293b;
                }

                /* ═══════════════════════════════════════════════════════════════
                   SECTION WRAPPER - Sections start on new pages but content can flow
                   ═══════════════════════════════════════════════════════════════ */
                .pdf-section {
                    page-break-before: always !important;
                    break-before: page !important;
                    padding: 0;
                    margin: 0;
                }

                /* First section after cover doesn't need break-before since cover has break-after */
                .pdf-section:first-of-type {
                    page-break-before: auto;
                    break-before: auto;
                }

                /* ═══════════════════════════════════════════════════════════════
                   COVER PAGE - Constrained to single page within margins
                   A4 = 297mm, minus margins (30mm top + 22mm bottom) = ~245mm available
                   ═══════════════════════════════════════════════════════════════ */
                .cover-page {
                    width: 100%;
                    height: 245mm;
                    max-height: 245mm;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    position: relative;
                    overflow: hidden;
                }

                .cover-page .top-bar {
                    height: 4px;
                    background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%);
                    flex-shrink: 0;
                }

                .cover-page .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px 40px;
                    overflow: hidden;
                }

                .cover-page .footer-content {
                    padding: 16px 40px 20px;
                    background: #1e293b;
                    color: white;
                    flex-shrink: 0;
                }
                /* ═══════════════════════════════════════════════════════════════
                   CONTENT SECTIONS - Targeted break protection ONLY for critical elements
                   IMPORTANT: Avoid broad selectors like [class*="rounded-"] as they
                   match most Tailwind elements and cause unwanted full-block displacement
                   ═══════════════════════════════════════════════════════════════ */
                
                /* Only protect charts and critical visualizations from splitting */
                .recharts-wrapper, .recharts-surface, .recharts-responsive-container {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                /* Headers should stay with following content (not break after) */
                h1, h2, h3, h4, h5 {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }

                /* Orphan/widow control for paragraphs */
                p, li {
                    orphans: 3;
                    widows: 3;
                }

                /* Hide interactive elements */
                button, [role="button"], input, textarea {
                    pointer-events: none !important;
                }

                /* Disable all animations */
                *, *::before, *::after {
                    animation: none !important;
                    transition: none !important;
                }

                /* ═══════════════════════════════════════════════════════════════
                   SECTION HEADER STYLING
                   ═══════════════════════════════════════════════════════════════ */
                .section-header {
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #e2e8f0;
                }

                .section-header h2 {
                    font-size: 24px;
                    font-weight: 900;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0;
                }

                .section-header .section-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: #1e293b;
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    border-radius: 8px;
                    margin-right: 12px;
                }

            `}</style>

            {/* ═══════════════════════════════════════════════════════════════
                COVER PAGE (Page 1)
                ═══════════════════════════════════════════════════════════════ */}
            <div className="cover-page">
                <div className="top-bar"></div>

                <div className="main-content">
                    <img src="/stratapilot-logo.png" alt="StrataPilot" className="w-28 mb-3" />
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 text-center">
                        StrataPilot
                    </h1>
                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] mb-6 text-center">
                        Predictive Creative Intelligence
                    </p>

                    <div className="max-w-md text-center mb-6">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Too many ads miss the mark — they fail to connect with the right audience,
                            dilute brand impact, and waste valuable marketing spend.
                            <span className="font-semibold text-slate-800"> StrataPilot gives you the vision to fix creative before you spend.</span>
                        </p>
                    </div>

                    <div className="w-72 bg-white rounded-lg shadow-md border border-slate-100 p-4 mb-4">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2 text-center">
                            Report Details
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                <span className="text-slate-500 font-medium">Audit ID</span>
                                <span className="font-mono font-bold text-slate-800">{auditId}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                <span className="text-slate-500 font-medium">Generated</span>
                                <span className="font-semibold text-slate-700">{date}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500 font-medium">Classification</span>
                                <span className="font-bold text-indigo-600 uppercase text-[10px] tracking-wider">Confidential</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-center">
                        {['Pre-launch Testing', 'Mid-campaign Optimization', 'Post-campaign Review', 'Creative Brainstorming'].map((useCase, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[8px] font-semibold uppercase tracking-wider">
                                {useCase}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="footer-content">
                    <div className="flex justify-between items-start">
                        <div className="max-w-sm">
                            <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">About StrataPilot</p>
                            <p className="text-[9px] text-slate-300 leading-relaxed">
                                StrataPilot's Ad Diagnostic & Persona Alignment Tool evaluates advertisements
                                through audience relevance, message clarity, and emotional resonance.
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-slate-400 mb-1">Powered by</p>
                            <p className="text-xs font-bold text-white">Strata7 Consulting LLP</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-700 text-center">
                        <p className="text-[8px] text-slate-500">
                            © 2025 StrataPilot AI — All Rights Reserved
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                REPORT BODY - Deterministic Section Rendering
                Each section wrapped in pdf-section for page isolation
                ═══════════════════════════════════════════════════════════════ */}
            {analysis && (
                <div className="print-mode">
                    <AnalysisView
                        data={analysis}
                        printMode={true}
                        onUpdateData={() => { }}
                        onGenerateStrategy={() => { }}
                        isStrategizing={false}
                        activeMode="PROD"
                        onExport={async () => { }}
                    />
                </div>
            )}

            {/* Strategy Section */}
            {strategy && (
                <div className="pdf-section">
                    <StrategyView strategy={strategy} printMode={true} />
                </div>
            )}
        </div>
    );
}
