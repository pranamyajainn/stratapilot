
import dotenv from 'dotenv';
dotenv.config();

import { GroqStrategicAnalyzer } from '../server/services/groqAnalyzer.js';
import type { VisualFeatures } from '../server/services/llmRouter/types.js';

// ==========================================================
// INVARIANT VALIDATOR
// ==========================================================

class DiagnosticValidator {
    static validate(diagnostics: any[]) {
        const errors: string[] = [];

        diagnostics.forEach((d, index) => {
            const context = `Diagnostic[${index}] (${d.metric}):`;

            // 1️⃣ MATH SAFETY INVARIANT
            if (typeof d.score !== 'number' || isNaN(d.score)) {
                errors.push(`${context} Score must be a valid number. Got ${d.score}`);
            }

            // 2️⃣ CONFIDENCE INVARIANT & PARSING
            const confidenceMatch = d.commentary.match(/^Confidence:\s*(HIGH|MEDIUM|LOW)/i);
            if (!confidenceMatch) {
                errors.push(`${context} Commentary MUST start with "Confidence: [HIGH|MEDIUM|LOW]". Got: "${d.commentary.substring(0, 30)}..."`);
            }
            const confidenceLevel = confidenceMatch ? confidenceMatch[1].toUpperCase() : 'UNKNOWN';

            // 3️⃣ EVIDENCE INVARIANT
            // Heuristic: Count concrete references or check for "insufficient"
            const hasConcreteEvidence = this.checkConcreteEvidence(d.subInsights);

            if (confidenceLevel === 'LOW') {
                // If LOW, must state limitation
                const mentionsLimitation =
                    d.commentary.toLowerCase().includes('limit') ||
                    d.commentary.toLowerCase().includes('insufficient') ||
                    d.commentary.toLowerCase().includes('missing') ||
                    d.subInsights.some((s: string) => s.toLowerCase().includes('insufficient') || s.toLowerCase().includes('missing'));

                if (!mentionsLimitation) {
                    errors.push(`${context} Confidence is LOW but no limitation/insufficiency explicitly stated.`);
                }
            } else {
                // If HIGH/MEDIUM, must have concrete evidence
                if (!hasConcreteEvidence) {
                    errors.push(`${context} Confidence is ${confidenceLevel} but failed Evidence Invariant (fewer than 2 concrete observation markers found).`);
                }
            }

            // 4️⃣ GENERICITY INVARIANT
            if (this.isGeneric(d.commentary) && !hasConcreteEvidence) {
                errors.push(`${context} Commentary flagged as GENERIC fluff without concrete backing.`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`\n❌ INVARIANT VIOLATIONS FOUND:\n${errors.join('\n')}`);
        }
        console.log(`✅ Passed all invariants (${diagnostics.length} diagnostics checked).`);
    }

    private static checkConcreteEvidence(subInsights: string[]): boolean {
        // Strict Mode: Check for "Evidence X:" prefix OR concrete Regex
        // The prompt asks for "commentary MUST reference >= 2 concrete observations". 
        // We proxy this by checking subInsights which feed the commentary.

        let evidenceCount = 0;
        const concreteRegex = /\d+|red|blue|green|yellow|black|white|orange|purple|logo|cta|button|text|overlay|transition|cut|pace|music|audio|voiceover|scene|shot|frame|seconds|0:|1:|top|bottom|left|right|center/i;

        subInsights.forEach(insight => {
            // Check for explicit "Evidence" label or concrete keywords
            if (insight.match(/^Evidence/i) || insight.match(concreteRegex)) {
                evidenceCount++;
            }
        });

        return evidenceCount >= 2;
    }

    private static isGeneric(text: string): boolean {
        const bannedPhrases = [
            /engaging content/i,
            /good visuals/i,
            /strong branding/i,
            /professional look/i,
            /clean design/i
        ];

        // If it contains a banned phrase AND lacks concrete numbers/timestamps, it's generic
        const hasBanned = bannedPhrases.some(regex => regex.test(text));
        const hasConcrete = /\d|:|logo|text|cta/i.test(text);

        return hasBanned && !hasConcrete;
    }
}

// ==========================================================
// TEST SUITE
// ==========================================================

async function runTests() {
    console.log('🔒 LOCKING VERIFIABLE DIAGNOSTICS: REGRESSION TEST SUITE\n');

    const analyzer = new GroqStrategicAnalyzer();

    // ---------------------------------------------------------
    // TEST 1: REAL HIGH CONTEXT ANALYSIS (Should PASS)
    // ---------------------------------------------------------
    console.log('Test 1: Running Real High-Context Analysis...');
    try {
        const highContextFeatures: VisualFeatures = {
            objects: ['Sports Car', 'Mountain Road', 'Driver', 'Logo'],
            scenes: ['Winding road at sunset', 'Close up of wheel'],
            colors: ['Red', 'Black'],
            composition: 'Dynamic',
            textOverlays: ['Speed Redefined'],
            transcript: 'Drive today.',
            audioMood: 'Energetic Rock',
            humanPresence: true,
            facialExpressions: ['Excited'],
            emotionalTone: ['Adrenaline'],
            logoDetected: true,
            logoPosition: 'Top Right',
            ctaText: 'Test Drive Now',
            ctaPlacement: 'End Card',
            creativeFormat: 'video_short',
            pacing: 'fast',
            transitions: ['Cut'],
            duration: 15,
            brandColors: ['Red'],
            aspectRatio: '16:9'
        };

        const result = await analyzer.analyze(
            highContextFeatures,
            "Car Launch",
            "Effectiveness"
        );

        DiagnosticValidator.validate(result.adDiagnostics);

    } catch (e: any) {
        console.error('❌ Test 1 FAILED:', e.message);
        process.exit(1);
    }

    // ---------------------------------------------------------
    // TEST 2: REAL LOW CONTEXT ANALYSIS (Should PASS via Low Confidence)
    // ---------------------------------------------------------
    console.log('\nTest 2: Running Real Low-Context Analysis...');
    try {
        const lowContextFeatures: VisualFeatures = {
            objects: [],
            scenes: [],
            colors: [],
            composition: 'unknown',
            textOverlays: [],
            transcript: '',
            audioMood: 'unknown',
            humanPresence: false,
            facialExpressions: [],
            emotionalTone: [],
            logoDetected: false,
            creativeFormat: 'unknown',
            pacing: 'unknown',
            transitions: [],
            brandColors: [],
            ctaText: undefined
        } as any;

        const result = await analyzer.analyze(
            lowContextFeatures,
            "Unknown",
            "Effectiveness"
        );

        DiagnosticValidator.validate(result.adDiagnostics);

    } catch (e: any) {
        console.error('❌ Test 2 FAILED:', e.message);
        process.exit(1);
    }

    // ---------------------------------------------------------
    // TEST 3: MANUFACTURER INVALID OUTPUT (Should FAIL)
    // ---------------------------------------------------------
    console.log('\nTest 3: Validating Invariant Enforcer (Expect Failures)...');

    const badDiagnostics = [
        {
            metric: "Bad Math",
            score: NaN, // Violation
            commentary: "Confidence: HIGH. Good stuff.",
            subInsights: ["Evidence: Logo"]
        },
        {
            metric: "Missing Confidence",
            score: 80,
            commentary: "This is a great ad.", // Violation
            subInsights: ["Evidence: Logo", "Evidence: Text"]
        },
        {
            metric: "Generic Fluff",
            score: 90,
            commentary: "Confidence: HIGH. Engaging content with good visuals.", // Violation (Generic + No Evidence)
            subInsights: ["It looks nice", "Very cool"]
        },
        {
            metric: "Fake High Confidence",
            score: 90,
            commentary: "Confidence: HIGH. We see things.",
            subInsights: ["Vague observation", "Another vague one"] // Violation (No concrete keywords)
        }
    ];

    try {
        DiagnosticValidator.validate(badDiagnostics);
        console.error('❌ Test 3 FAILED: Validator verified bad data as valid!');
        process.exit(1);
    } catch (e: any) {
        console.log('✅ Test 3 PASSED: Validator correctly caught violations.');
        console.log('   (Caught Error Summary):', e.message.split('\n')[1]); // Log first error line
    }

    console.log('\n🎉 ALL REGRESSION TESTS PASSED. INVARIANTS LOCKED.');
}

runTests();
