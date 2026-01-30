import puppeteer from 'puppeteer';

/**
 * Generate PDF by navigating Puppeteer to the print route
 * Uses Puppeteer's native header/footer templates for proper positioning
 */
export async function generatePdfFromPrintRoute(token: string): Promise<Buffer> {
    try {
        console.log('[PDF_STEP_1] Launching headless browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('[PDF_STEP_2] Browser launched successfully');

        try {
            console.log('[PDF_STEP_3] Creating new page...');
            const page = await browser.newPage();
            console.log('[PDF_STEP_4] New page created');

            const port = process.env.PORT || 3000;
            const url = `http://localhost:${port}/report/print?token=${token}`;
            console.log('[PDF_STEP_5] Starting navigation to: ' + url);
            console.log(`[PDF_DEBUG] Token (first 8 chars): ${token.substring(0, 8)}`);

            // Capture browser console for debugging
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.error('[PDF_BROWSER_ERROR]', msg.text());
                }
            });
            page.on('pageerror', err => {
                console.error('[PDF_PAGE_ERROR]', (err as Error).message);
            });

            // Navigate to the print route on localhost:3000
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            console.log('[PDF_STEP_6] Navigation completed successfully (networkidle0)');

            console.log('[PDF_STEP_7] Waiting for printReady signal...');

            // Wait for the print route to signal it's ready
            await page.waitForFunction(
                () => (window as any).printReady === true,
                { timeout: 60000 }
            );
            console.log('[PDF_STEP_8] printReady signal received');

            console.log('[PDF_STEP_9] Emulating print media type...');
            await page.emulateMediaType('print');
            console.log('[PDF_STEP_10] Print media type emulated');

            // Professional Header Template
            const headerTemplate = `
                <div style="width: 100%; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                            display: flex; justify-content: space-between; align-items: center;
                            padding: 8px 40px; border-bottom: 2px solid #e2e8f0; font-size: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 700; color: #1e293b; letter-spacing: 0.02em;">StrataPilot AI</span>
                    </div>
                    <div style="font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px;">
                        Ad Diagnostic Report
                    </div>
                </div>
            `;

            // Professional Footer Template with Page Numbers
            const footerTemplate = `
                <div style="width: 100%; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                            display: flex; justify-content: space-between; align-items: center;
                            padding: 8px 40px; border-top: 1px solid #f1f5f9; font-size: 8px;">
                    <div style="font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">
                        Confidential • Internal Use Only
                    </div>
                    <div style="font-weight: 500; color: #94a3b8;">
                        © 2025 StrataPilot AI — A Strata7 Consulting LLP Product
                    </div>
                    <div style="font-weight: 600; color: #64748b;">
                        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                    </div>
                </div>
            `;

            console.log('[PDF_STEP_11] Starting PDF generation with header/footer...');
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate,
                margin: {
                    top: '30mm',      // Increased space for header
                    right: '15mm',
                    bottom: '22mm',   // Space for footer
                    left: '15mm'
                }
            });
            console.log(`[PDF_STEP_12] PDF generation complete: ${pdfBuffer.length} bytes`);

            return Buffer.from(pdfBuffer);

        } finally {
            console.log('[PDF_STEP_13] Closing browser...');
            await browser.close();
            console.log('[PDF_STEP_14] Browser closed successfully');
        }
    } catch (err) {
        console.error('[PDF_FATAL] Error in PDF generation pipeline:', err);
        console.error('[PDF_FATAL] Error stack:', (err as Error).stack);
        console.error('[PDF_FATAL] Error message:', (err as Error).message);
        throw err;
    }
}

// Keep old export for backward compatibility during transition
export async function generatePdfReport(data: any): Promise<Buffer> {
    throw new Error('Legacy PDF generation disabled. Use print route instead.');
}
