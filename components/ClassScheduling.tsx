
import React, { useState, useEffect, useMemo } from 'react';
import { ClassInfo, ClassSubject, ScheduleSlot, Teacher } from '../types';
import { generateSmartSchedule } from '../services/geminiService';
import { saveClasses, loadClasses } from '../services/databaseService';
import { CalendarIcon, ClockIcon, SparklesIcon, SaveIcon, SpinnerIcon, TrashIcon, ArrowDownIcon, AlertTriangleIcon, ChevronDownIcon, XIcon } from './icons';

interface ClassSchedulingProps {
    classInfo: ClassInfo;
    onBack: () => void;
    allClasses: ClassInfo[];
    teachers: Teacher[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ClassScheduling = ({ classInfo, onBack, allClasses, teachers }: ClassSchedulingProps) => {
    const [schedule, setSchedule] = useState<ScheduleSlot[]>(classInfo.schedule || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Settings
    const [startHour, setStartHour] = useState('07:30');
    const [endHour, setEndHour] = useState('16:30');
    const [slotDuration, setSlotDuration] = useState(60); // minutes

    // Drag & Drop
    const [draggedSubject, setDraggedSubject] = useState<ClassSubject | null>(null);

    // Manual Edit Modal
    const [selectedSlot, setSelectedSlot] = useState<{day: string, time: string} | null>(null);
    const [showSlotModal, setShowSlotModal] = useState(false);

    // Helper to get teacher name
    const getTeacherName = (id: string) => {
        const t = teachers.find(tea => tea.id === id);
        return t ? `${t.lastName}, ${t.firstName}` : 'Unknown';
    };

    // Generate Time Slots based on settings
    const timeSlots = useMemo(() => {
        const slots = [];
        let current = new Date(`2000-01-01T${startHour}`);
        const end = new Date(`2000-01-01T${endHour}`);

        while (current < end) {
            const startStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            current.setMinutes(current.getMinutes() + slotDuration);
            const endStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            slots.push({ start: startStr, end: endStr });
        }
        return slots;
    }, [startHour, endHour, slotDuration]);

    // Check Conflicts
    const checkConflict = (day: string, startTime: string, teacherId: string): boolean => {
        if (!teacherId) return false;
        // Check other classes
        for (const cls of allClasses) {
            if (cls.id === classInfo.id) continue; // Skip current class
            const conflict = cls.schedule?.find(s => 
                s.day === day && 
                s.startTime === startTime && 
                s.teacherId === teacherId
            );
            if (conflict) return true;
        }
        return false;
    };

    const handleGenerate = async () => {
        if (!classInfo.subjects || classInfo.subjects.length === 0) {
            alert("Please add subjects to this class first.");
            return;
        }
        setIsGenerating(true);
        try {
            const aiSchedule = await generateSmartSchedule(classInfo.subjects, classInfo.gradeLevel, startHour, endHour);
            setSchedule(aiSchedule);
        } catch (error) {
            console.error(error);
            alert("Failed to generate schedule.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update class info with new schedule
            const updatedClass = { ...classInfo, schedule: schedule };
            // We need to update this single class in the DB. 
            // Since saveClasses takes an array, we'll just update this one.
            // Ideally we'd have a separate `updateClass` method but we can reuse saveClasses by passing the full list with the update.
            // Optimization: Just pass this one if the service supports partial updates or overwrite.
            // The current `saveClasses` overwrites the whole `classes` node. We must be careful.
            // Let's use a safer approach: construct the full array with the update.
            const updatedAllClasses = allClasses.map(c => c.id === classInfo.id ? updatedClass : c);
            await saveClasses('TEMP_ID_IGNORED_BY_SERVICE', updatedAllClasses); // Service actually uses userId, we need to pass user ID from props if strict. 
            // Wait, ClassInformation passes `user.uid` to loadClasses. We need user ID here? 
            // Actually `saveClasses` in `databaseService` uses `getClassesRef` which is global `classes` root. The userId param is unused for global data.
            // So passing 'admin' or any string works for now based on current implementation.
            
            alert("Schedule saved successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to save schedule.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDrop = (day: string, time: string) => {
        if (!draggedSubject) return;
        
        // Remove existing slot at this time if any
        const cleanSchedule = schedule.filter(s => !(s.day === day && s.startTime === time));
        
        const newSlot: ScheduleSlot = {
            id: crypto.randomUUID(),
            day,
            startTime: time,
            endTime: timeSlots.find(t => t.start === time)?.end || time,
            subjectId: draggedSubject.id,
            subjectName: draggedSubject.name,
            teacherId: draggedSubject.teacherId,
            teacherName: getTeacherName(draggedSubject.teacherId),
            type: 'class'
        };

        setSchedule([...cleanSchedule, newSlot]);
        setDraggedSubject(null);
    };

    const handleManualAssign = (subjectId: string) => {
        if (!selectedSlot) return;
        const subject = classInfo.subjects.find(s => s.id === subjectId);
        if (subject) {
             // Remove existing slot at this time if any
            const cleanSchedule = schedule.filter(s => !(s.day === selectedSlot.day && s.startTime === selectedSlot.time));
            const newSlot: ScheduleSlot = {
                id: crypto.randomUUID(),
                day: selectedSlot.day,
                startTime: selectedSlot.time,
                endTime: timeSlots.find(t => t.start === selectedSlot.time)?.end || selectedSlot.time,
                subjectId: subject.id,
                subjectName: subject.name,
                teacherId: subject.teacherId,
                teacherName: getTeacherName(subject.teacherId),
                type: 'class'
            };
            setSchedule([...cleanSchedule, newSlot]);
        }
        setShowSlotModal(false);
        setSelectedSlot(null);
    };

    const handleClearSlot = (day: string, time: string) => {
        setSchedule(prev => prev.filter(s => !(s.day === day && s.startTime === time)));
    };

    return (
        <div className="animate-fade-in-up h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <ChevronDownIcon className="w-6 h-6 rotate-90" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-2 text-indigo-500" />
                            Schedule: {classInfo.gradeLevel} - {classInfo.section}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Plan weekly classes and detect conflicts.</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 mr-4">
                        <span className="text-xs font-bold text-slate-400 uppercase px-2">Range</span>
                        <input type="time" value={startHour} onChange={e => setStartHour(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-16" />
                        <span className="text-slate-400">-</span>
                        <input type="time" value={endHour} onChange={e => setEndHour(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-16" />
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all shadow-md"
                    >
                        {isGenerating ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : <SparklesIcon className="w-4 h-4 mr-2"/>}
                        AI Auto-Schedule
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-all shadow-md"
                    >
                        {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : <SaveIcon className="w-4 h-4 mr-2"/>}
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar: Subjects (Draggable) */}
                <div className="w-64 border-r border-slate-200 dark:border-slate-700 p-4 overflow-y-auto bg-white dark:bg-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Available Subjects</h3>
                    <div className="space-y-2">
                        {classInfo.subjects.map(sub => (
                            <div 
                                key={sub.id}
                                draggable
                                onDragStart={() => setDraggedSubject(sub)}
                                onDragEnd={() => setDraggedSubject(null)}
                                className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                            >
                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{sub.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{getTeacherName(sub.teacherId)}</div>
                            </div>
                        ))}
                        {classInfo.subjects.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No subjects defined for this class.</p>
                        )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Legend</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-300 mr-2 rounded"></div> Conflict</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-indigo-50 border border-indigo-200 mr-2 rounded"></div> Scheduled Class</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-amber-50 border border-amber-200 mr-2 rounded"></div> Break</div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/30">
                    <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                        {/* Header Row */}
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 text-xs font-bold text-slate-500 text-center">Time</div>
                        {DAYS.map(day => (
                            <div key={day} className="bg-slate-100 dark:bg-slate-800 p-3 text-xs font-bold text-slate-700 dark:text-slate-300 text-center uppercase tracking-wider">
                                {day}
                            </div>
                        ))}

                        {/* Time Slots */}
                        {timeSlots.map((slot, idx) => (
                            <React.Fragment key={idx}>
                                <div className="bg-white dark:bg-slate-800 p-3 text-xs font-mono text-slate-500 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center">
                                    {slot.start}
                                </div>
                                {DAYS.map(day => {
                                    // Find schedule entry
                                    const entry = schedule.find(s => s.day === day && s.startTime === slot.start);
                                    const hasConflict = entry && checkConflict(day, slot.start, entry.teacherId);
                                    
                                    return (
                                        <div 
                                            key={`${day}-${slot.start}`}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={() => handleDrop(day, slot.start)}
                                            onClick={() => { setSelectedSlot({day, time: slot.start}); setShowSlotModal(true); }}
                                            className={`relative p-2 min-h-[80px] border-t border-slate-100 dark:border-slate-700 transition-colors cursor-pointer flex flex-col justify-center
                                                ${entry 
                                                    ? (entry.type === 'break' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700')
                                                    : 'bg-white dark:bg-slate-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                                                }
                                                ${hasConflict ? 'ring-2 ring-inset ring-red-400 bg-red-50 dark:bg-red-900/20' : ''}
                                            `}
                                        >
                                            {entry ? (
                                                <>
                                                    <div className={`text-sm font-bold ${entry.type === 'break' ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {entry.subjectName || (entry.type === 'break' ? 'BREAK' : 'Unknown')}
                                                    </div>
                                                    {entry.type !== 'break' && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.teacherName}</div>
                                                    )}
                                                    {hasConflict && (
                                                        <div className="absolute top-1 right-1 text-red-500" title="Teacher Conflict: This teacher has another class at this time!">
                                                            <AlertTriangleIcon className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleClearSlot(day, slot.start); }}
                                                        className="absolute bottom-1 right-1 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-xs text-slate-300 dark:text-slate-600 text-center opacity-0 hover:opacity-100">+ Add</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Manual Assignment Modal */}
            {showSlotModal && selectedSlot && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Assign Subject</h3>
                            <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{selectedSlot.day} @ {selectedSlot.time}</p>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {classInfo.subjects.map(sub => (
                                <button 
                                    key={sub.id}
                                    onClick={() => handleManualAssign(sub.id)}
                                    className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    {sub.name}
                                </button>
                            ))}
                            <button 
                                onClick={() => {
                                    const breakSlot: ScheduleSlot = {
                                        id: crypto.randomUUID(),
                                        day: selectedSlot.day,
                                        startTime: selectedSlot.time,
                                        endTime: selectedSlot.time, // Simplify
                                        subjectId: 'break',
                                        subjectName: 'BREAK',
                                        teacherId: '',
                                        teacherName: '',
                                        type: 'break'
                                    };
                                    setSchedule(prev => [...prev.filter(s => !(s.day === selectedSlot.day && s.startTime === selectedSlot.time)), breakSlot]);
                                    setShowSlotModal(false);
                                }}
                                className="w-full text-left p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 transition-colors text-sm font-bold text-amber-700 dark:text-amber-400 mt-2 border border-amber-200 dark:border-amber-800"
                            >
                                Set as Break / Recess
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
