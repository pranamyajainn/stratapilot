import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '../data/insights.db');

// Initialize database
let db: Database.Database;

export function initDatabase(): void {
    db = new Database(DB_PATH);

    // Create insights table
    db.exec(`
        CREATE TABLE IF NOT EXISTS insights (
            id TEXT PRIMARY KEY,
            content_hash TEXT NOT NULL,
            analysis_label TEXT NOT NULL,
            industry TEXT DEFAULT 'Other',
            genre TEXT DEFAULT 'Unknown',
            brand TEXT DEFAULT 'Unknown',
            source_url TEXT,
            analysis TEXT NOT NULL,
            tags TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            last_accessed_at TEXT NOT NULL,
            access_count INTEGER DEFAULT 1,
            UNIQUE(content_hash, analysis_label)
        );
        
        CREATE INDEX IF NOT EXISTS idx_content_hash ON insights(content_hash);
        CREATE INDEX IF NOT EXISTS idx_industry ON insights(industry);
        CREATE INDEX IF NOT EXISTS idx_brand ON insights(brand);
    `);

    console.log('[INSIGHT DB] Database initialized at', DB_PATH);
}

export interface InsightRecord {
    id: string;
    content_hash: string;
    analysis_label: string;
    industry: string;
    genre: string;
    brand: string;
    source_url?: string;
    analysis: any;
    tags: string[];
    created_at: string;
    last_accessed_at: string;
    access_count: number;
}

export function getInsightByHash(contentHash: string, analysisLabel: string): InsightRecord | null {
    const stmt = db.prepare(`
        SELECT * FROM insights 
        WHERE content_hash = ? AND analysis_label = ?
    `);
    const row = stmt.get(contentHash, analysisLabel) as any;

    if (!row) return null;

    return {
        ...row,
        analysis: JSON.parse(row.analysis),
        tags: JSON.parse(row.tags)
    };
}

export function saveInsight(record: InsightRecord): void {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO insights 
        (id, content_hash, analysis_label, industry, genre, brand, source_url, analysis, tags, created_at, last_accessed_at, access_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        record.id,
        record.content_hash,
        record.analysis_label,
        record.industry,
        record.genre,
        record.brand,
        record.source_url || null,
        JSON.stringify(record.analysis),
        JSON.stringify(record.tags),
        record.created_at,
        record.last_accessed_at,
        record.access_count
    );
}

export function updateAccessTime(id: string): void {
    const stmt = db.prepare(`
        UPDATE insights 
        SET last_accessed_at = ?, access_count = access_count + 1
        WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
}

export function getInsightsByIndustry(industry: string, limit: number = 50): InsightRecord[] {
    const stmt = db.prepare(`
        SELECT * FROM insights 
        WHERE industry = ?
        ORDER BY access_count DESC, last_accessed_at DESC
        LIMIT ?
    `);
    const rows = stmt.all(industry, limit) as any[];

    return rows.map(row => ({
        ...row,
        analysis: JSON.parse(row.analysis),
        tags: JSON.parse(row.tags)
    }));
}

export function getInsightsByBrand(brand: string): InsightRecord[] {
    const stmt = db.prepare(`
        SELECT * FROM insights 
        WHERE brand LIKE ?
        ORDER BY created_at DESC
    `);
    const rows = stmt.all(`%${brand}%`) as any[];

    return rows.map(row => ({
        ...row,
        analysis: JSON.parse(row.analysis),
        tags: JSON.parse(row.tags)
    }));
}

export function getInsightStats(): { total: number; byIndustry: Record<string, number> } {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM insights');
    const total = (totalStmt.get() as any).count;

    const industryStmt = db.prepare('SELECT industry, COUNT(*) as count FROM insights GROUP BY industry');
    const industryRows = industryStmt.all() as any[];

    const byIndustry: Record<string, number> = {};
    industryRows.forEach(row => {
        byIndustry[row.industry] = row.count;
    });

    return { total, byIndustry };
}
