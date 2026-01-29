
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// --- HTML TEMPLATE GENERATOR ---
// Generates a clean, print-ready HTML structure matching the StataPilot brand
function generateHtml(data: any): string {
    const {
        adDiagnostics = [],
        brandStrategyWindow = [],
        brandArchetypeDetail = {},
        roiMetrics = {},
        audience = {},
        userContext = ""
    } = data;

    const overallScore = data.holisticScorecard?.averageScore || 0;

    // Helper to render score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return '#10b981'; // emerald
        if (score >= 60) return '#4f46e5'; // indigo
        return '#ef4444'; // red
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>StrataPilot Analysis Report</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 40px;
                background: #fff;
                color: #0f172a;
                -webkit-print-color-adjust: exact;
            }

            /* UTILS */
            .page-break { page-break-before: always; }
            .section { margin-bottom: 40px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #fff; }
            .shadow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            
            /* TYPOGRAPHY */
            h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 8px 0; }
            h2 { font-size: 24px; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 20px 0; color: #1e293b; text-transform: uppercase; }
            h3 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 12px; }
            p { line-height: 1.6; color: #475569; font-size: 12px; margin: 0; }
            
            /* HEADER */
            header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 40px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 40px; height: 40px; background: #2F5C5C; color: #ef4444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }
            .meta { text-align: right; }
            .meta-item { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }

            /* HERO SCORE */
            .hero-score { background: #0f172a; color: #fff; padding: 40px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
            .score-val { font-size: 80px; font-weight: 900; line-height: 1; color: #fff; }
            .score-label { font-size: 18px; font-weight: 700; color: #10b981; }

            /* DIAGNOSTICS */
            .diagnostic-item { margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
            .diag-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .diag-metric { font-weight: 800; font-size: 14px; }
            .diag-score { font-weight: 900; font-size: 14px; padding: 2px 8px; border-radius: 4px; background: #f8fafc; }
            
            /* STRATEGY CARDS */
            .strategy-card { background: #f8fafc; padding: 20px; border-radius: 12px; page-break-inside: avoid; }
            .card-title { font-weight: 900; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; color: #334155; }
            .card-sub { font-size: 9px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 12px; }

            /* ARCHETYPE */
            .archetype-hero { text-align: center; padding: 40px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 24px; color: #b45309; }
            
            /* ROI */
            .roi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
            .roi-card { text-align: center; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; }
            .roi-val { font-size: 24px; font-weight: 900; color: #10b981; }
            
            footer { margin-top: 60px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        </style>
    </head>
    <body>

        <!-- PAGE 1: OVERVIEW -->
        <header>
            <div class="brand">
                <div class="logo">&lt;/&gt;</div>
                <div>
                    <h1>STRATAPILOT</h1>
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #94a3b8;">PREDICT. OPTIMISE. SUCCEED.</div>
                </div>
            </div>
            <div class="meta">
                <div class="meta-item">Generated on ${new Date().toLocaleDateString()}</div>
                <div class="meta-item">Analysis ID: ${data.auditId || 'N/A'}</div>
            </div>
        </header>

        <div class="hero-score">
            <div>
                <h3 style="color: #64748b; margin: 0;">HOLISTIC PERFORMANCE SCORE</h3>
                <div style="color: #94a3b8; font-size: 11px; margin-top: 8px;">AI-Calibrated against 10M+ benchmarks</div>
            </div>
            <div style="text-align: right;">
                <div class="score-val">${overallScore}</div>
                <div class="score-label">${overallScore >= 80 ? 'EXCELLENT' : overallScore >= 60 ? 'GOOD' : 'AVERAGE'}</div>
            </div>
        </div>

        <div class="section">
            <h2>Executive Summary</h2>
            <div class="grid-2">
                ${adDiagnostics.slice(0, 4).map((d: any) => `
                <div class="card">
                    <div class="diag-header">
                        <span class="diag-metric">${d.metric}</span>
                        <span class="diag-score" style="color: ${getScoreColor(d.score)}">${d.score}</span>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 9px; font-weight: 900; color: #ef4444; margin-bottom: 4px;">THE ISSUE</div>
                        <p>${d.commentary}</p>
                    </div>
                    <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #dcfce7;">
                        <div style="font-size: 9px; font-weight: 900; color: #166534; margin-bottom: 4px;">THE FIX</div>
                        <p style="color: #166534;">${d.recommendation}</p>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <div class="section">
             <h2>Context & Intent</h2>
             <div class="card">
                <p><strong>Brief:</strong> ${userContext || 'No context provided.'}</p>
             </div>
        </div>

        <div class="page-break"></div>

        <!-- PAGE 2: DEEP DIVE -->
        <div class="section">
            <h2>Diagnostic Deep Dive</h2>
            <div class="grid-2">
                ${adDiagnostics.map((d: any) => `
                <div class="diagnostic-item">
                    <div class="diag-header">
                        <span class="diag-metric">${d.metric}</span>
                        <span class="diag-score" style="color: ${getScoreColor(d.score)}">${d.score}</span>
                    </div>
                    <p>${d.commentary}</p>
                </div>
                `).join('')}
            </div>
        </div>

        <!-- PAGE 3: BRAND STRATEGY -->
        <div class="page-break"></div>
        
        ${brandArchetypeDetail.archetype ? `
        <div class="section">
            <h2>Brand Archetype</h2>
            <div class="archetype-hero">
                <div style="font-size: 12px; font-weight: 900; letter-spacing: 0.2em; margin-bottom: 12px;">DETECTED ARCHETYPE</div>
                <div style="font-size: 48px; font-weight: 900; margin-bottom: 8px;">${brandArchetypeDetail.archetype}</div>
                <div style="font-style: italic; opacity: 0.8;">"${brandArchetypeDetail.quote || ''}"</div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>Brand Strategy Window</h2>
            <div class="grid-3">
                ${brandStrategyWindow.map((c: any) => `
                <div class="strategy-card">
                    <div class="card-title">${c.title}</div>
                    <div class="card-sub">${c.subtitle}</div>
                    <p>${c.content}</p>
                </div>
                `).join('')}
            </div>
        </div>

        <!-- ROI -->
        <div class="section">
            <h2>Value Unlocking</h2>
            <div class="roi-grid">
                 <div class="roi-card">
                    <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Predicted CTR</div>
                    <div class="roi-val">${roiMetrics.predictedCtr || 0}%</div>
                 </div>
                 <div class="roi-card">
                    <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">ROAS Uplift</div>
                    <div class="roi-val">${roiMetrics.roiUplift || 0}x</div>
                 </div>
                 <div class="roi-card">
                    <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Hook Score</div>
                    <div class="roi-val">${roiMetrics.hookScore || 0}</div>
                 </div>
            </div>
        </div>

        <footer>
            Generated by StrataPilot Agentic Engine • Confidential & Proprietary
        </footer>

    </body>
    </html>
    `;
}

// --- PUPPETEER GENERATOR ---
export async function generatePdfReport(data: any): Promise<Buffer> {
    const html = generateHtml(data);
    let browser = null;

    try {
        console.log('[PDF] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Optimize for print
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

        console.log('[PDF] Setting content...');
        await page.setContent(html, { waitUntil: 'networkidle0' });

        console.log('[PDF] Generating PDF buffer...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        // Uint8Array to Buffer (if needed, though puppeteer returns Buffer or Uint8Array depending on version)
        return Buffer.from(pdfBuffer);

    } catch (error) {
        console.error('[PDF] Generation failed:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}
