
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { LessonPlan, Subject, QuarterUnit, WeeklyUnit } from '../types';
import { generateLessonPlan } from '../services/geminiService';
import { SpinnerIcon, SparklesIcon, PrinterIcon, SaveIcon, BookOpenIcon, EditIcon, ChevronDownIcon, CheckCircleIcon, FileTextIcon, XIcon, SearchIcon, TrashIcon, ArrowDownIcon } from './icons';
import jsPDF from 'jspdf';
import { saveLessonPlan, loadSubjects, loadLessonPlans, sendNotification, deleteLessonPlan } from '../services/databaseService';

interface LessonPlannerProps {
    user: User;
}

const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

const LessonPlanner = ({ user }: LessonPlannerProps) => {
    const [step, setStep] = useState<'input' | 'editor'>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Library State
    const [savedPlans, setSavedPlans] = useState<LessonPlan[]>([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [planSearch, setPlanSearch] = useState('');
    
    // Delete Confirmation State
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Tracking
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    
    // Selection State
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1st Quarter');
    const [selectedWeekId, setSelectedWeekId] = useState('');
    const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]); 
    
    // Custom Dropdown State
    const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

    // Input State
    const [learningArea, setLearningArea] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [timeAllotment, setTimeAllotment] = useState('60 Minutes');
    const [topic, setTopic] = useState('');
    const [competencyCode, setCompetencyCode] = useState('');
    const [strategy, setStrategy] = useState('4As');
    
    // Auto-populated Standards
    const [contentStandards, setContentStandards] = useState('');
    const [performanceStandards, setPerformanceStandards] = useState('');
    
    const [isLinked, setIsLinked] = useState(false);
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

    const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);
    
    // Robustly handle curriculum/weeks data structure (Array vs Object from Firebase)
    const availableWeeks = useMemo(() => {
        if (!selectedSubject) return [];
        
        // Ensure curriculum is treated as array
        const rawCurriculum = selectedSubject.curriculum as any;
        const curriculumArray: QuarterUnit[] = rawCurriculum 
            ? (Array.isArray(rawCurriculum) ? rawCurriculum : Object.values(rawCurriculum))
            : [];

        const quarterData = curriculumArray.find(q => q.quarter === selectedQuarter);
        
        if (!quarterData || !quarterData.weeks) return [];
        
        // Ensure weeks is treated as array and sorted
        const rawWeeks = quarterData.weeks as any;
        const weeksArray: WeeklyUnit[] = Array.isArray(rawWeeks) 
            ? rawWeeks 
            : Object.values(rawWeeks);
            
        return weeksArray.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [selectedSubject, selectedQuarter]);

    const selectedWeekData = useMemo(() => {
        return availableWeeks.find(w => w.id === selectedWeekId);
    }, [availableWeeks, selectedWeekId]);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subId = e.target.value;
        setSelectedSubjectId(subId);
        const sub = subjects.find(s => s.id === subId);
        if (sub) {
            setLearningArea(sub.name);
            setGradeLevel(sub.gradeLevel);
        } else {
            setLearningArea('');
            setGradeLevel('');
        }
        setSelectedWeekId('');
        setIsLinked(false);
    };

    const selectWeek = (wId: string) => {
        setSelectedWeekId(wId);
        
        const week = availableWeeks.find(w => w.id === wId);
        if (week) {
            setTopic(week.contentTopic);
            setContentStandards(week.contentStandard);
            setPerformanceStandards(week.performanceStandard);
            setSelectedCompetencyIds(week.competencies ? week.competencies.map(c => c.description) : []);
            setCompetencyCode(week.competencies ? week.competencies.map(c => c.code).join(', ') : '');
            setIsLinked(true);
        } else {
            setTopic('');
            setContentStandards('');
            setPerformanceStandards('');
            setSelectedCompetencyIds([]);
            setIsLinked(false);
        }
        setIsWeekDropdownOpen(false);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const context = isLinked ? {
                contentStandards,
                performanceStandards,
                learningCompetencies: selectedCompetencyIds
            } : undefined;

            const generatedPlan = await generateLessonPlan(
                learningArea, gradeLevel, selectedQuarter, timeAllotment, 
                topic, competencyCode, strategy, context
            );
            
            setPlan({ ...generatedPlan, preparedBy: user.displayName || "" });
            setCurrentPlanId(null); // New generation means new plan
            setStep('editor');
        } catch (error) {
            console.error(error);
            alert("Failed to generate plan. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSmartSave = async () => {
        if (!plan) return;
        setIsSaving(true);
        try {
            const savedId = await saveLessonPlan(user.uid, plan, currentPlanId || undefined);
            setCurrentPlanId(savedId);
            
            sendNotification(user.uid, {
                title: currentPlanId ? 'Lesson Plan Updated' : 'Lesson Plan Saved',
                message: `"${plan.topic}" has been saved to your library.`,
                type: 'success',
                link: 'lessonPlanner'
            });
            // alert(currentPlanId ? "Plan updated successfully!" : "Plan saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save plan.");
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
        setLearningArea(loadedPlan.learningArea);
        setGradeLevel(loadedPlan.gradeLevel);
        setSelectedQuarter(loadedPlan.quarter);
        setTopic(loadedPlan.topic);
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

    const handleUpdatePlan = (field: keyof LessonPlan, value: string) => {
        if (plan) setPlan({ ...plan, [field]: value });
    };

    const handleExportPDF = () => {
        if (!plan) return;
        const doc = new jsPDF();
        
        const margin = 15;
        let y = margin;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        const addText = (text: string, x: number, yPos: number, size: number, weight: 'normal' | 'bold' = 'normal', align: 'left' | 'center' = 'left', maxWidth?: number) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', weight);
            if (maxWidth) {
                const lines = doc.splitTextToSize(text, maxWidth);
                doc.text(lines, x, yPos, { align });
                return lines.length * (size * 0.45);
            } else {
                doc.text(text, x, yPos, { align });
                return size * 0.45;
            }
        };

        y += addText("Department of Education", pageWidth / 2, y, 12, 'bold', 'center');
        y += 6;
        y += addText("DETAILED LESSON PLAN (DLP)", pageWidth / 2, y, 14, 'bold', 'center');
        y += 10;

        const cellHeight = 8;
        const col1 = margin;
        const col2 = margin + 30;
        const col3 = pageWidth / 2;
        const col4 = col3 + 30;

        doc.setLineWidth(0.1);
        doc.rect(margin, y, contentWidth, cellHeight * 2);
        doc.line(margin, y + cellHeight, pageWidth - margin, y + cellHeight);
        doc.line(pageWidth / 2, y, pageWidth / 2, y + (cellHeight * 2));

        addText("DLP No.:", col1 + 2, y + 5, 10, 'bold');
        addText("1", col2 + 2, y + 5, 10);
        addText("Learning Area:", col3 + 2, y + 5, 10, 'bold');
        addText(plan.learningArea, col4 + 2, y + 5, 10);
        addText("Grade Level:", col1 + 2, y + cellHeight + 5, 10, 'bold');
        addText(plan.gradeLevel, col2 + 2, y + cellHeight + 5, 10);
        addText("Quarter:", col3 + 2, y + cellHeight + 5, 10, 'bold');
        addText(plan.quarter, col4 + 2, y + cellHeight + 5, 10);

        y += (cellHeight * 2) + 5;

        const sections = [
            { title: "I. OBJECTIVES", content: [
                `A. Content Standards: ${plan.contentStandards}`,
                `B. Performance Standards: ${plan.performanceStandards}`,
                `C. Learning Competencies: ${plan.learningCompetencies}`,
                `D. Objectives:\n${plan.subTaskedObjectives}`
            ]},
            { title: "II. CONTENT", content: [
                `Topic: ${plan.topic}`,
                `Concepts: ${plan.concepts}`
            ]},
            { title: "III. LEARNING RESOURCES", content: [
                `A. References:`,
                `   1. Teacher's Guide: ${plan.refGuidePages}`,
                `   2. Learner's Material: ${plan.refLearnerPages}`,
                `   3. Textbook: ${plan.refTextbookPages}`,
                `B. Other Resources: ${plan.otherResources}`
            ]},
            { title: "IV. PROCEDURES", content: [
                `A. Preparatory Activities:\n${plan.preparatoryActivities}`,
                `B. Presentation:\n${plan.presentation}`,
                `C. Lesson Proper:\n${plan.lessonProper}`,
                `D. Application / Activity:\n${plan.groupActivity}`,
            ]},
            { title: "V. ASSESSMENT", content: [plan.assessment] },
            { title: "VI. ASSIGNMENT", content: [plan.assignment] }
        ];

        sections.forEach(section => {
            if (y > 250) { doc.addPage(); y = margin; }
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.rect(margin, y, contentWidth, 8, 'S');
            addText(section.title, margin + 2, y + 5.5, 10, 'bold');
            y += 8;

            section.content.forEach(text => {
                const lines = doc.splitTextToSize(text, contentWidth - 4);
                const height = lines.length * 5;
                if (y + height > 270) { doc.addPage(); y = margin; }
                doc.rect(margin, y, contentWidth, height + 2);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(lines, margin + 2, y + 5);
                y += height + 2;
            });
            y += 2;
        });

        if (y > 240) { doc.addPage(); y = margin; }
        y += 10;
        
        addText("Prepared by:", margin, y, 10);
        addText("Noted by:", pageWidth / 2 + margin, y, 10);
        y += 15;
        
        addText(plan.preparedBy.toUpperCase(), margin, y, 10, 'bold');
        doc.line(margin, y + 1, margin + 60, y + 1);
        addText("Teacher", margin, y + 5, 9);

        addText(plan.notedBy.toUpperCase() || "PRINCIPAL", pageWidth / 2 + margin, y, 10, 'bold');
        doc.line(pageWidth / 2 + margin, y + 1, pageWidth / 2 + margin + 60, y + 1);
        addText("School Head", pageWidth / 2 + margin, y + 5, 9);

        doc.save(`${plan.topic.replace(/\s+/g, '_')}_DLP.pdf`);
    };

    const filteredSavedPlans = savedPlans.filter(p => 
        p.topic.toLowerCase().includes(planSearch.toLowerCase()) || 
        p.learningArea.toLowerCase().includes(planSearch.toLowerCase())
    );

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
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 animate-fade-in-up">
                    <form onSubmit={handleGenerate} className="space-y-8">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-4 flex items-center">
                                <SparklesIcon className="w-4 h-4 mr-2" /> Curriculum Integration
                            </h3>
                            
                            {/* Subject & Quarter Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Subject</label>
                                    <div className="relative">
                                        <select value={selectedSubjectId} onChange={handleSubjectChange} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                            <option value="">-- Choose Subject --</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quarter</label>
                                    <div className="relative">
                                        <select value={selectedQuarter} onChange={e => { setSelectedQuarter(e.target.value); setSelectedWeekId(''); }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Rich Text Dropdown for Week */}
                            <div className="mb-6 relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Week</label>
                                
                                {/* Dropdown Trigger */}
                                <div 
                                    onClick={() => !(!selectedSubjectId) && setIsWeekDropdownOpen(!isWeekDropdownOpen)}
                                    className={`w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-left flex justify-between items-center transition-all shadow-sm ${!selectedSubjectId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                >
                                    <span className="block pr-4 text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                                        {selectedWeekData 
                                            ? <span className="flex flex-col sm:flex-row sm:items-center gap-1">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded whitespace-nowrap">{selectedWeekData.weekLabel}</span>
                                                <span>{selectedWeekData.contentTopic}</span>
                                              </span>
                                            : <span className="text-slate-400">-- Choose Week (View Topics) --</span>
                                        }
                                    </span>
                                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isWeekDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`}/>
                                </div>

                                {/* Dropdown Menu */}
                                {isWeekDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsWeekDropdownOpen(false)}></div>
                                        <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-fade-in-up">
                                            {availableWeeks.length === 0 ? (
                                                <div className="p-6 text-sm text-slate-500 text-center italic">No weeks found for this quarter.</div>
                                            ) : (
                                                availableWeeks.map(w => (
                                                    <div 
                                                        key={w.id}
                                                        onClick={() => selectWeek(w.id)}
                                                        className={`p-4 border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 cursor-pointer transition-all flex flex-col gap-1 group last:border-0 ${selectedWeekId === w.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedWeekId === w.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600'}`}>
                                                                {w.weekLabel}
                                                            </span>
                                                            {selectedWeekId === w.id && <CheckCircleIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                                        </div>
                                                        <span className={`text-sm leading-relaxed font-medium ${selectedWeekId === w.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {w.contentTopic}
                                                        </span>
                                                        {w.competencies && w.competencies.length > 0 && (
                                                             <span className="text-[10px] text-slate-400 flex items-center mt-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
                                                                {w.competencies.length} Competencies
                                                             </span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {isLinked && selectedWeekData && (
                                <div className="mt-6 animate-fade-in">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide flex items-center">
                                            <CheckCircleIcon className="w-3 h-3 mr-1" /> Linked to Curriculum
                                        </span>
                                    </div>
                                    {selectedWeekData.competencies && selectedWeekData.competencies.length > 0 && (
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Competencies:</label>
                                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                {selectedWeekData.competencies.map((comp, idx) => (
                                                    <label key={idx} className="flex items-start gap-2 cursor-pointer group">
                                                        <input type="checkbox" checked={selectedCompetencyIds.includes(comp.description)} onChange={() => {
                                                            setSelectedCompetencyIds(prev => prev.includes(comp.description) ? prev.filter(d => d !== comp.description) : [...prev, comp.description]);
                                                        }} className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{comp.description} <span className="text-xs text-slate-400 ml-1">({comp.code})</span></span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Learning Area</label>
                                <input required type="text" value={learningArea} onChange={e => setLearningArea(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Grade Level</label>
                                <input required type="text" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Time Allotment</label>
                                <input required type="text" value={timeAllotment} onChange={e => setTimeAllotment(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Topic / Subject Matter</label>
                                <input required type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Competency Code</label>
                                <input type="text" value={competencyCode} onChange={e => setCompetencyCode(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teaching Strategy</label>
                                <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="4As">4A's (Activity, Analysis, Abstraction, Application)</option>
                                    <option value="Inductive">Inductive Method</option>
                                    <option value="Differentiated">Differentiated Instruction</option>
                                    <option value="Direct">Direct Instruction</option>
                                    <option value="Inquiry-Based">Inquiry-Based Learning</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 disabled:opacity-70 flex justify-center items-center group">
                                {isLoading ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : <SparklesIcon className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />}
                                {isLoading ? "Architecting Lesson Plan..." : "Generate Lesson Plan"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {step === 'editor' && plan && (
                <div className="animate-fade-in-up max-w-6xl mx-auto">
                    {/* STICKY ACTION BAR */}
                    <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 mb-8 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setStep('input')}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors flex items-center font-bold text-sm"
                            >
                                <ArrowDownIcon className="w-4 h-4 mr-2 rotate-90" /> Back
                            </button>
                            <div>
                                <h2 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{plan.topic || 'Untitled Plan'}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{plan.gradeLevel} • {plan.learningArea}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleOpenLibrary}
                                className="hidden md:flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors"
                            >
                                <FileTextIcon className="w-4 h-4 mr-2" /> Library
                            </button>
                            <button 
                                onClick={handleSmartSave}
                                disabled={isSaving}
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md transition-all"
                            >
                                {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : <SaveIcon className="w-4 h-4 mr-2" />}
                                {currentPlanId ? 'Save Changes' : 'Save Draft'}
                            </button>
                            <button 
                                onClick={handleExportPDF}
                                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition-all"
                            >
                                <PrinterIcon className="w-4 h-4 mr-2" /> Export PDF
                            </button>
                        </div>
                    </div>

                    {/* FULL WIDTH EDITOR */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 md:p-12 space-y-12">
                        
                        {/* I. OBJECTIVES */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">I</span> Objectives
                            </h3>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Content Standards</label>
                                        <textarea 
                                            value={plan.contentStandards} 
                                            onChange={e => handleUpdatePlan('contentStandards', e.target.value)} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Performance Standards</label>
                                        <textarea 
                                            value={plan.performanceStandards} 
                                            onChange={e => handleUpdatePlan('performanceStandards', e.target.value)} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Learning Competencies</label>
                                        <textarea 
                                            value={plan.learningCompetencies} 
                                            onChange={e => handleUpdatePlan('learningCompetencies', e.target.value)} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Specific Objectives</label>
                                    <textarea 
                                        value={plan.subTaskedObjectives} 
                                        onChange={e => handleUpdatePlan('subTaskedObjectives', e.target.value)} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-48 resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        placeholder="List cognitive, psychomotor, and affective objectives..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* II. CONTENT */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">II</span> Content
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Topic</label>
                                    <input 
                                        type="text"
                                        value={plan.topic} 
                                        onChange={e => handleUpdatePlan('topic', e.target.value)} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Key Concepts</label>
                                    <input 
                                        type="text"
                                        value={plan.concepts} 
                                        onChange={e => handleUpdatePlan('concepts', e.target.value)} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* III. LEARNING RESOURCES */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">III</span> Learning Resources
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Teacher's Guide Pages</label>
                                    <input 
                                        value={plan.refGuidePages} 
                                        onChange={e => handleUpdatePlan('refGuidePages', e.target.value)} 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Learner's Material Pages</label>
                                    <input 
                                        value={plan.refLearnerPages} 
                                        onChange={e => handleUpdatePlan('refLearnerPages', e.target.value)} 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Textbook Pages</label>
                                    <input 
                                        value={plan.refTextbookPages} 
                                        onChange={e => handleUpdatePlan('refTextbookPages', e.target.value)} 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Other Resources</label>
                                    <input 
                                        value={plan.otherResources} 
                                        onChange={e => handleUpdatePlan('otherResources', e.target.value)} 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* IV. PROCEDURES */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">IV</span> Procedures ({plan.strategy})
                            </h3>
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">A. Preparatory Activities</label>
                                    <textarea 
                                        value={plan.preparatoryActivities} 
                                        onChange={e => handleUpdatePlan('preparatoryActivities', e.target.value)} 
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-48 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                        placeholder="Drill, Review, Motivation..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">B. Presentation</label>
                                    <textarea 
                                        value={plan.presentation} 
                                        onChange={e => handleUpdatePlan('presentation', e.target.value)} 
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-48 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                        placeholder="Presenting the new lesson..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">C. Lesson Proper</label>
                                    <textarea 
                                        value={plan.lessonProper} 
                                        onChange={e => handleUpdatePlan('lessonProper', e.target.value)} 
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-64 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed font-medium"
                                        placeholder="Developmental activities, discussion, analysis..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">D. Application</label>
                                    <textarea 
                                        value={plan.groupActivity} 
                                        onChange={e => handleUpdatePlan('groupActivity', e.target.value)} 
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-48 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                        placeholder="Group activities, abstraction, finding practical applications..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* V. ASSESSMENT */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">V</span> Evaluation
                            </h3>
                            <div className="space-y-3">
                                <textarea 
                                    value={plan.assessment} 
                                    onChange={e => handleUpdatePlan('assessment', e.target.value)} 
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-48 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                    placeholder="Quiz, Formative Assessment details..."
                                />
                            </div>
                        </section>

                        {/* VI. ASSIGNMENT */}
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">VI</span> Assignment
                            </h3>
                            <div className="space-y-3">
                                <textarea 
                                    value={plan.assignment} 
                                    onChange={e => handleUpdatePlan('assignment', e.target.value)} 
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-32 resize-y focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                    placeholder="Homework or Agreement..."
                                />
                            </div>
                        </section>

                        {/* SIGNATORIES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 mt-8 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-center">
                                <input 
                                    type="text" 
                                    value={plan.preparedBy} 
                                    onChange={e => handleUpdatePlan('preparedBy', e.target.value)} 
                                    className="font-bold text-center border-b-2 border-slate-300 dark:border-slate-600 outline-none bg-transparent w-3/4 uppercase pb-2 text-lg focus:border-indigo-500 transition-colors"
                                />
                                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Prepared By</p>
                            </div>
                            <div className="text-center">
                                <input 
                                    type="text" 
                                    value={plan.notedBy} 
                                    onChange={e => handleUpdatePlan('notedBy', e.target.value)} 
                                    className="font-bold text-center border-b-2 border-slate-300 dark:border-slate-600 outline-none bg-transparent w-3/4 uppercase pb-2 text-lg focus:border-indigo-500 transition-colors" 
                                    placeholder="PRINCIPAL'S NAME" 
                                />
                                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Noted By</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIBRARY MODAL */}
            {showLoadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up relative">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lesson Plan Library</h3>
                            <button onClick={() => setShowLoadModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                                <input 
                                    type="text" 
                                    placeholder="Search plans..." 
                                    value={planSearch}
                                    onChange={(e) => setPlanSearch(e.target.value)}
                                    className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredSavedPlans.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">No plans found.</div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredSavedPlans.map((p, idx) => (
                                        <div 
                                            key={p.id || idx} 
                                            onClick={() => handleLoadPlan(p)}
                                            className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-500 cursor-pointer transition-all hover:shadow-md group relative"
                                        >
                                            <div className="flex justify-between items-start pr-8">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors">{p.topic}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.learningArea} • {p.gradeLevel} • {p.quarter}</p>
                                                </div>
                                                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                    {new Date(p.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDeletePlan(e, p.id)}
                                                className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete Plan"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* DELETE CONFIRMATION MODAL (OVERLAY) */}
                        {deleteConfirmId && (
                            <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center z-[110] p-6 rounded-xl">
                                <div className="text-center max-w-sm w-full animate-fade-in-up">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Lesson Plan?</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                        Are you sure you want to permanently delete this plan? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={executeDelete}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPlanner;
