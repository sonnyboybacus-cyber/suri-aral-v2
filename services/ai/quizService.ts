
import { GenerateContentResponse, Type } from "@google/genai";
import { QuizQuestion } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

export const generateQuizFromTopic = async (topic: string): Promise<QuizQuestion[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as a Professor creating a rigorous exam on: "${topic}".
        Generate 15 high-quality multiple choice questions.
        
        SYSTEM INSTRUCTION: MATHEMATICAL FORMATTING PROTOCOL

        1. STRICT DELIMITERS IN TEXT:
           - For standalone equations in 'questionText', 'explanation', or 'options', you MUST wrap the code in double dollar signs: $$ ... $$
           - For inline variables, wrap in single dollar signs: $ ... $

        2. JSON AS A CONTAINER (Formula Context):
           - If a question involves a core mathematical formula (e.g., Quadratic Formula, Newton's Second Law), provide the raw LaTeX string in the 'formulaContext' field.
           - Example: "formulaContext": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
           - Do NOT include delimiters ($$) in the 'formulaContext' field itself, just the raw LaTeX.
           - This field allows the frontend to render the primary formula distinctively.

        3. EXPLANATIONS:
           - In the "explanation" field, break down the solution conceptually.
        
        Output JSON array.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
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
                            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                            formulaContext: { type: Type.STRING, description: "Raw LaTeX string of the main formula involved, if any." }
                        },
                        required: ["questionText", "options", "correctAnswer", "explanation", "difficulty", "type"]
                    }
                }
            }
        }));

        let jsonString = response.text?.trim() || "[]";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const questions = JSON.parse(jsonString);
        return questions.map((q: any, i: number) => ({ ...q, id: crypto.randomUUID() }));
    } catch (error) {
        console.error("Quiz Gen Error:", error);
        throw error;
    }
};

export const verifyMathAnswer = async (correctAnswer: string, userAnswer: string): Promise<boolean> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as a Python SymPy Symbolic Math Engine.
        Your task is to verify if the User's Answer is mathematically equivalent to the Correct Answer.
        
        Correct Answer: "${correctAnswer}"
        User Answer: "${userAnswer}"
        
        Rules:
        1. Ignore whitespace and variable case if context implies equivalence.
        2. Evaluate expressions: "x + 1" IS equivalent to "1 + x". "0.5" IS equivalent to "1/2".
        3. If the answer is text-based, check for semantic meaning.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isCorrect: { type: Type.BOOLEAN }
                    },
                    required: ["isCorrect"]
                }
            }
        }));

        const json = JSON.parse(response.text || "{}");
        return json.isCorrect || false;
    } catch (error) {
        console.error("Math Verification Error:", error);
        return correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
    }
};

export const getQuizHint = async (question: QuizQuestion, userQuery: string): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
        You are a Socratic Proctor. The student is stuck on this question:
        "${question.questionText}"
        
        The student asks: "${userQuery}"
        
        DO NOT give the answer.
        Instead, guide them with a hint or a follow-up question that leads them to the solution.
        
        SYSTEM INSTRUCTION: MATHEMATICAL FORMATTING PROTOCOL
        1. STRICT DELIMITERS:
           - For standalone equations, complex formulas, limits, integrals, or fractions, you MUST wrap the code in double dollar signs: $$ ... $$
           - For inline variables or simple terms (like x, y, theta), you MUST wrap the code in single dollar signs: $ ... $
           
           BAD: \\lim_{x \\to 0} ...
           GOOD: $$\\lim_{x \\to 0} ...$$
           
        2. NO MARKDOWN CODE BLOCKS.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt
        }));

        return response.text || "Think about the core concept.";
    } catch (error) {
        return "I can't provide a hint right now.";
    }
};
