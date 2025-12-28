
import React, { useState, useEffect } from 'react';
import { CalendarCheckIcon, SpinnerIcon, SaveIcon, XIcon, SparklesIcon, ChevronDownIcon, CalendarIcon, FileTextIcon, TrashIcon, CheckCircleIcon, BrainCircuitIcon } from './icons';
import { generateStudySchedule } from '../services/geminiService';
import { saveStudyPlan, sendNotification, loadStudyPlans, deleteStudyPlan } from '../services/databaseService';
import { StudyPlan } from '../types';

interface StudyPlannerProps {
    userId: string;
    onClose?: () => void;
    isStandalone?: boolean;
    onLaunchTutor?: (topic: string) => void;
}

interface ScheduleItem {
    date: string;
    topic: string;
    focus: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const StudyPlanner = ({ userId, onClose, isStandalone = false, onLaunchTutor }: StudyPlannerProps) => {
    const [step, setStep] = useState<'input' | 'preview' | 'success'>('input');
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [eventName, setEventName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [topics, setTopics] = useState('');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    
    // Generated Data
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

    // Preview State
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
    const [selectedDayDetails, setSelectedDayDetails] = useState<ScheduleItem | null>(null);
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    // Library State
    const [savedPlans, setSavedPlans] = useState<StudyPlan[]>([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Helper to safely parse date string to Date object
    const safeParseDate = (dateStr: string): Date => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    // Auto-load latest plan if standalone
    useEffect(() => {
        if (isStandalone) {
            const fetchPlans = async () => {
                setIsLoading(true);
                try {
                    const plans = await loadStudyPlans(userId);
                    if (plans && plans.length > 0) {
                        // Sort by creation date desc
                        const latest = plans.sort((a, b) => b.createdAt - a.createdAt)[0];
                        loadPlanIntoState(latest);
                    }
                } catch (e) {
                    console.error("Failed to load existing plans", e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPlans();
        }
    }, [isStandalone, userId]);

    const loadPlanIntoState = (plan: StudyPlan) => {
        // Parse schedule items back to UI format
        const parsedSchedule = (plan.schedule || []).map(item => ({
            date: item.date || new Date().toISOString(),
            topic: item.topic || "Review",
            focus: item.focus || "General Study"
        }));
        
        setSchedule(parsedSchedule);
        setEventName(plan.eventName || 'Untitled Event');
        setStep('preview');
        
        // Set calendar to first event month
        if (parsedSchedule.length > 0) {
            const firstDate = safeParseDate(parsedSchedule[0].date);
            setCurrentCalendarDate(firstDate);
            setSelectedDayDetails(parsedSchedule[0]);
        }
    };

    const handleOpenLibrary = async () => {
        setIsLoading(true);
        try {
            const plans = await loadStudyPlans(userId);
            setSavedPlans(plans.sort((a, b) => b.createdAt - a.createdAt));
            setShowLoadModal(true);
        } catch (e) {
            console.error(e);
            alert("Failed to load saved plans.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadSavedPlan = (plan: StudyPlan) => {
        loadPlanIntoState(plan);
        setShowLoadModal(false);
    };

    const handleDeletePlan = (e: React.MouseEvent, planId: string) => {
        e.stopPropagation();
        setDeleteConfirmId(planId);
    };

    const executeDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteStudyPlan(userId, deleteConfirmId);
            setSavedPlans(prev => prev.filter(p => p.id !== deleteConfirmId));
            
            // Check if current plan is the deleted one? 
            // Since we don't store ID in state when loading into view (only data), we don't clear view.
            // But this is fine for now.
            
            sendNotification(userId, {
                title: 'Plan Deleted',
                message: 'Study plan was permanently removed.',
                type: 'success'
            });
        } catch (error) {
            console.error("Error deleting plan:", error);
            alert("Failed to delete plan.");
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventName || !examDate || !topics) {
            alert("Please fill in all fields.");
            return;
        }
        
        setIsLoading(true);
        try {
            const generated = await generateStudySchedule(eventName, examDate, topics, difficulty);
            setSchedule(generated);
            
            // Set initial calendar view to the month of the first study session
            if (generated.length > 0) {
                const firstDate = safeParseDate(generated[0].date);
                setCurrentCalendarDate(firstDate);
                setSelectedDayDetails(generated[0]);
            }
            
            setStep('preview');
        } catch (error: any) {
            console.warn(error.message); 
            alert(error.message || "Failed to generate schedule. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Extra sanitation before saving
            const dbSchedule = schedule.map(item => ({
                date: item.date || new Date().toISOString(),
                topic: item.topic || "Review",
                focus: item.focus || "Key concepts",
                completed: false
            }));

            await saveStudyPlan(userId, {
                eventName: eventName || "Study Plan",
                examDate,
                topics,
                difficulty,
                schedule: dbSchedule
            });

            await sendNotification(userId, {
                title: 'Study Plan Created',
                message: `Your schedule for "${eventName}" has been synced to your daily missions.`,
                type: 'success',
                link: 'studyPlanner'
            });

            setStep('success');
        } catch (error) {
            console.error(error);
            alert("Failed to save plan.");
        } finally {
            setIsLoading(false);
        }
    };

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentCalendarDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentCalendarDate(newDate);
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentCalendarDate);
        const firstDay = getFirstDayOfMonth(currentCalendarDate);
        const days = [];

        // Empty slots for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-14 md:h-20 bg-transparent"></div>);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            // Normalize date string to YYYY-MM-DD for comparison
            const year = currentCalendarDate.getFullYear();
            const month = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${year}-${month}-${dayStr}`;
            
            const session = schedule.find(s => s.date === dateStr);
            const isSelected = selectedDayDetails?.date === dateStr;

            days.push(
                <div 
                    key={day} 
                    onClick={() => session && setSelectedDayDetails(session)}
                    className={`h-14 md:h-20 border border-slate-100 dark:border-slate-800 p-1 flex flex-col items-start justify-between transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'
                    } ${session ? '' : 'opacity-50 cursor-default'}`}
                >
                    <span className={`text-xs font-bold ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        {day}
                    </span>
                    
                    {session && (
                        <div className="w-full">
                            <div className="hidden md:block bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 text-[10px] px-1 rounded truncate font-medium mb-1">
                                {session.topic}
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto md:hidden"></div>
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up relative border border-white/20 ${isStandalone ? 'h-full w-full rounded-2xl shadow-none border-0' : 'rounded-[2.5rem] w-full max-w-4xl max-h-[90vh]'}`}>
            
            {/* Close Button */}
            {onClose && (
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors z-10"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            )}

            {/* Header */}
            <div className="pt-8 px-10 text-center shrink-0">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 transform rotate-3">
                    <CalendarCheckIcon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    {step === 'input' && "AI Study Planner"}
                    {step === 'preview' && "Your Optimized Schedule"}
                    {step === 'success' && "All Set!"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                    {step === 'input' && "Let AI reverse-engineer your study habits."}
                    {step === 'preview' && "Review the calendar before syncing to your dashboard."}
                    {step === 'success' && "Your study missions are ready."}
                </p>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                {step === 'input' && (
                    <div className="max-w-xl mx-auto space-y-8">
                        <div className="flex justify-center mb-6">
                            <button 
                                onClick={handleOpenLibrary}
                                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                            >
                                <FileTextIcon className="w-4 h-4 mr-1" /> Load Previous Plan
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Exam Name</label>
                                <input 
                                    type="text" 
                                    value={eventName}
                                    onChange={e => setEventName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                                    placeholder="e.g. Calculus Midterms"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Exam Date</label>
                                    <input 
                                        type="date" 
                                        value={examDate}
                                        onChange={e => setExamDate(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Intensity</label>
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value as any)}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner appearance-none"
                                    >
                                        <option value="Easy">Light Review</option>
                                        <option value="Medium">Balanced</option>
                                        <option value="Hard">Intensive Cram</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Topics to Cover</label>
                                <textarea 
                                    value={topics}
                                    onChange={e => setTopics(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner h-32 resize-none"
                                    placeholder="List chapters, modules, or specific concepts..."
                                    required
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5"/>}
                                {isLoading ? 'Generating Schedule...' : 'Generate Plan'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="animate-fade-in">
                        <div className="flex flex-col lg:flex-row gap-8">
                            
                            {/* Calendar View */}
                            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">
                                        {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => changeMonth(-1)} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-600"><ChevronDownIcon className="w-5 h-5 rotate-90"/></button>
                                        <button onClick={() => changeMonth(1)} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-600"><ChevronDownIcon className="w-5 h-5 -rotate-90"/></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                                    {DAYS.map(d => <div key={d} className="py-2 text-xs font-bold text-slate-400 uppercase">{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-700 gap-px border-b border-slate-200 dark:border-slate-700">
                                    {renderCalendarDays()}
                                </div>
                            </div>

                            {/* Details Panel */}
                            <div className="w-full lg:w-80 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex flex-col">
                                
                                {/* Header Area with Clear Logic */}
                                <div className="flex justify-between items-center mb-4 min-h-[1.75rem]">
                                    {isConfirmingClear ? (
                                        <div className="flex items-center gap-2 w-full animate-fade-in bg-white dark:bg-slate-800 p-2 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm">
                                            <span className="text-xs font-bold text-red-600 dark:text-red-400 pl-1">Discard all?</span>
                                            <div className="flex gap-2 ml-auto">
                                                <button 
                                                    onClick={() => {
                                                        setSchedule([]);
                                                        setStep('input');
                                                        setIsConfirmingClear(false);
                                                    }}
                                                    className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                                                >
                                                    Yes
                                                </button>
                                                <button 
                                                    onClick={() => setIsConfirmingClear(false)}
                                                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Session Details</h4>
                                            <button 
                                                onClick={() => setIsConfirmingClear(true)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Discard Schedule"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {selectedDayDetails ? (
                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                                {new Date(selectedDayDetails.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                                Study Session
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Topic</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedDayDetails.topic}</div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Focus Area</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300">{selectedDayDetails.focus}</div>
                                        </div>

                                        {onLaunchTutor && (
                                            <button 
                                                onClick={() => onLaunchTutor(selectedDayDetails.topic)}
                                                className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform flex items-center justify-center gap-2 group"
                                            >
                                                <BrainCircuitIcon className="w-5 h-5 group-hover:animate-pulse" /> 
                                                <span>Start AI Session</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4 opacity-60">
                                        <CalendarIcon className="w-12 h-12 mb-2" />
                                        <p className="text-sm">Select a date on the calendar to view details.</p>
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800 flex gap-3">
                                    <button 
                                        onClick={() => setStep('input')}
                                        className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                                    >
                                        Edit Parameters
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-transform active:scale-95 text-sm flex justify-center items-center"
                                    >
                                        {isLoading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : 'Confirm Plan'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-10 animate-fade-in-up">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Schedule Synced!</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10 text-lg">
                            Your study plan for <strong className="text-indigo-600 dark:text-indigo-400">{eventName}</strong> has been added to your daily missions. Good luck!
                        </p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Close Planner
                            </button>
                            <button 
                                onClick={() => {
                                    setStep('input');
                                    setEventName('');
                                    setExamDate('');
                                    setTopics('');
                                    setSchedule([]);
                                }}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-transform hover:-translate-y-1"
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Library Modal */}
            {showLoadModal && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex flex-col animate-fade-in">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Saved Plans</h3>
                        <button onClick={() => setShowLoadModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><XIcon className="w-6 h-6 text-slate-500"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {savedPlans.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-400">No saved plans found.</div>
                        ) : (
                            savedPlans.map(plan => (
                                <div key={plan.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group relative" onClick={() => handleLoadSavedPlan(plan)}>
                                    <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{plan.eventName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{new Date(plan.examDate).toLocaleDateString()} • {plan.difficulty}</p>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        <CalendarIcon className="w-4 h-4" />
                                        {plan.schedule.length} Sessions
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeletePlan(e, plan.id)}
                                        className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Plan"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* DELETE CONFIRMATION MODAL (OVERLAY) */}
                    {deleteConfirmId && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center z-[110] p-6 rounded-xl">
                            <div className="text-center max-w-sm w-full animate-fade-in-up">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Study Plan?</h3>
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
            )}
        </div>
    );
};
