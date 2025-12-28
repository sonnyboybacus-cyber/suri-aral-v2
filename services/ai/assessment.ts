
import { GenerateContentResponse, Type } from "@google/genai";
import { ItemAnalysisResult, QuizQuestion, RemediationResponse, TestMetadata } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

export const generateQuizFromFile = async (base64Data: string, mimeType: string): Promise<QuizQuestion[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Analyze this exam paper. Extract ALL distinct questions found in the document (up to 50 items).
        
        SYSTEM INSTRUCTION: MATHEMATICAL FORMATTING PROTOCOL

        1. STRICT DELIMITERS:
           You must NEVER output raw LaTeX code (like \\frac{1}{2}) as plain text.
           - For standalone equations, complex formulas, limits, integrals, or fractions, you MUST wrap the code in double dollar signs: $$ ... $$
           - For inline variables or simple terms (like x, y, theta), you MUST wrap the code in single dollar signs: $ ... $

           BAD: \\lim_{x \\to 0} \\frac{\\sin(x)}{x}
           GOOD: $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$

        2. NO MARKDOWN CODE BLOCKS:
           Do NOT use standard Markdown code blocks (like \`\`\`latex). 
           
        If the image contains math formulas, transcribe them into LaTeX format using the delimiters above.
        Do not output raw image text; structure it into a quiz format.
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
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['MultipleChoice', 'Formula'] },
                            questionText: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
                        },
                        required: ["questionText", "options", "correctAnswer", "explanation", "difficulty", "type"]
                    }
                }
            }
        }));

        let jsonString = response.text || "[]";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const questions = JSON.parse(jsonString);
        return questions.map((q: any) => ({ ...q, id: crypto.randomUUID() }));
    } catch (error) {
        console.error("File Quiz Gen Error:", error);
        throw error;
    }
};

export const generateRemediationQuestions = async (analysisResults: ItemAnalysisResult[], metadata: TestMetadata, questionsText: string): Promise<RemediationResponse> => {
    try {
        const ai = getAI();
        const leastMastered = analysisResults.filter(r => r.interpretation === 'Least Mastered' || r.interpretation === 'Not Mastered').map(r => r.itemNumber);

        const prompt = `
        Based on the analysis, items ${leastMastered.join(', ')} were least mastered.
        Context (Test Subject: ${metadata.subject}, Grade: ${metadata.gradeLevel}):
        
        Original Questions Text:
        ${questionsText}
        
        Generate 5 Remedial Questions targeting the concepts from these least mastered items.
        
        SYSTEM INSTRUCTION: MATHEMATICAL FORMATTING PROTOCOL
        1. STRICT DELIMITERS:
           - For standalone equations, complex formulas, limits, integrals, or fractions, you MUST wrap the code in double dollar signs: $$ ... $$
           - For inline variables or simple terms (like x, y, theta), you MUST wrap the code in single dollar signs: $ ... $
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswer: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    targetedConcept: { type: Type.STRING }
                                },
                                required: ["question", "options", "correctAnswer", "explanation", "targetedConcept"]
                            }
                        }
                    }
                }
            }
        }));

        return JSON.parse(response.text || '{"questions": []}');
    } catch (error) {
        console.error("Remediation Error:", error);
        throw error;
    }
};

export const analyzeKnowledgeGaps = async (mistakes: { question: string, userAnswer: string, correctAnswer: string, explanation: string }[]): Promise<{ summary: string, gaps: string[], recommendation: string }> => {
    try {
        const ai = getAI();
        const prompt = `
        Analyze these incorrect answers from a student's quiz. Identify the underlying conceptual misunderstandings.
        
        Mistakes Data:
        ${JSON.stringify(mistakes)}
        
        Task:
        1. Summarize the student's performance issues concisely.
        2. List the top 3 conceptual gaps or weak areas.
        3. Provide a specific recommendation for improvement.
        
        Output JSON.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendation: { type: Type.STRING }
                    },
                    required: ["summary", "gaps", "recommendation"]
                }
            }
        }));

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Gap Analysis Error:", error);
        throw error;
    }
};
