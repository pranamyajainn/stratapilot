import crypto from 'crypto';

/**
 * Generate SHA-256 hash of content for deduplication
 */
export function generateContentHash(content: Buffer | string): string {
    if (typeof content === 'string') {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate hash from URL with weekly bucket for freshness
 * URLs are refreshed weekly to ensure data stays current
 */
export function generateUrlHash(url: string): string {
    const weekBucket = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return generateContentHash(`${url}::${weekBucket}`);
}

/**
 * Generate hash from base64 file data
 */
export function generateFileHash(base64Data: string): string {
    return generateContentHash(base64Data);
}
