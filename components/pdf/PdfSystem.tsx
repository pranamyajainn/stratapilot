import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AnalysisResult } from '../../types';
import {
    PdfCoverPage,
    PdfScorecard,
    PdfRoiUplift,
    PdfDiagnosticPage,
    PdfBrandStrategyWindow,
    PdfBrandArchetypeMatrix,
    PdfStrategyView
} from './PdfComponents';

interface PdfSystemProps {
    data: AnalysisResult;
}

export interface PdfSystemHandle {
    generate: () => Promise<void>;
}

export const PdfSystem = forwardRef<PdfSystemHandle, PdfSystemProps>(({ data }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        generate: async () => {
            try {
                const diagnostics = data.adDiagnostics || [];
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                // Load logo for header
                const logoImg = new Image();
                logoImg.src = '/stratapilot-logo.png';
                await new Promise((resolve) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = resolve; // Continue even if logo fails
                });

                const addHeaderFooter = (doc: jsPDF, pageNum: number, title: string) => {
                    // Header Background
                    doc.setFillColor(248, 250, 252); // slate-50
                    doc.rect(0, 0, pageWidth, 20, 'F');

                    // Header Logo
                    try {
                        doc.addImage(logoImg, 'PNG', 10, 5, 25, 10);
                    } catch (e) {
                        doc.setFontSize(10);
                        doc.setTextColor(30, 27, 75);
                        doc.text("STRATAPILOT", 10, 12);
                    }

                    // Header Title
                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139); // slate-500
                    doc.text("CREATIVE INTELLIGENCE REPORT", pageWidth - 10, 8, { align: 'right' });
                    doc.setFontSize(10);
                    doc.setTextColor(30, 27, 75); // slate-900
                    doc.text(title, pageWidth - 10, 14, { align: 'right' });

                    // Footer
                    doc.setDrawColor(226, 232, 240);
                    doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Page ${pageNum} | StrataPilot AI Analysis`, 10, pageHeight - 10);
                    doc.text(new Date().toLocaleDateString(), pageWidth - 10, pageHeight - 10, { align: 'right' });
                };

                const captureAndAddPage = async (elementId: string, pageTitle: string, pageNum: number, isDark = false, isCover = false) => {
                    const el = document.getElementById(elementId);
                    if (el) {
                        if (pageNum > 1 || (!isCover && pageNum === 1)) pdf.addPage();

                        const canvas = await html2canvas(el, {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            backgroundColor: isDark ? '#0f172a' : '#ffffff'
                        });
                        const imgData = canvas.toDataURL('image/png');
                        const imgHeight = (canvas.height * pageWidth) / canvas.width;

                        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, Math.min(imgHeight, pageHeight));

                        // Add header/footer to non-cover pages
                        if (!isCover) {
                            addHeaderFooter(pdf, pageNum, pageTitle);
                        }
                    } else {
                        console.warn(`PDF Generation: Element ${elementId} not found.`);
                    }
                };

                let pageCounter = 1;

                // 1. COVER PAGE
                await captureAndAddPage('pdf-cover-page', 'COVER', 1, false, true);

                // Reset counter for content pages? No, keep it flowing.
                // Or maybe start page 1 at Scorecard? 
                // Let's count Cover as non-numbered, and start Page 1 at Scorecard.
                pageCounter = 1;

                // 2. SCORECARD
                await captureAndAddPage('pdf-scorecard', 'EXECUTIVE SCORECARD', pageCounter++);

                // 3. ROI UPLIFT (Moved to end to match UI flow)

                // 4. DIAGNOSTICS (Loop)
                for (let i = 0; i < diagnostics.length; i++) {
                    await captureAndAddPage(`pdf-diagnostic-${i}`, `DIAGNOSTIC: ${diagnostics[i].metric.toUpperCase()}`, pageCounter++);
                }

                // 5. BRAND STRATEGY
                if (data.brandStrategyWindow) {
                    await captureAndAddPage('pdf-brand-strategy', 'BRAND STRATEGY DECODE', pageCounter++);
                }

                // 6. BRAND ARCHETYPE
                if (data.brandArchetypeDetail) {
                    await captureAndAddPage('pdf-brand-archetype', 'BRAND ARCHETYPE ANALYSIS', pageCounter++);
                }

                // 7. ROI UPLIFT
                await captureAndAddPage('pdf-roi', 'ROI UPLIFT PROJECTION', pageCounter++);

                // 7. STRATEGY PLAN
                if (data.campaignStrategy) {
                    await captureAndAddPage('pdf-strategy-plan', 'STRATEGIC EXECUTION PLAN', pageCounter++, true);
                }

                pdf.save(`StrataPilot-Report-${new Date().toISOString().split('T')[0]}.pdf`);

            } catch (err) {
                console.error("PDF Generation failed:", err);
                alert("Failed to generate PDF. Check console for details.");
            }
        }
    }));

    if (!data) return null;

    const diagnostics = data.adDiagnostics || [];

    return (
        <div
            ref={containerRef}
            className="fixed top-0 left-[-9999px] w-[210mm] z-[9999] opacity-0 pointer-events-none"
        >
            {/* All PDF Components are rendered here, off-screen */}
            <PdfCoverPage data={data} />
            <PdfScorecard data={data} />
            <PdfRoiUplift data={data} />
            {diagnostics.map((item, idx) => (
                <PdfDiagnosticPage key={idx} item={item} index={idx} />
            ))}
            {data.brandStrategyWindow && <PdfBrandStrategyWindow cards={data.brandStrategyWindow} />}
            {data.brandArchetypeDetail && <PdfBrandArchetypeMatrix detail={data.brandArchetypeDetail} />}
            {data.campaignStrategy && <PdfStrategyView strategy={data.campaignStrategy} />}
        </div>
    );
});
