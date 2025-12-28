import React, { useState, useMemo } from 'react';
import { Subject, QuarterUnit, WeeklyUnit } from '../../types';
import { 
    SpinnerIcon, SparklesIcon, ChevronDownIcon, CheckCircleIcon, AlertTriangleIcon, FileTextIcon, CalendarIcon
} from '../icons';

interface PlannerInputFormProps {
    subjects: Subject[];
    onSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    errorMsg: string | null;
    
    // State Setters & Values
    learningArea: string; setLearningArea: (v: string) => void;
    gradeLevel: string; setGradeLevel: (v: string) => void;
    timeAllotment: string; setTimeAllotment: (v: string) => void;
    topic: string; setTopic: (v: string) => void;
    competencyCode: string; setCompetencyCode: (v: string) => void;
    strategy: string; setStrategy: (v: string) => void;
    selectedQuarter: string; setSelectedQuarter: (v: string) => void;
    
    // Plan Type
    planType: 'DLP' | 'DLL'; setPlanType: (v: 'DLP' | 'DLL') => void;

    // Curriculum Linking
    selectedSubjectId: string; setSelectedSubjectId: (v: string) => void;
    selectedWeekId: string; setSelectedWeekId: (v: string) => void;
    selectedCompetencyIds: string[]; setSelectedCompetencyIds: React.Dispatch<React.SetStateAction<string[]>>;
    isLinked: boolean; setIsLinked: (v: boolean) => void;
    setContentStandards: (v: string) => void;
    setPerformanceStandards: (v: string) => void;
}

const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

export const PlannerInputForm = ({
    subjects, onSubmit, isLoading, errorMsg,
    learningArea, setLearningArea,
    gradeLevel, setGradeLevel,
    timeAllotment, setTimeAllotment,
    topic, setTopic,
    competencyCode, setCompetencyCode,
    strategy, setStrategy,
    selectedQuarter, setSelectedQuarter,
    planType, setPlanType,
    selectedSubjectId, setSelectedSubjectId,
    selectedWeekId, setSelectedWeekId,
    selectedCompetencyIds, setSelectedCompetencyIds,
    isLinked, setIsLinked,
    setContentStandards, setPerformanceStandards
}: PlannerInputFormProps) => {
    
    const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

    const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);

    const availableWeeks = useMemo(() => {
        if (!selectedSubject) return [];
        
        const rawCurriculum = selectedSubject.curriculum as any;
        const curriculumArray: QuarterUnit[] = rawCurriculum 
            ? (Array.isArray(rawCurriculum) ? rawCurriculum : Object.values(rawCurriculum))
            : [];

        const quarterData = curriculumArray.find(q => q.quarter === selectedQuarter);
        
        if (!quarterData || !quarterData.weeks) return [];
        
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
            setCompetencyCode('');
            setIsLinked(false);
        }
        setIsWeekDropdownOpen(false);
    };

    const handleCompetencyToggle = (desc: string) => {
        if (selectedCompetencyIds.includes(desc)) {
            setSelectedCompetencyIds(prev => prev.filter(id => id !== desc));
        } else {
            setSelectedCompetencyIds(prev => [...prev, desc]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 animate-fade-in-up">
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-sm font-bold flex items-center shadow-sm animate-fade-in">
                    <AlertTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}
            <form onSubmit={onSubmit} className="space-y-8">
                
                {/* Plan Format Selector */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl flex gap-2">
                    <button
                        type="button"
                        onClick={() => setPlanType('DLP')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                            planType === 'DLP' 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4" />
                        Detailed Lesson Plan (DLP)
                    </button>
                    <button
                        type="button"
                        onClick={() => setPlanType('DLL')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                            planType === 'DLL' 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Daily Lesson Log (DLL)
                    </button>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-4 flex items-center">
                        <SparklesIcon className="w-4 h-4 mr-2" /> Curriculum Integration
                    </h3>
                    
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

                    <div className="mb-6 relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Week</label>
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Focus Competencies</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {selectedWeekData.competencies.map((comp, idx) => (
                                            <label key={idx} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedCompetencyIds.includes(comp.description)}
                                                    onChange={() => handleCompetencyToggle(comp.description)}
                                                    className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                                    <span className="font-mono text-xs text-slate-400 mr-2 bg-slate-100 dark:bg-slate-700 px-1 rounded">{comp.code}</span>
                                                    {comp.description}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Target Competency Display (For Item Analysis Remediation Context or External) */}
                    {competencyCode && !selectedWeekId && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 mb-2 animate-fade-in">
                            <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                                Target Competency (From External Context)
                            </label>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                                "{competencyCode}"
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Learning Area</label>
                        <input 
                            type="text"
                            value={learningArea} 
                            onChange={e => setLearningArea(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Mathematics"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Grade Level</label>
                        <input 
                            type="text"
                            value={gradeLevel} 
                            onChange={e => setGradeLevel(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Grade 10"
                        />
                    </div>
                    {planType === 'DLP' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Time Allotment</label>
                            <input 
                                type="text"
                                value={timeAllotment} 
                                onChange={e => setTimeAllotment(e.target.value)} 
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. 60 Minutes"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Topic</label>
                        <input 
                            type="text"
                            value={topic} 
                            onChange={e => setTopic(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Polynomial Functions"
                        />
                    </div>
                    
                    {planType === 'DLP' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Teaching Strategy</label>
                            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                <option value="4As">4As (Activity, Analysis, Abstraction, Application)</option>
                                <option value="Inductive">Inductive Method</option>
                                <option value="Deductive">Deductive Method</option>
                                <option value="Inquiry-Based">Inquiry-Based Learning</option>
                                <option value="Problem-Based">Problem-Based Learning</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:transform-none flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 mr-2 animate-spin" />
                                Generating {planType}...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                Generate {planType === 'DLP' ? 'Lesson Plan' : 'Weekly Log'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
