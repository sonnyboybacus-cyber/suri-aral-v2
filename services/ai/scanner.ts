
import { GenerateContentResponse, Type } from "@google/genai";
import { getAI, getAIModel, withRetry } from "./aiCore";

export const analyzeAnswerSheetFromImage = async (base64Data: string, totalItems: number, mimeType: string = 'image/jpeg'): Promise<{ answers: string[] }> => {
    try {
        if (!base64Data || base64Data.length < 100) {
            console.warn("Skipping analysis: Invalid image data received.");
            return { answers: [] };
        }

        const ai = getAI();
        const prompt = `
        You are an advanced Optical Mark Recognition (OMR) scanner AI.
        
        TASK:
        Analyze the provided image of a student's answer sheet.
        Extract the marked answer for each item number from 1 to ${totalItems}.
        
        IMAGE LAYOUT & ALIGNMENT:
        1. **Fiducial Markers:** Locate the four solid black squares at the corners of the page. Use these to correct any rotation or perspective skew internally.
        2. **Item Grid:** The questions are arranged in columns. Find the sequence 1, 2, 3... to align your reading row by row.
        3. **Bubbles:** The bubbles are large circles. Inside each bubble is a faint letter (A, B, C, D).
        
        MARK DETECTION RULES:
        1. **Filled Bubbles:** A bubble is considered "marked" if it is shaded, filled in, or has a heavy mark over it.
        2. **Letters inside Bubbles:** The letters (A, B, C, D) are printed in light gray. If a bubble is shaded, the letter will be obscured. A visible letter means the bubble is EMPTY. A hidden/obscured letter (darker than the others) means it is FILLED.
        3. **Ambiguity:**
           - If a row is empty/unmarked: return "" (empty string).
           - If a row has multiple marks: return "" (invalid).
           - If a mark is erased/crossed out and another is clearly filled: select the clear final choice.
        4. **Valid Options:** Return only "A", "B", "C", "D", "E".
        
        OUTPUT FORMAT:
        Return ONLY a JSON object with this exact schema:
        {
          "answers": ["A", "C", "", "B", ...]
        }
        The array length MUST be exactly ${totalItems}. Pad with empty strings if necessary.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        answers: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["answers"]
                }
            }
        }));

        let jsonString = response.text || '{"answers": []}';
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

        const json = JSON.parse(jsonString);
        let answers = json.answers || [];

        // Sanitize: ensure only single letters or empty
        answers = answers.map((a: string) => {
            if (!a) return '';
            const clean = a.toString().trim().toUpperCase().replace(/[^A-E]/g, '');
            return clean.length > 1 ? '' : clean;
        });

        // Ensure exact length
        if (answers.length < totalItems) {
            const missing = totalItems - answers.length;
            answers = [...answers, ...Array(missing).fill("")];
        } else if (answers.length > totalItems) {
            answers = answers.slice(0, totalItems);
        }

        return { answers };
    } catch (error: any) {
        if (error.message && (error.message.includes('400') || error.message.includes('INVALID_ARGUMENT'))) {
            console.warn("Vision API Argument Error:", error.message);
            return { answers: [] };
        }
        console.error("Analysis Error:", error);
        return { answers: Array(totalItems).fill('') };
    }
};

export const extractTextFromPdf = async (file: { mimeType: string, data: string }): Promise<string> => {
    try {
        const ai = getAI();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: {
                parts: [
                    { inlineData: { mimeType: file.mimeType, data: file.data } },
                    { text: "Extract all text from this document clearly and structured." }
                ]
            }
        }));
        return response.text || "";
    } catch (error) {
        console.error("Extraction Error:", error);
        return "";
    }
};
