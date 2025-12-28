import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import {
    ItemAnalysisResult, Student, TestMetadata,
    SchoolInfo, ClassInfo, Teacher, Subject, SessionInfo, SessionData,
    RemedialQuestion, InitialQuestionAnalysisResponse, QuarterUnit, WeeklyUnit,
    AIContext, ChatMessage
} from '../../types';
import { QuestionBank, TOS, Question } from '../../types/questionBank';
import {
    loadSchools, loadClasses, loadTeachers, loadSubjects, listSessions,
    loadSession, createNewSession, saveSession, deleteSession,
    logUserActivity, awardXP, sendNotification, loadStudents_SF1,
    loadStudentProgress, addStudentProgress, loadUserProfile, deleteStudentProgress,
    loadQuestionBanks, loadTOSList, loadQuestions, loadTOS, updateTOS
} from '../../services/databaseService';
import {
    mapCompetenciesToItems, getInitialQuestionAnalysis,
    generateRemediationQuestions, extractTextFromPdf
} from '../../services/geminiService';
import { generateItemAnalysisReport, generateAnswerSheet } from '../../services/pdfGenerator';
import { useSessionManager } from './useSessionManager';

const initialMetadata: TestMetadata = {
    district: '',
    psds: '',
    school: '',
    schoolHead: '',
    schoolYear: '',
    titleOfExamination: '',
    dateOfExamination: '',
    quarter: '',
    answerKey: [],
    subject: '',
    gradeLevel: '',
    totalItems: 0,
    testTakers: 0,
    section: '',
    teacherInCharge: '',
    competencies: []
};

export const useItemAnalysis = (
    user: firebase.User,
    onStartAnalysis: (context: AIContext) => void,
    chatMessages: ChatMessage[]
) => {
    // Core Data
    const [metadata, setMetadata] = useState<TestMetadata>(initialMetadata);
    const [students, setStudents] = useState<Student[]>([]);
    const [analysisResults, setAnalysisResults] = useState<ItemAnalysisResult[]>([]);
    const [testQuestions, setTestQuestions] = useState<string>('');

    // UI State
    const [activeTab, setActiveTab] = useState<'config' | 'questions' | 'scores' | 'results' | 'consolidated'>('config');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // isSaving moved to useSessionManager
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [isMappingCompetencies, setIsMappingCompetencies] = useState<boolean>(false);
    const [isGeneratingRemedial, setIsGeneratingRemedial] = useState<boolean>(false);

    // Resources
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]); // Full SF1 list
    const [selectedClassId, setSelectedClassId] = useState<string>(''); // To track selected class

    // Session Management
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [showLoadModal, setShowLoadModal] = useState<boolean>(false);

    // Question Bank & TOS Integration
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [tosList, setTosList] = useState<TOS[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [selectedTOSId, setSelectedTOSId] = useState<string>('');
    const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
    const [isLoadingTOS, setIsLoadingTOS] = useState<boolean>(false);

    // AI Results
    const [aiAnalysisReport, setAiAnalysisReport] = useState<string | null>(null);
    const [remedialQuestions, setRemedialQuestions] = useState<RemedialQuestion[]>([]);
    const [questionAnalysis, setQuestionAnalysis] = useState<InitialQuestionAnalysisResponse | null>(null);
    const [showQuestionAnalysis, setShowQuestionAnalysis] = useState<boolean>(false);
    const [showRemedialModal, setShowRemedialModal] = useState<boolean>(false);
    const [isRemedialCopied, setIsRemedialCopied] = useState<boolean>(false);

    // Student Progress Modal
    const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<Student | null>(null);
    const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(false);

    // Use Session Manager Hook
    const {
        isSaving,
        isLoading: isSessionLoading,
        handleSave,
        handleLoad
    } = useSessionManager({ userId: user.uid, classes, schools, allStudents });

    // Combine loading states
    const isGlobalLoading = isLoading || isSessionLoading;

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [s, c, t, sub, sess, studList] = await Promise.all([
                    loadSchools(user.uid),
                    loadClasses(user.uid),
                    loadTeachers(user.uid),
                    loadSubjects(),
                    listSessions(user.uid),
                    loadStudents_SF1(user.uid)
                ]);
                setSchools(s.filter(x => !x.deletedAt));
                setClasses(c.filter(x => !x.deletedAt));
                setTeachers(t.filter(x => !x.deletedAt));
                setSubjects(sub.filter(x => !x.deletedAt));
                setSessions(sess);
                setAllStudents(studList);
                // Also load banks/TOS in background
                try {
                    const [b, t] = await Promise.all([
                        loadQuestionBanks(user.uid),
                        loadTOSList(user.uid)
                    ]);
                    setQuestionBanks(b);
                    setTosList(t);
                } catch (e) {
                    console.warn('Failed to load banks/TOS for integration:', e);
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [user.uid]);

    // Derived Updates
    useEffect(() => {
        if (chatMessages.length > 0) {
            const reportMsg = chatMessages.find(m => m.role === 'model');
            if (reportMsg) {
                setAiAnalysisReport(reportMsg.content);
            }
        } else {
            setAiAnalysisReport(null);
        }
    }, [chatMessages]);

    // Calculation Logic
    const calculateAnalysis = () => {
        if (students.length === 0 || metadata.totalItems === 0) return;

        const results: ItemAnalysisResult[] = [];
        for (let i = 0; i < metadata.totalItems; i++) {
            let correctCount = 0;
            students.forEach(student => {
                const isCorrect = student.studentAnswers[i] === metadata.answerKey?.[i];
                if (isCorrect) correctCount++;
                if (!student.responses) student.responses = new Array(metadata.totalItems).fill(0);
                student.responses[i] = isCorrect ? 1 : 0;
            });

            const mps = (correctCount / students.length) * 100;
            let interpretation: ItemAnalysisResult['interpretation'] = 'Not Mastered';
            if (mps >= 75) interpretation = 'Mastered';
            else if (mps >= 50) interpretation = 'Least Mastered';

            let difficulty: ItemAnalysisResult['difficulty'] = 'Difficult';
            if (mps >= 75) difficulty = 'Easy';
            else if (mps >= 35) difficulty = 'Moderate';

            results.push({
                itemNumber: i + 1,
                totalCorrect: correctCount,
                mps,
                interpretation,
                difficulty,
                competency: metadata.competencies?.[i] || ''
            });
        }
        setAnalysisResults(results);
        setMetadata(prev => ({ ...prev, testTakers: students.length }));
        setActiveTab('results');

        logUserActivity(user.uid, {
            type: 'STATS',
            title: 'Calculated Item Analysis',
            subtitle: `${metadata.titleOfExamination} - ${students.length} students`
        });
    };

    // Handlers
    const handleExtractQuestions = async (file: File) => {
        setIsExtracting(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (evt) => {
                const base64 = (evt.target?.result as string).split(',')[1];
                const text = await extractTextFromPdf({ mimeType: file.type, data: base64 });
                setTestQuestions(prev => prev + "\n\n" + text);
                setIsExtracting(false);
            };
        } catch (error) {
            console.error(error);
            setIsExtracting(false);
            alert("Failed to extract text from file.");
        }
    };

    const handleMapCompetencies = async () => {
        if (!testQuestions || metadata.totalItems === 0) {
            alert("Please input test questions and set the total number of items first.");
            return;
        }
        setIsMappingCompetencies(true);
        try {
            const selectedSubject = subjects.find(s => s.name === metadata.subject || s.code === metadata.subject);
            let officialList: string[] = [];

            if (selectedSubject && selectedSubject.curriculum) {
                const curriculumData = selectedSubject.curriculum as any;
                const curriculumArray: QuarterUnit[] = (Array.isArray(curriculumData)
                    ? curriculumData
                    : (curriculumData ? Object.values(curriculumData as object) : [])) as QuarterUnit[];

                curriculumArray.forEach((quarter: QuarterUnit) => {
                    if (quarter.weeks) {
                        const weeksData = quarter.weeks as any;
                        const weeksArray: WeeklyUnit[] = (Array.isArray(weeksData) ? weeksData : (weeksData ? Object.values(weeksData as object) : [])) as WeeklyUnit[];
                        weeksArray.forEach((week: WeeklyUnit) => {
                            if (week.competencies) {
                                week.competencies.forEach(comp => {
                                    if (comp.description) {
                                        const compText = comp.code ? `${comp.code} - ${comp.description}` : comp.description;
                                        officialList.push(compText);
                                    }
                                });
                            }
                        });
                    }
                });
            }

            const mapped = await mapCompetenciesToItems(testQuestions, metadata.totalItems, officialList);
            const newCompetencies = [...(metadata.competencies || [])];
            mapped.forEach(m => {
                if (m.itemNumber > 0 && m.itemNumber <= metadata.totalItems) {
                    newCompetencies[m.itemNumber - 1] = m.competency;
                }
            });

            setMetadata(prev => ({ ...prev, competencies: newCompetencies }));
            if (analysisResults.length > 0) {
                setAnalysisResults(prev => prev.map((r, i) => ({
                    ...r,
                    competency: newCompetencies[i] || r.competency
                })));
            }
            alert(officialList.length > 0 ? "Competencies mapped using Official Subject Curriculum!" : "Competencies mapped (No official subject match found, using general AI).");
        } catch (error) {
            console.error(error);
            alert("Failed to map competencies.");
        } finally {
            setIsMappingCompetencies(false);
        }
    };

    const handleGenerateRemedial = async () => {
        if (analysisResults.length === 0) {
            alert("Please run analysis first.");
            return;
        }
        setIsGeneratingRemedial(true);
        try {
            const result = await generateRemediationQuestions(analysisResults, metadata, testQuestions);
            setRemedialQuestions(result.questions);
            setShowRemedialModal(true);
            awardXP(user.uid, 50);
        } catch (error) {
            console.error(error);
            alert("Failed to generate remediation.");
        } finally {
            setIsGeneratingRemedial(false);
        }
    };

    const handleQuestionAnalysis = async (itemNumber: number) => {
        const comp = metadata.competencies?.[itemNumber - 1];
        const contextText = comp ? `Item testing: ${comp}` : `Item #${itemNumber}`;

        setShowQuestionAnalysis(true);
        setQuestionAnalysis(null);

        try {
            const result = await getInitialQuestionAnalysis(contextText);
            setQuestionAnalysis(result);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveSession = async () => {
        try {
            const newId = await handleSave(
                sessionId,
                metadata,
                students,
                testQuestions,
                analysisResults,
                // New Fields
                selectedTOSId,
                selectedBankId,
                aiAnalysisReport || undefined,
                remedialQuestions,
                questionAnalysis || undefined
            );

            if (newId && newId !== sessionId) {
                setSessionId(newId);
                setSessions(prev => [{ id: newId, titleOfExamination: metadata.titleOfExamination, lastModified: Date.now() }, ...prev]);
            }
            sendNotification(user.uid, {
                title: 'Session Saved',
                message: `${metadata.titleOfExamination} saved successfully.`,
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            alert("Failed to save session.");
        }
    };

    const handleLoadSession = async (id: string) => {
        try {
            const restored = await handleLoad(id);

            // Apply Restored State
            setMetadata(restored.metadata);
            setStudents(restored.students);
            setTestQuestions(restored.testQuestions);
            setAnalysisResults(restored.analysisResults);

            setSessionId(id);

            // Apply UI Sync State
            if (restored.selectedClassId) {
                setSelectedClassId(restored.selectedClassId);
            }

            // Apply New Restored Features
            if (restored.selectedTOSId) setSelectedTOSId(restored.selectedTOSId);
            if (restored.selectedBankId) setSelectedBankId(restored.selectedBankId);
            if (restored.aiAnalysisReport) setAiAnalysisReport(restored.aiAnalysisReport);
            if (restored.remedialQuestions) setRemedialQuestions(restored.remedialQuestions);
            if (restored.questionAnalysis) setQuestionAnalysis(restored.questionAnalysis);

            setActiveTab(restored.activeTab);
            setShowLoadModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to load session.");
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this session?")) {
            await deleteSession(user.uid, id);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (sessionId === id) setSessionId(null);
        }
    };

    const handleRecordScoresToHistory = async () => {
        if (!metadata.titleOfExamination || students.length === 0) {
            alert("Cannot record scores. Please ensure examination title is set and students are loaded.");
            return;
        }

        setIsLoadingProgress(true); // Re-use loading state or add specific saving state if needed
        try {
            const promises = students.map(student => {
                // Ensure score is current (recalculate) to avoid zero-score bug if Analyze wasn't clicked
                let score = 0;
                if (metadata.answerKey && metadata.answerKey.length > 0) {
                    score = student.studentAnswers.reduce((acc, ans, i) =>
                        acc + (ans && metadata.answerKey?.[i] && ans === metadata.answerKey?.[i] ? 1 : 0), 0);
                } else {
                    // Fallback if no answer key
                    score = student.responses.reduce((a: number, b: number) => a + b, 0);
                }

                return addStudentProgress(student.id, {
                    date: new Date().toISOString(),
                    testName: metadata.titleOfExamination,
                    score: score,
                    totalItems: metadata.totalItems
                });
            });

            await Promise.all(promises);

            sendNotification(user.uid, {
                title: 'Scores Recorded',
                message: `Progress history updated for ${students.length} students.`,
                type: 'success'
            });
            alert(`Successfully recorded scores for ${students.length} students.`);
        } catch (error) {
            console.error("Failed to record scores:", error);
            alert("Failed to record scores to student history.");
        } finally {
            setIsLoadingProgress(false);
        }
    };

    const handleInitializeStudents = () => {
        if (students.length === 0 && selectedClassId) {
            const cls = classes.find(c => c.id === selectedClassId);
            if (cls && cls.studentIds && cls.studentIds.length > 0) {
                const classStudents = cls.studentIds.map(sId => {
                    const idToSearch = typeof sId === 'object' ? (sId as any).id : sId;
                    const s = allStudents.find(as => as.id === idToSearch);
                    return s ? {
                        id: s.id,
                        name: (s.lastName && s.firstName)
                            ? `${s.lastName}, ${s.firstName}`
                            : (s.name || "Unknown Student"),
                        responses: [],
                        studentAnswers: Array(metadata.totalItems || 0).fill(''),
                        feedback: '',
                        progressHistory: []
                    } : null;
                }).filter(Boolean) as Student[];

                setStudents(classStudents);
            }
        }
        setActiveTab('questions');
    };

    const handleCopyRemedial = () => {
        const text = remedialQuestions.map((q, i) => (
            `Question ${i + 1}: ${q.question}\n` +
            `Options:\n${q.options.map((opt, idx) => `  ${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n` +
            `Correct Answer: ${q.correctAnswer}\n` +
            `Explanation: ${q.explanation}\n` +
            `Targeted Concept: ${q.targetedConcept}`
        )).join('\n\n------------------------------------------------\n\n');

        const header = `REMEDIAL QUESTIONS\n${metadata.titleOfExamination || 'Assessment'}\nSubject: ${metadata.subject || 'General'}\n\n`;

        navigator.clipboard.writeText(header + text).then(() => {
            setIsRemedialCopied(true);
            setTimeout(() => setIsRemedialCopied(false), 2000);
        });
    };

    const handleSchoolSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const schoolId = e.target.value;
        const selectedSchool = schools.find(s => s.id === schoolId);

        let schoolHeadName = '';
        if (selectedSchool?.principalId) {
            const principal = teachers.find(t => t.id === selectedSchool.principalId);
            if (principal) {
                schoolHeadName = `${principal.firstName} ${principal.lastName}`;
            } else {
                // Try fetching if not in teachers list
                try {
                    const profile = await loadUserProfile(selectedSchool.principalId);
                    if (profile) schoolHeadName = profile.displayName || '';
                } catch (e) { console.warn("Could not resolve Principal Name", e); }
            }
        }

        let psdsName = selectedSchool?.psds || '';
        // Check if psds looks like an ID (e.g., has numbers or is UUID-like) or just check valid teacher
        const psdsTeacher = teachers.find(t => t.id === psdsName);
        if (psdsTeacher) {
            psdsName = `${psdsTeacher.firstName} ${psdsTeacher.lastName}`;
        } else if (psdsName) {
            // Try fetching user profile directly if it looks like an ID
            try {
                const profile = await loadUserProfile(psdsName);
                if (profile) psdsName = profile.displayName || '';
            } catch (e) {
                // If fetch fails, keep original value (might be a plain text name)
                console.warn("Could not resolve PSDS Name", e);
            }
        }

        setMetadata(prev => ({
            ...prev,
            school: selectedSchool?.schoolName || '',  // Store school NAME for PDF display
            schoolId: schoolId,  // Keep ID for internal lookups if needed
            district: selectedSchool?.district || '',
            psds: psdsName,
            schoolHead: schoolHeadName || '', // Auto-filled
            // Check if we should reset class/subject
        }));
        setSelectedClassId(''); // Reset selected class
        setStudents([]); // Clear students
    };

    const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const classId = e.target.value;
        setSelectedClassId(classId);

        const selectedClass = classes.find(c => c.id === classId);
        if (selectedClass) {
            setMetadata(prev => ({
                ...prev,
                gradeLevel: selectedClass.gradeLevel,
                section: selectedClass.section,
                schoolYear: selectedClass.schoolYear || prev.schoolYear
            }));

            // Filter students based on class enrollment (Source of Truth)
            const classStudentIds = selectedClass.studentIds || [];

            if (classStudentIds.length > 0) {
                const enrolledStudents = allStudents.filter(s => classStudentIds.includes(s.linkedAccountId));

                const mappedStudents: Student[] = enrolledStudents.map(s => ({
                    id: s.id,
                    name: (s.lastName && s.firstName) ? `${s.lastName}, ${s.firstName}` : (s.name || "Unknown Student"),
                    responses: [],
                    studentAnswers: [],
                    score: 0,
                    feedback: '',
                    progressHistory: []
                })).sort((a, b) => a.name.localeCompare(b.name));

                setStudents(mappedStudents);
                setMetadata(prev => ({ ...prev, testTakers: mappedStudents.length }));
            } else {
                setStudents([]);
                setMetadata(prev => ({ ...prev, testTakers: 0 }));
            }
        } else {
            setStudents([]);
            setMetadata(prev => ({ ...prev, gradeLevel: '', section: '', testTakers: 0 }));
        }
    };

    const handleSubjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subjectName = e.target.value;

        // Find teacher for this subject in the selected class
        let teacherName = '';
        const currentClass = classes.find(c => c.id === selectedClassId);

        if (currentClass) {
            const classSubject = currentClass.subjects.find(s => s.name === subjectName);
            if (classSubject) {
                const teacher = teachers.find(t => t.id === classSubject.teacherId);
                if (teacher) {
                    teacherName = `${teacher.lastName}, ${teacher.firstName}`;
                }
            }
        }

        setMetadata(prev => ({
            ...prev,
            subject: subjectName,
            teacherInCharge: teacherName || prev.teacherInCharge // Fallback to existing if not found (or allow manual override later)
        }));
    };


    // Integration Handlers
    const handleBankSelect = async (bankId: string) => {
        setIsLoadingBanks(true);
        try {
            const bank = questionBanks.find(b => b.id === bankId);
            const questions = await loadQuestions(bankId);

            if (bank && questions.length > 0) {
                // 1. Format Questions for AI Context
                const formattedQuestions = questions.map((q, idx) => {
                    let text = `${idx + 1}. ${q.questionText}\n`;
                    if (q.options) {
                        q.options.forEach(opt => {
                            text += `${opt.letter}. ${opt.text}\n`;
                        });
                    }
                    return text;
                }).join('\n');
                setTestQuestions(formattedQuestions);

                // 2. Extract Answer Key
                const key = questions.map(q => {
                    // Normalize standard keys (A, B, C, D) or value
                    const ans = q.correctAnswer.trim().toUpperCase();
                    return (['A', 'B', 'C', 'D'].includes(ans)) ? ans : ans.substring(0, 1);
                });

                // 3. Update Metadata
                setMetadata(prev => ({
                    ...prev,
                    titleOfExamination: bank.name,
                    subject: bank.subject,
                    gradeLevel: bank.gradeLevel,
                    schoolYear: bank.schoolYear,
                    totalItems: questions.length,
                    answerKey: key
                }));

                setSelectedBankId(bankId);
            }
        } catch (e) {
            console.error('Failed to load bank details:', e);
            alert('Failed to load question bank details.');
        } finally {
            setIsLoadingBanks(false);
        }
    };

    const handleTOSSelect = async (tosId: string) => {
        setIsLoadingTOS(true);
        try {
            const tos = await loadTOS(tosId);
            if (tos) {
                // Initialize array with empty strings based on total items
                const totalItems = metadata.totalItems || tos.totalItems || 50;
                const newCompetencies: string[] = new Array(totalItems).fill('');

                // Map TOS entries to specific item indices
                tos.entries.forEach(entry => {
                    const compText = `${entry.competencyCode}: ${entry.learningCompetency}`;

                    if (entry.itemPlacement && entry.itemPlacement.length > 0) {
                        entry.itemPlacement.forEach(itemNum => {
                            // itemPlacement is 1-based, array is 0-based
                            if (itemNum > 0 && itemNum <= totalItems) {
                                newCompetencies[itemNum - 1] = compText;
                            }
                        });
                    }
                });

                setMetadata(prev => ({
                    ...prev,
                    competencies: newCompetencies,
                    // Auto-fill other fields if empty
                    subject: prev.subject || tos.subject,
                    gradeLevel: prev.gradeLevel || tos.gradeLevel,
                    quarter: prev.quarter || tos.quarter,
                    totalItems: tos.totalItems || prev.totalItems,
                    titleOfExamination: prev.titleOfExamination || tos.title // Auto-fill Title from TOS
                }));

                setSelectedTOSId(tosId);

                // Auto-load Linked Question Bank
                if (tos.linkedQuestionBankId) {
                    await handleBankSelect(tos.linkedQuestionBankId);
                } else {
                    // Check if there is a 'smart match' by name/subject to suggest?
                    // For now, we will rely on UI to prompt user to link manually if missing.
                }
            }
        } catch (e) {
            console.error('Failed to load TOS details:', e);
            alert('Failed to load TOS details.');
        } finally {
            setIsLoadingTOS(false);
        }
    };

    const handleLinkTOSToBank = async (bankId: string) => {
        if (!selectedTOSId) return;
        try {
            await updateTOS(selectedTOSId, { linkedQuestionBankId: bankId });

            // Update local state for immediate feedback
            setTosList(prev => prev.map(t => t.id === selectedTOSId ? { ...t, linkedQuestionBankId: bankId } : t));

            // Auto-load the bank now
            await handleBankSelect(bankId);

            alert("Question Bank linked successfully! It will now auto-load whenever you select this TOS.");
        } catch (e) {
            console.error("Failed to link TOS to Bank:", e);
            alert("Failed to save the link. Please try again.");
        }
    };
    const handleAnswerKeyChange = (index: number, val: string) => {
        const newKey = [...(metadata.answerKey || Array(metadata.totalItems).fill(''))];
        // Resize if needed
        while (newKey.length < metadata.totalItems) newKey.push('');
        while (newKey.length > metadata.totalItems) newKey.pop();

        newKey[index] = val.toUpperCase();
        setMetadata(prev => ({ ...prev, answerKey: newKey }));
    };

    const handleDeleteProgress = async (studentId: string, recordId: string) => {
        if (!confirm("Are you sure you want to delete this specific progress record?")) return;
        setIsLoadingProgress(true);
        try {
            await deleteStudentProgress(studentId, recordId);

            // Update Local State
            if (selectedStudentForProgress && selectedStudentForProgress.id === studentId) {
                const updatedHistory = (selectedStudentForProgress.progressHistory || []).filter(h => h.id !== recordId);
                const updatedStudent = { ...selectedStudentForProgress, progressHistory: updatedHistory };
                setSelectedStudentForProgress(updatedStudent);

                setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
            }
        } catch (e) {
            console.error("Delete progress failed", e);
            alert("Failed to delete record.");
        } finally {
            setIsLoadingProgress(false);
        }
    };

    return {
        // State
        metadata, setMetadata,
        handleAnswerKeyChange,
        students, setStudents,
        analysisResults, setAnalysisResults,
        testQuestions, setTestQuestions,
        activeTab, setActiveTab,
        isLoading: isGlobalLoading,
        isSaving,
        isExtracting,
        isMappingCompetencies,
        isGeneratingRemedial,
        schools, classes, teachers, subjects, allStudents,
        selectedClassId, setSelectedClassId, // Exposed for UI Sync
        sessionId, sessions, showLoadModal, setShowLoadModal,
        questionBanks,
        tosList,
        selectedBankId,
        selectedTOSId,
        isLoadingBanks,
        isLoadingTOS,
        handleBankSelect,
        handleTOSSelect,
        handleLinkTOSToBank,
        aiAnalysisReport, remedialQuestions, questionAnalysis,
        showQuestionAnalysis, setShowQuestionAnalysis,
        showRemedialModal, setShowRemedialModal,
        isRemedialCopied,
        selectedStudentForProgress, setSelectedStudentForProgress,
        isLoadingProgress, setIsLoadingProgress,

        // Handlers
        calculateAnalysis,
        handleExtractQuestions,
        handleMapCompetencies,
        handleGenerateRemedial,
        handleQuestionAnalysis,
        handleSaveSession,
        handleLoadSession,
        handleDeleteSession,
        handleRecordScoresToHistory,
        handleInitializeStudents,
        handleCopyRemedial,
        handleSchoolSelect,
        handleClassSelect,
        handleSubjectSelect,
        handleDeleteProgress,
        handleOpenProgress: (student: Student) => {
            setSelectedStudentForProgress(student);
            setIsLoadingProgress(true);
            loadStudentProgress(user.uid, student.id)
                .then(history => {
                    const updatedStudent = { ...student, progressHistory: history || [] };
                    setSelectedStudentForProgress(updatedStudent);
                    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
                })
                .catch(e => console.error("Failed to load progress", e))
                .finally(() => setIsLoadingProgress(false));
        }
    };
};
