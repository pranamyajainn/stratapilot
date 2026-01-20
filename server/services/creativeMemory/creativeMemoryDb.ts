/**
 * Creative Memory Database
 * SQLite schema and initialization for the Comparative Creative Memory Layer
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location (same directory as insights.db)
const DB_PATH = path.join(__dirname, '..', '..', 'creative_memory.db');

let db: Database.Database | null = null;

/**
 * Initialize the Creative Memory database with required tables
 */
export function initCreativeMemoryDatabase(): Database.Database {
    if (db) return db;

    console.log('[CreativeMemory] Initializing database at:', DB_PATH);

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Table: creatives - Stores normalized creative objects
    db.exec(`
    CREATE TABLE IF NOT EXISTS creatives (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_tier INTEGER NOT NULL,
      advertiser_name TEXT NOT NULL,
      advertiser_id TEXT,
      advertiser_domain TEXT,
      industry TEXT NOT NULL,
      niche TEXT,
      category TEXT,
      format TEXT NOT NULL,
      platforms TEXT NOT NULL,
      regions TEXT NOT NULL,
      signals TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      source_url TEXT,
      content_hash TEXT,
      indexed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      
      -- Indexes for fast lookups
      UNIQUE(content_hash)
    );
    
    CREATE INDEX IF NOT EXISTS idx_creatives_industry ON creatives(industry);
    CREATE INDEX IF NOT EXISTS idx_creatives_niche ON creatives(niche);
    CREATE INDEX IF NOT EXISTS idx_creatives_source ON creatives(source);
    CREATE INDEX IF NOT EXISTS idx_creatives_expires ON creatives(expires_at);
    CREATE INDEX IF NOT EXISTS idx_creatives_industry_niche ON creatives(industry, niche);
  `);

    // Table: pattern_distributions - Cached aggregated patterns
    db.exec(`
    CREATE TABLE IF NOT EXISTS pattern_distributions (
      id TEXT PRIMARY KEY,
      industry TEXT NOT NULL,
      niche TEXT NOT NULL,
      region TEXT NOT NULL,
      sample_size INTEGER NOT NULL,
      hook_distribution TEXT NOT NULL,
      cta_distribution TEXT NOT NULL,
      format_distribution TEXT NOT NULL,
      visual_style_distribution TEXT NOT NULL,
      dominant_patterns TEXT NOT NULL,
      saturated_patterns TEXT NOT NULL,
      underutilized_patterns TEXT NOT NULL,
      tier1_percentage REAL NOT NULL,
      generated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      
      UNIQUE(industry, niche, region)
    );
    
    CREATE INDEX IF NOT EXISTS idx_patterns_industry ON pattern_distributions(industry);
    CREATE INDEX IF NOT EXISTS idx_patterns_expires ON pattern_distributions(expires_at);
  `);

    // Table: ingestion_log - Track ingestion runs
    db.exec(`
    CREATE TABLE IF NOT EXISTS ingestion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      industry TEXT NOT NULL,
      niche TEXT,
      region TEXT,
      creatives_ingested INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_ingestion_source ON ingestion_log(source);
    CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_log(status);
  `);

    // Table: niche_mappings - Custom industry-to-niche mappings learned over time
    db.exec(`
    CREATE TABLE IF NOT EXISTS niche_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry TEXT NOT NULL,
      niche TEXT NOT NULL,
      keywords TEXT NOT NULL,
      sample_count INTEGER DEFAULT 0,
      last_updated TEXT NOT NULL,
      
      UNIQUE(industry, niche)
    );
  `);

    console.log('[CreativeMemory] Database initialized successfully');

    return db;
}

/**
 * Get the database instance (initializes if needed)
 */
export function getCreativeMemoryDb(): Database.Database {
    if (!db) {
        return initCreativeMemoryDatabase();
    }
    return db;
}

/**
 * Close the database connection
 */
export function closeCreativeMemoryDb(): void {
    if (db) {
        db.close();
        db = null;
        console.log('[CreativeMemory] Database connection closed');
    }
}

/**
 * Clean up expired records
 */
export function cleanupExpiredRecords(): { creativesDeleted: number; patternsDeleted: number } {
    const database = getCreativeMemoryDb();
    const now = new Date().toISOString();

    const creativesResult = database.prepare(`
    DELETE FROM creatives WHERE expires_at < ?
  `).run(now);

    const patternsResult = database.prepare(`
    DELETE FROM pattern_distributions WHERE expires_at < ?
  `).run(now);

    const result = {
        creativesDeleted: creativesResult.changes,
        patternsDeleted: patternsResult.changes,
    };

    if (result.creativesDeleted > 0 || result.patternsDeleted > 0) {
        console.log('[CreativeMemory] Cleanup:', result);
    }

    return result;
}

/**
 * Get database statistics
 */
export function getCreativeMemoryStats(): {
    totalCreatives: number;
    totalPatterns: number;
    creativesBySource: Record<string, number>;
    creativesByIndustry: Record<string, number>;
} {
    const database = getCreativeMemoryDb();

    const totalCreatives = database.prepare(`
    SELECT COUNT(*) as count FROM creatives
  `).get() as { count: number };

    const totalPatterns = database.prepare(`
    SELECT COUNT(*) as count FROM pattern_distributions
  `).get() as { count: number };

    const bySource = database.prepare(`
    SELECT source, COUNT(*) as count FROM creatives GROUP BY source
  `).all() as { source: string; count: number }[];

    const byIndustry = database.prepare(`
    SELECT industry, COUNT(*) as count FROM creatives GROUP BY industry
  `).all() as { industry: string; count: number }[];

    return {
        totalCreatives: totalCreatives.count,
        totalPatterns: totalPatterns.count,
        creativesBySource: Object.fromEntries(bySource.map(r => [r.source, r.count])),
        creativesByIndustry: Object.fromEntries(byIndustry.map(r => [r.industry, r.count])),
    };
}
