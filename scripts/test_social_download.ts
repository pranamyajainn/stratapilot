
import { getSocialDownloader } from '../server/services/socialDownloader';

// Mock console.log to see output clearly
const originalLog = console.log;
console.log = (...args) => originalLog('[TEST]', ...args);

async function runTest() {
    console.log('Starting SocialDownloader Test...');

    // We'll test with a known "safe" URL that might not have a video but will test navigation
    // Or a sample public video if standard. 
    // Since we don't have a guaranteed permanent TikTok URL, we will test the *navigation* and *failure* (graceful) 
    // or success if we had a link. 
    // Let's use a dummy generic URL to prove Puppeteer launches and navigation happens.
    const testUrl = process.argv[2] || 'https://www.tiktok.com/@tiktok/video/7321685374465543457'; // Sample official generic link

    console.log(`Testing with URL: ${testUrl}`);

    try {
        const downloader = getSocialDownloader();
        const directUrl = await downloader.getVideoDirectUrl(testUrl);

        if (directUrl) {
            console.log('SUCCESS: Extracted Direct URL:', directUrl);
        } else {
            console.log('RESULT: No video found (Expected if URL is expired/invalid, but Puppeteer ran).');
        }
    } catch (error: any) {
        console.error('ERROR:', error);
    }
}

runTest();
