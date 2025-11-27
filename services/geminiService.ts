
import { GoogleGenAI, Chat, GenerateContentResponse, Type, Schema, Modality } from "@google/genai";
import { AIContext, ItemAnalysisResult, InitialQuestionAnalysisResponse, ChatMessage, InitialAnalysisResponse, GeneralChatResponse, TestMetadata, RemediationResponse, LessonPlan, ScheduleSlot, ClassSubject, Curriculum, HistoryResponse, DataAnalysisResult, AdvancedAnalysisResult, AnalysisTier, QuizQuestion, AssistantContext, ScheduleItem } from "../types";

// Initialize the Google GenAI SDK
const getAI = (): GoogleGenAI => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for retrying async operations with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        // Extract status/code from various possible locations in the error object structure
        const code = error?.response?.status || error?.status || error?.code || error?.error?.code || error?.error?.status;
        const message = error?.message || error?.error?.message || JSON.stringify(error);

        const isRateLimit = code === 429 || code === 'RESOURCE_EXHAUSTED' || message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota');
        const isServerOverload = code === 503 || message.includes('503') || message.includes('Overloaded');

        if (retries > 0) {
            if (isRateLimit || isServerOverload) {
                console.warn(`AI API Busy (${code}). Retrying in ${delay}ms... (${retries} left)`);
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

// --- Chat Instances ---
let analysisChat: Chat | null = null;
let tutorChat: Chat | null = null;
let assistantChat: Chat | null = null;
let questionAnalysisChat: Chat | null = null;

// --- 1. ITEM ANALYSIS & GRADING ---

export const analyzeAnswerSheetFromImage = async (base64Data: string, totalItems: number, mimeType: string = 'image/jpeg'): Promise<{ answers: string[] }> => {
    try {
        const ai = getAI();
        const prompt = `
        Analyze this image of an answer sheet. There are ${totalItems} questions.
        Extract the student's answers (A, B, C, D, or blank).
        Return ONLY a JSON object with an array of strings named 'answers'.
        Example: { "answers": ["A", "B", "C", "", "D", ...] }
        If an answer is ambiguous or blank, use an empty string "".
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash', // Vision capable
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

        const json = JSON.parse(response.text || '{"answers": []}');
        // Ensure array length matches totalItems
        const answers = json.answers || [];
        while (answers.length < totalItems) answers.push("");
        return { answers: answers.slice(0, totalItems) };
    } catch (error) {
        console.error("Analysis Error:", error);
        throw new Error("Failed to analyze answer sheet.");
    }
};

export const analyzeAnswerSheetFrame = async (base64Data: string, totalItems: number): Promise<{ answers: string[] }> => {
    // Optimized version for live scanning (can use same model or faster config)
    return analyzeAnswerSheetFromImage(base64Data, totalItems);
};

export const extractTextFromPdf = async (file: { mimeType: string, data: string }): Promise<string> => {
    try {
        const ai = getAI();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
            model: 'gemini-2.5-flash',
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

// --- 2. ITEM ANALYSIS CHAT ---

export const startAnalysisChat = async (context: AIContext): Promise<InitialAnalysisResponse> => {
    const ai = getAI();
    try {
        const prompt = `
        Here is the Item Analysis Data:
        Metadata: ${JSON.stringify(context.metadata)}
        Results: ${JSON.stringify(context.analysisResults)}
        
        Please provide:
        1. A comprehensive analysis report (Markdown format).
           - IMPORTANT: Use the provided 'competency' fields to identify specific skills/topics the students mastered or failed.
           - Group your insights by these Learning Competencies.
        2. 3-5 suggested follow-up questions for the teacher.
        `;

        // 1. Get structured analysis using Schema (Safe JSON)
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysisReport: { type: Type.STRING },
                        suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }));

        const jsonText = response.text || "{}";
        const json = JSON.parse(jsonText);

        // 2. Initialize Chat with History (Context Injection)
        analysisChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are an expert Educational Data Analyst. Analyze the provided test results and provide insights on student performance, item difficulty, and remedial strategies.",
            },
            history: [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: jsonText }] }
            ]
        });

        return {
            analysisReport: json.analysisReport || "No report generated.",
            suggestedQuestions: json.suggestedQuestions || []
        };
    } catch (error: any) {
        console.error("Start Analysis Chat Error:", error);
        
        // Initialize chat with error state so the user can still try to interact or retry
        analysisChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are an expert Educational Data Analyst.",
            }
        });

        return {
            analysisReport: `### ⚠️ Service Busy\n\nI am currently experiencing high traffic volume (Rate Limit Exceeded). \n\nThe analysis could not be generated automatically at this moment. Please try asking me a specific question below to start the conversation manually.\n\n*Error Details: ${error.message || 'Resource Exhausted'}*`,
            suggestedQuestions: ["Analyze the results now", "Identify least mastered items"]
        };
    }
};

export const continueAnalysisChat = async (message: string): Promise<string> => {
    if (!analysisChat) throw new Error("Chat not initialized");
    const response = await withRetry<GenerateContentResponse>(() => analysisChat!.sendMessage({ message }));
    return response.text || "";
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
        4. Suggested follow-up questions for the teacher to ask you.
        `;

        // 1. Structured Response
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
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

        // 2. Init Chat for Follow-up
        questionAnalysisChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: jsonText }] }
            ]
        });

        return json;
    } catch (error) {
        console.error("Question Analysis Error:", error);
        
        // Fallback to prevent crash
        questionAnalysisChat = ai.chats.create({ model: 'gemini-2.5-flash' });
        
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
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
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

// --- 3. ASSISTANT CHAT ---

export const initAssistantChat = async (context: AssistantContext) => {
    const ai = getAI();
    assistantChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are SURI-ARAL Assistant, the central intelligence for ${context.schoolName}.
            
            CURRENT SCHOOL CONTEXT:
            - Name: ${context.schoolName} (${context.location})
            - School Year: ${context.schoolYear}
            - Database: ${context.totalStudents} students, ${context.totalTeachers} teachers, ${context.activeClasses} active classes.

            YOU HAVE ACCESS TO THESE NEW AI MODULES:
            
            1. **Exam SA (Quiz SA)**: 
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
            - If a user asks about Math/Science tests, direct them to **Exam SA**.
            - If a user needs to analyze grades, suggest **Item Analysis** or **Data SA**.
            - Keep responses professional, encouraging, and concise.`
        }
    });
};

export const getInitialAssistantMessage = async (): Promise<GeneralChatResponse> => {
    if (!assistantChat) throw new Error("Assistant not initialized");
    const response = await withRetry<GenerateContentResponse>(() => assistantChat!.sendMessage({ 
        message: "Give a warm, short greeting to the teacher. Then briefly mention that you have been upgraded with new AI modules (Exam SA, Data SA, History SA) ready to assist them." 
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

// --- 4. TUTOR & LEARN SA ---

export const createTutorChat = (mode: string, responseStyle: string = 'detailed', language: string = 'english') => {
    const ai = getAI();
    const systemInstruction = `You are an AI Tutor in mode: ${mode}.
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

    tutorChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction }
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

export const generateReplySuggestions = async (context: string): Promise<string[]> => {
    try {
        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Given this tutor response: "${context.substring(0, 500)}...", suggest 3 short follow-up questions for the student. Return JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch {
        return [];
    }
};

export const generateCurriculum = async (topic: string, file?: { mimeType: string, data: string }): Promise<Curriculum> => {
    try {
        const ai = getAI();
        const parts: any[] = [{ text: `Create a structured learning curriculum for the topic: "${topic}".
        Break it down into 5-7 modules.
        Return JSON: { "id": "uuid", "topic": "${topic}", "modules": [{ "id": "uuid", "order": 1, "title": "Title", "description": "Desc", "status": "locked" }] }` }];
        
        if (file) {
            parts.unshift({ inlineData: file });
            parts[1].text += " Use the attached document as context.";
        }

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { responseMimeType: "application/json" }
        }));

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Curriculum Gen Error:", error);
        throw error;
    }
};

// --- 5. AUDIO & TTS ---

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
            model: 'gemini-2.5-flash',
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
            model: 'gemini-2.5-flash',
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

// --- 6. READING SA ---

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
            model: 'gemini-2.5-flash',
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
            model: 'gemini-2.5-flash',
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

// --- 7. PLANNERS & SCHEDULING ---

export const generateStudySchedule = async (eventName: string, examDate: string, topics: string, difficulty: string): Promise<ScheduleItem[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Create a study schedule for "${eventName}" occurring on ${examDate}.
        Topics: ${topics}
        Intensity: ${difficulty}
        Today is ${new Date().toISOString().split('T')[0]}.
        
        Return strictly a JSON array of sessions.
        `;
        
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            topic: { type: Type.STRING },
                            focus: { type: Type.STRING }
                        }
                    }
                }
            }
        }));
        return JSON.parse(response.text || "[]");
    } catch (error) {
        console.error("Study Plan Error:", error);
        throw error;
    }
};

export const generateLessonPlan = async (area: string, grade: string, quarter: string, time: string, topic: string, code: string, strategy: string, context?: any): Promise<LessonPlan> => {
    try {
        const ai = getAI();
        const prompt = `
        Create a Detailed Lesson Plan (DLP) for DepEd Philippines.
        Subject: ${area}, Grade: ${grade}, Quarter: ${quarter}, Time: ${time}
        Topic: ${topic}
        Competency Code: ${code}
        Strategy: ${strategy}
        ${context ? `Curriculum Context: ${JSON.stringify(context)}` : ''}
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        
        const json = JSON.parse(response.text || "{}");
        // Assign IDs and default values if missing
        return {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            preparedBy: "",
            notedBy: "",
            ...json
        };
    } catch (error) {
        console.error("Lesson Plan Gen Error:", error);
        throw error;
    }
};

export const generateSmartSchedule = async (subjects: ClassSubject[], gradeLevel: string, start: string, end: string): Promise<ScheduleSlot[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Create a weekly class schedule for ${gradeLevel}.
        School Hours: ${start} to ${end}.
        Subjects to schedule: ${JSON.stringify(subjects)}
        
        Rules:
        - Distribute subjects evenly across Mon-Fri.
        - Include breaks.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (error) {
        console.error("Schedule Gen Error:", error);
        throw error;
    }
};

// --- 8. HISTORY & DATA SA ---

export const generateHistoryAnalysis = async (query: string): Promise<HistoryResponse> => {
    try {
        const ai = getAI();
        const prompt = `
        Analyze this historical query: "${query}"
        Determine if it requires a Timeline, Comparison, or general Table.
        Return JSON matching HistoryResponse structure.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("History Analysis Error:", error);
        throw error;
    }
};

export const performAdvancedAnalysis = async (data: string, tier: AnalysisTier): Promise<AdvancedAnalysisResult> => {
    try {
        const ai = getAI();
        const prompt = `
        Perform ${tier} analysis on this dataset.
        Data Sample: ${data.substring(0, 10000)}...
        
        Return JSON matching AdvancedAnalysisResult interface.
        Ensure all data fields are strictly numeric for charts.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Data Analysis Error:", error);
        throw error;
    }
};

// --- QUIZ SA ---

export const generateQuizFromTopic = async (topic: string): Promise<QuizQuestion[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as a Professor creating a rigorous exam on: "${topic}".
        Generate 15 high-quality multiple choice questions.
        
        SYSTEM INSTRUCTION: MATHEMATICAL FORMATTING PROTOCOL

        1. STRICT DELIMITERS:
           You must NEVER output raw LaTeX code (like \\frac{1}{2}) as plain text.
           - For standalone equations, complex formulas, limits, integrals, or fractions, you MUST wrap the code in double dollar signs: $$ ... $$
           - For inline variables or simple terms (like x, y, theta), you MUST wrap the code in single dollar signs: $ ... $

           BAD: \\lim_{x \\to 0} \\frac{\\sin(x)}{x}
           GOOD: $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$

        2. NO MARKDOWN CODE BLOCKS:
           Do NOT use standard Markdown code blocks (like \`\`\`latex). 
           Your output is being parsed by a specific React Regex splitter that looks for $$ and $.

        3. VISUAL CLARITY:
           - Use \\displaystyle inside inline math if a fraction needs to be readable.

        4. EXPLANATIONS:
           - In the "explanation" field, break down the solution conceptually.
           - If the formula is complex, provide a plain English "translation" of what the symbols mean.
        
        Ensure questions test deep understanding, not just trivia.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
                        },
                        required: ["questionText", "options", "correctAnswer", "explanation", "difficulty", "type"]
                    }
                }
            }
        }));

        let jsonString = response.text?.trim() || "[]";
        // Sometimes text comes wrapped in markdown
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const questions = JSON.parse(jsonString);
        return questions.map((q: any, i: number) => ({ ...q, id: crypto.randomUUID() }));
    } catch (error) {
        console.error("Quiz Gen Error:", error);
        throw error;
    }
};

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
            model: 'gemini-2.5-flash',
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

        let jsonString = response.text?.trim() || "[]";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const questions = JSON.parse(jsonString);
        return questions.map((q: any) => ({ ...q, id: crypto.randomUUID() }));
    } catch (error) {
        console.error("File Quiz Gen Error:", error);
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
            model: 'gemini-2.5-flash',
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
        2. NO MARKDOWN CODE BLOCKS.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));

        return response.text || "Think about the core concept.";
    } catch (error) {
        return "I can't provide a hint right now.";
    }
};
