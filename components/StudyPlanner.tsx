
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CalendarCheckIcon, SpinnerIcon, CheckCircleIcon, SaveIcon, XIcon, SparklesIcon, TrendingUpIcon, AlertTriangleIcon, ChevronDownIcon, GridIcon, ClipboardListIcon, PlusIcon, CalendarIcon, BrainCircuitIcon } from './icons';
import { generateStudySchedule } from '../services/geminiService';
import { saveStudyPlan, sendNotification, loadStudyPlans } from '../services/databaseService';

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
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
    const [selectedDayDetails, setSelectedDayDetails] = useState<ScheduleItem | null>(null);

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
                        
                        // Parse schedule items back to UI format
                        const parsedSchedule = latest.schedule.map(item => ({
                            date: item.date,
                            topic: item.topic,
                            focus: item.focus
                        }));
                        
                        setSchedule(parsedSchedule);
                        setEventName(latest.eventName);
                        setStep('preview');
                        
                        // Set calendar to first event month
                        if (parsedSchedule.length > 0) {
                            setCurrentCalendarDate(new Date(parsedSchedule[0].date));
                        }
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

    const handleViewExistingPlan = async () => {
        setIsLoading(true);
        try {
            const plans = await loadStudyPlans(userId);
            if (plans && plans.length > 0) {
                // Sort by creation date desc
                const latest = plans.sort((a, b) => b.createdAt - a.createdAt)[0];
                
                // Parse schedule items back to UI format
                const parsedSchedule = latest.schedule.map(item => ({
                    date: item.date,
                    topic: item.topic,
                    focus: item.focus
                }));
                
                setSchedule(parsedSchedule);
                setEventName(latest.eventName);
                setStep('preview');
                setViewMode('calendar');
                
                // Set calendar to first event month
                if (parsedSchedule.length > 0) {
                    setCurrentCalendarDate(new Date(parsedSchedule[0].date));
                }
            } else {
                alert("No saved study plans found.");
            }
        } catch (e) {
            console.error("Failed to load existing plans", e);
            alert("Error loading plan.");
        } finally {
            setIsLoading(false);
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
                const firstDate = new Date(generated[0].date);
                if (!isNaN(firstDate.getTime())) {
                    setCurrentCalendarDate(firstDate);
                    setSelectedDayDetails(generated[0]);
                }
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
            const dbSchedule = schedule.map(item => ({
                date: item.date,
                topic: item.topic,
                focus: item.focus,
                completed: false
            }));

            await saveStudyPlan(userId, {
                eventName,
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
        const newDate = new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset));
        setCurrentCalendarDate(new Date(newDate));
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
            const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    const Content = () => (
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
                    <form onSubmit={handleGenerate} className="space-y-8 max-w-xl mx-auto">
                        <div className="space-y-5">
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
                                <div className="hidden md:block"></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Topics to Cover</label>
                                <textarea 
                                    value={topics}
                                    onChange={e => setTopics(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all min-h-[120px] resize-none shadow-inner"
                                    placeholder="List topics, chapters, or concepts..."
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">Intensity Level</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Easy')}
                                    className={`relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group ${
                                        difficulty === 'Easy' 
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/20 scale-105' 
                                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                                    }`}
                                >
                                    <SparklesIcon className={`w-8 h-8 ${difficulty === 'Easy' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-emerald-400'}`} />
                                    <span className={`font-bold text-sm ${difficulty === 'Easy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Easy</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Medium')}
                                    className={`relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group ${
                                        difficulty === 'Medium' 
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-lg shadow-amber-500/20 scale-105' 
                                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-200 dark:hover:border-amber-800'
                                    }`}
                                >
                                    <TrendingUpIcon className={`w-8 h-8 ${difficulty === 'Medium' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-400'}`} />
                                    <span className={`font-bold text-sm ${difficulty === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>Medium</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Hard')}
                                    className={`relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group ${
                                        difficulty === 'Hard' 
                                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 shadow-lg shadow-rose-500/20 scale-105' 
                                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-rose-200 dark:hover:border-rose-800'
                                    }`}
                                >
                                    <AlertTriangleIcon className={`w-8 h-8 ${difficulty === 'Hard' ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-rose-400'}`} />
                                    <span className={`font-bold text-sm ${difficulty === 'Hard' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>Hard</span>
                                </button>
                            </div>
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all duration-300 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4"
                        >
                            {isLoading ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : "Generate Plan"}
                        </button>

                        <div className="mt-4 flex justify-center">
                            <button 
                                type="button"
                                onClick={handleViewExistingPlan}
                                className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-bold transition-colors"
                            >
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                View Current Calendar
                            </button>
                        </div>
                    </form>
                )}

                {step === 'preview' && (
                    <div className="space-y-6 h-full flex flex-col">
                        {/* View Toggle */}
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {eventName || "Current Plan"}
                            </h3>
                            <div className="flex gap-2">
                                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
                                    <button 
                                        onClick={() => setViewMode('calendar')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <GridIcon className="w-4 h-4" /> Calendar
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('list')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <ClipboardListIcon className="w-4 h-4" /> Timeline
                                    </button>
                                </div>
                                <button 
                                    onClick={() => { setStep('input'); setSchedule([]); setEventName(''); setExamDate(''); setTopics(''); }}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" /> New Plan
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
                            {viewMode === 'calendar' ? (
                                <div className="flex-1 flex flex-col">
                                    {/* Calendar Navigation */}
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDownIcon className="w-5 h-5 rotate-90 text-slate-500" /></button>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{MONTHS[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}</h3>
                                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDownIcon className="w-5 h-5 -rotate-90 text-slate-500" /></button>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            {DAYS.map(d => (
                                                <div key={d} className="py-2 text-center text-[10px] font-bold uppercase text-slate-400">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 flex-1">
                                            {renderCalendarDays()}
                                        </div>
                                    </div>
                                    
                                    {/* Selected Day Details (Mobile/Compact) */}
                                    {selectedDayDetails && (
                                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-center min-w-[60px]">
                                                        <span className="block text-xs font-bold uppercase">{new Date(selectedDayDetails.date).toLocaleString('default', { month: 'short' })}</span>
                                                        <span className="block text-xl font-bold">{new Date(selectedDayDetails.date).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">{selectedDayDetails.topic}</h4>
                                                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">{selectedDayDetails.focus}</p>
                                                    </div>
                                                </div>
                                                {onLaunchTutor && (
                                                    <button 
                                                        onClick={() => onLaunchTutor(selectedDayDetails.topic + ' - ' + selectedDayDetails.focus)}
                                                        className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
                                                    >
                                                        <BrainCircuitIcon className="w-4 h-4 mr-2 group-hover:text-indigo-500" />
                                                        Study with SA Tutor
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Timeline View
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <div className="relative pl-8 border-l-4 border-indigo-200 dark:border-slate-700 space-y-8">
                                        {schedule.map((item, idx) => (
                                            <div key={idx} className="relative group">
                                                <div className="absolute -left-[41px] w-6 h-6 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform"></div>
                                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h4 className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{item.topic}</h4>
                                                            <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 tracking-wide">
                                                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{item.focus}</p>
                                                    </div>
                                                    {onLaunchTutor && (
                                                        <button 
                                                            onClick={() => onLaunchTutor(item.topic + ' - ' + item.focus)}
                                                            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                            title="Study with SA Tutor"
                                                        >
                                                            <BrainCircuitIcon className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 flex gap-4">
                            <button 
                                onClick={() => setStep('input')}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-colors"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-1 transition-all flex justify-center items-center"
                            >
                                {isLoading ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : <SaveIcon className="w-6 h-6 mr-2" />}
                                Sync to Calendar
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10 animate-fade-in-up">
                        <div className="w-32 h-32 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircleIcon className="w-16 h-16 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Plan Saved!</h3>
                            <p className="text-slate-600 dark:text-slate-300 max-w-sm mx-auto text-lg">
                                Your study sessions have been injected into your Daily Missions.
                            </p>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 max-w-sm w-full">
                            <p className="font-bold text-indigo-800 dark:text-indigo-200 text-sm uppercase tracking-wide mb-1">Target</p>
                            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{eventName}</p>
                        </div>
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl transition-transform hover:scale-105"
                            >
                                Go to Dashboard
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (isStandalone) {
        return <Content />;
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 transition-opacity duration-300">
            <Content />
        </div>
    );
};
