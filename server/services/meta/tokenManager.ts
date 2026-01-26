import { getMetaDb } from './metaDb.js';
import axios from 'axios';
import { MetaTokenResponse } from './types.js';
import crypto from 'crypto';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/auth/meta/callback';
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

export class TokenManager {
    static generateState(): string {
        return crypto.randomUUID();
    }

    static validateState(receivedState: string, storedState: string): boolean {
        return receivedState === storedState;
    }

    static getAuthUrl(state: string): string {
        const scopes = ['ads_read', 'read_insights']; // Add 'ads_management' if needed later
        const encodedRedirectUri = encodeURIComponent(META_REDIRECT_URI);
        return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodedRedirectUri}&state=${state}&scope=${scopes.join(',')}`;
    }

    static async exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
        try {
            const response = await axios.get(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`, {
                params: {
                    client_id: META_APP_ID,
                    redirect_uri: META_REDIRECT_URI,
                    client_secret: META_APP_SECRET,
                    code: code
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Meta Token Exchange Error:', error.response?.data || error.message);
            throw new Error('Failed to exchange Meta token');
        }
    }

    static async getLongLivedToken(shortLivedToken: string): Promise<string> {
        try {
            const response = await axios.get(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: META_APP_ID,
                    client_secret: META_APP_SECRET,
                    fb_exchange_token: shortLivedToken
                }
            });
            return response.data.access_token;
        } catch (error: any) {
            console.warn('Failed to exchange for long-lived token, using short-lived one:', error.message);
            return shortLivedToken;
        }
    }

    static async refreshLongLivedToken(currentLongToken: string): Promise<MetaTokenResponse> {
        try {
            const response = await axios.get(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: META_APP_ID,
                    client_secret: META_APP_SECRET,
                    fb_exchange_token: currentLongToken
                }
            });
            return response.data; // { access_token, token_type, expires_in }
        } catch (error: any) {
            console.error('Meta Token Refresh Error:', error.response?.data || error.message);
            throw new Error('Failed to refresh Meta token');
        }
    }

    // SQLite storage for tokens
    static storeUserToken(userId: string, accessToken: string, expiresIn?: number, refreshToken?: string) {
        const db = getMetaDb();
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO authorized_users 
            (user_id, access_token, token_expires_at, refresh_token, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        // Calculate expiry timestamp
        const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;

        stmt.run(userId, accessToken, expiresAt, refreshToken);
    }

    static getAccessToken(userId: string): string | null {
        const db = getMetaDb();
        const row = db.prepare('SELECT access_token FROM authorized_users WHERE user_id = ?').get(userId) as any;
        return row ? row.access_token : null;
    }

    static deleteToken(userId: string): void {
        const db = getMetaDb();
        db.prepare('DELETE FROM authorized_users WHERE user_id = ?').run(userId);
    }
}
