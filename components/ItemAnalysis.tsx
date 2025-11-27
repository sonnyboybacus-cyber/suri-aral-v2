
import React, { useState, useEffect, useRef, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { AIContext, ChatMessage, ItemAnalysisResult, SessionInfo, Student, TestMetadata, ClassInfo, SchoolInfo, ProgressRecord, Teacher, InitialQuestionAnalysisResponse, RemediationResponse, Subject, QuarterUnit, WeeklyUnit } from '../types';
import { loadSession, listSessions, createNewSession, saveSession, deleteSession, loadClasses, loadSchools, loadTeachers, logActivity, saveStudentProgress, loadStudentProgress, sendNotification, loadSubjects } from '../services/databaseService';
import { generateAndDownloadRawScoreCSV, generateAndDownloadAnalysisCSV } from '../services/csvHelper';
import { analyzeAnswerSheetFromImage, analyzeAnswerSheetFrame, extractTextFromPdf, getInitialQuestionAnalysis, continueQuestionAnalysisChat, generateRemediationQuestions, mapCompetenciesToItems } from '../services/geminiService';
import { 
    SaveIcon, BrainCircuitIcon, SpinnerIcon, 
    PlusIcon, TrashIcon, ChevronDownIcon, XIcon, 
    DownloadIcon, HistoryIcon, CameraIcon, UploadIcon, 
    TrendingUpIcon, PrinterIcon, FileTextIcon,
    SearchIcon, UserIcon, BotIcon, LightbulbIcon,
    MessageSquareIcon, SparklesIcon, CopyIcon, CheckCircleIcon, CheckSquareIcon
} from './icons';
import jsPDF from 'jspdf';

interface ItemAnalysisProps {
    user: firebase.User;
    onStartAnalysis: (context: AIContext) => void;
    chatMessages: ChatMessage[];
}

const initialMetadata: TestMetadata = {
  district: '',
  psds: '',
  school: '',
  schoolHead: '',
  schoolYear: '',
  titleOfExamination: '',
  subject: '',
  gradeLevel: '',
  totalItems: 0,
  testTakers: 0,
  section: '',
  teacherInCharge: '',
  answerKey: []
};

// Helper to safely convert Firebase object/array to Array
const safeArray = <T,>(data: any, length?: number, fillValue?: any): T[] => {
    let arr: T[] = [];
    if (Array.isArray(data)) {
        arr = data;
    } else if (data && typeof data === 'object') {
        arr = Object.values(data);
    }
    
    if (length !== undefined && arr.length < length) {
        const fill = fillValue !== undefined ? fillValue : '';
        return [...arr, ...Array(length - arr.length).fill(fill)];
    }
    return arr;
};

// Helper to parse markdown for the print view
const parseMarkdownForPrint = (text: string) => {
    if (!text) return null;
    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // Basic sanitization
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>') // H3
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-slate-800 pb-1">$1</h2>') // H2
        .replace(/^\s*[\-\*] (.*)/gm, '<li class="ml-4 list-disc">$1</li>') // Lists
        .replace(/\n/g, '<br />'); // Line breaks
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

// Helper to extract question text robustly
const extractQuestionFromText = (text: string, itemNumber: number): string => {
    if (!text) return '';
    const nextItem = itemNumber + 1;
    const regex = new RegExp(
        `^\\s*(?:Q|Item|Question|\\()?\\s*${itemNumber}(?:[\\.\\)\\:\\-]\\s*|\\s+)([\\s\\S]*?)(?=^\\s*(?:Q|Item|Question|\\()?\\s*${nextItem}(?:[\\.\\)\\:\\-]\\s*|\\s+)|$)`,
        'im'
    );
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : '';
};

export const ItemAnalysis = ({ user, onStartAnalysis, chatMessages }: ItemAnalysisProps) => {
    const [metadata, setMetadata] = useState<TestMetadata>(initialMetadata);
    const [students, setStudents] = useState<Student[]>([]);
    const [testQuestions, setTestQuestions] = useState<string>('');
    const [analysisResults, setAnalysisResults] = useState<ItemAnalysisResult[]>([]);
    
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [openSection, setOpenSection] = useState<string>('setup');
    
    // Class, School & Teacher Loading State
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]); // To hold curriculum data
    
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [showSessionsList, setShowSessionsList] = useState(false);

    // Delete Confirmation Modal State (Session)
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; sessionId: string | null; sessionTitle: string }>({
        isOpen: false,
        sessionId: null,
        sessionTitle: ''
    });

    // Feedback Modal State
    const [feedbackModal, setFeedbackModal] = useState({
        isOpen: false,
        studentIndex: -1,
        studentName: '',
        text: ''
    });

    // Camera & Scanning State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isLiveScanning, setIsLiveScanning] = useState(false);
    const [activeStudentIndex, setActiveStudentIndex] = useState<number | null>(null);
    const [scannedPreview, setScannedPreview] = useState<string[] | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Progress Modal State
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<Student | null>(null);
    const [progressHistory, setProgressHistory] = useState<ProgressRecord[]>([]);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    
    // Progress Delete Confirmation Modal State
    const [deleteProgressModal, setDeleteProgressModal] = useState<{ isOpen: boolean; recordId: string | null }>({
        isOpen: false,
        recordId: null
    });
    
    // Question Extraction State
    const [isExtractingQuestions, setIsExtractingQuestions] = useState(false);
    const [isMappingCompetencies, setIsMappingCompetencies] = useState(false); // New state for mapping
    const [pendingAnalysisItem, setPendingAnalysisItem] = useState<number | null>(null);
    const quickUploadInputRef = useRef<HTMLInputElement>(null);

    // Question Analysis Modal State
    const [isQuestionAnalysisModalOpen, setIsQuestionAnalysisModalOpen] = useState(false);
    const [selectedQuestionItem, setSelectedQuestionItem] = useState<number | null>(null);
    const [questionAnalysisData, setQuestionAnalysisData] = useState<InitialQuestionAnalysisResponse | null>(null);
    const [isAnalyzingQuestion, setIsAnalyzingQuestion] = useState(false);
    const [currentQuestionText, setCurrentQuestionText] = useState('');
    const [questionChatHistory, setQuestionChatHistory] = useState<ChatMessage[]>([]);
    const [questionChatInput, setQuestionChatInput] = useState('');
    const [isSendingQuestionChat, setIsSendingQuestionChat] = useState(false);

    // Remedial Generation State
    const [remedialModal, setRemedialModal] = useState<{ isOpen: boolean; data: RemediationResponse | null }>({ isOpen: false, data: null });
    const [isGeneratingRemedial, setIsGeneratingRemedial] = useState(false);
    const [copyRemedialSuccess, setCopyRemedialSuccess] = useState(false);

    // View Competency Modal State
    const [viewCompetency, setViewCompetency] = useState<{item: number, text: string} | null>(null);

    // Print Preview State
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    useEffect(() => {
        if (user) {
            loadClasses(user.uid).then(setClasses);
            loadSchools(user.uid).then(setSchools);
            loadTeachers(user.uid).then(setTeachers);
            loadSubjects().then(setSubjects); // Load curriculum data
            refreshSessions();
        }
    }, [user]);

    const refreshSessions = async () => {
        if (user) {
            const s = await listSessions(user.uid);
            setSessions(s);
        }
    };

    const showStatusMessage = (text: string, duration = 3000, type: 'success' | 'error' | 'info' = 'info') => {
        setStatusMessage({ text, type });
        setTimeout(() => setStatusMessage(null), duration);
    };

    const handleLoadSession = async (sessionId: string) => {
        if (!user) return;
        setIsLoadingData(true);
        try {
            const data = await loadSession(user.uid, sessionId);
            if (data && data.metadata) {
                // Ensure student list is an array (Firebase sometimes returns object for sparse arrays)
                const loadedStudentsList = safeArray<any>(data.students);
                const totalItems = Number(data.metadata.totalItems) || 0;

                // 1. Sanitize Answer Key (Ensure Array)
                const safeAnswerKey = safeArray<string>(data.metadata.answerKey, totalItems, '');
                
                // 2. Sanitize Metadata
                const loadedMetadata = {
                    ...data.metadata,
                    answerKey: safeAnswerKey,
                    totalItems: totalItems
                };
                setMetadata(loadedMetadata);

                // 3. Sanitize Students (Ensure Arrays for answers/responses)
                const safeStudents = loadedStudentsList.map(s => ({ 
                    ...s, 
                    progressHistory: safeArray<ProgressRecord>(s.progressHistory),
                    responses: safeArray<0 | 1>(s.responses, totalItems, 0),
                    studentAnswers: safeArray<string>(s.studentAnswers, totalItems, '') 
                }));
                setStudents(safeStudents);

                setTestQuestions(data.testQuestions || '');
                setActiveSessionId(sessionId);
                setIsConfigured(true);
                setOpenSection('rawScore');

                // 4. Attempt to restore Dropdown States based on Metadata Text
                const matchingSchool = schools.find(s => s.schoolName === loadedMetadata.school);
                if (matchingSchool) {
                    setSelectedSchoolId(matchingSchool.id);
                    // If school matches, try to match class
                    const matchingClass = classes.find(c => 
                        c.schoolId === matchingSchool.id && 
                        c.gradeLevel === loadedMetadata.gradeLevel && 
                        c.section === loadedMetadata.section
                    );
                    if (matchingClass) {
                        setSelectedClassId(matchingClass.id);
                    } else {
                        setSelectedClassId('');
                    }
                } else {
                    setSelectedSchoolId('');
                    setSelectedClassId('');
                }

                showStatusMessage(`Loaded: ${data.metadata.titleOfExamination}`);
                
                if (totalItems > 0 && safeStudents.length > 0) {
                     // Use the sanitized variables directly for calculation
                     calculateAnalysis(loadedMetadata, safeStudents);
                }
            } else {
                showStatusMessage('Error: Session not found or corrupted.', 5000, 'error');
            }
        } catch (err) {
            console.error("Error loading session:", err);
            showStatusMessage('Error: Failed to load session.', 5000, 'error');
        } finally {
            setIsLoadingData(false);
            setShowSessionsList(false);
        }
    };

    const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const getTeacherName = (id: string) => {
        const t = teachers.find(teacher => teacher.id === id);
        return t ? `${t.firstName} ${t.lastName}` : '';
    };

    const handleSchoolSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const schoolId = e.target.value;
        setSelectedSchoolId(schoolId);
        setSelectedClassId(''); // Reset class when school changes
        
        const school = schools.find(s => s.id === schoolId);
        if (school) {
            setMetadata(prev => ({
                ...prev,
                school: school.schoolName,
                district: school.district,
                schoolHead: getTeacherName(school.principalId)
            }));
        }
    };

    // Filter classes based on selected school
    const filteredClasses = useMemo(() => {
        if (!selectedSchoolId) return [];
        return classes.filter(c => c.schoolId === selectedSchoolId);
    }, [classes, selectedSchoolId]);

    // Get subjects for the selected class
    const activeClassSubjects = useMemo(() => {
        if (!selectedClassId) return [];
        const cls = classes.find(c => c.id === selectedClassId);
        return cls ? (cls.subjects || []) : [];
    }, [classes, selectedClassId]);

    const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const classId = e.target.value;
        setSelectedClassId(classId);
        if (classId) {
            const cls = classes.find(c => c.id === classId);
            if (cls) {
                setMetadata(prev => ({
                    ...prev,
                    gradeLevel: cls.gradeLevel,
                    section: cls.section,
                    schoolYear: cls.schoolYear,
                    testTakers: cls.studentIds ? cls.studentIds.length : 0,
                    teacherInCharge: getTeacherName(cls.adviserId), // Auto-fill Adviser
                    subject: '' // Reset subject
                }));
            }
        }
    };

    const handleSubjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subjectName = e.target.value;
        let teacherName = metadata.teacherInCharge; // Default to class adviser

        if (selectedClassId && subjectName) {
            const cls = classes.find(c => c.id === selectedClassId);
            // Find the subject object to get the teacher ID
            const subj = cls?.subjects?.find(s => s.name === subjectName);
            if (subj && subj.teacherId) {
                teacherName = getTeacherName(subj.teacherId);
            }
        }

        setMetadata(prev => ({
            ...prev,
            subject: subjectName,
            teacherInCharge: teacherName
        }));
    };

    const handleUpdateTotalItems = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value) || 0;
        setMetadata(prev => ({
            ...prev,
            totalItems: count,
            answerKey: Array(count).fill('')
        }));
        setStudents(prev => prev.map(s => ({
            ...s,
            studentAnswers: Array(count).fill(''),
            responses: Array(count).fill(0)
        })));
    };

    const handleAnswerKeyChange = (index: number, value: string) => {
        const newKey = [...metadata.answerKey];
        newKey[index] = value.toUpperCase();
        setMetadata(prev => ({ ...prev, answerKey: newKey }));
    };

    const handleAddStudent = () => {
        setStudents(prev => [...prev, {
            id: crypto.randomUUID(),
            name: '',
            responses: Array(metadata.totalItems).fill(0),
            studentAnswers: Array(metadata.totalItems).fill(''),
            feedback: '',
            progressHistory: []
        }]);
    };
    
    // Initialize students based on class or defaults when entering raw score
    const initializeStudents = async () => {
         if (selectedClassId) {
             const { loadStudents_SF1 } = await import('../services/databaseService');
             const allStudents = await loadStudents_SF1(user.uid);
             const cls = classes.find(c => c.id === selectedClassId);
             if (cls && cls.studentIds) {
                 const classStudents = allStudents.filter(s => cls.studentIds.includes(s.id));
                 const newStudents = classStudents.map(s => ({
                     id: s.id,
                     name: `${s.lastName}, ${s.firstName}`,
                     responses: Array(metadata.totalItems).fill(0),
                     studentAnswers: Array(metadata.totalItems).fill(''),
                     feedback: '',
                     progressHistory: []
                 }));
                 setStudents(newStudents);
                 setMetadata(prev => ({ ...prev, testTakers: newStudents.length }));
             }
         } else if (students.length === 0) {
             const emptyStudents = Array.from({ length: 10 }).map(() => ({
                id: crypto.randomUUID(),
                name: '',
                responses: Array(metadata.totalItems).fill(0),
                studentAnswers: Array(metadata.totalItems).fill(''),
                feedback: '',
                progressHistory: []
             }));
             setStudents(emptyStudents);
         }
         setIsConfigured(true);
         setOpenSection('rawScore');
    };

    const handleStudentNameChange = (index: number, name: string) => {
        const newStudents = [...students];
        newStudents[index].name = name;
        setStudents(newStudents);
    };

    const handleStudentAnswerChange = (studentIndex: number, questionIndex: number, value: string) => {
        const newStudents = [...students];
        newStudents[studentIndex].studentAnswers[questionIndex] = value.toUpperCase();
        setStudents(newStudents);
    };

    const handleOpenFeedback = (index: number) => {
        setFeedbackModal({
            isOpen: true,
            studentIndex: index,
            studentName: students[index].name,
            text: students[index].feedback || ''
        });
    };

    const handleSaveFeedback = () => {
        if (feedbackModal.studentIndex > -1) {
            const newStudents = [...students];
            newStudents[feedbackModal.studentIndex].feedback = feedbackModal.text;
            setStudents(newStudents);
        }
        setFeedbackModal({ isOpen: false, studentIndex: -1, studentName: '', text: '' });
    };

    const calculateAnalysis = (meta: TestMetadata = metadata, currStudents: Student[] = students) => {
        if (meta.totalItems === 0) return;

        const updatedStudents = currStudents.map(s => {
            const responses: (0|1)[] = [];
            for(let i=0; i<meta.totalItems; i++) {
                responses[i] = (s.studentAnswers[i] && s.studentAnswers[i] === meta.answerKey[i]) ? 1 : 0;
            }
            return { ...s, responses };
        });
        
        setStudents(updatedStudents);
        setMetadata(prev => ({ ...prev, testTakers: updatedStudents.length }));

        const results: ItemAnalysisResult[] = [];
        for (let i = 0; i < meta.totalItems; i++) {
            let correctCount = 0;
            updatedStudents.forEach(s => {
                if (s.responses[i] === 1) correctCount++;
            });
            
            const mps = updatedStudents.length > 0 ? (correctCount / updatedStudents.length) * 100 : 0;
            
            let difficulty: 'Easy' | 'Moderate' | 'Difficult' = 'Moderate';
            if (mps >= 76) difficulty = 'Easy';
            else if (mps <= 25) difficulty = 'Difficult'; 

            let interpretation: 'Mastered' | 'Least Mastered' | 'Not Mastered' = 'Not Mastered';
            if (mps >= 75) interpretation = 'Mastered';
            else if (mps >= 50) interpretation = 'Least Mastered';
            else interpretation = 'Not Mastered';
            
            // Try to preserve existing competency if re-calculating
            const existingItem = analysisResults.find(r => r.itemNumber === i + 1);

            results.push({
                itemNumber: i + 1,
                totalCorrect: correctCount,
                mps: mps,
                interpretation,
                difficulty,
                competency: existingItem?.competency
            });
        }
        setAnalysisResults(results);
    };

    const handleCalculate = () => {
        calculateAnalysis();
        setOpenSection('results');
        showStatusMessage('Analysis Calculated', 2000, 'success');
    };

    const handleSaveSession = async () => {
        if (!metadata.titleOfExamination) {
            showStatusMessage('Please enter a Title of Examination.', 3000, 'error');
            return;
        }
        
        setIsLoadingData(true);
        try {
            calculateAnalysis();
            
            const sessionData = {
                metadata: { ...metadata, testTakers: students.length },
                students,
                testQuestions
            };
            
            if (activeSessionId) {
                await saveSession(user.uid, activeSessionId, sessionData);
                await logActivity(user.uid, user.displayName || user.email || 'Unknown', 'update', 'Item Analysis', `Updated session: ${metadata.titleOfExamination}`);
                showStatusMessage('Session saved successfully.', 3000, 'success');
                sendNotification(user.uid, {
                    title: 'Analysis Saved',
                    message: `Successfully saved analysis for ${metadata.titleOfExamination}.`,
                    type: 'success',
                    link: 'itemAnalysis'
                });
            } else {
                const newId = await createNewSession(user.uid, sessionData);
                setActiveSessionId(newId);
                await logActivity(user.uid, user.displayName || user.email || 'Unknown', 'create', 'Item Analysis', `Created session: ${metadata.titleOfExamination}`);
                showStatusMessage('New session created and saved.', 3000, 'success');
                refreshSessions();
                sendNotification(user.uid, {
                    title: 'New Analysis Created',
                    message: `Created new session: ${metadata.titleOfExamination}.`,
                    type: 'success',
                    link: 'itemAnalysis'
                });
            }
        } catch (e) {
            console.error(e);
            showStatusMessage('Failed to save session.', 3000, 'error');
        } finally {
            setIsLoadingData(false);
        }
    };

    const triggerDeleteSession = (id: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModalState({ isOpen: true, sessionId: id, sessionTitle: title });
    };

    const executeDeleteSession = async () => {
        const { sessionId } = deleteModalState;
        if (!sessionId) return;

        try {
            setSessions(prev => prev.filter(s => s.id !== sessionId)); // Optimistic UI update
            await deleteSession(user.uid, sessionId);
            await logActivity(user.uid, user.displayName || user.email || 'Unknown', 'delete', 'Item Analysis', `Deleted session ID: ${sessionId}`);
            
            refreshSessions(); // Sync with DB

            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMetadata(initialMetadata);
                setStudents([]);
                setAnalysisResults([]);
                setIsConfigured(false);
            }
            showStatusMessage('Session deleted.', 3000, 'success');
        } catch (err) {
             console.error(err);
             showStatusMessage('Failed to delete session.', 3000, 'error');
             refreshSessions();
        } finally {
            setDeleteModalState({ isOpen: false, sessionId: null, sessionTitle: '' });
        }
    };

    const startAI = () => {
        handleCalculate();
        onStartAnalysis({
            metadata,
            students,
            analysisResults,
            questions: testQuestions
        });
    };

    const handleGenerateRemedial = async () => {
        if (!testQuestions || !testQuestions.trim()) {
            showStatusMessage("Please upload or paste the test questions below before generating remedial questions.", 4000, 'error');
            const textarea = document.getElementById('testQuestionsInput');
            if (textarea) textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setIsGeneratingRemedial(true);
        try {
            const data = await generateRemediationQuestions(analysisResults, metadata, testQuestions);
            setRemedialModal({ isOpen: true, data });
            await logActivity(user.uid, user.displayName || user.email || 'Unknown', 'other', 'Item Analysis', 'Generated remedial questions.');
        } catch (error) {
            console.error(error);
            showStatusMessage("Failed to generate remedial questions. Ensure analysis is calculated.", 3000, 'error');
        } finally {
            setIsGeneratingRemedial(false);
        }
    };

    // Helper to retrieve official curriculum based on metadata
    const getCurriculumCompetencies = (): string[] => {
        if (!metadata.subject || !metadata.gradeLevel || !metadata.titleOfExamination) return [];

        const activeSubject = subjects.find(s => s.name === metadata.subject && s.gradeLevel === metadata.gradeLevel);
        if (!activeSubject || !activeSubject.curriculum) return [];

        let targetQuarter = '';
        if (metadata.titleOfExamination.includes('1st')) targetQuarter = '1st Quarter';
        else if (metadata.titleOfExamination.includes('2nd')) targetQuarter = '2nd Quarter';
        else if (metadata.titleOfExamination.includes('3rd')) targetQuarter = '3rd Quarter';
        else if (metadata.titleOfExamination.includes('4th')) targetQuarter = '4th Quarter';

        if (!targetQuarter) return [];

        const rawCurriculum = activeSubject.curriculum as any;
        const curriculumArray: QuarterUnit[] = Array.isArray(rawCurriculum) ? rawCurriculum : Object.values(rawCurriculum);
        const quarterData = curriculumArray.find(q => q.quarter === targetQuarter);

        if (!quarterData || !quarterData.weeks) return [];

        // Flatten all competencies from all weeks in that quarter
        const rawWeeks = quarterData.weeks as any;
        const weeksArray: WeeklyUnit[] = Array.isArray(rawWeeks) ? rawWeeks : Object.values(rawWeeks);
        
        const allCompetencies: string[] = [];
        weeksArray.forEach(week => {
            if (week.competencies) {
                week.competencies.forEach(comp => {
                    allCompetencies.push(`${comp.code} - ${comp.description}`);
                });
            }
        });

        return allCompetencies;
    };

    const handleExtractCompetencies = async () => {
        if (!testQuestions || !testQuestions.trim()) {
            showStatusMessage("Please upload or paste the test questions first.", 4000, 'error');
            return;
        }
        
        setIsMappingCompetencies(true);
        try {
            // Get official list if available
            const officialCompetencies = getCurriculumCompetencies();
            if (officialCompetencies.length > 0) {
                console.log(`Found ${officialCompetencies.length} official competencies from Curriculum Guide.`);
            } else {
                console.log("No official curriculum found for this subject/quarter. AI will generate descriptions.");
            }

            const mapping = await mapCompetenciesToItems(testQuestions, metadata.totalItems, officialCompetencies);
            
            if (mapping.length === 0) {
                showStatusMessage("Could not identify competencies. Please ensure questions are clearly numbered.", 4000, 'error');
                return;
            }

            setAnalysisResults(prev => prev.map(item => {
                const match = mapping.find(m => m.itemNumber === item.itemNumber);
                return match ? { ...item, competency: match.competency } : item;
            }));
            
            showStatusMessage(`Mapped ${mapping.length} competencies successfully.`, 3000, 'success');
        } catch (error) {
            console.error("Mapping failed:", error);
            showStatusMessage("Failed to extract competencies.", 3000, 'error');
        } finally {
            setIsMappingCompetencies(false);
        }
    };

    const copyRemedialQuestions = () => {
        if (!remedialModal.data) return;
        const text = remedialModal.data.questions.map((q, i) => 
            `${i + 1}. ${q.question}\n${q.options.map((o, idx) => `   ${String.fromCharCode(65 + idx)}. ${o}`).join('\n')}\n   Correct: ${q.correctAnswer}\n   Explanation: ${q.explanation}\n`
        ).join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            setCopyRemedialSuccess(true);
            setTimeout(() => setCopyRemedialSuccess(false), 2000);
        });
    };

    // --- CAMERA & SCANNING LOGIC ---

    const startCamera = async (index: number) => {
        setActiveStudentIndex(index);
        setScannedPreview(null);
        setIsCameraOpen(true);
        setIsLiveScanning(false); // Default to standard mode
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Could not access camera. Please check permissions.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        setIsLiveScanning(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
        setActiveStudentIndex(null);
        setScannedPreview(null);
    };

    // Continuous Live Scanning Effect
    useEffect(() => {
        let timeoutId: any;

        const captureFrame = async () => {
            if (!videoRef.current || !canvasRef.current || !isLiveScanning) return;

            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7); // Lower quality for speed
                
                try {
                    // Use the new optimized frame analysis function
                    const result = await analyzeAnswerSheetFrame(imageData.split(',')[1], metadata.totalItems);
                    
                    // Only update preview if we got valid results to avoid flickering empty states
                    const hasAnswers = result.answers.some(a => a !== '');
                    if (hasAnswers) {
                         setScannedPreview(result.answers);
                    }
                } catch (error) {
                    // console.error("Live scan error:", error);
                    // Continue silently on error during live scan
                }
            }

            if (isLiveScanning) {
                timeoutId = setTimeout(captureFrame, 1500); // Scan every 1.5 seconds
            }
        };

        if (isLiveScanning) {
            captureFrame();
        }

        return () => clearTimeout(timeoutId);
    }, [isLiveScanning, metadata.totalItems]);


    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current || activeStudentIndex === null) return;
        
        setIsScanning(true);
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const imageData = canvasRef.current.toDataURL('image/jpeg');
            
            try {
                const result = await analyzeAnswerSheetFromImage(imageData.split(',')[1], metadata.totalItems, 'image/jpeg');
                setScannedPreview(result.answers);
            } catch (error) {
                console.error(error);
                alert("Failed to scan answers. Please ensure the image is clear and try again.");
            } finally {
                setIsScanning(false);
            }
        }
    };

    const confirmScan = () => {
        if (activeStudentIndex !== null && scannedPreview) {
             const newStudents = [...students];
             newStudents[activeStudentIndex].studentAnswers = scannedPreview;
             setStudents(newStudents);
             showStatusMessage('Answers scanned and saved!', 2000, 'success');
             stopCamera();
        }
    };

    const retakeScan = () => {
        setScannedPreview(null);
        setIsLiveScanning(false);
    };

    const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoadingData(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = (event.target?.result as string).split(',')[1];
                const mimeType = file.type;
                const result = await analyzeAnswerSheetFromImage(base64, metadata.totalItems, mimeType);
                
                const newStudents = [...students];
                newStudents[index].studentAnswers = result.answers;
                setStudents(newStudents);
                showStatusMessage('File uploaded and scanned!', 2000, 'success');
            } catch (err) {
                console.error(err);
                alert("Failed to process image.");
            } finally {
                setIsLoadingData(false);
            }
        };
        reader.readAsDataURL(file);
    };
    
    // --- QUESTION EXTRACTION LOGIC ---
    const handleQuestionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtractingQuestions(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = (event.target?.result as string).split(',')[1];
                const text = await extractTextFromPdf({
                    mimeType: file.type,
                    data: base64
                });
                
                setTestQuestions(prev => {
                    const newText = prev ? `${prev}\n\n--- Extracted from ${file.name} ---\n${text}` : text;
                    return newText;
                });
                showStatusMessage('Questions extracted successfully!', 3000, 'success');
            } catch (err) {
                console.error(err);
                showStatusMessage("Failed to extract text from file.", 3000, 'error');
            } finally {
                setIsExtractingQuestions(false);
                e.target.value = ''; 
            }
        };
        reader.readAsDataURL(file);
    };

    const handleQuickQuestionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; 
        
        if (!file) {
            setPendingAnalysisItem(null);
            return;
        }

        setIsExtractingQuestions(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = (event.target?.result as string).split(',')[1];
                const text = await extractTextFromPdf({
                    mimeType: file.type,
                    data: base64
                });
                
                setTestQuestions(text);
                showStatusMessage('Questions extracted successfully!', 3000, 'success');

                if (pendingAnalysisItem !== null) {
                    setSelectedQuestionItem(pendingAnalysisItem);
                    setQuestionAnalysisData(null);
                    setQuestionChatHistory([]);
                    setQuestionChatInput('');
                    
                    // Use helper to extract specific question
                    const extractedText = extractQuestionFromText(text, pendingAnalysisItem);
                    setCurrentQuestionText(extractedText);
                    
                    setIsQuestionAnalysisModalOpen(true);
                }
            } catch (err) {
                console.error(err);
                showStatusMessage("Failed to extract text from file.", 3000, 'error');
            } finally {
                setIsExtractingQuestions(false);
                setPendingAnalysisItem(null);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- PROGRESS TRACKING LOGIC ---
    const handleOpenProgressModal = async (student: Student) => {
        setSelectedStudentForProgress(student);
        setIsProgressModalOpen(true);
        setIsLoadingProgress(true);
        try {
             const history = await loadStudentProgress(user.uid, student.id);
             setProgressHistory(history);
        } catch (e) {
             console.error(e);
             setProgressHistory(student.progressHistory || []);
        } finally {
            setIsLoadingProgress(false);
        }
    };

    const handleCloseProgressModal = () => {
        setIsProgressModalOpen(false);
        setSelectedStudentForProgress(null);
        setProgressHistory([]);
    };

    const saveProgressRecord = async () => {
        if (!selectedStudentForProgress) return;
        
        const score = selectedStudentForProgress.responses.reduce((a,b) => a+b, 0);
        const newRecord: ProgressRecord = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            testName: metadata.titleOfExamination || 'Untitled Exam',
            score: score,
            totalItems: metadata.totalItems
        };
        
        const updatedHistory = [...progressHistory, newRecord];
        setProgressHistory(updatedHistory);
        
        try {
             await saveStudentProgress(user.uid, selectedStudentForProgress.id, updatedHistory);
             setStudents(prev => prev.map(s => s.id === selectedStudentForProgress.id ? { ...s, progressHistory: updatedHistory } : s));
             showStatusMessage('Progress saved.', 2000, 'success');
        } catch (e) {
             console.error(e);
             alert('Failed to save progress to database.');
        }
    };

    const handleDeleteProgressRecord = (recordId: string) => {
        setDeleteProgressModal({ isOpen: true, recordId });
    };

    const executeDeleteProgress = async () => {
         const { recordId } = deleteProgressModal;
         if (!recordId || !selectedStudentForProgress) return;

         const updatedHistory = progressHistory.filter(r => r.id !== recordId);

         try {
              await saveStudentProgress(user.uid, selectedStudentForProgress.id, updatedHistory);
              setProgressHistory(updatedHistory);
              setStudents(prev => prev.map(s => s.id === selectedStudentForProgress.id ? { ...s, progressHistory: updatedHistory } : s));
              showStatusMessage('History record deleted.', 2000, 'success');
         } catch (e) {
              console.error(e);
              showStatusMessage('Failed to delete record.', 3000, 'error');
         } finally {
             setDeleteProgressModal({ isOpen: false, recordId: null });
         }
    };

    // --- QUESTION ANALYSIS LOGIC ---
    const openQuestionAnalysis = (itemNumber: number) => {
        if (!testQuestions || !testQuestions.trim()) {
             if (confirm("Test questions are not loaded yet. Would you like to upload a file (PDF/Image) to extract them now?")) {
                 setPendingAnalysisItem(itemNumber);
                 quickUploadInputRef.current?.click();
             }
             return;
        }

        setSelectedQuestionItem(itemNumber);
        setQuestionAnalysisData(null);
        setQuestionChatHistory([]);
        setQuestionChatInput('');
        
        // Use robust extraction helper
        const extractedText = extractQuestionFromText(testQuestions, itemNumber);
        setCurrentQuestionText(extractedText);
        
        setIsQuestionAnalysisModalOpen(true);
    };

    const closeQuestionAnalysis = () => {
        setIsQuestionAnalysisModalOpen(false);
        setSelectedQuestionItem(null);
    };

    const handleAnalyzeQuestion = async () => {
        if (!currentQuestionText.trim()) {
             alert("Please enter the text of the question you want to analyze.");
             return;
        }
        setIsAnalyzingQuestion(true);
        try {
            const data = await getInitialQuestionAnalysis(currentQuestionText);
            setQuestionAnalysisData(data);
        } catch (error) {
            console.error(error);
            alert("Failed to analyze question. Please try again.");
        } finally {
            setIsAnalyzingQuestion(false);
        }
    };

    const handleQuestionChatSend = async () => {
        if (!questionChatInput.trim() || !questionAnalysisData) return;

        const newMessage: ChatMessage = { role: 'user', content: questionChatInput };
        setQuestionChatHistory(prev => [...prev, newMessage]);
        setQuestionChatInput('');
        setIsSendingQuestionChat(true);

        try {
            const response = await continueQuestionAnalysisChat(questionChatHistory, questionChatInput);
            setQuestionChatHistory(prev => [...prev, { role: 'model', content: response }]);
        } catch (error) {
            console.error(error);
            setQuestionChatHistory(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error." }]);
        } finally {
            setIsSendingQuestionChat(false);
        }
    };

    // --- PRINTING LOGIC ---
    const handlePrintAnswerSheet = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(metadata.school || 'School Name', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Examination: ${metadata.titleOfExamination}`, 105, 30, { align: 'center' });
        doc.text(`Name: _____________________________  Date: _________`, 20, 45);
        doc.text(`Grade & Section: ___________________  Score: ________`, 20, 55);

        let y = 70;
        let x = 20;
        
        for (let i = 1; i <= metadata.totalItems; i++) {
            doc.text(`${i}.  [A]  [B]  [C]  [D]`, x, y);
            y += 10;
            if (y > 270) {
                y = 70;
                x += 60;
                if (x > 180) {
                    doc.addPage();
                    x = 20;
                }
            }
        }
        
        doc.save('AnswerSheet.pdf');
    };
    
    const handlePrintAnalysisReport = () => {
        setShowPrintPreview(true);
    };
    
    const handleDownloadPDF = async () => {
        const originalElement = document.getElementById('analysis-report-print-view');
        if (!originalElement) return;
        
        // We will clone the element to ensure we capture it without affecting the current UI state
        // or relying on the 'print:block' media query behavior for html2canvas.
        const clonedElement = originalElement.cloneNode(true) as HTMLElement;
        
        // Setup styles to make it visible and formatted for capture
        clonedElement.classList.remove('hidden');
        clonedElement.classList.add('block');
        clonedElement.classList.remove('fixed', 'inset-0', 'overflow-y-auto', 'z-[9999]');
        
        clonedElement.style.position = 'absolute';
        clonedElement.style.top = '-10000px';
        clonedElement.style.left = '0';
        clonedElement.style.width = '800px'; // Approximate A4 width @ 96DPI
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.style.zIndex = '-1';
        
        // Force text color to black for PDF capture
        clonedElement.style.color = '#000000';
        
        document.body.appendChild(clonedElement);
        
        // Small delay to ensure rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await (window as any).html2canvas(clonedElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                windowWidth: 800
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${metadata.titleOfExamination || 'Analysis-Report'}.pdf`);
            showStatusMessage('PDF Downloaded successfully', 3000, 'success');
        } catch (error) {
            console.error('PDF generation failed:', error);
            showStatusMessage('Failed to generate PDF report.', 3000, 'error');
        } finally {
            if (document.body.contains(clonedElement)) {
                document.body.removeChild(clonedElement);
            }
        }
    };

    // Extract AI Analysis report from chat messages
    const aiAnalysisReport = useMemo(() => {
        const modelMessage = chatMessages.find(m => m.role === 'model');
        return modelMessage ? modelMessage.content : null;
    }, [chatMessages]);

    // Reusable report content
    const reportContent = (
        <>
             <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Item Analysis Report</h1>
                <h2 className="text-xl font-semibold mt-1 text-black">{metadata.school || 'School Name'}</h2>
                <p className="text-sm text-black mt-1">SURI-ARAL Generated Report</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border border-black p-4 rounded-md text-black">
                    <div className="flex justify-between"><span className="font-bold">Examination:</span> <span>{metadata.titleOfExamination}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Subject:</span> <span>{metadata.subject}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Grade & Section:</span> <span>{metadata.gradeLevel} - {metadata.section}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Teacher:</span> <span>{metadata.teacherInCharge}</span></div>
                    <div className="flex justify-between"><span className="font-bold">School Year:</span> <span>{metadata.schoolYear}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Date Generated:</span> <span>{new Date().toLocaleDateString()}</span></div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-lg uppercase border-b border-black mb-3 text-black">Performance Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Mean Score</div>
                        <div className="text-xl font-bold text-black">{(students.reduce((acc, s) => acc + s.responses.reduce((a,b)=>a+b,0), 0) / (students.length || 1)).toFixed(2)}</div>
                    </div>
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">MPS</div>
                        <div className="text-xl font-bold text-black">{(analysisResults.reduce((acc, r) => acc + r.mps, 0) / (analysisResults.length || 1)).toFixed(2)}%</div>
                    </div>
                        <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Total Students</div>
                        <div className="text-xl font-bold text-black">{students.length}</div>
                    </div>
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Total Items</div>
                        <div className="text-xl font-bold text-black">{metadata.totalItems}</div>
                    </div>
                </div>
            </div>

            {analysisResults.length > 0 && (
                <div className="mb-8 break-inside-avoid">
                    <h3 className="font-bold text-lg uppercase border-b border-black mb-3 text-black">Item Analysis Data</h3>
                    <table className="w-full text-sm border-collapse border border-black text-black">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black px-2 py-1 text-black">Item #</th>
                                <th className="border border-black px-2 py-1 text-black">Correct</th>
                                <th className="border border-black px-2 py-1 text-black">MPS</th>
                                <th className="border border-black px-2 py-1 text-black">Difficulty</th>
                                <th className="border border-black px-2 py-1 text-black">Interpretation</th>
                                <th className="border border-black px-2 py-1 text-black w-1/3">Competency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysisResults.map(r => (
                                <tr key={r.itemNumber}>
                                    <td className="border border-black px-2 py-1 text-center font-bold text-black">{r.itemNumber}</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.totalCorrect}</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.mps.toFixed(0)}%</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.difficulty}</td>
                                    <td className="border border-black px-2 py-1 text-center">
                                        <span className={`font-bold ${
                                            r.interpretation === 'Mastered' ? 'text-green-800' :
                                            r.interpretation === 'Least Mastered' ? 'text-yellow-800' : 'text-red-800'
                                        }`}>{r.interpretation}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1 text-xs text-black">{r.competency || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {aiAnalysisReport && (
                <div className="mb-6 break-inside-avoid">
                    <h3 className="font-bold text-lg uppercase border-b border-black mb-3 flex items-center text-black">
                        <BrainCircuitIcon className="w-5 h-5 mr-2 text-black"/> SURI-ARAL AI Insights
                    </h3>
                    <div className="text-sm text-justify leading-relaxed prose max-w-none text-black">
                        {parseMarkdownForPrint(aiAnalysisReport)}
                    </div>
                </div>
            )}
            
            <div className="mt-12 pt-8 border-t border-black flex justify-between text-sm text-black">
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-1 w-48">{metadata.teacherInCharge || 'Teacher'}</p>
                    <p>Prepared By</p>
                </div>
                <div className="text-center">
                        <p className="font-bold border-t border-black pt-1 w-48">{metadata.schoolHead || 'Principal'}</p>
                    <p>Noted By</p>
                </div>
            </div>
        </>
    );

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans">
            <style>{`
                .input-field { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #1e293b; font-size: 0.875rem; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); } 
                .input-field:focus { border-color: #6366f1; outline: none; ring: 2px; ring-color: #e0e7ff; }
                .dark .input-field { background-color: #1e293b; border-color: #475569; color: #f1f5f9; }
                .dark .input-field:focus { border-color: #818cf8; ring-color: #312e81; }
                .answer-key-input { text-align: center; font-weight: bold; text-transform: uppercase; width: 3rem; height: 3rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
                .answer-key-input:focus { border-color: #6366f1; ring: 2px; ring-color: #e0e7ff; transform: scale(1.05); }
                .dark .answer-key-input { background-color: #1e293b; border-color: #475569; color: #fff; }
            `}</style>
            
            {/* HIDDEN PRINT VIEW */}
            <div id="analysis-report-print-view" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-y-auto text-black">
                {reportContent}
            </div>
            
            {/* COMPETENCY MODAL */}
            {viewCompetency && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewCompetency(null)}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <BrainCircuitIcon className="w-5 h-5 mr-2 text-indigo-500" />
                                Item #{viewCompetency.item} Competency
                            </h3>
                            <button onClick={() => setViewCompetency(null)} className="text-slate-400 hover:text-slate-600">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 max-h-64 overflow-y-auto custom-scrollbar">
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                                {viewCompetency.text}
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setViewCompetency(null)} 
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT PREVIEW MODAL */}
            {showPrintPreview && (
                <div className="fixed inset-0 z-[50] flex flex-col bg-slate-900/80 backdrop-blur-sm print:hidden">
                     <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-lg z-10">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                            <PrinterIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"/> Print Preview
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowPrintPreview(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <PrinterIcon className="w-4 h-4 mr-2"/> Print Now
                            </button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-100 dark:bg-slate-900/50">
                        <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-12 text-black scale-95 origin-top">
                            {reportContent}
                        </div>
                     </div>
                </div>
            )}
            
            <div className="print:hidden max-w-7xl mx-auto space-y-8">
                {/* Hidden input for quick question upload */}
                <input 
                    type="file" 
                    accept="application/pdf, image/*" 
                    className="hidden" 
                    ref={quickUploadInputRef}
                    onChange={handleQuickQuestionUpload}
                />

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Comprehensive assessment data and insights.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-auto">
                            <button 
                                onClick={() => setShowSessionsList(!showSessionsList)}
                                className="w-full md:w-auto flex items-center justify-center px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold shadow-sm transition-all"
                            >
                                <HistoryIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                Load Session
                                <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${showSessionsList ? 'rotate-180' : ''}`} />
                            </button>
                            {showSessionsList && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-fade-in-up">
                                    {sessions.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-sm italic">No saved sessions found.</div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {sessions.map(s => (
                                                <li key={s.id}>
                                                    <div className="flex items-center justify-between p-3 hover:bg-indigo-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group" onClick={() => handleLoadSession(s.id)}>
                                                        <div className="truncate flex-1 pr-3">
                                                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{s.titleOfExamination || 'Untitled Analysis'}</div>
                                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{new Date(s.lastModified).toLocaleDateString()}</div>
                                                        </div>
                                                        <button onClick={(e) => triggerDeleteSession(s.id, s.titleOfExamination || 'Untitled', e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => {
                                setActiveSessionId(null);
                                setMetadata(initialMetadata);
                                setStudents([]);
                                setAnalysisResults([]);
                                setTestQuestions('');
                                setIsConfigured(false);
                                setOpenSection('setup');
                            }}
                            className="w-full md:w-auto flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-bold text-sm transition-all hover:-translate-y-0.5"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            New Analysis
                        </button>
                    </div>
                </div>

                {statusMessage && (
                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center shadow-sm animate-fade-in ${
                        statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : 
                        statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 
                        'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                        {statusMessage.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
                        {statusMessage.text}
                    </div>
                )}

                {/* 1. CONFIGURATION SECTION */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button 
                        onClick={() => setOpenSection(openSection === 'setup' ? '' : 'setup')}
                        className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 transition-colors ${openSection === 'setup' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>1</div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Test Configuration</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Metadata & Answer Key</p>
                            </div>
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSection === 'setup' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openSection === 'setup' && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                             {/* ... existing config form ... */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Load School</label>
                                    <div className="relative">
                                        <select value={selectedSchoolId} onChange={handleSchoolSelect} className="w-full input-field appearance-none">
                                            <option value="">-- Select --</option>
                                            {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Load Class</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedClassId} 
                                            onChange={handleClassSelect} 
                                            className="w-full input-field appearance-none disabled:opacity-50"
                                            disabled={!selectedSchoolId}
                                        >
                                            <option value="">-- Select --</option>
                                            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.gradeLevel} - {c.section}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Items</label>
                                    <input type="number" name="totalItems" value={metadata.totalItems} onChange={handleUpdateTotalItems} className="w-full input-field font-mono font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Title of Examination <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select 
                                            name="titleOfExamination" 
                                            value={metadata.titleOfExamination} 
                                            onChange={handleMetadataChange} 
                                            className="w-full input-field appearance-none font-medium"
                                        >
                                            <option value="">-- Select --</option>
                                            <option value="1st Quarter Examination">1st Quarter Examination</option>
                                            <option value="2nd Quarter Examination">2nd Quarter Examination</option>
                                            <option value="3rd Quarter Examination">3rd Quarter Examination</option>
                                            <option value="4th Quarter Examination">4th Quarter Examination</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Subject</label>
                                    {selectedClassId && activeClassSubjects.length > 0 ? (
                                        <div className="relative">
                                            <select 
                                                name="subject" 
                                                value={metadata.subject} 
                                                onChange={handleSubjectSelect} 
                                                className="w-full input-field appearance-none"
                                            >
                                                <option value="">-- Select --</option>
                                                {activeClassSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                        </div>
                                    ) : (
                                        <input 
                                            type="text" 
                                            name="subject" 
                                            value={metadata.subject} 
                                            onChange={handleMetadataChange} 
                                            className="w-full input-field" 
                                            placeholder="Subject Name"
                                        />
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Grade Level</label>
                                    <input 
                                        type="text" 
                                        name="gradeLevel" 
                                        value={metadata.gradeLevel} 
                                        onChange={handleMetadataChange} 
                                        className="w-full input-field disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500" 
                                        disabled={!!selectedClassId} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Section</label>
                                    <input type="text" name="section" value={metadata.section} onChange={handleMetadataChange} className="w-full input-field" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">School Year</label>
                                    <input type="text" name="schoolYear" value={metadata.schoolYear} onChange={handleMetadataChange} className="w-full input-field" />
                                </div>
                                 <div className="lg:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Teacher In Charge</label>
                                    <input type="text" name="teacherInCharge" value={metadata.teacherInCharge} onChange={handleMetadataChange} className="w-full input-field" />
                                </div>
                            </div>

                            {metadata.totalItems > 0 && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50">
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center">
                                        <CheckSquareIcon className="w-5 h-5 mr-2" /> Correct Answer Key
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {Array.from({ length: metadata.totalItems }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold text-slate-400 mb-1">{i + 1}</span>
                                                <input 
                                                    type="text" 
                                                    maxLength={1} 
                                                    className="answer-key-input shadow-sm"
                                                    value={metadata.answerKey[i] || ''}
                                                    onChange={(e) => handleAnswerKeyChange(i, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-8 flex justify-end">
                                 <button 
                                    onClick={initializeStudents}
                                    className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 font-bold shadow-lg transition-all hover:-translate-y-0.5"
                                 >
                                    Proceed to Scoring &rarr;
                                 </button>
                            </div>
                        </div>
                    )}
                </div>

                 {/* 2. RAW SCORES SECTION */}
                 {isConfigured && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* ... (Raw Scores UI) ... */}
                        <button 
                            onClick={() => setOpenSection(openSection === 'rawScore' ? '' : 'rawScore')}
                            className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 transition-colors ${openSection === 'rawScore' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>2</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Student Responses</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Input Data & Grading</p>
                                </div>
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSection === 'rawScore' ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {openSection === 'rawScore' && (
                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex gap-2">
                                        <button onClick={handlePrintAnswerSheet} className="flex items-center px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 shadow-sm transition-colors">
                                            <PrinterIcon className="w-4 h-4 mr-2"/> Print Sheet
                                        </button>
                                        <button onClick={handleAddStudent} className="flex items-center px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 shadow-sm transition-colors">
                                            <PlusIcon className="w-4 h-4 mr-2"/> Add Student
                                        </button>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                        {students.length} Students Enrolled
                                    </p>
                                </div>
                                
                                <div className="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-800">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '250px' }}>Name</th>
                                                {Array.from({ length: metadata.totalItems }).map((_, i) => (
                                                    <th key={i} className="px-2 py-3 text-center text-xs font-bold text-slate-500 w-12">{i + 1}</th>
                                                ))}
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800 sticky right-0 z-10 shadow-[-4px_0_24px_-2px_rgba(0,0,0,0.1)]">Score</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ minWidth: '160px' }}>Tools</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {students.map((student, sIdx) => {
                                                const score = student.responses.reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={student.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                        <td className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors z-10 border-r border-slate-100 dark:border-slate-700">
                                                            <div className="flex items-center">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 mr-3">
                                                                    {sIdx + 1}
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    value={student.name} 
                                                                    onChange={(e) => handleStudentNameChange(sIdx, e.target.value)}
                                                                    placeholder="Student Name"
                                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300"
                                                                />
                                                            </div>
                                                        </td>
                                                        {Array.from({ length: metadata.totalItems }).map((_, qIdx) => (
                                                            <td key={qIdx} className="px-1 py-1 text-center">
                                                                <input 
                                                                    type="text"
                                                                    maxLength={1}
                                                                    value={student.studentAnswers[qIdx] || ''}
                                                                    onChange={(e) => handleStudentAnswerChange(sIdx, qIdx, e.target.value)}
                                                                    className={`w-8 h-8 text-center rounded text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                                                                        student.studentAnswers[qIdx] === metadata.answerKey[qIdx] 
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 focus:ring-green-500' 
                                                                        : student.studentAnswers[qIdx] 
                                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 focus:ring-red-500'
                                                                            : 'bg-slate-50 text-slate-800 dark:bg-slate-700/50 dark:text-slate-200 focus:ring-indigo-500 border border-slate-200 dark:border-slate-600'
                                                                    }`}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-4 py-2 text-center bg-slate-50/50 dark:bg-slate-800/50 sticky right-0 z-10 border-l border-slate-100 dark:border-slate-700">
                                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                                                score >= metadata.totalItems * 0.75 ? 'bg-green-100 text-green-700' : 
                                                                score >= metadata.totalItems * 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {score}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            <div className="flex justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => startCamera(sIdx)} className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600" title="Scan Paper">
                                                                    <CameraIcon className="w-4 h-4" />
                                                                </button>
                                                                <label className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 cursor-pointer" title="Upload Image">
                                                                    <UploadIcon className="w-4 h-4" />
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(sIdx, e)} />
                                                                </label>
                                                                <button onClick={() => handleOpenFeedback(sIdx)} className={`p-1.5 rounded-md hover:bg-amber-100 ${student.feedback ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}>
                                                                    <MessageSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleOpenProgressModal(student)} className="p-1.5 rounded-md hover:bg-teal-100 text-teal-600" title="History">
                                                                    <TrendingUpIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => setStudents(prev => prev.filter((_, i) => i !== sIdx))} className="p-1.5 rounded-md hover:bg-red-100 text-red-600" title="Delete">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button 
                                        onClick={handleCalculate}
                                        className="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all"
                                    >
                                        <BrainCircuitIcon className="w-5 h-5 mr-2" />
                                        Run Analysis
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                 {/* 3. RESULTS SECTION */}
                 {analysisResults.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button 
                            onClick={() => setOpenSection(openSection === 'results' ? '' : 'results')}
                            className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 transition-colors ${openSection === 'results' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>3</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Analysis Results</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Performance Insights & Actions</p>
                                </div>
                            </div>
                             <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSection === 'results' ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {openSection === 'results' && (
                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* KPI Cards */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">Mean Score</span>
                                                <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                                                    {(students.reduce((acc, s) => acc + s.responses.reduce((a,b)=>a+b,0), 0) / (students.length || 1)).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">MPS</span>
                                                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                                                    {(analysisResults.reduce((acc, r) => acc + r.mps, 0) / (analysisResults.length || 1)).toFixed(2)}%
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">Students</span>
                                                <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{students.length}</div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">Passing Rate</span>
                                                <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                                                    {((students.filter(s => s.responses.reduce((a,b)=>a+b,0) >= metadata.totalItems * 0.75).length / students.length) * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Item Table */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                    <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-800/80">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correct</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">MPS</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interpretation</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Learning Competency</th>
                                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                        {analysisResults.map(r => (
                                                            <tr key={r.itemNumber} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">#{r.itemNumber}</td>
                                                                <td className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">{r.totalCorrect}</td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center">
                                                                        <span className="w-8 text-right font-bold text-xs mr-2">{r.mps.toFixed(0)}%</span>
                                                                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${r.mps >= 75 ? 'bg-green-500' : r.mps >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{width: `${r.mps}%`}}></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{r.difficulty}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                                        r.interpretation === 'Mastered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                                        r.interpretation === 'Least Mastered' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                    }`}>
                                                                        {r.interpretation}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-[200px]">
                                                                    {r.competency ? (
                                                                        <button 
                                                                            onClick={() => setViewCompetency({ item: r.itemNumber, text: r.competency! })}
                                                                            className="text-left text-indigo-600 dark:text-indigo-400 hover:underline truncate w-full block font-medium"
                                                                            title="View Full Competency"
                                                                        >
                                                                            {r.competency}
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic">--</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button 
                                                                        onClick={() => openQuestionAnalysis(r.itemNumber)}
                                                                        className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
                                                                        title="AI Analysis"
                                                                    >
                                                                        <LightbulbIcon className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Sidebar */}
                                    <div className="space-y-4">
                                         <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                            <h3 className="text-lg font-bold relative z-10 mb-1">AI Actions</h3>
                                            <p className="text-indigo-200 text-xs mb-6 relative z-10">Advanced insights & remediation.</p>
                                            
                                            <button onClick={startAI} className="w-full mb-3 py-3 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-md flex items-center justify-center relative z-10">
                                                <BrainCircuitIcon className="w-4 h-4 mr-2"/>
                                                Generate Insights
                                            </button>
                                            <button onClick={handleGenerateRemedial} disabled={isGeneratingRemedial} className="w-full py-3 bg-indigo-700 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center relative z-10 disabled:opacity-70">
                                                {isGeneratingRemedial ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : <SparklesIcon className="w-4 h-4 mr-2"/>}
                                                Remedial Questions
                                            </button>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                                            <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-2">Data & Reports</h3>
                                            <button onClick={handleSaveSession} disabled={isLoadingData} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                                <span className="flex items-center">{isLoadingData ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : <SaveIcon className="w-4 h-4 mr-2"/>} Save Session</span>
                                            </button>
                                            <button onClick={handlePrintAnalysisReport} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                                <span className="flex items-center"><PrinterIcon className="w-4 h-4 mr-2"/> Print Report</span>
                                            </button>
                                            <button onClick={handleDownloadPDF} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                                <span className="flex items-center"><FileTextIcon className="w-4 h-4 mr-2"/> Download PDF</span>
                                            </button>
                                            <button onClick={() => generateAndDownloadAnalysisCSV(metadata, analysisResults)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                                <span className="flex items-center"><DownloadIcon className="w-4 h-4 mr-2"/> Export CSV</span>
                                            </button>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                             <div className="flex justify-between items-center mb-3">
                                                <label className="font-bold text-slate-800 dark:text-white text-sm flex items-center cursor-pointer group">
                                                    <FileTextIcon className="w-4 h-4 mr-2 text-slate-400"/> Test Questions
                                                    <input 
                                                        type="file" 
                                                        accept="application/pdf, image/*" 
                                                        className="hidden" 
                                                        onChange={handleQuestionFileUpload}
                                                        disabled={isExtractingQuestions}
                                                    />
                                                    {isExtractingQuestions ? <SpinnerIcon className="w-4 h-4 animate-spin text-indigo-500 ml-2"/> : <UploadIcon className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"/>}
                                                </label>
                                                <button 
                                                    onClick={handleExtractCompetencies} 
                                                    disabled={isMappingCompetencies}
                                                    className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded font-bold hover:bg-indigo-100 transition-colors flex items-center"
                                                >
                                                    {isMappingCompetencies ? <SpinnerIcon className="w-3 h-3 animate-spin mr-1"/> : <BrainCircuitIcon className="w-3 h-3 mr-1"/>}
                                                    Map Skills
                                                </button>
                                             </div>
                                            <textarea 
                                                id="testQuestionsInput"
                                                value={testQuestions} 
                                                onChange={(e) => setTestQuestions(e.target.value)} 
                                                className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Paste questions here or upload file..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CAMERA MODAL */}
                {isCameraOpen && (
                    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-0 md:p-4 backdrop-blur-md">
                        {/* ... Camera Logic remains unchanged ... */}
                        <div className="relative bg-black md:rounded-2xl overflow-hidden w-full max-w-5xl h-full md:h-[85vh] flex flex-col shadow-2xl border border-slate-800">
                             <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                                        <CameraIcon className="w-5 h-5 text-white"/>
                                    </div>
                                    <h3 className="text-lg font-bold text-white tracking-wide">
                                        {isLiveScanning ? 'Live Scan' : 'Capture Mode'}
                                    </h3>
                                </div>
                                <button onClick={stopCamera} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm">
                                    <XIcon className="w-6 h-6"/>
                                </button>
                            </header>

                            <div className="flex-1 flex flex-col md:flex-row relative">
                                {/* Video Feed */}
                                <div className="flex-1 relative bg-black flex items-center justify-center">
                                    {!scannedPreview || isLiveScanning ? (
                                        <>
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90"></video>
                                            <canvas ref={canvasRef} className="hidden"></canvas>
                                            
                                            {/* Scan Overlay UI */}
                                            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10">
                                                <div className="w-full h-full border-2 border-indigo-500/50 relative">
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                                                    
                                                    {isLiveScanning && (
                                                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan-line"></div>
                                                    )}
                                                </div>
                                            </div>

                                            {isLiveScanning && (
                                                <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
                                                    <div className="bg-black/70 text-white px-6 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-white/10 shadow-lg">
                                                        Align answer sheet within frame
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
                                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
                                                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                                            </div>
                                            <p className="text-lg font-medium">Image Captured Successfully</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Results Sidebar */}
                                {(isLiveScanning || scannedPreview) && (
                                    <div className="w-full md:w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col absolute md:relative bottom-0 md:bottom-auto max-h-[40vh] md:max-h-full z-30 rounded-t-2xl md:rounded-none transition-transform duration-300">
                                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                                            <h4 className="font-bold text-xs uppercase text-slate-400 tracking-widest">Detected Answers</h4>
                                            <span className="text-xs font-mono text-indigo-400">{scannedPreview?.filter(a => a).length || 0}/{metadata.totalItems}</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                            <div className="grid grid-cols-5 gap-2">
                                                {(scannedPreview || Array(metadata.totalItems).fill('')).map((answer, idx) => (
                                                    <div key={idx} className="flex flex-col items-center">
                                                        <span className="text-[9px] text-slate-500 mb-1">{idx + 1}</span>
                                                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border ${
                                                            answer 
                                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                                                            : 'bg-slate-800 border-slate-700 text-slate-600'
                                                        }`}>
                                                            {answer || '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="p-6 bg-black/90 backdrop-blur-md border-t border-slate-800 flex justify-center gap-6 z-30">
                                {!scannedPreview && !isLiveScanning ? (
                                    <>
                                        <button 
                                            onClick={captureAndScan} 
                                            disabled={isScanning}
                                            className="flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center group-hover:bg-white/10 transition-all">
                                                <div className="w-12 h-12 bg-white rounded-full"></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Capture</span>
                                        </button>
                                        
                                        <button 
                                            onClick={() => setIsLiveScanning(true)} 
                                            className="flex flex-col items-center gap-2 group absolute right-8 bottom-8 md:static"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 group-hover:scale-110 transition-transform">
                                                <BrainCircuitIcon className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide hidden md:block">Live AI</span>
                                        </button>
                                    </>
                                ) : isLiveScanning ? (
                                    <button 
                                        onClick={() => setIsLiveScanning(false)} 
                                        className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20 animate-pulse"
                                    >
                                        <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={retakeScan}
                                            className="px-8 py-3 rounded-full font-bold text-white border border-slate-600 hover:bg-slate-800 transition-colors"
                                        >
                                            Retake
                                        </button>
                                        <button 
                                            onClick={confirmScan}
                                            className="px-8 py-3 rounded-full font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/30 transition-colors flex items-center"
                                        >
                                            <CheckCircleIcon className="w-5 h-5 mr-2"/> Confirm
                                        </button>
                                    </>
                                )}
                            </footer>
                        </div>
                        <style>{`
                            @keyframes scan-line {
                                0% { top: 0; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { top: 100%; opacity: 0; }
                            }
                            .animate-scan-line {
                                animation: scan-line 2s linear infinite;
                            }
                        `}</style>
                    </div>
                )}
                
                {/* DELETE CONFIRMATION MODAL (SESSION) */}
                {deleteModalState.isOpen && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Session</h3>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Are you sure you want to permanently delete <strong>{deleteModalState.sessionTitle}</strong>? This action cannot be undone.
                            </p>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button 
                                    onClick={() => setDeleteModalState({ isOpen: false, sessionId: null, sessionTitle: '' })} 
                                    className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDeleteSession} 
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                 {/* PROGRESS MODAL */}
                 {isProgressModalOpen && selectedStudentForProgress && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
                            <header className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Student Progress: {selectedStudentForProgress.name}</h3>
                                <button onClick={handleCloseProgressModal}><XIcon className="w-6 h-6 text-slate-500"/></button>
                            </header>
                            
                            <div className="mb-6">
                                <h4 className="font-semibold mb-2">Current Performance</h4>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex justify-around text-center">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase">Score</div>
                                        <div className="text-2xl font-bold text-indigo-600">{selectedStudentForProgress.responses.reduce((a,b)=>a+b,0)} / {metadata.totalItems}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase">Percentage</div>
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {((selectedStudentForProgress.responses.reduce((a,b)=>a+b,0) / (metadata.totalItems || 1)) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                                 <button onClick={saveProgressRecord} className="mt-2 w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">
                                    Save Current Result to History
                                </button>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">History</h4>
                                <div className="max-h-60 overflow-y-auto border rounded-md custom-scrollbar">
                                    {isLoadingProgress ? (
                                        <div className="p-4 text-center"><SpinnerIcon className="w-6 h-6 animate-spin mx-auto"/></div>
                                    ) : progressHistory.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">No history recorded.</div>
                                    ) : (
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-slate-700 dark:text-slate-200 font-semibold">Date</th>
                                                    <th className="px-4 py-2 text-left text-slate-700 dark:text-slate-200 font-semibold">Test</th>
                                                    <th className="px-4 py-2 text-right text-slate-700 dark:text-slate-200 font-semibold">Score</th>
                                                    <th className="px-4 py-2 text-center text-slate-700 dark:text-slate-200 font-semibold w-20">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {progressHistory.map((record) => (
                                                    <tr key={record.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(record.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{record.testName}</td>
                                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{record.score} / {record.totalItems}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                onClick={() => handleDeleteProgressRecord(record.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                                title="Delete Record"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE PROGRESS CONFIRMATION MODAL */}
                {deleteProgressModal.isOpen && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete History Record</h3>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Are you sure you want to delete this progress record? This action cannot be undone.
                            </p>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button 
                                    onClick={() => setDeleteProgressModal({ isOpen: false, recordId: null })} 
                                    className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDeleteProgress} 
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FEEDBACK MODAL */}
                {feedbackModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                            <header className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Feedback for {feedbackModal.studentName}</h3>
                                <button onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-500 hover:text-slate-700">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </header>
                            <div className="space-y-4">
                                <textarea 
                                    value={feedbackModal.text}
                                    onChange={(e) => setFeedbackModal(prev => ({ ...prev, text: e.target.value }))}
                                    placeholder="Enter detailed feedback, observations, or notes for this student..."
                                    className="w-full h-32 input-field resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                                        className="px-4 py-2 text-sm bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveFeedback}
                                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Save Feedback
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* QUESTION ANALYSIS MODAL */}
                {isQuestionAnalysisModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        {/* ... Existing Modal Content ... */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                             <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <LightbulbIcon className="w-5 h-5 text-yellow-500" />
                                        Item Analysis: Question #{selectedQuestionItem}
                                    </h2>
                                    <div className="flex gap-3 mt-1 text-sm">
                                         <span className="text-slate-500">MPS: <strong className="text-slate-800 dark:text-slate-200">{analysisResults.find(r => r.itemNumber === selectedQuestionItem)?.mps.toFixed(0)}%</strong></span>
                                         <span className="text-slate-500">Difficulty: <strong className="text-slate-800 dark:text-slate-200">{analysisResults.find(r => r.itemNumber === selectedQuestionItem)?.difficulty}</strong></span>
                                    </div>
                                </div>
                                <button onClick={closeQuestionAnalysis} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6" /></button>
                            </header>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                {!questionAnalysisData ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Enter the text for Question #{selectedQuestionItem} below to get an in-depth AI analysis of core concepts, misconceptions, and teaching strategies.
                                        </p>
                                        <textarea 
                                            value={currentQuestionText}
                                            onChange={(e) => setCurrentQuestionText(e.target.value)}
                                            placeholder="Paste the question text here..."
                                            className="w-full h-32 input-field"
                                        />
                                        <button 
                                            onClick={handleAnalyzeQuestion}
                                            disabled={isAnalyzingQuestion || !currentQuestionText.trim()}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex justify-center items-center font-medium"
                                        >
                                            {isAnalyzingQuestion ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2"/> : <BrainCircuitIcon className="w-5 h-5 mr-2"/>}
                                            {isAnalyzingQuestion ? 'Analyzing...' : 'Analyze Question'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center"><BrainCircuitIcon className="w-4 h-4 mr-2"/> Core Concept</h4>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{questionAnalysisData.analysis.coreConcept}</p>
                                            </div>
                                            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                                                <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center"><TrendingUpIcon className="w-4 h-4 mr-2"/> Misconceptions</h4>
                                                 <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                                                    {questionAnalysisData.analysis.commonMisconceptions.map((m, i) => <li key={i}>{m}</li>)}
                                                 </ul>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800">
                                                <h4 className="font-bold text-green-800 dark:text-green-300 mb-2 flex items-center"><LightbulbIcon className="w-4 h-4 mr-2"/> Teaching Strategy</h4>
                                                 <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                                                    {questionAnalysisData.analysis.teachingSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                                                 </ul>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                            <h3 className="font-bold mb-4">Ask Follow-up Questions</h3>
                                            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar p-2">
                                                {questionChatHistory.map((msg, idx) => (
                                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                        {msg.role === 'model' && <BotIcon className="w-6 h-6 text-indigo-500 mt-1"/>}
                                                        <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                            {msg.content}
                                                        </div>
                                                        {msg.role === 'user' && <UserIcon className="w-6 h-6 text-slate-400 mt-1"/>}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex gap-2 mb-3 flex-wrap">
                                                {questionAnalysisData.suggestedQuestions.map((q, i) => (
                                                    <button key={i} onClick={() => setQuestionChatInput(q)} className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={questionChatInput} 
                                                    onChange={(e) => setQuestionChatInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleQuestionChatSend()}
                                                    placeholder="Ask about this specific question..."
                                                    className="flex-1 input-field"
                                                />
                                                <button 
                                                    onClick={handleQuestionChatSend}
                                                    disabled={isSendingQuestionChat || !questionChatInput.trim()}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* REMEDIAL QUESTIONS MODAL */}
                {remedialModal.isOpen && remedialModal.data && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                            <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-100 rounded-full text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                        <SparklesIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI Remedial Questions</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Targeting least mastered competencies</p>
                                    </div>
                                </div>
                                <button onClick={() => setRemedialModal({ isOpen: false, data: null })} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </header>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/20">
                                {remedialModal.data.questions.map((q, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Question {i + 1}</h3>
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-semibold rounded">
                                                {q.targetedConcept}
                                            </span>
                                        </div>
                                        <p className="text-base mb-4 font-medium">{q.question}</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                            {q.options.map((opt, idx) => (
                                                <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-600 text-sm">
                                                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-600 bg-green-50/50 dark:bg-green-900/10 rounded p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                <span className="font-bold text-sm text-green-800 dark:text-green-300">Correct Answer: {q.correctAnswer}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">{q.explanation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
                                <button 
                                    onClick={() => setRemedialModal({ isOpen: false, data: null })}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={copyRemedialQuestions}
                                    className={`flex items-center px-4 py-2 rounded-md text-white transition-colors ${copyRemedialSuccess ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {copyRemedialSuccess ? <CheckCircleIcon className="w-4 h-4 mr-2"/> : <CopyIcon className="w-4 h-4 mr-2"/>}
                                    {copyRemedialSuccess ? 'Copied!' : 'Copy All Questions'}
                                </button>
                            </footer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
