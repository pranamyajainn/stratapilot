import { GoogleGenAI } from "@google/genai";

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("No API Key");
        return;
    }
    const client = new GoogleGenAI({ apiKey });

    try {
        const response = await client.models.list();
        console.log("Available Models:");
        for await (const model of response) {
            console.log(`- ${model.name}`);
        }
    } catch (e: any) {
        console.error("List failed:", e.message);
    }
}

listModels();
