import { initGA4Database, upsertConnection, getConnection, logAudit } from '../server/services/ga4/ga4Db';
import { encrypt, decrypt } from '../server/utils/encryption';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Mock Env
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATA_DIR = path.join(process.cwd(), 'data');

async function runVerification() {
    console.log('--- GA4 Integration Verification ---');

    // 1. Database Init
    console.log('[1] Initializing Database...');
    if (!fs.existsSync(process.env.DATA_DIR)) {
        fs.mkdirSync(process.env.DATA_DIR);
    }
    initGA4Database();
    console.log('✅ Database initialized.');

    // 2. Encryption Test
    console.log('\n[2] Testing Encryption...');
    const originalText = 'my-secret-token-123';
    const encrypted = encrypt(originalText);
    const decrypted = decrypt(encrypted);

    if (decrypted === originalText) {
        console.log('✅ Encryption/Decryption working.');
    } else {
        console.error('❌ Encryption failed!', { original: originalText, decrypted });
        process.exit(1);
    }

    // 3. Database Operations
    console.log('\n[3] Testing Database Operations...');
    const userId = 'test-user-' + Date.now();
    const connectionId = uuidv4();

    // Insert
    upsertConnection({
        id: connectionId,
        user_id: userId,
        refresh_token_encrypted: encrypted,
        scopes: JSON.stringify(['scope1']),
        revenue_allowed: true,
        timezone: 'UTC',
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // Read
    const conn = getConnection(userId);
    if (conn && conn.user_id === userId && conn.currency === 'USD') {
        console.log('✅ Connection inserted and retrieved.');
    } else {
        console.error('❌ Failed to retrieve connection', conn);
        process.exit(1);
    }

    // Audit Log
    logAudit(uuidv4(), userId, 'TEST_ACTION', { foo: 'bar' });
    console.log('✅ Audit log entry created.');

    console.log('\n--- Verification SUCCESS ---');
}

runVerification().catch(e => {
    console.error('Verification Script Failed:', e);
    process.exit(1);
});
