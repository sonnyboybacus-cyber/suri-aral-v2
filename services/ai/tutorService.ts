
import { Chat, GenerateContentResponse, Type } from "@google/genai";
import { Curriculum, LearningStyle } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

let tutorChat: Chat | null = null;

export const createTutorChat = (mode: string, responseStyle: string = 'detailed', language: string = 'english', contextData?: string) => {
    const ai = getAI();

    let baseInstruction = `You are an AI Tutor in mode: ${mode}.
    Response Style: ${responseStyle}.
    Language: ${language}.
    
    Modes:
    - tutor: General subject tutor. Explain concepts clearly.
    - history: Historical archive persona. Use timelines and cause-effect analysis.
    - stats: Data analyst. Focus on statistical significance and trends.
    - writing: Writing coach. Focus on grammar, tone, and structure.
    - exam_prep: Quiz master. Ask questions and verify answers.
    - reading: Reading coach. Focus on comprehension and fluency.
    - sa_tutor: Socratic Tutor for Learn SA modules.
    `;

    if (contextData) {
        baseInstruction += `\n\nIMPORTANT CONTEXT FROM DATABASE:\n${contextData}\n\nEnsure all explanations align with the curriculum and grade level defined in this context.`;
    }

    tutorChat = ai.chats.create({
        model: getAIModel(),
        config: { systemInstruction: baseInstruction }
    });
};

export const sendMessageToTutor = async (message: string, attachment?: { mimeType: string, data: string }): Promise<{ text: string, images?: string[] }> => {
    if (!tutorChat) throw new Error("Tutor not initialized");

    const contents = attachment ? {
        parts: [
            { inlineData: attachment },
            { text: message }
        ]
    } : message;

    const response = await withRetry<GenerateContentResponse>(() => tutorChat!.sendMessage({ message: contents as any }));
    return { text: response.text || "" };
};

export const resetTutorChat = () => {
    tutorChat = null;
};

export const generateCurriculum = async (topic: string, file?: { mimeType: string, data: string }, subjectContext?: string, learningStyle: LearningStyle = 'Academic'): Promise<Curriculum> => {
    try {
        const ai = getAI();

        let promptText = `Create a structured learning curriculum for the topic: "${topic}".
        Break it down into 5-7 modules.
        
        LEARNING STYLE: ${learningStyle}
        
        STYLE INSTRUCTIONS:
        - Socratic: Focus on guiding questions and critical thinking in descriptions.
        - ELI5: Use simple language, analogies, and real-world examples.
        - Academic: Use formal terminology, definitions, and citations.
        - Practical: Focus on "How-to", steps, and application.
        
        Return JSON: { "id": "uuid", "topic": "${topic}", "modules": [{ "id": "uuid", "order": 1, "title": "Title", "description": "Desc", "status": "locked" }] }`;

        if (subjectContext) {
            promptText += `\n\nALIGNMENT CONTEXT:\n${subjectContext}\n\nEnsure the curriculum strictly aligns with the Grade Level, Semester, and Competencies described above.`;
        }

        const parts: any[] = [{ text: promptText }];

        if (file) {
            parts.unshift({ inlineData: file });
            parts[1].text += " Use the attached document as primary source material.";
        }

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        modules: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    order: { type: Type.NUMBER },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    status: { type: Type.STRING, enum: ['locked', 'active', 'completed'] }
                                },
                                required: ["id", "order", "title", "description", "status"]
                            }
                        }
                    },
                    required: ["id", "topic", "modules"]
                }
            }
        }));

        // Ensure UUIDs are unique on client side just in case
        const data = JSON.parse(response.text || "{}");
        if (data.modules) {
            data.modules = data.modules.map((m: any) => ({ ...m, id: crypto.randomUUID() }));
            if (data.modules.length > 0) data.modules[0].status = 'active'; // Unlock first module
        }
        return data;
    } catch (error) {
        console.error("Curriculum Gen Error:", error);
        throw error;
    }
};