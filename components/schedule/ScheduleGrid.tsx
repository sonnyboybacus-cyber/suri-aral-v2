
import React from 'react';
import { ScheduleSlot, ClassInfo } from '../../types';
import { checkScheduleConflict, DAYS } from './ScheduleUtils';
import { TrashIcon, AlertTriangleIcon, ShieldIcon, FileTextIcon, LayersIcon, BookOpenIcon, MicIcon, PenToolIcon, CalendarIcon, MegaphoneIcon, XCircleIcon, UsersIcon } from '../icons';

interface TimeSlot {
    start: string;
    end: string;
}

interface ScheduleGridProps {
    timeSlots: TimeSlot[];
    schedule: ScheduleSlot[];
    onDrop?: (day: string, time: string) => void;
    onSlotClick?: (day: string, time: string) => void;
    onClearSlot?: (day: string, time: string) => void;
    currentClassId: string;
    allClasses: ClassInfo[];
    readOnly?: boolean;
}

export const ScheduleGrid = ({ 
    timeSlots, 
    schedule, 
    onDrop, 
    onSlotClick, 
    onClearSlot, 
    currentClassId,
    allClasses,
    readOnly = false
}: ScheduleGridProps) => {

    const handleDragOver = (e: React.DragEvent) => {
        if (readOnly) return;
        e.preventDefault();
        e.currentTarget.classList.add('bg-indigo-50/50', 'dark:bg-indigo-900/30', 'ring-2', 'ring-inset', 'ring-indigo-400');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-indigo-50/50', 'dark:bg-indigo-900/30', 'ring-2', 'ring-inset', 'ring-indigo-400');
    };

    const handleDropInternal = (e: React.DragEvent, day: string, time: string) => {
        if (readOnly || !onDrop) return;
        e.preventDefault();
        e.currentTarget.classList.remove('bg-indigo-50/50', 'dark:bg-indigo-900/30', 'ring-2', 'ring-inset', 'ring-indigo-400');
        onDrop(day, time);
    };

    const getActivityStyle = (type: string | undefined) => {
        switch (type) {
            case 'Lecture': return { 
                bg: 'bg-white dark:bg-slate-800', 
                border: 'border-slate-200 dark:border-slate-700', 
                text: 'text-slate-700 dark:text-slate-200', 
                accent: 'bg-slate-400',
                icon: <BookOpenIcon className="w-3 h-3 text-slate-400"/> 
            };
            // Retain styling for other types if they exist historically, even if palette is restricted
            default: return { 
                bg: 'bg-white dark:bg-slate-800', 
                border: 'border-slate-200 dark:border-slate-700', 
                text: 'text-slate-700 dark:text-slate-200', 
                accent: 'bg-slate-400',
                icon: <BookOpenIcon className="w-3 h-3 text-slate-400"/> 
            };
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 relative custom-scrollbar">
            
            <style>{`
                .pattern-diagonal-lines {
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0, 0, 0, 0.03) 5px, rgba(0, 0, 0, 0.03) 10px);
                }
                .dark .pattern-diagonal-lines {
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, 0.03) 5px, rgba(255, 255, 255, 0.03) 10px);
                }
            `}</style>

            <div className="min-w-[1200px] p-6">
                <div className="grid grid-cols-[80px_repeat(5,minmax(200px,1fr))] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                    
                    <div className="contents">
                        <div className="sticky top-0 left-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-b border-r border-slate-200 dark:border-slate-700">
                            Time
                        </div>
                        {DAYS.map(day => (
                            <div key={day} className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md p-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center uppercase tracking-widest border-b border-l border-slate-200 dark:border-slate-700">
                                {day}
                            </div>
                        ))}
                    </div>

                    {timeSlots.map((slot, idx) => (
                        <div key={idx} className="contents group/time-row">
                            <div className="sticky left-0 z-10 bg-white dark:bg-slate-800 p-3 flex flex-col items-center justify-center border-b border-r border-slate-100 dark:border-slate-700/50 group-hover/time-row:bg-slate-50 dark:group-hover/time-row:bg-slate-700/20 transition-colors">
                                <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{slot.start}</span>
                                <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 my-1"></span>
                                <span className="font-mono text-[10px] text-slate-400">{slot.end}</span>
                            </div>
                            
                            {DAYS.map(day => {
                                const entry = schedule.find(s => s.day === day && s.startTime === slot.start);
                                const conflictMsg = entry ? checkScheduleConflict(day, slot.start, slot.end, currentClassId, allClasses, entry.teacherId, entry.roomId) : null;
                                
                                const style = getActivityStyle(entry?.activityType);
                                const isOfficialClass = entry && entry.type === 'class';
                                const isBreak = entry && entry.type === 'break';
                                const isNonInstructional = entry && ['Holiday', 'Suspension', 'Meeting', 'Event'].includes(entry.activityType || '');

                                return (
                                    <div 
                                        key={`${day}-${slot.start}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDropInternal(e, day, slot.start)}
                                        onClick={() => !readOnly && onSlotClick && onSlotClick(day, slot.start)}
                                        className={`relative p-2 min-h-[100px] border-b border-l border-slate-100 dark:border-slate-700/50 transition-all duration-200
                                            ${isBreak ? 'bg-slate-50 dark:bg-slate-900 pattern-diagonal-lines' : ''}
                                            ${!entry && !readOnly ? 'hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer group/cell' : ''}
                                            ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                                        `}
                                    >
                                        {!entry && !readOnly && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center shadow-sm">
                                                    <span className="text-xl font-light leading-none mb-0.5">+</span>
                                                </div>
                                            </div>
                                        )}

                                        {entry && (
                                            <div className={`w-full h-full rounded-xl p-3 flex flex-col relative shadow-sm hover:shadow-md transition-shadow 
                                                ${isOfficialClass ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 pl-4' : `${style.bg} border ${style.border}`}
                                                ${isBreak ? 'items-center justify-center border-none shadow-none bg-transparent' : ''}
                                                ${conflictMsg ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-slate-900' : ''}
                                            `}>
                                                
                                                <div className="flex justify-between items-start mb-2 w-full">
                                                    {isOfficialClass ? (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Official Class</span>
                                                    ) : isBreak ? (
                                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Break</span>
                                                    ) : (
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${style.border} bg-white dark:bg-slate-900 ${style.text}`}>
                                                            {style.icon}
                                                            {entry.activityType}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isBreak && (
                                                    <>
                                                        <div className="font-bold text-sm text-slate-800 dark:text-white leading-tight mb-1 line-clamp-2">
                                                            {entry.title || entry.subjectName}
                                                        </div>
                                                        
                                                        {!isNonInstructional && (
                                                            <div className="mt-auto pt-2 flex flex-col gap-0.5">
                                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                    {entry.teacherName.split(',')[0]}
                                                                </div>
                                                                {entry.roomName && (
                                                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                        {entry.roomName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {conflictMsg && (
                                                    <div className="absolute -top-1 -right-1 text-red-500 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md z-10 animate-bounce" title={conflictMsg}>
                                                        <AlertTriangleIcon className="w-4 h-4" />
                                                    </div>
                                                )}

                                                {!readOnly && onClearSlot && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onClearSlot(day, slot.start); }}
                                                        className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                        title="Remove"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
