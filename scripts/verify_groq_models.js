import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found in .env');
    process.exit(1);
}

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
});

const TARGET_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen/qwen3-32b'
];

async function verifyModels() {
    console.log('🔍 Fetching available models from Groq...');

    let availableModels = [];
    try {
        const list = await client.models.list();
        availableModels = list.data.map(m => m.id);
        console.log(`✅ Found ${availableModels.length} available models on Groq.`);
        console.log('Available Models:', JSON.stringify(availableModels, null, 2));
    } catch (err) {
        console.error('❌ Failed to list models:', err.message);
        return;
    }

    console.log('\n--- MODEL AVAILABILITY AUDIT ---');
    console.table(TARGET_MODELS.map(target => {
        const exists = availableModels.includes(target);
        return {
            'Target Model ID': target,
            'Status': exists ? '✅ AVAILABLE' : '❌ MISSING',
            'Action': exists ? 'None' : 'CRITICAL: FIX ID'
        };
    }));

    // If missing, try to find close matches
    const missing = TARGET_MODELS.filter(m => !availableModels.includes(m));
    if (missing.length > 0) {
        console.log('\n--- POTENTIAL MATCHES FOR MISSING MODELS ---');
        missing.forEach(m => {
            const match = availableModels.find(am => am.includes(m.split('-')[0]) || am.includes(m.split('/')[1] || ''));
            if (match) {
                console.log(`❓ For '${m}', did you mean '${match}'?`);
            } else {
                // List Qwen models if Qwen search failed
                if (m.includes('qwen')) {
                    const qwenModels = availableModels.filter(am => am.toLowerCase().includes('qwen'));
                    console.log(`❓ All Qwen models found: ${qwenModels.join(', ')}`);
                }
            }
        });
    }

    console.log('\n--- FUNCTIONAL TEST (Sample Generation) ---');
    // Test a reliable one and a deepseek one
    const testSubset = availableModels.includes('deepseek-r1-distill-llama-70b')
        ? ['llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b']
        : ['llama-3.1-8b-instant'];

    for (const model of testSubset) {
        process.stdout.write(`Testing generation on ${model}... `);
        try {
            const completion = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: 'Say hello.' }],
                max_tokens: 10
            });
            console.log('✅ SUCCESS');
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
}

verifyModels();
