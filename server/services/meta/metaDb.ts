import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - separate DB for Meta Ads to keep things clean
const DB_PATH = path.join(__dirname, '../../data/meta_ads.db');

let db: Database.Database;

export function initMetaDatabase(): void {
    db = new Database(DB_PATH);
    console.log('[META DB] Database initialized at', DB_PATH);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // --- Auth & Config Tables ---

    // authorized_users: Maps app user to Meta tokens
    db.exec(`
        CREATE TABLE IF NOT EXISTS authorized_users (
            user_id TEXT PRIMARY KEY, 
            meta_user_id TEXT,
            access_token TEXT NOT NULL,
            token_expires_at INTEGER,
            refresh_token TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // ad_accounts: Accounts discovered/linked for a user
    db.exec(`
        CREATE TABLE IF NOT EXISTS ad_accounts (
            id TEXT PRIMARY KEY, -- act_{id}
            account_id TEXT NOT NULL, -- just the number
            name TEXT,
            currency TEXT,
            timezone_name TEXT,
            timezone_id INTEGER,
            account_status INTEGER,
            disable_reason INTEGER,
            linked_by_user_id TEXT, -- The app user who linked this
            is_sync_enabled INTEGER DEFAULT 0,
            last_synced_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(linked_by_user_id) REFERENCES authorized_users(user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_ad_accounts_user ON ad_accounts(linked_by_user_id);
    `);

    // consents: granular permissions per account
    db.exec(`
        CREATE TABLE IF NOT EXISTS consents (
            account_id TEXT PRIMARY KEY,
            allow_spend INTEGER DEFAULT 0,
            allow_conversions INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES ad_accounts(id)
        );
    `);

    // --- Entity Tables ---

    db.exec(`
        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY, 
            account_id TEXT,
            name TEXT,
            status TEXT,
            objective TEXT,
            start_time TEXT,
            stop_time TEXT,
            effective_status TEXT,
            updated_time TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES ad_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(account_id);

        CREATE TABLE IF NOT EXISTS ad_sets (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            campaign_id TEXT,
            name TEXT,
            status TEXT,
            optimization_goal TEXT,
            start_time TEXT,
            end_time TEXT,
            updated_time TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES ad_accounts(id),
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
        );
        CREATE INDEX IF NOT EXISTS idx_adsets_campaign ON ad_sets(campaign_id);

        CREATE TABLE IF NOT EXISTS ads (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            campaign_id TEXT,
            adset_id TEXT,
            name TEXT,
            status TEXT,
            creative_id TEXT,
            updated_time TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES ad_accounts(id),
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
            FOREIGN KEY(adset_id) REFERENCES ad_sets(id)
        );
        CREATE INDEX IF NOT EXISTS idx_ads_adset ON ads(adset_id);
    `);

    // ad_creatives: detailed creative metadata
    db.exec(`
        CREATE TABLE IF NOT EXISTS ad_creatives (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            name TEXT,
            object_type TEXT,
            thumbnail_url TEXT,
            image_url TEXT,
            video_id TEXT,
            title TEXT,
            body TEXT,
            call_to_action_type TEXT,
            link_url TEXT,
            instagram_actor_id TEXT,
            page_id TEXT,
            fingerprint TEXT, -- Hash to detect changes
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // --- Metrics Tables ---

    // insights_daily: aggregated metrics
    db.exec(`
        CREATE TABLE IF NOT EXISTS insights_daily (
            id TEXT PRIMARY KEY, -- composed key: scope_id + date
            scope_level TEXT, -- 'ad', 'adset', 'campaign', 'account'
            scope_id TEXT,
            account_id TEXT,
            date_start TEXT,
            date_stop TEXT,
            
            impressions INTEGER,
            spend REAL,
            reach INTEGER,
            frequency REAL,
            clicks INTEGER,
            unique_clicks INTEGER,
            ctr REAL,
            cpc REAL,
            cpm REAL,
            
            inline_link_clicks INTEGER,
            landing_page_views INTEGER,
            
            video_p25_watched_actions INTEGER,
            video_p50_watched_actions INTEGER,
            video_p75_watched_actions INTEGER,
            video_p100_watched_actions INTEGER,
            video_3_sec_watched_actions INTEGER,
            video_avg_time_watched_actions INTEGER,
            
            actions_json TEXT, -- All actions (likes, comments, etc)
            conversions_json TEXT, -- Purchase, Lead, etc. mappings
            
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_insights_scope_date ON insights_daily(scope_id, date_start);
    `);

    // --- System Tables ---

    // sync_runs: audit log of sync jobs
    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_runs (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            mode TEXT, -- 'ON_DEMAND', 'SCHEDULED', 'BACKFILL'
            status TEXT, -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
            started_at TEXT,
            finished_at TEXT,
            records_processed INTEGER DEFAULT 0,
            error_message TEXT,
            params_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sync_runs_account ON sync_runs(account_id, started_at DESC);
    `);
}

export function getMetaDb(): Database.Database {
    if (!db) {
        throw new Error('Meta Database not initialized. Call initMetaDatabase() first.');
    }
    return db;
}
