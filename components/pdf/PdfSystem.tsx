import React, { forwardRef, useImperativeHandle } from 'react';
import { AnalysisResult } from '../../types';

interface PdfSystemProps {
    data: AnalysisResult;
}

export interface PdfSystemHandle {
    generate: () => Promise<void>;
}

export const PdfSystem = forwardRef<PdfSystemHandle, PdfSystemProps>(({ data }, ref) => {

    useImperativeHandle(ref, () => ({
        generate: async () => {
            try {
                if (!data) return;

                console.log('[PdfSystem] Triggering backend PDF generation...');

                const response = await fetch('/api/reports/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ analysis: data })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'PDF generation failed');
                }

                // Handle binary response
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `StrataPilot_Report-${data.auditId || 'Generated'}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                console.log('[PdfSystem] PDF downloaded successfully.');

            } catch (err: any) {
                console.error("PDF Generation failed:", err);
                alert(`Failed to generate PDF: ${err.message}`);
            }
        }
    }));

    // No UI to render, this is a logic-only component wrapper now
    return null;
});
