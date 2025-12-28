
import { GoogleGenAI } from "@google/genai";

export const getAI = (): GoogleGenAI => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIModel = (): string => {
    try {
        return localStorage.getItem('suri_ai_model') || 'gemini-2.5-flash';
    } catch {
        return 'gemini-2.5-flash';
    }
};

// Helper for retrying async operations with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        // Extract status/code from various possible locations in the error object structure
        const code = error?.response?.status || error?.status || error?.code || error?.error?.code || error?.error?.status;
        const message = error?.message || error?.error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

        // Check for specific error object structure { error: { code: 429 ... } } which might be stringified or object
        let parsedCode = code;
        if (!parsedCode && typeof error === 'object' && error.error && error.error.code) {
            parsedCode = error.error.code;
        }

        const isRateLimit = parsedCode === 429 || parsedCode === 'RESOURCE_EXHAUSTED' || message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota');
        const isServerOverload = parsedCode === 503 || message.includes('503') || message.includes('Overloaded');

        if (isRateLimit) {
            // STOP RETRYING immediately for quota errors to prevent lag
            throw new Error("Quota Exceeded: AI service is currently unavailable.");
        }

        if (retries > 0) {
            if (isServerOverload) {
                console.warn(`AI API Busy (${parsedCode || 'Overload'}). Retrying in ${delay}ms... (${retries} left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
            }

            // For other transient errors
            console.warn(`AI API Error. Retrying in 1000ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return withRetry(fn, retries - 1, delay);
        }
        throw error;
    }
}
