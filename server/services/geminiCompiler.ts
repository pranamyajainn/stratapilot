/**
 * Gemini Visual Compiler
 * Extracts visual features from images/videos using Gemini
 * Acts as a COMPILER - extracts only, no strategic conclusions
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { VisualFeatures } from './llmRouter/types.js';

// =====================================================
// VISUAL EXTRACTION SCHEMA
// =====================================================

/**
 * Strict JSON schema for visual feature extraction
 * Gemini outputs ONLY observable features, no analysis
 */
export const visualFeaturesSchema = {
    type: Type.OBJECT,
    properties: {
        // Scene Understanding
        objects: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of objects/items visible in the creative"
        },
        scenes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Scene descriptions (e.g., 'outdoor urban setting', 'modern office')"
        },
        colors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Dominant colors in the creative"
        },
        composition: {
            type: Type.STRING,
            description: "Visual composition notes (e.g., 'centered subject', 'rule of thirds')"
        },

        // Motion/Video specific
        pacing: {
            type: Type.STRING,
            enum: ["slow", "medium", "fast", "variable"],
            description: "Pacing of the video (for videos only)"
        },
        transitions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Types of transitions used (e.g., 'cut', 'fade', 'zoom')"
        },
        durationSeconds: {
            type: Type.NUMBER,
            description: "Estimated duration in seconds (for videos)"
        },

        // Text and Audio
        textOverlays: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "All text visible on screen, verbatim"
        },
        transcript: {
            type: Type.STRING,
            description: "Speech transcript or 'No speech detected'"
        },
        audioMood: {
            type: Type.STRING,
            description: "Music/sound mood (e.g., 'upbeat', 'calm', 'dramatic', 'none')"
        },

        // Emotional Cues (observable only)
        emotionalTone: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Observable emotional elements (e.g., 'smiling faces', 'warm lighting')"
        },
        humanPresence: {
            type: Type.BOOLEAN,
            description: "Whether people are visible"
        },
        facialExpressions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Facial expressions if humans present (e.g., 'smiling', 'focused')"
        },

        // Brand Elements
        logoDetected: {
            type: Type.BOOLEAN,
            description: "Whether a logo is visible"
        },
        logoPosition: {
            type: Type.STRING,
            description: "Logo position (e.g., 'top-right', 'bottom-center')"
        },
        brandColors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Colors that appear to be brand-specific"
        },
        ctaText: {
            type: Type.STRING,
            description: "Call-to-action text if present"
        },
        ctaPlacement: {
            type: Type.STRING,
            description: "CTA position (e.g., 'end frame', 'bottom banner')"
        },

        // Format detection
        creativeFormat: {
            type: Type.STRING,
            enum: ["static_image", "video_short", "video_long", "carousel", "unknown"],
            description: "Type of creative format"
        },
        aspectRatio: {
            type: Type.STRING,
            description: "Approximate aspect ratio (e.g., '16:9', '1:1', '9:16')"
        }
    },
    required: [
        "objects", "scenes", "colors", "composition",
        "textOverlays", "transcript", "emotionalTone",
        "humanPresence", "logoDetected", "creativeFormat"
    ]
};

// =====================================================
// COMPILER SYSTEM PROMPT
// =====================================================

/**
 * System prompt that constrains Gemini to extraction only
 * NO strategic conclusions, NO analysis, NO recommendations
 */
export const VISUAL_COMPILER_PROMPT = `You are a Visual Feature Extractor. Your ONLY job is to describe what you observe.

**STRICT RULES:**
1. DESCRIBE only what is visible or audible - no interpretation
2. DO NOT provide strategic analysis or recommendations
3. DO NOT infer target audience or marketing effectiveness
4. DO NOT suggest improvements or score anything
5. BE LITERAL - if you see "a person smiling", say that, not "happiness appeal"

**OUTPUT:**
Fill in the JSON schema with observable facts only.
For text overlays, transcribe EXACTLY what is shown/said.
If something is not visible, use empty arrays or "not detected".

You are a COMPILER, not an analyst. Extract. Do not conclude.`;

// =====================================================
// VISUAL COMPILER CLASS
// =====================================================

export class GeminiVisualCompiler {
    private getClient() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing");
        }
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Extract visual features from an image or video
     * Returns structured features for downstream analysis
     */
    async extractFeatures(
        fileData?: string | null,
        mimeType?: string | null,
        fileUri?: string | null
    ): Promise<VisualFeatures> {
        const parts: any[] = [];

        // Add media
        if (fileData && mimeType) {
            parts.push({
                inlineData: {
                    mimeType,
                    data: fileData
                }
            });
        }

        if (fileUri && mimeType) {
            parts.push({
                fileData: {
                    mimeType,
                    fileUri
                }
            });
        }

        if (parts.length === 0) {
            throw new Error("No visual content provided for extraction");
        }

        parts.push({ text: "Extract all visual features from this creative asset." });

        console.log('[GeminiCompiler] Extracting visual features...');

        try {
            const response = await this.getClient().models.generateContent({
                model: 'gemini-2.0-flash',
                contents: { parts },
                config: {
                    systemInstruction: VISUAL_COMPILER_PROMPT,
                    responseMimeType: "application/json",
                    responseSchema: visualFeaturesSchema,
                    temperature: 0.1, // Low temperature for consistent extraction
                    topP: 0.95,
                    maxOutputTokens: 4096,
                }
            });

            if (!response?.text) {
                throw new Error("Empty response from Gemini");
            }

            const features = JSON.parse(response.text) as VisualFeatures;
            console.log('[GeminiCompiler] Features extracted successfully');

            return features;

        } catch (error: any) {
            console.error('[GeminiCompiler] Extraction failed:', error.message);

            // Return minimal features on error
            return {
                objects: [],
                scenes: ["extraction failed"],
                colors: [],
                composition: "unknown",
                pacing: "medium",
                transitions: [],
                textOverlays: [],
                transcript: "Extraction failed: " + error.message,
                audioMood: "unknown",
                emotionalTone: [],
                humanPresence: false,
                logoDetected: false,
                brandColors: [],
                creativeFormat: 'unknown',
            };
        }
    }

    /**
     * Format extracted features as context for Groq analysis
     */
    formatFeaturesForAnalysis(features: VisualFeatures): string {
        return `
## VISUAL FEATURES EXTRACTED FROM CREATIVE

### Scene & Objects
- Objects: ${features.objects.join(', ') || 'none detected'}
- Scenes: ${features.scenes.join(', ') || 'none detected'}
- Colors: ${features.colors.join(', ') || 'none detected'}
- Composition: ${features.composition || 'not analyzed'}

### Motion & Pacing
- Pacing: ${features.pacing || 'N/A'}
- Transitions: ${features.transitions?.join(', ') || 'none'}
- Duration: ${features.durationSeconds ? features.durationSeconds + 's' : 'N/A'}

### Text & Audio
- Text Overlays: ${features.textOverlays.join(' | ') || 'none'}
- Transcript: ${features.transcript || 'none'}
- Audio Mood: ${features.audioMood || 'unknown'}

### Human Elements
- People Present: ${features.humanPresence ? 'Yes' : 'No'}
- Facial Expressions: ${features.facialExpressions?.join(', ') || 'N/A'}

### Brand Elements
- Logo Visible: ${features.logoDetected ? 'Yes' : 'No'}
- Logo Position: ${features.logoPosition || 'N/A'}
- Brand Colors: ${features.brandColors?.join(', ') || 'none detected'}
- CTA Text: ${features.ctaText || 'none'}
- CTA Placement: ${features.ctaPlacement || 'N/A'}

### Emotional Cues
- Emotional Elements: ${features.emotionalTone.join(', ') || 'none detected'}
`.trim();
    }
}

// Singleton
let compilerInstance: GeminiVisualCompiler | null = null;

export function getGeminiCompiler(): GeminiVisualCompiler {
    if (!compilerInstance) {
        compilerInstance = new GeminiVisualCompiler();
    }
    return compilerInstance;
}
