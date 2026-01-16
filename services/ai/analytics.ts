
import { Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, InitialQuestionAnalysisResponse } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";
import { ConsolidatedData } from "../analysisAggregation";

let questionAnalysisChat: Chat | null = null;

export const mapCompetenciesToItems = async (questionsText: string, totalItems: number, officialCompetencies: string[] = []): Promise<{ itemNumber: number, competency: string }[]> => {
    try {
        const ai = getAI();

        let prompt = `
        Analyze the following exam text. 
        For each question item (from 1 to ${totalItems}), identify the specific Learning Competency or Skill being tested.
        `;

        if (officialCompetencies.length > 0) {
            prompt += `
            
            IMPORTANT: You MUST select the competency from the following OFFICIAL CURRICULUM LIST. 
            Do not invent new descriptions. Match the question to the closest item in this list:
            
            OFFICIAL LIST:
            ${JSON.stringify(officialCompetencies)}
            
            If a question clearly does not match any official competency, describe it concisely (max 10 words).
            `;
        } else {
            prompt += `
            Keep the competency description concise (max 10 words).
            `;
        }

        prompt += `
        
        Text:
        "${questionsText.substring(0, 30000)}"
        
        Return a JSON array of objects with 'itemNumber' (integer) and 'competency' (string).
        Only return items found in the text.
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
                            itemNumber: { type: Type.INTEGER },
                            competency: { type: Type.STRING }
                        },
                        required: ["itemNumber", "competency"]
                    }
                }
            }
        }));

        return JSON.parse(response.text || "[]");
    } catch (error: any) {
        const message = error?.message || JSON.stringify(error);
        console.error("Competency Mapping Error:", error);

        if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
            throw new Error("AI service busy (Quota Exceeded). Please try again in a minute.");
        }
        return [];
    }
};

export const getInitialQuestionAnalysis = async (questionText: string): Promise<InitialQuestionAnalysisResponse> => {
    const ai = getAI();
    try {
        const prompt = `
        Analyze this specific test question: "${questionText}"
        
        Provide:
        1. Core Concept being tested.
        2. Common Misconceptions students might have.
        3. Teaching Suggestions to address these gaps.
        4. Suggested follow-up questions for the teacher to ask you (Keep them very short, max 8 words).
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: {
                            type: Type.OBJECT,
                            properties: {
                                coreConcept: { type: Type.STRING },
                                commonMisconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                teachingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }));

        const jsonText = response.text || "{}";
        const json = JSON.parse(jsonText);

        questionAnalysisChat = ai.chats.create({
            model: getAIModel(),
            config: {
                systemInstruction: "You are an expert Educational Data Analyst. Analyze the provided test results and provide insights on student performance, item difficulty, and remedial strategies.",
            },
            history: [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: jsonText }] }
            ]
        });

        return json;
    } catch (error) {
        console.error("Question Analysis Error:", error);

        questionAnalysisChat = ai.chats.create({ model: getAIModel() });

        return {
            analysis: {
                coreConcept: "Analysis Temporarily Unavailable (Rate Limit)",
                commonMisconceptions: ["Please try again in a few moments."],
                teachingSuggestions: ["Review the question manually."]
            },
            suggestedQuestions: []
        };
    }
};

export const continueQuestionAnalysisChat = async (history: ChatMessage[], message: string): Promise<string> => {
    if (!questionAnalysisChat) throw new Error("Chat not initialized");
    const response = await withRetry<GenerateContentResponse>(() => questionAnalysisChat!.sendMessage({ message }));
    return response.text || "";
};

export const generateDepartmentalInsights = async (data: ConsolidatedData): Promise<string> => {
    try {
        const ai = getAI();
        const leastMastered = data.competencies.filter(c => c.interpretation !== 'Mastered').map(c => `${c.description} (${c.mps.toFixed(1)}%)`).join(', ');

        // Flatten sections from all schools
        const allSections = data.schools.flatMap(school => school.sections);
        const sectionComparison = allSections.map(s => `${s.name}: ${s.mps.toFixed(1)}%`).join(', ');

        const prompt = `
        You are a Department Head giving a report on the ${data.gradeLevel} ${data.subject} ${data.examTitle}.
        
        Data Summary:
        - Overall Grade Level MPS: ${data.overallMPS.toFixed(2)}%
        - Total Students: ${data.totalStudents}
        - Sections Performance: ${sectionComparison}
        - Least Mastered Competencies: ${leastMastered}
        
        Task:
        1. Identify the competencies that are universally difficult across all sections.
        2. Identify anomalies where one section significantly outperformed others on specific topics (if any).
        3. Suggest a remedial intervention plan that can be applied to the whole Grade Level (e.g., a remedial session or specific handout).
        
        Output Format: Markdown. Be professional and concise.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt
        }));

        return response.text || "No insights generated.";
    } catch (error) {
        console.error("Department Insights Error:", error);
        return "Failed to generate insights.";
    }
};
