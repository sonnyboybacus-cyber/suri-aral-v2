
import { Chat, GenerateContentResponse, Schema, Type } from "@google/genai";
import { AdvancedAnalysisResult, AIContext, AnalysisTier, InitialAnalysisResponse } from "../../types";
import { getAI, getAIModel, withRetry } from "./aiCore";

// Single active chat instance for the consolidated service
let activeChat: Chat | null = null;

// --- SHARED DATA ANALYSIS LOGIC ---
export const performAdvancedAnalysis = async (data: string, tier: AnalysisTier): Promise<AdvancedAnalysisResult> => {
    try {
        const ai = getAI();
        const prompt = `
        Role: Lead Data Scientist & Statistician using Python (Pandas, Scikit-learn, Statsmodels).
        Task: Perform a deep "${tier}" analysis on the provided dataset.
        
        Data Sample (First 15k chars): 
        ${data.substring(0, 15000)}...
        
        TIER INSTRUCTIONS:
        
        1. **Descriptive**: 
           - Calculate Mean, Median, Mode, Std Dev, Variance, Skewness, Kurtosis.
           - Chart: Histogram or Box Plot distribution.
           - Insight: Identify outliers and distribution shape.
           
        2. **Inferential**:
           - Perform Hypothesis Testing (T-Test or ANOVA depending on data groups).
           - Chart: Error Bar chart or confidence intervals.
           - Insight: State the Null Hypothesis and whether to reject it based on P-value.
           
        3. **Regression**:
           - Perform Linear or Logistic Regression.
           - Chart: Scatter plot with Line of Best Fit.
           - Insight: Report R-Squared and correlation coefficients.
           
        4. **Predictive**:
           - Use Time-Series forecasting (ARIMA simulation) or Trend Extrapolation.
           - Chart: Line chart with dashed "Forecast" section.
           - Insight: Predict next 3-5 periods with confidence interval.
           
        5. **Multivariate**:
           - Simulate PCA (Principal Component Analysis) or K-Means Clustering.
           - Chart: Scatter plot of PC1 vs PC2, or Clusters.
           - Insight: Explain variance explained by components.

        OUTPUT FORMAT (Strict JSON):
        You must map the analysis to this schema.
        - 'chartData': Array of objects. 
           - Key 'name': The X-axis label (string).
           - Key 'value1': Primary metric (e.g., Count, Y-value).
           - Key 'value2': Secondary metric (e.g., Regression Line, Forecast, Error Upper Bound).
        - 'legendMapping': Map 'value1', 'value2' to real names (e.g., {"value1": "Actual Sales", "value2": "Predicted Sales"}).
        - 'summaryTable': A professional statistical table (e.g., ANOVA table, Regression Summary).
        - 'insight': A professional, executive summary of the findings.
        
        Ensure all numerical values are numbers, not strings.
        `;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                tier: { type: Type.STRING },
                insight: { type: Type.STRING },
                chartType: { type: Type.STRING, enum: ['bar', 'line', 'area', 'scatter', 'composed'] },
                xAxisKey: { type: Type.STRING },
                dataKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
                legendMapping: {
                    type: Type.OBJECT,
                    properties: {
                        value1: { type: Type.STRING },
                        value2: { type: Type.STRING },
                        value3: { type: Type.STRING },
                        value4: { type: Type.STRING },
                        value5: { type: Type.STRING }
                    }
                },
                chartData: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            value1: { type: Type.NUMBER },
                            value2: { type: Type.NUMBER },
                            value3: { type: Type.NUMBER },
                            value4: { type: Type.NUMBER },
                            value5: { type: Type.NUMBER },
                        },
                        required: ["name", "value1"]
                    }
                },
                summaryTable: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        rows: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    value: { type: Type.STRING },
                                    significance: { type: Type.BOOLEAN }
                                },
                                required: ["label", "value"]
                            }
                        }
                    }
                },
                equation: { type: Type.STRING },
                rSquared: { type: Type.NUMBER },
                testName: { type: Type.STRING },
                pValue: { type: Type.NUMBER }
            },
            required: ["tier", "insight", "chartType", "chartData", "xAxisKey", "dataKeys"]
        };

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: getAIModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        }));

        let jsonString = response.text || "{}";
        jsonString = jsonString.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Data Analysis Error:", error);
        throw error;
    }
};

// --- UNIFIED CHAT LOGIC ---

export const startAnalysisChat = async (context: AIContext): Promise<InitialAnalysisResponse> => {
    const ai = getAI();
    activeChat = null; // Reset chat session

    // BRANCH 1: Data Analysis Context (DataSA)
    if (context.advancedAnalysisResult) {
        const analysis = context.advancedAnalysisResult;
        console.log("Initializing Data Scientist Persona...");

        const systemContext = `
        You are a Lead Data Scientist specializing in ${analysis.tier} statistics.
        
        CURRENT ANALYSIS CONTEXT:
        - Tier: ${analysis.tier}
        - Insight: "${analysis.insight}"
        - R-Squared: ${analysis.rSquared || 'N/A'}
        - P-Value: ${analysis.pValue !== undefined ? analysis.pValue : 'N/A'}
        - Equation: ${analysis.equation || 'N/A'}
        
        RAW DATA SUMMARY:
        ${JSON.stringify(analysis.summaryTable)}
        
        GOAL:
        Explain these findings to a user who might not be a statistician. 
        Use the provided metrics (like p-value < 0.05) to justify your claims scientifically but simply.
        `;

        activeChat = ai.chats.create({
            model: getAIModel(),
            config: { systemInstruction: systemContext }
        });

        // Trigger initial summary
        const prompt = "Please summarize these findings and explain what the statistical metrics imply for my data.";

        try {
            const response = await withRetry<GenerateContentResponse>(() => activeChat!.sendMessage({ message: prompt }));

            // Dynamic suggestions based on tier
            let suggestions = ["Explain the chart", "Identify outliers"];
            if (analysis.tier === 'inferential') suggestions = ["Explain P-Value", "Is this significant?"];
            if (analysis.tier === 'regression') suggestions = ["Predict next value", "Correlation?", "R-Squared?"];

            return {
                analysisReport: response.text || "I have analyzed the data.",
                suggestedQuestions: suggestions
            };
        } catch (error) {
            console.error("Data Insights Start Error:", error);
            return {
                analysisReport: "I encountered an error initializing the data analysis chat. You can still ask me questions about your data.",
                suggestedQuestions: ["Summarize findings", "Explain significance"]
            };
        }
    }

    // BRANCH 2: Item Analysis Context (Default)
    else {
        console.log("Initializing Educational Data Analyst Persona...");
        try {
            const prompt = `
            Here is the Item Analysis Data:
            Metadata: ${JSON.stringify(context.metadata)}
            Results (including Competencies): ${JSON.stringify(context.analysisResults)}
            
            FULL TEST QUESTIONS CONTEXT:
            "${context.questions ? context.questions.substring(0, 50000) : 'No question text provided'}"
            
            TASK:
            1. A comprehensive analysis report (Markdown format).
               - **CRITICAL:** You MUST correlate the statistical result (MPS) with the actual CONTENT of the question/competency.
               - Example: "Item 5 (MPS 20%) tested 'Fraction Multiplication'. The low score suggests students struggle with..."
               - Group your insights by the provided 'competency' fields.
               - Use the provided test questions text to quote specific parts of difficult items if available.
               - **IMPORTANT:** Do NOT include a "Suggested Questions" section in the report text itself.
            2. 3-5 suggested follow-up questions for the teacher. Keep them very short (Max 8 words each).
            `;

            const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: getAIModel(),
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

            activeChat = ai.chats.create({
                model: getAIModel(),
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

            activeChat = ai.chats.create({
                model: getAIModel(),
                config: {
                    systemInstruction: "You are an expert Educational Data Analyst.",
                }
            });

            return {
                analysisReport: `### ⚠️ Service Busy\n\nI am currently experiencing high traffic volume (Rate Limit Exceeded). \n\nThe analysis could not be generated automatically at this moment. Please try asking me a specific question below to start the conversation manually.\n\n*Error Details: ${error.message || 'Resource Exhausted'}*`,
                suggestedQuestions: ["Analyze the results", "Identify gaps"]
            };
        }
    }
};

export const continueAnalysisChat = async (message: string): Promise<string> => {
    if (!activeChat) {
        // Fallback or auto-recovery
        throw new Error("Chat not initialized. Please restart the analysis.");
    }
    const response = await withRetry<GenerateContentResponse>(() => activeChat!.sendMessage({ message }));
    return response.text || "";
};
