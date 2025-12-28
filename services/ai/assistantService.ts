import { Chat, GenerateContentResponse } from "@google/genai";
import { AssistantContext, ChatMessage, GeneralChatResponse } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

let assistantChat: Chat | null = null;

export const initAssistantChat = async (context: AssistantContext) => {
    const ai = getAI();
    assistantChat = ai.chats.create({
        model: getAIModel(),
        config: {
            systemInstruction: `You are SURI-ARAL Assistant, the central intelligence for ${context.schoolName}.
            
            CURRENT SCHOOL CONTEXT:
            - Name: ${context.schoolName} (${context.location})
            - School Year: ${context.schoolYear}
            - Database: ${context.totalStudents} students, ${context.totalTeachers} teachers, ${context.activeClasses} active classes.

            YOU HAVE ACCESS TO THESE NEW AI MODULES:
            
            1. **Quiz SA**: 
               - Can generate complex exams from topics or uploaded files.
               - *Key Feature*: Supports LaTeX for Math ($$ ... $$) and symbolic verification for answers.
            
            2. **Data SA (Statistical Analysis)**:
               - A full statistical suite. Can run Descriptive, Inferential (T-Test, ANOVA), Regression, and Predictive analysis on datasets.
               - Visualizes data automatically.

            3. **History SA**:
               - Generates interactive historical timelines and comparison matrices.

            4. **Reading SA**:
               - Assesses student reading fluency and pronunciation accuracy in real-time.

            5. **Learn SA**:
               - A personalized AI Tutor that builds custom curriculums.

            STANDARD MODULES:
            - Student (SF1), Teacher, and Class Management.
            - Smart Lesson Planner (DepEd format).
            - Item Analysis (MPS calculation).

            ROLE:
            - Act as a proactive concierge. Guide users to the right tool for their task.
            - If a user asks about Math/Science tests, direct them to **Quiz SA**.
            - If a user needs to analyze grades, suggest **Item Analysis** or **Data SA**.
            - Keep responses professional, encouraging, and concise.`
        }
    });
};

export const getInitialAssistantMessage = async (): Promise<GeneralChatResponse> => {
    if (!assistantChat) throw new Error("Assistant not initialized");
    const response = await withRetry<GenerateContentResponse>(() => assistantChat!.sendMessage({
        message: "Give a warm, short greeting to the teacher. Then briefly mention that you have been upgraded with new AI modules (Quiz SA, Data SA, History SA) ready to assist them."
    }));

    return {
        response: response.text || "Hello! I am your updated SURI-ARAL Assistant.",
        suggestedQuestions: ["Create a Math Quiz", "Analyze Data", "Generate History Timeline"]
    };
};

export const continueAssistantChat = async (history: ChatMessage[], message: string): Promise<GeneralChatResponse> => {
    if (!assistantChat) throw new Error("Assistant not initialized");
    const response = await withRetry<GenerateContentResponse>(() => assistantChat!.sendMessage({ message }));
    return {
        response: response.text || "",
        suggestedQuestions: []
    };
};