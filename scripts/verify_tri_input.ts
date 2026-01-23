
import { GroqStrategicAnalyzer } from '../server/services/groqAnalyzer';
import { VisualFeatures } from '../server/services/llmRouter/types';

// Mock Primary Features (e.g. Uploaded Medical Ad)
const primaryFeatures: VisualFeatures = {
    objects: ["Doctor", "Stethoscope", "Patient"],
    scenes: ["Clinical setting", "Examination room"],
    colors: ["White", "Blue", "Clean"],
    composition: "Professional, centered",
    pacing: "medium",
    transitions: ["Cut"],
    textOverlays: ["Trust the experts", "99% success"],
    transcript: "We care for your health.",
    audioMood: "Calm, reassuring",
    emotionalTone: ["Trust", "Care"],
    humanPresence: true,
    logoDetected: true,
    brandColors: ["Blue", "White"], // Added
    creativeFormat: "video_short",
    durationSeconds: 15
};

// Mock Secondary Features (e.g. URL Gaming Video - Conflict!)
const secondaryFeatures: VisualFeatures = {
    objects: ["Space ship", "Laser", "Explosion"],
    scenes: ["Outer space", "Battle"],
    colors: ["Neon", "Black", "Red"],
    composition: "Chaotic",
    pacing: "fast",
    transitions: ["Flash", "Zoom"],
    textOverlays: ["LEVEL UP", "PLAY NOW"],
    transcript: "Destroy them all!",
    audioMood: "Intense, electronic",
    emotionalTone: ["Excitement", "Aggression"],
    humanPresence: false,
    logoDetected: true,
    brandColors: ["Blue", "White"], // Added
    creativeFormat: "video_short",
    durationSeconds: 30
};

async function verifyTriInput() {
    console.log("Starting Tri-Input Verification...");
    const analyzer = new GroqStrategicAnalyzer();

    // 1. Verify Normal Mode (Primary Only)
    console.log("\n--- TEST 1: Normal Mode (Primary Only) ---");
    try {
        await analyzer.analyze(primaryFeatures, "Medical Brand Context", "Creative Audit");
        console.log("✅ Normal Mode Passed");
    } catch (e) {
        console.error("❌ Normal Mode Failed", e);
    }

    // 2. Verify Tri-Input Mode (Primary + Secondary)
    console.log("\n--- TEST 2: Tri-Input Mode (Primary + Secondary) ---");
    try {
        const result = await analyzer.analyze(
            primaryFeatures,
            "Medical Brand Context",
            "Creative Audit",
            undefined,
            undefined,
            secondaryFeatures
        );

        console.log("✅ Tri-Input Mode Call Succeeded");

        // We can't easily inspect the prompt internally without mocking the orchestrator or spying.
        // But the logs from the server should show "Tri-Input Mode: Synthesizing Context...".
        // And the result should be a valid analysis.

        if (result && result.adDiagnostics) {
            console.log("✅ Analysis Result Generated");
            console.log(`Diagnostic Count: ${result.adDiagnostics.length}`);
        } else {
            console.error("❌ Analysis Result Empty");
        }

    } catch (e) {
        console.error("❌ Tri-Input Mode Failed", e);
    }
}

verifyTriInput();
