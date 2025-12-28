
import { GenerateContentResponse, Type } from "@google/genai";
import { getAI, getAIModel, withRetry } from "./aiCore";
import { Question } from "../../types/questionBank";

interface AIAnswer {
    correctAnswer: string;
    explanation: string;
}

export const solveQuestion = async (
    questionText: string,
    options?: string[],
    type: 'Multiple Choice' | 'Identification' | 'True/False' = 'Multiple Choice'
): Promise<AIAnswer> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as a Subject Matter Expert Professor.
        Analyze this question and provide the correct answer and a brief explanation.

        Question: "${questionText}"
        ${options && options.length > 0 ? `Options: ${JSON.stringify(options)}` : ''}
        Type: ${type}

        Output JSON strictly.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ["correctAnswer", "explanation"]
                }
            }
        }));

        const jsonString = response.text?.trim() || "{}";
        return JSON.parse(jsonString) as AIAnswer;
    } catch (error) {
        console.error("AI Solve Error:", error);
        throw new Error("Failed to solve question with AI");
    }
};

export interface AIImportedQuestion {
    questionText: string;
    questionType: 'multiple_choice' | 'true_false' | 'identification' | 'essay';
    options?: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[];
    correctAnswer: string;
    explanation?: string;
    // Generated metadata
    cognitiveLevel?: string;
    difficultyLevel?: string;
}

export const extractQuestionsFromPDF = async (
    questionFileBase64: string,
    answerFileBase64?: string
): Promise<AIImportedQuestion[]> => {
    try {
        const ai = getAI();
        const parts: any[] = [
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: questionFileBase64
                }
            }
        ];

        if (answerFileBase64) {
            parts.push({
                inlineData: {
                    mimeType: "application/pdf",
                    data: answerFileBase64
                }
            });
        }

        const prompt = `
        Act as a Test Parser. 
        Extract all questions from the attached PDF document(s).
        
        ${answerFileBase64 ? 'I have attached both the Question Paper and the Answer Key. Match the answers to the questions.' : 'I have attached the Question Paper. Please identify the correct answer if marked, or solve it yourself if not marked.'}

        For each question:
        1. Identify the text.
        2. Identify the type (Multiple Choice, True/False, Identification, Essay).
        3. Extract options if Multiple Choice (A, B, C, D).
        4. Provide the correct answer (Letter for MC, True/False for TF, phrase for ID).
        5. Provide a brief explanation for the answer.

        Output a JSON array of objects.
        `;

        parts.push({ text: prompt });

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: parts }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionText: { type: Type.STRING },
                            questionType: { type: Type.STRING, enum: ['multiple_choice', 'true_false', 'identification', 'essay'] },
                            options: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        letter: { type: Type.STRING },
                                        text: { type: Type.STRING }
                                    },
                                    required: ["letter", "text"]
                                }
                            },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                        },
                        required: ["questionText", "questionType", "correctAnswer"]
                    }
                }
            }
        }));

        const jsonString = response.text?.trim() || "[]";
        return JSON.parse(jsonString) as AIImportedQuestion[];
    } catch (error: any) {
        console.error("AI PDF Extract Error:", error);
        throw new Error(error.message || "Failed to extract questions from PDF");
    }
};

/**
 * Generates new questions for a specific TOS competency slot.
 */
export const generateQuestionsForCompetency = async (
    competencyCode: string,
    learningCompetency: string,
    cognitiveLevel: string,
    subject: string,
    gradeLevel: string,
    count: number = 3
): Promise<AIImportedQuestion[]> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as a Teacher and Examiner for ${gradeLevel} ${subject}.
        Generate ${count} ORIGINAL exam questions targeting the following competency:

        Competency Code: ${competencyCode}
        Description: ${learningCompetency}
        Cognitive Level: ${cognitiveLevel} (Bloom's Taxonomy)

        Ensure the questions are:
        1. Appropriate for the grade level.
        2. Strictly aligned with the cognitive level (e.g. Analyzing should require analysis, not just recall).
        3. Varied in type (Multiple Choice is preferred, but True/False is okay).
        4. High quality and distinct from each other.

        Output a JSON array of questions.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash', // Using 2.0 Flash for speed/quality balance
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionText: { type: Type.STRING },
                            questionType: { type: Type.STRING, enum: ['multiple_choice', 'true_false'] },
                            options: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        letter: { type: Type.STRING },
                                        text: { type: Type.STRING }
                                    },
                                    required: ["letter", "text"]
                                }
                            },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            difficultyLevel: { type: Type.STRING, enum: ['Easy', 'Average', 'Difficult'] }
                        },
                        required: ["questionText", "questionType", "correctAnswer", "difficultyLevel"]
                    }
                }
            }
        }));

        const jsonString = response.text?.trim() || "[]";
        // Map to ensure types match
        const raw = JSON.parse(jsonString);
        return raw.map((q: any) => ({
            ...q,
            cognitiveLevel, // Force align
            difficultyLevel: q.difficultyLevel || 'Average'
        }));

    } catch (error: any) {
        console.error("AI Generate Questions Error:", error);
        throw new Error("Failed to generate questions");
    }
};

export const improveQuestionWithAI = async (
    question: Partial<Question>
): Promise<{
    improved: Partial<Question>;
    changes: string[];
}> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as an Expert Academic Editor and Assessment Specialist.
        Review the following exam question and improve it for:
        1. Grammar and Spelling errors.
        2. Clarity and Conciseness (remove wordiness).
        3. Parallelism in Options (for Multiple Choice).
        4. Bloom's Taxonomy alignment (ensure phrasing matches ${question.cognitiveLevel || 'the intended level'}).
        5. Removal of bias or ambiguity.

        Original Question Data:
        Question Text: "${question.questionText}"
        Type: ${question.questionType}
        ${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}
        Correct Answer: "${question.correctAnswer}"
        Explanation: "${question.explanation}"

        Output a JSON object with:
        - "improved": The full question object with your fixes applied.
        - "changes": An array of strings explaining specifically what you fixed (e.g., "Corrected subject-verb agreement", "Made options parallel").

        If the question is already perfect, return it as is but note "No changes needed" in changes.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        improved: {
                            type: Type.OBJECT,
                            properties: {
                                questionText: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            letter: { type: Type.STRING },
                                            text: { type: Type.STRING }
                                        },
                                        required: ["letter", "text"]
                                    }
                                },
                                explanation: { type: Type.STRING }
                            },
                            required: ["questionText"]
                        },
                        changes: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["improved", "changes"]
                }
            }
        }));

        const jsonString = response.text?.trim() || "{}";
        const result = JSON.parse(jsonString);

        return {
            improved: {
                ...question,
                ...result.improved
            },
            changes: result.changes
        };

    } catch (error: any) {
        console.error("AI Improve Question Error:", error);
        throw new Error(error.message || "Failed to improve question with AI");
    }
};

export interface MetadataAnalysis {
    competencyCode: string;
    learningCompetency: string;
    cognitiveLevel: string;
    difficultyLevel: string;
    reasoning: string;
}

export const analyzeQuestionMetadata = async (
    questionText: string,
    subject: string,
    gradeLevel: string,
    availableCompetencies: { code: string; desc: string; topic?: string; contentStandard?: string; performanceStandard?: string }[]
): Promise<MetadataAnalysis> => {
    try {
        const ai = getAI();

        // Limit competencies to save context if list is huge (top 50 or similar strategy might be needed in real app)
        const competencyListString = availableCompetencies
            .map((c, index) => `
            Option [${index}]:
            Code: ${c.code}
            Topic: ${c.topic || 'N/A'}
            Content Standard: ${c.contentStandard || 'N/A'}
            Performance Standard: ${c.performanceStandard || 'N/A'}
            Competency: ${c.desc}
            `).join('\n-------------------\n');

        const prompt = `
        Act as an Education Curriculum Expert.
        
        Task: Analyze the Question below and match it to one of the provided Learning Competency Options.
        
        CRITICAL INSTRUCTIONS: 
        1. **Best Available Fit**: You must select the **Index Number** of the competency that is the *closest* conceptual match to the question, even if not perfect.
        2. **Closed Set**: You must ONLY choose from the provided "List of Options". Do not invent or hallucinate new competencies.
        3. **Contextual Matching**: Use the 'Topic', 'Content Standard', and 'Performance Standard' as strong clues. If the question pertains to the Topic, select the competency within that Topic that best describes the specific action/skill.
        4. **Cognitive Level Analysis**: strict analysis based on the following **Revised Bloom's Taxonomy Reference Guide**. Match the question's construction to these examples:
           - **Remembering**: Recall (e.g., "What is...", "List...", "Who wrote...", "When did...").
           - **Understanding**: Explain meaning (e.g., "Explain in own words...", "Summarize...", "Interpret...", "What does it mean...").
           - **Applying**: Use in new situation (e.g., "How would you use...", "Solve...", "Apply principles...", "Demonstrate...", "Calculate...").
           - **Analyzing**: Distinguish parts (e.g., "Compare and contrast...", "Differentiate...", "Analyze causes...", "Break down...", "Classify...").
           - **Evaluating**: Justify decision (e.g., "Do you agree?", "Critique...", "Assess impact...", "Which is effective?", "Judge significance...").
           - **Creating**: Create new product (e.g., "Design...", "Rewrite...", "Propose solutions...", "Formulate hypothesis...", "Invent...").
        5. **Avoid "No Match"**: Only return index -1 if the question is completely unrelated to the subject matter (e.g., a Math question in an English exam). Otherwise, pick the best candidate.

        List of Options:
        ${competencyListString}

        Question: "${questionText}"
        Subject: ${subject}
        Grade: ${gradeLevel}

        Tasks:
        1. Identify the 'bestMatchIndex' (integer).
        2. Determine 'cognitiveLevel' (Bloom's).
        3. Determine 'difficultyLevel' (Easy/Average/Difficult).
        4. Provide 'reasoning' (Explain WHY it matches the specific competency code, or why it failed if -1).

        Output JSON strictly.
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        bestMatchIndex: { type: Type.INTEGER, description: "The index required from the options list" },
                        cognitiveLevel: { type: Type.STRING, enum: ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'] },
                        difficultyLevel: { type: Type.STRING, enum: ['Easy', 'Average', 'Difficult'] },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["bestMatchIndex", "cognitiveLevel", "difficultyLevel", "reasoning"]
                }
            }
        }));

        const jsonString = response.text?.trim() || "{}";

        // Sanitize JSON (remove markdown code blocks if present)
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try {
            result = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("Failed to parse AI response:", cleanJson);
            throw new Error(`AI returned invalid JSON: ${cleanJson.substring(0, 50)}...`);
        }

        let selectedCode = '';
        let selectedDesc = '';

        if (result.bestMatchIndex !== undefined && result.bestMatchIndex >= 0 && result.bestMatchIndex < availableCompetencies.length) {
            const match = availableCompetencies[result.bestMatchIndex];
            selectedCode = match.code;
            selectedDesc = match.desc;
        } else {
            // Fallback or None found
            selectedCode = 'None';
            selectedDesc = 'No suitable competency found in list';
        }

        return {
            competencyCode: selectedCode,
            learningCompetency: selectedDesc,
            cognitiveLevel: result.cognitiveLevel,
            difficultyLevel: result.difficultyLevel,
            reasoning: result.reasoning
        };

    } catch (error: any) {
        console.error("AI Analyze Metadata Error:", error);
        // Throw the actual error message so the user sees it in the alert
        throw new Error(error.message || "Failed to analyze question metadata.");
    }
};
