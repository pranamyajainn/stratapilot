import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - assuming /server/data exists near other DBs
const DB_PATH = path.join(__dirname, '../../data/ga4.db'); // server/services/ga4/../../data -> server/data

let db: Database.Database;

export function initGA4Database(): void {
    const dataDir = path.dirname(DB_PATH);

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // 1. ga4_connections table
    db.exec(`
        CREATE TABLE IF NOT EXISTS ga4_connections (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            property_id TEXT,
            property_display_name TEXT,
            account_id TEXT,
            refresh_token_encrypted TEXT NOT NULL,
            scopes TEXT NOT NULL,
            revenue_allowed BOOLEAN DEFAULT 0,
            timezone TEXT DEFAULT 'UTC',
            currency TEXT DEFAULT 'USD',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id)
        );
    `);

    // 2. ga4_cache table
    db.exec(`
        CREATE TABLE IF NOT EXISTS ga4_cache (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            report_key TEXT NOT NULL, 
            range_days INTEGER NOT NULL,
            payload_json TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            UNIQUE(user_id, property_id, report_key, range_days)
        );
    `);

    // 3. audit_logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT NOT NULL
        );
    `);

    console.log('[GA4 DB] Database initialized at', DB_PATH);
}

// --- TYPES ---
export interface GA4Connection {
    id: string;
    user_id: string;
    property_id?: string;
    property_display_name?: string;
    account_id?: string;
    refresh_token_encrypted: string;
    scopes: string;
    revenue_allowed: boolean;
    timezone: string;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface GA4CacheEntry {
    id: string;
    user_id: string;
    property_id: string;
    report_key: string;
    range_days: number;
    payload_json: string;
    fetched_at: string;
    expires_at: string;
}

// --- OPERATIONS ---

// Connections
export function upsertConnection(conn: GA4Connection): void {
    const stmt = db.prepare(`
        INSERT INTO ga4_connections 
        (id, user_id, property_id, property_display_name, account_id, refresh_token_encrypted, scopes, revenue_allowed, timezone, currency, created_at, updated_at)
        VALUES (@id, @user_id, @property_id, @property_display_name, @account_id, @refresh_token_encrypted, @scopes, @revenue_allowed, @timezone, @currency, @created_at, @updated_at)
        ON CONFLICT(user_id) DO UPDATE SET
            property_id = excluded.property_id,
            property_display_name = excluded.property_display_name,
            account_id = excluded.account_id,
            refresh_token_encrypted = excluded.refresh_token_encrypted,
            scopes = excluded.scopes,
            revenue_allowed = excluded.revenue_allowed,
            timezone = excluded.timezone,
            currency = excluded.currency,
            updated_at = excluded.updated_at
    `);
    const params = {
        property_id: null,
        property_display_name: null,
        account_id: null,
        ...conn,
        revenue_allowed: conn.revenue_allowed ? 1 : 0
    };
    stmt.run(params);
}

export function getConnection(userId: string): GA4Connection | undefined {
    const stmt = db.prepare('SELECT * FROM ga4_connections WHERE user_id = ?');
    const res = stmt.get(userId) as any;
    return res ? { ...res, revenue_allowed: Boolean(res.revenue_allowed) } : undefined;
}

export function deleteConnection(userId: string): void {
    const stmt = db.prepare('DELETE FROM ga4_connections WHERE user_id = ?');
    stmt.run(userId);
    // Also clear cache for this user
    db.prepare('DELETE FROM ga4_cache WHERE user_id = ?').run(userId);
}

export function updatePropertySelection(userId: string, propertyId: string, displayName: string, timezone: string, currency: string): void {
    const stmt = db.prepare(`
        UPDATE ga4_connections 
        SET property_id = ?, property_display_name = ?, timezone = ?, currency = ?, updated_at = ?
        WHERE user_id = ?
    `);
    stmt.run(propertyId, displayName, timezone, currency, new Date().toISOString(), userId);
}

export function updateConsent(userId: string, revenueAllowed: boolean): void {
    const stmt = db.prepare(`
        UPDATE ga4_connections 
        SET revenue_allowed = ?, updated_at = ?
        WHERE user_id = ?
    `);
    stmt.run(revenueAllowed ? 1 : 0, new Date().toISOString(), userId);
}

// Cache
export function getCachedReport(userId: string, propertyId: string, reportKey: string, rangeDays: number): GA4CacheEntry | undefined {
    const stmt = db.prepare(`
        SELECT * FROM ga4_cache 
        WHERE user_id = ? AND property_id = ? AND report_key = ? AND range_days = ?
    `);
    return stmt.get(userId, propertyId, reportKey, rangeDays) as GA4CacheEntry | undefined;
}

export function setCachedReport(entry: GA4CacheEntry): void {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO ga4_cache
        (id, user_id, property_id, report_key, range_days, payload_json, fetched_at, expires_at)
        VALUES (@id, @user_id, @property_id, @report_key, @range_days, @payload_json, @fetched_at, @expires_at)
    `);
    stmt.run(entry);
}

// Audit
export function logAudit(id: string, userId: string, action: string, details: any): void {
    const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, action, JSON.stringify(details), new Date().toISOString());
}
