import puppeteer from 'puppeteer';

export class SocialDownloader {
    /**
     * Extract direct video URL from a social media page
     */
    async getVideoDirectUrl(url: string): Promise<string | null> {
        console.log(`[SocialDownloader] Processing URL: ${url}`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Set stealthy user agent
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            await page.setViewport({ width: 1280, height: 800 });

            console.log('[SocialDownloader] Navigating to page...');

            let targetUrl = url;
            // INSTAGRAM STRATEGY: Use Embed URL to bypass login wall
            if (url.includes('instagram.com')) {
                const match = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
                if (match && match[1]) {
                    targetUrl = `https://www.instagram.com/p/${match[1]}/embed/captioned`;
                    console.log(`[SocialDownloader] Detected Instagram. Using Embed URL: ${targetUrl}`);
                }
            }

            // Go to URL and wait for network idle to ensure dynamic content loads
            // Instagram often redirects to login, so we check title
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            const title = await page.title();
            console.log(`[SocialDownloader] Page Title: ${title}`);

            // Strategy 1: Look for OpenGraph Video
            console.log('[SocialDownloader] Strategy 1: OpenGraph');
            const ogVideo = await page.evaluate(() => {
                const meta = document.querySelector('meta[property="og:video"]') ||
                    document.querySelector('meta[property="og:video:secure_url"]');
                return meta ? meta.getAttribute('content') : null;
            });

            if (ogVideo) {
                console.log('[SocialDownloader] Found OG Video URL');
                return ogVideo;
            }

            // Strategy 2: Look for Video Tag
            console.log('[SocialDownloader] Strategy 2: Video Tag');
            // Wait for video tag if not present immediately
            try {
                await page.waitForSelector('video', { timeout: 5000 });
            } catch (e) {
                console.log('[SocialDownloader] No video tag found after wait.');
            }

            const videoSrc = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video ? video.src : null;
            });

            if (videoSrc) {
                console.log('[SocialDownloader] Found Video Tag Src');
                return videoSrc;
            }

            // Strategy 3: Specialized Selectors (TikTok/Insta specific fallbacks)
            console.log('[SocialDownloader] Strategy 3: Specialized Selectors');
            const specializedSrc = await page.evaluate(() => {
                // TikTok specific
                const tiktokVideo = document.querySelector('div[data-e2e="video-container"] video');
                if (tiktokVideo && (tiktokVideo as HTMLVideoElement).src) return (tiktokVideo as HTMLVideoElement).src;

                return null;
            });

            if (specializedSrc) {
                console.log('[SocialDownloader] Found Specialized Video Src');
                return specializedSrc;
            }

            console.warn('[SocialDownloader] Failed to find video URL');
            return null;

        } catch (error: any) {
            console.error(`[SocialDownloader] Error extracting video: ${error.message}`);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}

// Singleton
let instance: SocialDownloader | null = null;

export function getSocialDownloader(): SocialDownloader {
    if (!instance) {
        instance = new SocialDownloader();
    }
    return instance;
}
