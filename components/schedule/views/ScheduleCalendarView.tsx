import React, { useState } from 'react';
import { ClassInfo, CalendarEvent } from '../../../types';
import { checkScheduleConflict, DAYS } from '../ScheduleUtils';
import { ClockIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';

interface ScheduleCalendarViewProps {
    classes: ClassInfo[];
    selectedGradeLevel: string;
    onEditClass: (classId: string) => void;
    onShowCalendarManager: () => void;
    events?: CalendarEvent[];
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
    classes,
    selectedGradeLevel,
    onEditClass,
    onShowCalendarManager,
    events = []
}) => {
    const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Weekly View Logic ---
    const displayClasses = selectedGradeLevel === 'All' ? classes : classes.filter(c => c.gradeLevel === selectedGradeLevel);
    const startHour = 7;
    const endHour = 18;
    const totalMinutes = (endHour - startHour) * 60;
    const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h * 60 + m) - (startHour * 60);
    };

    // --- Monthly View Logic ---
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDate = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => {
            const start = e.startDate;
            const end = e.endDate || e.startDate;
            return start <= dateStr && end >= dateStr;
        });
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'Exam': return '#ef4444';
            case 'Holiday': return '#f59e0b';
            case 'Suspension': return '#7f1d1d';
            case 'Meeting': return '#3b82f6';
            case 'Deadline': return '#db2777';
            default: return '#10b981';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl flex flex-col h-[750px] animate-fade-in-up transition-all hover:shadow-indigo-500/10">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                        <button
                            onClick={() => setViewType('monthly')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewType === 'monthly' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setViewType('weekly')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewType === 'weekly' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Week
                        </button>
                    </div>
                    {viewType === 'monthly' && (
                        <div className="flex items-center gap-2">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ChevronLeftIcon className="w-5 h-5" /></button>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white min-w-[140px] text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ChevronRightIcon className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>

                <button
                    onClick={onShowCalendarManager}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                >
                    <CalendarIcon className="w-4 h-4" />
                    Manage Events
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative bg-slate-50/50 dark:bg-slate-900/50">

                {/* MONTHLY VIEW */}
                {viewType === 'monthly' && (
                    <div className="p-6 h-full flex flex-col">
                        <div className="grid grid-cols-7 gap-4 mb-4">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-center font-bold text-slate-400 text-xs uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            {/* Empty Slots */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="bg-transparent" />)}

                            {/* Day Cells */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dayEvents = getEventsForDate(day);
                                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                                return (
                                    <div key={day} className={`bg-white dark:bg-slate-800 rounded-2xl p-3 border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col gap-1 min-h-[100px] ${isToday ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30'}`}>
                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                                        <div className="flex flex-col gap-1 mt-1 overflow-y-auto custom-scrollbar max-h-[80px]">
                                            {dayEvents.map((evt, idx) => (
                                                <div key={idx} className="text-[10px] px-2 py-1 rounded-md text-white font-medium shadow-sm truncate" style={{ backgroundColor: getEventColor(evt.type) }} title={evt.title}>
                                                    {evt.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* WEEKLY VIEW */}
                {viewType === 'weekly' && (
                    <div className="flex h-full relative">
                        {/* Time Column */}
                        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 sticky left-0">
                            {Array.from({ length: endHour - startHour }).map((_, i) => (
                                <div key={i} className="absolute w-full text-center" style={{ top: `${(i / (endHour - startHour)) * 100}%`, transform: 'translateY(-50%)' }}>
                                    <span className="text-[10px] font-bold text-slate-400">{(startHour + i).toString().padStart(2, '0')}:00</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex-1 flex overflow-x-auto">
                            {DAYS.map(day => (
                                <div key={day} className="flex-1 min-w-[120px] border-r border-slate-200 dark:border-slate-700/50 relative group bg-white/50 dark:bg-slate-800/50">
                                    <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 p-2 text-center border-b border-slate-200 dark:border-slate-700 z-10 text-xs font-black text-slate-500 uppercase tracking-widest">{day}</div>

                                    {/* Hour Lines */}
                                    {Array.from({ length: endHour - startHour }).map((_, i) => (
                                        <div key={i} className="absolute w-full border-b border-slate-100 dark:border-slate-800 pointer-events-none" style={{ top: `${(i / (endHour - startHour)) * 100}%` }}></div>
                                    ))}

                                    {/* Render Events (Holidays/ Activities) */}
                                    {events.filter(e => {
                                        // Simple check: does the event include this day?
                                        // For now, assuming single day events or checking if today is in range
                                        // Since we don't have a "current week" context in weekly view (it shows generic M-F schedule),
                                        // we might just show events that match the day name if it repeats, OR 
                                        // strictly speaking, this View usually shows a generic schedule. 
                                        // However, assuming the user expects to see Calendar Events overlaid:
                                        // We need to map Date to Day Name.
                                        // BUT: The "Weekly View" here often represents a "Class Schedule Matrix" (Generic), not "This Week".
                                        // If it IS "This Week", we need to know the dates of this week.
                                        // Let's assume we show events if they fall on this day of the CURRENT week derived from `currentDate`.

                                        // Get date of this day in the current week view
                                        // This requires calculating the date for "Monday" of the current view.
                                        // For simplicity, let's just show events if they match the Day Name AND are active in the current month view context?
                                        // No, that's confusing. 
                                        // Let's stick to: If the event startDate corresponds to this day of the week in the currently selected month/week.

                                        // BETTER APPROACH: Just Iterate events and if they fall in the current week, show them.
                                        // We need `currentDate` (which is in Monthly view) to determine the "Week".
                                        // Let's assume `currentDate` is the anchor.

                                        const eventDate = new Date(e.startDate);
                                        const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });

                                        // Check if event is in the same week as currentDate?
                                        // For now, let's just check if it matches the day name and is in the current month/year to show it "generically" 
                                        // or if the user wants to see specific dates, we should probably have real dates in the header.
                                        // Given the "School Calendar" context, specific dates make sense.

                                        // Update: The Weekly View headers are just "Monday", "Tuesday". This implies a generic schedule.
                                        // BUT users want to see "Holidays".
                                        // Let's match by Day Name if it matches `currentDate`'s week.

                                        return dayOfWeek === day &&
                                            eventDate.getMonth() === currentDate.getMonth() &&
                                            eventDate.getFullYear() === currentDate.getFullYear();
                                    }).map((evt, idx) => (
                                        <div
                                            key={`evt-${idx}`}
                                            className="absolute left-1 right-1 p-1 rounded border z-30 opacity-90 hover:opacity-100 shadow-sm"
                                            style={{
                                                top: '0%',
                                                height: '100%', // Cover whole day for holidays, or calculate time
                                                backgroundColor: getEventColor(evt.type),
                                                color: 'white',
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            }}
                                            title={`${evt.title} (${evt.type})`}
                                        >
                                            <div className="font-bold text-[10px]">{evt.title}</div>
                                            <div className="text-[9px]">{evt.type}</div>
                                        </div>
                                    ))}

                                    {/* Render Classes (Generic Schedule) */}
                                    {displayClasses.map(cls => {
                                        return (cls.schedule || []).filter(s => s.day === day).map((slot, sIdx) => {
                                            const startM = toMinutes(slot.startTime);
                                            const endM = toMinutes(slot.endTime);
                                            const top = (startM / totalMinutes) * 100;
                                            const height = ((endM - startM) / totalMinutes) * 100;
                                            const conflict = checkScheduleConflict(day, slot.startTime, slot.endTime, cls.id, classes, slot.teacherId, slot.roomId);
                                            const isAllView = selectedGradeLevel === 'All';

                                            return (
                                                <div
                                                    key={`${cls.id}-${sIdx}`}
                                                    onClick={() => onEditClass(cls.id)}
                                                    className={`absolute inset-x-1 rounded-xl p-2 cursor-pointer transition-all hover:z-20 hover:scale-[1.05] hover:shadow-xl border overflow-hidden flex flex-col justify-center group/card
                                                        ${!!conflict ? 'bg-red-500 border-red-400 text-white z-20' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white shadow-sm'}
                                                        ${isAllView ? 'opacity-90' : ''}
                                                    `}
                                                    style={{ top: `${top}%`, height: `${height}%` }}
                                                    title={`${cls.gradeLevel}-${cls.section}: ${slot.subjectName}`}
                                                >
                                                    <div className={`w-1 absolute left-0 top-0 bottom-0 ${!!conflict ? 'bg-red-700' : 'bg-indigo-500'}`}></div>
                                                    <div className="pl-2">
                                                        <div className="font-bold text-[10px] leading-tight truncate">{slot.subjectName}</div>
                                                        <div className="text-[9px] opacity-70 truncate">{cls.section}</div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend (Only for Weekly) */}
            {viewType === 'weekly' && (
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500"></span> Class</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Conflic</span>
                    </div>
                    <div>{selectedGradeLevel === 'All' ? 'Select a Grade to filter' : 'Click to edit'}</div>
                </div>
            )}
        </div>
    );
};
