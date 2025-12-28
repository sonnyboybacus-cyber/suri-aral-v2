import { GenerateContentResponse, Modality, Type } from "@google/genai";
import { getAI, getAIModel, withRetry } from "./aiCore";

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts', // TTS Model
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        }));

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error("No audio data returned");
        return audioData;
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
};

export const rewriteForAudio = async (text: string): Promise<string> => {
    try {
        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: getAIModel(),
            contents: `Rewrite the following text for spoken audio. Convert formulas to natural language (e.g. "x squared"). Remove code blocks and complex tables, summarizing them instead. Keep it engaging. Text: "${text.substring(0, 2000)}"`
        });
        return response.text || text;
    } catch {
        return text;
    }
};

export const transcribeUserAudio = async (base64Audio: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
                    { text: "Transcribe this audio exactly word for word." }
                ]
            }
        }));
        return response.text || "";
    } catch (error) {
        console.error("Transcription Error:", error);
        return "";
    }
};

export const assessReadingSession = async (originalText: string, transcribedText: string, durationSeconds: number): Promise<{ accuracyScore: number, wpm: number, missedWords: string[], feedback: string }> => {
    try {
        const ai = getAI();
        const prompt = `
        Compare the Original Text and the User's Transcription.
        Original: "${originalText}"
        User: "${transcribedText}"
        Duration: ${durationSeconds} seconds.
        
        Calculate:
        1. Accuracy Score (0-100) based on word matching.
        2. WPM (Words Per Minute).
        3. List of missed or mispronounced words.
        4. Constructive feedback on fluency.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        accuracyScore: { type: Type.NUMBER },
                        wpm: { type: Type.NUMBER },
                        missedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        feedback: { type: Type.STRING }
                    },
                    required: ["accuracyScore", "wpm", "missedWords", "feedback"]
                }
            }
        }));

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Reading Assessment Error:", error);
        throw error;
    }
};

export const generateReadingMaterial = async (topic: string, level: string): Promise<{ title: string, level: string, content: string }> => {
    try {
        const ai = getAI();
        const prompt = `Generate a reading passage about "${topic}" for ${level} level reading proficiency.`;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        level: { type: Type.STRING },
                        content: { type: Type.STRING }
                    }
                }
            }
        }));
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw error;
    }
};