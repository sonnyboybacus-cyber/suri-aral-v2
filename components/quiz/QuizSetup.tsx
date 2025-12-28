
import React, { useState, useEffect, useMemo } from 'react';
import { PuzzleIcon, UploadIcon, BrainCircuitIcon, ArrowDownIcon, AlertTriangleIcon, XIcon, LibraryIcon, TrashIcon, BookOpenIcon, ChevronDownIcon, CheckCircleIcon, PenToolIcon } from '../icons';
import { SavedQuiz, QuizQuestion, Subject, WeeklyUnit } from '../../types';
import { loadQuizLibrary, deleteSavedQuiz, loadSubjects } from '../../services/databaseService';

interface QuizSetupProps {
    topic: string;
    setTopic: (t: string) => void;
    quizTitle: string;
    setQuizTitle: (t: string) => void;
    file: File | null;
    setFile: (f: File | null) => void;
    loading: boolean;
    onStart: () => void;
    onLoadFromLibrary: (questions: QuizQuestion[]) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: (e: React.MouseEvent) => void;
    errorMsg: string | null;
    mode: 'practice' | 'exam';
    setMode: (m: 'practice' | 'exam') => void;
    userId: string;
}

type SourceMode = 'custom' | 'upload' | 'curriculum';

export const QuizSetup = ({ 
    topic, 
    setTopic, 
    quizTitle,
    setQuizTitle,
    file, 
    setFile, 
    loading, 
    onStart, 
    onLoadFromLibrary,
    onFileChange, 
    onClearFile,
    errorMsg,
    mode,
    setMode,
    userId
}: QuizSetupProps) => {
    const [sourceMode, setSourceMode] = useState<SourceMode>('custom');
    
    // Library State
    const [showLibrary, setShowLibrary] = useState(false);
    const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    // Curriculum State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1st Quarter');
    const [selectedWeekId, setSelectedWeekId] = useState('');
    const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
    
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const data = await loadSubjects();
                setSubjects(data.filter(s => !s.deletedAt));
            } catch (e) {
                console.error("Failed to load subjects", e);
            }
        };
        fetchSubjects();
    }, []);

    // Curriculum Derived Data
    const activeSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);
    
    const activeWeeks = useMemo(() => {
        if (!activeSubject || !activeSubject.curriculum) return [];
        const rawCurriculum = activeSubject.curriculum as any;
        const curriculumArray = Array.isArray(rawCurriculum) ? rawCurriculum : Object.values(rawCurriculum);
        const quarterData = curriculumArray.find((q: any) => q.quarter === selectedQuarter);
        if (!quarterData || !quarterData.weeks) return [];
        
        const rawWeeks = quarterData.weeks as any;
        return (Array.isArray(rawWeeks) ? rawWeeks : Object.values(rawWeeks)) as WeeklyUnit[];
    }, [activeSubject, selectedQuarter]);

    const activeWeek = useMemo(() => activeWeeks.find(w => w.id === selectedWeekId), [activeWeeks, selectedWeekId]);

    // Auto-construct prompt and title when curriculum selection changes
    useEffect(() => {
        if (sourceMode === 'curriculum' && activeSubject && activeWeek) {
            // Auto set friendly title if user hasn't typed one
            if (!quizTitle || quizTitle.startsWith('Quiz: ')) {
                setQuizTitle(`Quiz: ${activeWeek.weekLabel} - ${activeSubject.name}`);
            }

            const comps = selectedCompetencies.length > 0 
                ? selectedCompetencies.join('; ') 
                : "All competencies in this module";
            
            const contextPrompt = `
            Create a quiz for: ${activeSubject.name} (${activeSubject.gradeLevel}).
            Topic: ${activeWeek.contentTopic}.
            Quarter: ${selectedQuarter}, ${activeWeek.weekLabel}.
            
            Focus on these Learning Competencies:
            ${comps}
            
            Target Performance Standard:
            ${activeWeek.performanceStandard}
            `.trim();
            
            setTopic(contextPrompt);
        }
    }, [sourceMode, activeSubject, activeWeek, selectedCompetencies, selectedQuarter, setTopic, quizTitle, setQuizTitle]);

    const openLibrary = async () => {
        setIsLoadingLibrary(true);
        setShowLibrary(true);
        try {
            const quizzes = await loadQuizLibrary(userId);
            setSavedQuizzes(quizzes.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        if (confirm("Delete this quiz?")) {
            await deleteSavedQuiz(userId, quizId);
            setSavedQuizzes(prev => prev.filter(q => q.id !== quizId));
        }
    };

    const handleTabChange = (newMode: SourceMode) => {
        setSourceMode(newMode);
        if (newMode === 'upload') {
            setTopic('');
        } else if (newMode === 'custom') {
            setFile(null);
            setTopic('');
        } else if (newMode === 'curriculum') {
            setFile(null);
            setTopic(''); // Will be auto-filled by effect
        }
    };

    const toggleCompetency = (desc: string) => {
        setSelectedCompetencies(prev => 
            prev.includes(desc) ? prev.filter(d => d !== desc) : [...prev, desc]
        );
    };

    return (
        <div className="max-w-3xl mx-auto mt-4 animate-fade-in-up text-center px-4 pb-20">
            {/* Library Modal */}
            {showLibrary && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <LibraryIcon className="w-5 h-5 text-indigo-500" /> Quiz Bank
                            </h3>
                            <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                            {isLoadingLibrary ? (
                                <div className="text-center py-10 text-slate-500">Loading...</div>
                            ) : savedQuizzes.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 italic">No saved quizzes found.</div>
                            ) : (
                                <div className="space-y-3">
                                    {savedQuizzes.map(quiz => (
                                        <div 
                                            key={quiz.id} 
                                            onClick={() => { onLoadFromLibrary(quiz.questions); setShowLibrary(false); }}
                                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer transition-all group relative shadow-sm"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="text-left">
                                                    <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">{quiz.topic}</h4>
                                                    <p className="text-xs text-slate-500 mt-1">{quiz.questions.length} Items • {new Date(quiz.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <button onClick={(e) => handleDelete(e, quiz.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3 transform hover:rotate-6 transition-transform duration-500">
                <PuzzleIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Quiz SA</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mb-6 max-w-md mx-auto leading-relaxed">
                The interactive assessment engine. Generate topic-based mastery quizzes or align with your curriculum.
            </p>

            <button 
                onClick={openLibrary}
                className="mb-8 flex items-center justify-center gap-2 mx-auto text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
                <LibraryIcon className="w-4 h-4" /> Open Quiz Library
            </button>

            {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-sm font-bold flex items-center shadow-sm animate-fade-in text-left">
                    <AlertTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {/* Mode Settings */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex mb-8 shadow-inner">
                <button 
                    onClick={() => setMode('practice')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                        mode === 'practice' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Practice
                </button>
                <button 
                    onClick={() => setMode('exam')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                        mode === 'exam' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Exam
                </button>
            </div>
            
            {/* Title Input (NEW) */}
            <div className="max-w-md mx-auto mb-6">
                 <div className="relative">
                    <PenToolIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        placeholder="Name your quiz (e.g. Unit 1 Review)"
                    />
                 </div>
            </div>
            
            {/* Source Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <button
                    onClick={() => handleTabChange('custom')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${sourceMode === 'custom' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <BrainCircuitIcon className="w-5 h-5" /> Custom Topic
                </button>
                <button
                    onClick={() => handleTabChange('upload')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${sourceMode === 'upload' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <UploadIcon className="w-5 h-5" /> Upload File
                </button>
                <button
                    onClick={() => handleTabChange('curriculum')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${sourceMode === 'curriculum' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <BookOpenIcon className="w-5 h-5" /> Curriculum
                </button>
            </div>

            {/* Source Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8 text-left">
                
                {sourceMode === 'custom' && (
                    <div className="space-y-4 animate-fade-in">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Topic or Concept</label>
                         <input 
                            type="text" 
                            placeholder="e.g. Thermodynamics, Jose Rizal, Quadratic Equations..." 
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                        />
                    </div>
                )}

                {sourceMode === 'upload' && (
                    <div className="space-y-4 animate-fade-in">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Upload Exam Paper (PDF/Image)</label>
                        <div className={`relative p-8 rounded-xl border-2 border-dashed text-center transition-all ${file ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={onFileChange}
                                accept=".pdf,image/*"
                            />
                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{file.name}</span>
                                    <button onClick={onClearFile} className="z-20 p-1 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="text-slate-500 dark:text-slate-400 pointer-events-none">
                                    <UploadIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Click to browse or drag file here</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {sourceMode === 'curriculum' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">1. Subject</label>
                                <div className="relative">
                                    <select 
                                        value={selectedSubjectId} 
                                        onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedWeekId(''); setSelectedCompetencies([]); }}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.gradeLevel})</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none"/>
                                </div>
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">2. Quarter</label>
                                <div className="relative">
                                    <select 
                                        value={selectedQuarter} 
                                        onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedWeekId(''); setSelectedCompetencies([]); }}
                                        disabled={!selectedSubjectId}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                    >
                                        {['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'].map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none"/>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">3. Weekly Unit</label>
                            <div className="relative">
                                <select 
                                    value={selectedWeekId} 
                                    onChange={(e) => { setSelectedWeekId(e.target.value); setSelectedCompetencies([]); }}
                                    disabled={!selectedSubjectId}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                >
                                    <option value="">Select Week</option>
                                    {activeWeeks.map(w => <option key={w.id} value={w.id}>{w.weekLabel} - {w.contentTopic}</option>)}
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none"/>
                            </div>
                        </div>

                        {activeWeek && activeWeek.competencies && activeWeek.competencies.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">4. Target Competencies</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {activeWeek.competencies.map((comp, idx) => (
                                        <label key={idx} className="flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCompetencies.includes(comp.description)}
                                                onChange={() => toggleCompetency(comp.description)}
                                                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                                <span className="font-mono font-bold text-slate-400 mr-1">{comp.code}</span>
                                                {comp.description}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeWeek && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
                                <CheckCircleIcon className="w-4 h-4" />
                                Context loaded: {activeWeek.contentTopic}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <button 
                onClick={onStart}
                disabled={loading || (!topic && !file)}
                className="w-full max-w-sm py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating Quiz...</span>
                    </>
                ) : (
                    <>
                        <span>Start Assessment</span>
                        <ArrowDownIcon className="w-5 h-5 -rotate-90" />
                    </>
                )}
            </button>
        </div>
    );
};
