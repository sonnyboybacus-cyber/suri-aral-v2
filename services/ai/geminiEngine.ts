
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash"; // Cost-effective and fast

interface GeminiGradingResult {
    answers: string[];
    rawText: string;
}

export const gradeWithGemini = async (
    apiKey: string,
    warpedImageBase64: string, // Expecting data:image/png;base64,...
    itemCount: number
): Promise<GeminiGradingResult> => {
    try {
        // 1. Initialize Client
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // 2. Prepare Image Part
        // Strip "data:image/xyz;base64," header
        const base64Data = warpedImageBase64.split(",")[1];

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/png",
            },
        };

        // 3. Construct Prompt
        const prompt = `
      You are an OMR (Optical Mark Recognition) grading machine.
      Analyze the attached image of a multiple-choice answer sheet.
      
      CONTEXT:
      - The sheet contains exactly ${itemCount} numbered items.
      - The items are arranged in columns (usually 2 columns).
      - Each item has options (bubbles) labeled A, B, C, D (and sometimes E).
      - A "marked" bubble is shaded or darkened by a pencil.
      
      TASK:
      - Scan the sheet from Item 1 to Item ${itemCount}.
      - For each item, determine which option is marked.
      - If multiple are marked, return "INVALID".
      - If none are marked, return "".
      - If a mark is faint but visible (erased), ignore it if there is a darker mark; otherwise treat as "unmarked" if very faint.
      
      OUTPUT FORMAT:
      - Return ONLY a raw JSON array of strings.
      - Example for 5 items: ["A", "B", "", "C", "A"]
      - Do NOT include markdown code blocks (like \`\`\`json).
      - Do NOT include any intro/outro text.
    `;

        // 4. Call API
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("[Gemini] Raw Response:", text);

        // 5. Clean and Parse JSON
        // Remove markdown if present
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let answers: string[] = [];
        try {
            answers = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("Gemini JSON Parse Error:", parseError);
            // Fallback: Try to extract array with regex
            const match = cleanJson.match(/\[.*\]/s);
            if (match) {
                answers = JSON.parse(match[0]);
            } else {
                throw new Error("Could not parse Gemini response");
            }
        }

        // Validate Length
        if (answers.length !== itemCount) {
            console.warn(`[Gemini] Expected ${itemCount} items, got ${answers.length}.`);
            // Pad or Trim? Let's just return what we got, UI handles it.
        }

        return { answers, rawText: text };

    } catch (error) {
        console.error("Gemini Grading Failed:", error);
        throw error;
    }
};
