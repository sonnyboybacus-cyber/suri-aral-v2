import { useState } from 'react';
import {
    SessionData, TestMetadata, Student, ItemAnalysisResult,
    ClassInfo, SchoolInfo, SessionInfo
} from '../../types';
import { createNewSession, saveSession, loadSession } from '../../services/databaseService';

interface UseSessionManagerProps {
    userId: string;
    classes: ClassInfo[];
    schools: SchoolInfo[];
    allStudents: any[]; // Full SF1 list
}

export const useSessionManager = (
    { userId, classes, schools, allStudents }: UseSessionManagerProps
) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // RESTORE STATE LOGIC
    // Takes raw session data and context (classes, students) and reconstructs the full application state
    const restoreState = (data: SessionData) => {
        const result = {
            metadata: data.metadata,
            students: data.students || [],
            testQuestions: data.testQuestions || '',
            analysisResults: data.analysisResults || [],
            selectedClassId: '',
            activeTab: 'config' as 'config' | 'questions' | 'scores' | 'results' | 'consolidated',
            // Restore New Features
            selectedTOSId: data.selectedTOSId,
            selectedBankId: data.selectedBankId,
            aiAnalysisReport: data.aiAnalysisReport,
            remedialQuestions: data.remedialQuestions || [],
            questionAnalysis: data.questionAnalysis
        };

        // 1. Recover Metadata (School ID from Name if missing)
        if (!result.metadata.schoolId && result.metadata.school) {
            const foundSchool = schools.find(s => s.schoolName === result.metadata.school);
            if (foundSchool) result.metadata.schoolId = foundSchool.id;
        }

        // 2. Recover Class ID (from Grade/Section)
        if (result.metadata.gradeLevel && result.metadata.section) {
            const matchedClass = classes.find(c =>
                c.gradeLevel === result.metadata.gradeLevel &&
                c.section === result.metadata.section
            );
            if (matchedClass) {
                result.selectedClassId = matchedClass.id;

                // 3. Smart Student Recovery (if session has no students, e.g. template)
                if (result.students.length === 0) {
                    const classStudentIds = matchedClass.studentIds || [];
                    if (classStudentIds.length > 0) {
                        const enrolledStudents = allStudents.filter(s => classStudentIds.includes(s.linkedAccountId));
                        result.students = enrolledStudents.map(s => ({
                            id: s.id,
                            name: (s.lastName && s.firstName) ? `${s.lastName}, ${s.firstName}` : (s.name || "Unknown Student"),
                            responses: [],
                            studentAnswers: [],
                            score: 0,
                            feedback: '',
                            progressHistory: []
                        })).sort((a, b) => a.name.localeCompare(b.name));
                        // Update metadata count
                        result.metadata.testTakers = result.students.length;
                    }
                }
            }
        }

        // 4. Tab Selection
        if (result.analysisResults.length > 0) {
            result.activeTab = 'results';
        }

        return result;
    };

    const handleSave = async (
        sessionId: string | null,
        metadata: TestMetadata,
        students: Student[],
        testQuestions: string,
        analysisResults: ItemAnalysisResult[],
        // New Args
        selectedTOSId?: string,
        selectedBankId?: string,
        aiAnalysisReport?: string,
        remedialQuestions?: any[], // RemedialQuestion[]
        questionAnalysis?: any // InitialQuestionAnalysisResponse
    ) => {
        setIsSaving(true);
        const data: Omit<SessionData, 'lastModified'> = {
            metadata,
            students,
            testQuestions,
            analysisResults,
            selectedTOSId,
            selectedBankId,
            aiAnalysisReport,
            remedialQuestions,
            questionAnalysis
        };

        // SANITIZATION: Remove undefined values for Firebase compatibility
        Object.keys(data).forEach(key => {
            if (data[key as keyof typeof data] === undefined) {
                delete data[key as keyof typeof data];
            }
        });

        try {
            if (sessionId) {
                await saveSession(userId, sessionId, data);
            } else {
                const newId = await createNewSession(userId, data);
                return newId; // Return new ID to update state
            }
            return sessionId;
        } catch (error) {
            console.error("Save Session Error", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoad = async (sessionId: string) => {
        setIsLoading(true);
        try {
            const data = await loadSession(userId, sessionId);
            if (!data) throw new Error("Session not found");
            return restoreState(data);
        } catch (error) {
            console.error("Load Session Error", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isSaving,
        isLoading,
        handleSave,
        handleLoad
    };
};
