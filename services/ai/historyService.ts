
import { Chat, GenerateContentResponse, Type } from "@google/genai";
import { HistoryResponse, ChatMessage } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

let personaChat: Chat | null = null;

export const generateHistoryAnalysis = async (query: string): Promise<HistoryResponse> => {
    try {
        const ai = getAI();
        // Added strict constraints to prevent token overflow and JSON truncation
        // Reduced limits significantly to ensure stability
        const prompt = `
        Analyze this historical query: "${query.substring(0, 300)}"
        
        Determine the best way to visualize this: 'timeline', 'comparison', 'graph' (Cause & Effect), or 'table'.
        
        STRICT OUTPUT CONSTRAINTS (CRITICAL to prevent errors):
        1. TIMELINE: 
           - 'timelineData': Max 10 most important events. Descriptions MUST be concise (max 15 words).
           - 'globalContextData': Max 3 major world events.
        
        2. COMPARISON: 
           - 'comparisonData': Max 5 distinct points.

        3. GRAPH: 
           - 'graphData': Max 10 nodes and 10 edges. 
           - Labels must be very short (max 3-4 words).

        4. TABLE: 
           - Max 10 rows.

        5. KEY FIGURE: Always identify one key historical figure.
        
        Output JSON matching the schema. Do not include markdown formatting or explanations outside the JSON.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['timeline', 'comparison', 'table', 'graph', 'text'] },
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },

                        // Timeline
                        timelineData: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { year: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING } }
                            }
                        },
                        globalContextData: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { year: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING } }
                            }
                        },

                        // Comparison
                        comparisonData: {
                            type: Type.OBJECT,
                            properties: {
                                subjectA: { type: Type.STRING },
                                subjectB: { type: Type.STRING },
                                points: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { criteria: { type: Type.STRING }, subjectA: { type: Type.STRING }, subjectB: { type: Type.STRING } }
                                    }
                                }
                            }
                        },

                        // Graph (Cause & Effect)
                        graphData: {
                            type: Type.OBJECT,
                            properties: {
                                nodes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, type: { type: Type.STRING } }
                                    }
                                },
                                edges: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, label: { type: Type.STRING } }
                                    }
                                }
                            }
                        },

                        // Table
                        tableData: {
                            type: Type.OBJECT,
                            properties: {
                                headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                                rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                            }
                        },

                        // Persona
                        keyFigure: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                role: { type: Type.STRING },
                                era: { type: Type.STRING },
                                greeting: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["type", "title", "summary"]
                }
            }
        }));

        let jsonString = response.text || "{}";
        // Clean up any potential markdown artifacts
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

        return JSON.parse(jsonString);
    } catch (error: any) {
        console.error("History Analysis Error:", error);
        return {
            type: 'text',
            title: 'Analysis Error',
            summary: 'The history analysis could not be completed due to the complexity of the topic. Please try a more specific query (e.g., "Timeline of Philippine Independence 1898" instead of just "Philippines").'
        };
    }
};

export const createPersonaChat = (figureName: string, era: string, role: string) => {
    const ai = getAI();
    const instruction = `
    You are now roleplaying as ${figureName} from the ${era} era.
    Role: ${role}.
    
    Rules:
    1. Speak using the vocabulary, tone, and knowledge available in your time.
    2. Do NOT mention modern technology or future events unless asked to speculate wildly.
    3. Be immersive. If asked about a historical event you witnessed, describe it from your perspective.
    4. Keep answers concise but character-rich.
    `;

    personaChat = ai.chats.create({
        model: getAIModel(),
        config: { systemInstruction: instruction }
    });
};

export const sendPersonaMessage = async (message: string): Promise<string> => {
    if (!personaChat) throw new Error("Persona not initialized");
    const response = await withRetry<GenerateContentResponse>(() => personaChat!.sendMessage({ message }));
    return response.text || "";
};
