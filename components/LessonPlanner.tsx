import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { LessonPlan, Subject } from '../types';
import { generateLessonPlan, generateDLL } from '../services/geminiService';
import { BookOpenIcon, FileTextIcon } from './icons';
import { saveLessonPlan, loadSubjects, loadLessonPlans, sendNotification, deleteLessonPlan } from '../services/databaseService';
import { generateLessonPlanPDF, generateDLLPDF } from '../services/pdfGenerator';
import { PlannerInputForm } from './lesson-planner/PlannerInputForm';
import { PlannerEditor } from './lesson-planner/PlannerEditor';
import { PlanLibraryModal } from './lesson-planner/PlanLibraryModal';

interface LessonPlannerProps {
    user: firebase.User;
    initialContext?: {
        topic: string;
        learningArea: string;
        gradeLevel: string;
        competency: string;
    } | null;
}

const LessonPlanner = ({ user, initialContext }: LessonPlannerProps) => {
    const [step, setStep] = useState<'input' | 'editor'>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Library State
    const [savedPlans, setSavedPlans] = useState<LessonPlan[]>([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Tracking
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    
    // Input State managed here to preserve across steps
    const [learningArea, setLearningArea] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [timeAllotment, setTimeAllotment] = useState('60 Minutes');
    const [topic, setTopic] = useState('');
    const [competencyCode, setCompetencyCode] = useState('');
    const [strategy, setStrategy] = useState('4As');
    const [selectedQuarter, setSelectedQuarter] = useState('1st Quarter');
    const [planType, setPlanType] = useState<'DLP' | 'DLL'>('DLP');
    
    // Curriculum Context State
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedWeekId, setSelectedWeekId] = useState('');
    const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);
    const [contentStandards, setContentStandards] = useState('');
    const [performanceStandards, setPerformanceStandards] = useState('');
    const [isLinked, setIsLinked] = useState(false);

    // The Generated Plan
    const [plan, setPlan] = useState<LessonPlan | null>(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const loaded = await loadSubjects();
                setSubjects(loaded.filter(s => !s.deletedAt));
            } catch (e) {
                console.error("Failed to load subjects", e);
            }
        };
        fetchSubjects();
    }, []);

    // Effect to populate form from initialContext (e.g. from Item Analysis)
    useEffect(() => {
        if (initialContext) {
            setTopic(initialContext.topic || '');
            setLearningArea(initialContext.learningArea || '');
            setGradeLevel(initialContext.gradeLevel || '');
            setCompetencyCode(initialContext.competency || ''); 
            setStep('input');

            // Auto-select Subject if loaded
            if (subjects.length > 0 && initialContext.learningArea) {
                const matchedSubject = subjects.find(s => 
                    s.name.toLowerCase() === initialContext.learningArea.toLowerCase() ||
                    s.code.toLowerCase() === initialContext.learningArea.toLowerCase()
                );
                if (matchedSubject) {
                    setSelectedSubjectId(matchedSubject.id);
                }
            }
        }
    }, [initialContext, subjects]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        try {
            // Find selected subject data for context
            const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
            
            // Re-derive week data just for context generation
            let selectedWeekData = null;
            if (selectedSubject && isLinked) {
                 const rawCurriculum = selectedSubject.curriculum as any;
                 const curriculumArray = rawCurriculum ? (Array.isArray(rawCurriculum) ? rawCurriculum : Object.values(rawCurriculum)) : [];
                 const quarterData = curriculumArray.find((q: any) => q.quarter === selectedQuarter);
                 if (quarterData && quarterData.weeks) {
                     const rawWeeks = quarterData.weeks as any;
                     const weeksArray = Array.isArray(rawWeeks) ? rawWeeks : Object.values(rawWeeks);
                     selectedWeekData = weeksArray.find((w: any) => w.id === selectedWeekId);
                 }
            }

            // 1. Gather Context from selected Subject (General Info)
            const subjectContext = selectedSubject ? {
                subjectName: selectedSubject.name,
                description: selectedSubject.description,
                classification: selectedSubject.classification,
                track: selectedSubject.track,
                strand: selectedSubject.strand,
                department: selectedSubject.department
            } : {};

            // 2. Gather Context from selected Week (Curriculum Standards)
            const curriculumContext = isLinked ? {
                contentStandards,
                performanceStandards,
                learningCompetencies: selectedCompetencyIds,
                weekOrder: selectedWeekData?.orderIndex,
                weekLabel: selectedWeekData?.weekLabel
            } : {};

            // 3. Merge Contexts
            const fullContext = { ...subjectContext, ...curriculumContext };

            let generatedPlan: LessonPlan;

            if (planType === 'DLL') {
                generatedPlan = await generateDLL(
                    learningArea, gradeLevel, selectedQuarter, topic, competencyCode, fullContext
                );
            } else {
                generatedPlan = await generateLessonPlan(
                    learningArea, gradeLevel, selectedQuarter, timeAllotment, 
                    topic, competencyCode, strategy, fullContext
                );
            }
            
            setPlan({ ...generatedPlan, preparedBy: user.displayName || "" });
            setCurrentPlanId(null); // New generation means new plan
            setStep('editor');
        } catch (error: any) {
            console.error(error);
            const errStr = error.message || JSON.stringify(error);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota') || errStr.includes('Quota Exceeded')) {
                 setErrorMsg("⚠️ AI Usage Limit Reached. Please try again later.");
            } else {
                 setErrorMsg("Failed to generate plan. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSmartSave = async () => {
        if (!plan) return;
        setIsSaving(true);
        try {
            // Data sanitation handled in databaseService layer for LessonPlanner now
            const savedId = await saveLessonPlan(user.uid, plan, currentPlanId || undefined);
            setCurrentPlanId(savedId);
            
            sendNotification(user.uid, {
                title: currentPlanId ? 'Lesson Plan Updated' : 'Lesson Plan Saved',
                message: `"${plan.topic}" has been saved to your library.`,
                type: 'success',
                link: 'lessonPlanner'
            });
        } catch (e) {
            console.error(e);
            alert("Failed to save plan. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenLibrary = async () => {
        setIsLoading(true);
        try {
            const plans = await loadLessonPlans(user.uid);
            const sorted = plans.sort((a: any, b: any) => (b.lastModified || b.createdAt) - (a.lastModified || a.createdAt));
            setSavedPlans(sorted);
            setShowLoadModal(true);
        } catch (e) {
            console.error(e);
            alert("Failed to load library.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadPlan = (loadedPlan: LessonPlan) => {
        setPlan(loadedPlan);
        setCurrentPlanId(loadedPlan.id);
        // Sync input state for consistency if they go 'Back'
        setLearningArea(loadedPlan.learningArea);
        setGradeLevel(loadedPlan.gradeLevel);
        setSelectedQuarter(loadedPlan.quarter);
        setTopic(loadedPlan.topic);
        setPlanType(loadedPlan.type || 'DLP');
        
        setStep('editor');
        setShowLoadModal(false);
    };

    const handleDeletePlan = (e: React.MouseEvent, planId: string) => {
        e.stopPropagation();
        setDeleteConfirmId(planId);
    };

    const executeDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteLessonPlan(user.uid, deleteConfirmId);
            setSavedPlans(prev => prev.filter(p => p.id !== deleteConfirmId));
            if (currentPlanId === deleteConfirmId) {
                setPlan(null);
                setCurrentPlanId(null);
                setStep('input');
            }
            sendNotification(user.uid, {
                title: 'Plan Deleted',
                message: 'Lesson plan was permanently removed.',
                type: 'success'
            });
        } catch (error) {
            console.error("Error deleting plan:", error);
            alert("Failed to delete plan.");
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleUpdatePlan = (field: keyof LessonPlan, value: any) => {
        if (plan) setPlan({ ...plan, [field]: value });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto text-slate-800 dark:text-slate-200">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
                        <BookOpenIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Smart Lesson Planner</h1>
                        <p className="text-slate-500 dark:text-slate-400">AI-powered curriculum development.</p>
                    </div>
                </div>
                {step === 'input' && (
                    <button 
                        onClick={handleOpenLibrary}
                        className="flex items-center px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm font-bold text-sm"
                    >
                        <FileTextIcon className="w-4 h-4 mr-2 text-indigo-500" /> Open Saved Plan
                    </button>
                )}
            </header>

            {step === 'input' && (
                <PlannerInputForm 
                    subjects={subjects}
                    onSubmit={handleGenerate}
                    isLoading={isLoading}
                    errorMsg={errorMsg}
                    learningArea={learningArea} setLearningArea={setLearningArea}
                    gradeLevel={gradeLevel} setGradeLevel={setGradeLevel}
                    timeAllotment={timeAllotment} setTimeAllotment={setTimeAllotment}
                    topic={topic} setTopic={setTopic}
                    competencyCode={competencyCode} setCompetencyCode={setCompetencyCode}
                    strategy={strategy} setStrategy={setStrategy}
                    selectedQuarter={selectedQuarter} setSelectedQuarter={setSelectedQuarter}
                    planType={planType} setPlanType={setPlanType}
                    selectedSubjectId={selectedSubjectId} setSelectedSubjectId={setSelectedSubjectId}
                    selectedWeekId={selectedWeekId} setSelectedWeekId={setSelectedWeekId}
                    selectedCompetencyIds={selectedCompetencyIds} setSelectedCompetencyIds={setSelectedCompetencyIds}
                    isLinked={isLinked} setIsLinked={setIsLinked}
                    setContentStandards={setContentStandards}
                    setPerformanceStandards={setPerformanceStandards}
                />
            )}

            {step === 'editor' && plan && (
                <PlannerEditor 
                    plan={plan}
                    onUpdate={handleUpdatePlan}
                    onSave={handleSmartSave}
                    onExport={() => plan.type === 'DLL' ? generateDLLPDF(plan) : generateLessonPlanPDF(plan)}
                    onBack={() => setStep('input')}
                    onOpenLibrary={handleOpenLibrary}
                    isSaving={isSaving}
                    currentPlanId={currentPlanId}
                />
            )}

            {showLoadModal && (
                <PlanLibraryModal 
                    savedPlans={savedPlans}
                    onClose={() => setShowLoadModal(false)}
                    onLoad={handleLoadPlan}
                    onDelete={handleDeletePlan}
                    deleteConfirmId={deleteConfirmId}
                    onCancelDelete={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                    onConfirmDelete={executeDelete}
                />
            )}
        </div>
    );
};

export default LessonPlanner;