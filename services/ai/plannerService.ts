
import { GenerateContentResponse, Type, Schema } from "@google/genai";
import { ClassSubject, LessonPlan, ScheduleItem, ScheduleSlot, Rubric } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

// ... (Search and Study Schedule functions remain unchanged) ...

export const searchEducationalResources = async (query: string): Promise<{ title: string, uri: string }[]> => {
    try {
        const ai = getAI();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: `Find 5 high-quality educational websites, videos, or articles for teaching: "${query}".`,
            config: { tools: [{ googleSearch: {} }] }
        }));

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
            return chunks.filter((c: any) => c.web?.uri && c.web?.title).map((c: any) => ({
                title: c.web.title,
                uri: c.web.uri
            }));
        }
        return [];
    } catch (error) {
        console.error("Resource Search Error:", error);
        return [];
    }
};

export const generateStudySchedule = async (eventName: string, examDate: string, topics: string, difficulty: string): Promise<ScheduleItem[]> => {
    try {
        const ai = getAI();
        const prompt = `Create a study schedule for "${eventName}" on ${examDate}. Topics: ${topics}. Intensity: ${difficulty}. Today: ${new Date().toISOString().split('T')[0]}. Return JSON array.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { date: { type: Type.STRING }, topic: { type: Type.STRING }, focus: { type: Type.STRING } },
                        required: ["date", "topic", "focus"]
                    }
                }
            }
        }));
        let jsonString = response.text || "[]";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        return JSON.parse(jsonString).map((item: any) => ({
            date: item.date || new Date().toISOString(),
            topic: item.topic || "Review",
            focus: item.focus || "General Study"
        }));
    } catch (error) { throw error; }
};

export const generateLessonPlan = async (area: string, grade: string, quarter: string, time: string, topic: string, code: string, strategy: string, context?: any): Promise<LessonPlan> => {
    try {
        const ai = getAI();
        const prompt = `Create a Detailed Lesson Plan (DLP) for ${area} ${grade}, Quarter ${quarter}, Topic: ${topic} (${code}), Strategy: ${strategy}. Context: ${JSON.stringify(context)}.`;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                contentStandards: { type: Type.STRING },
                performanceStandards: { type: Type.STRING },
                learningCompetencies: { type: Type.STRING },
                objectivesKnowledge: { type: Type.STRING },
                objectivesPsychomotor: { type: Type.STRING },
                objectivesAffective: { type: Type.STRING },
                concepts: { type: Type.STRING },
                refGuidePages: { type: Type.STRING },
                refLearnerPages: { type: Type.STRING },
                refTextbookPages: { type: Type.STRING },
                otherResources: { type: Type.STRING },
                preparatoryActivities: { type: Type.STRING },
                presentation: { type: Type.STRING },
                lessonProper: { type: Type.STRING },
                groupActivity: { type: Type.STRING },
                assessment: { type: Type.STRING },
                assignment: { type: Type.STRING }
            },
            required: ["contentStandards", "performanceStandards", "learningCompetencies", "objectivesKnowledge", "objectivesPsychomotor", "objectivesAffective", "concepts", "preparatoryActivities", "presentation", "lessonProper", "groupActivity", "assessment", "assignment"]
        };

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema }
        }));

        const json = JSON.parse(response.text || "{}");
        return {
            id: crypto.randomUUID(),
            type: 'DLP',
            createdAt: Date.now(),
            preparedBy: "",
            notedBy: "",
            learningArea: area, gradeLevel: grade, quarter, timeAllotment: time, topic, competencyCode: code, strategy,
            ...json
        };
    } catch (error) { throw error; }
};

export const generateDLL = async (area: string, grade: string, quarter: string, topic: string, code: string, context?: any): Promise<LessonPlan> => {
    try {
        const ai = getAI();
        const prompt = `Create a Daily Lesson Log (DLL) for ${area} ${grade}, Quarter ${quarter}, Topic: ${topic} (${code}). Context: ${JSON.stringify(context)}.`;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                days: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.STRING },
                            objectives: { type: Type.STRING },
                            content: { type: Type.STRING },
                            resources: { type: Type.STRING },
                            procedures: { type: Type.STRING },
                            remarks: { type: Type.STRING }
                        },
                        required: ["day", "objectives", "content", "resources", "procedures", "remarks"]
                    }
                }
            },
            required: ["days"]
        };

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema }
        }));

        const json = JSON.parse(response.text || "{}");
        return {
            id: crypto.randomUUID(),
            type: 'DLL',
            createdAt: Date.now(),
            preparedBy: "",
            notedBy: "",
            learningArea: area, gradeLevel: grade, quarter, timeAllotment: "", topic, competencyCode: code, strategy: "",
            contentStandards: "", performanceStandards: "", learningCompetencies: "", objectivesKnowledge: "", objectivesPsychomotor: "", objectivesAffective: "", concepts: "", refGuidePages: "", refLearnerPages: "", refTextbookPages: "", otherResources: "", preparatoryActivities: "", presentation: "", lessonProper: "", groupActivity: "", assessment: "", assignment: "",
            dllWeek: json.days || []
        };
    } catch (error) { throw error; }
};

// ... (Other functions remain unchanged) ...

export const generateSmartSchedule = async (subjects: { id: string, name: string }[], gradeLevel: string, start: string, end: string): Promise<ScheduleSlot[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Create a weekly class schedule for ${gradeLevel}.
        School Hours: ${start} to ${end}.
        Subjects to schedule (IMPORTANT: Use EXACTLY these names):
        ${JSON.stringify(subjects.map(s => s.name))}
        
        Constraints:
        - Distribute major subjects (Math, Science, English) in morning slots if possible.
        - Ensure breaks (Recess/Lunch) are included.
        - Return a JSON array of slots.
        
        Output format per slot:
        {
            "day": "Monday",
            "startTime": "07:30",
            "endTime": "08:30",
            "subjectName": "Mathematics",
            "type": "class" (or "break")
        }
        `;

        const responseSchema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING },
                    subjectName: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['class', 'break'] }
                },
                required: ["day", "startTime", "endTime", "subjectName", "type"]
            }
        };

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        }));

        let jsonString = response.text || "[]";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(jsonString);

        // We map back to IDs in the component, not here, as the AI only knows names.
        return parsed;
    } catch (error) {
        console.error("Schedule Gen Error:", error);
        throw error;
    }
};

// ... (Rubric and Quiz generation remain unchanged) ...
export const generateDifferentiation = async (topic: string, currentContent: string): Promise<{ remedial: string, average: string, enrichment: string }> => {
    try {
        const ai = getAI();
        const prompt = `Context: Lesson "${topic}". Activity: "${currentContent.substring(0, 1000)}". Create 3 differentiated versions (Remedial, Average, Enrichment). Return JSON.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { remedial: { type: Type.STRING }, average: { type: Type.STRING }, enrichment: { type: Type.STRING } } } }
        }));
        return JSON.parse(response.text || "{}");
    } catch { throw new Error("Failed"); }
};

export const generateRubric = async (objectives: string, type: 'analytic' | 'holistic'): Promise<Rubric> => {
    try {
        const ai = getAI();
        const prompt = `Create ${type} rubric for: "${objectives}". Return JSON {title, criteria:[{name, levels:[{score, description}]}]}`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: { responseMimeType: "application/json" } // Simplified schema for brevity in this snippet
        }));
        return JSON.parse(response.text || "{}");
    } catch { throw new Error("Failed"); }
};

export const generateQuiz = async (content: string, numItems: number): Promise<any[]> => {
    try {
        const ai = getAI();
        const prompt = `Create ${numItems}-item MC quiz on: "${content.substring(0, 1000)}". Return JSON array {question, options[], answer}`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch { throw new Error("Failed"); }
};
