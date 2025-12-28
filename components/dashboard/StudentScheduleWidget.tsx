import React, { useMemo } from 'react';
import { ClassInfo, ScheduleSlot } from '../../types';
import { CalendarIcon, ClockIcon } from '../icons';

interface StudentScheduleWidgetProps {
    classes: ClassInfo[];
}

export const StudentScheduleWidget: React.FC<StudentScheduleWidgetProps> = ({ classes }) => {
    // 1. Aggregate all schedule slots
    const allSlots = useMemo(() => {
        return classes.flatMap(c =>
            (c.schedule || []).map(slot => ({
                ...slot,
                className: `${c.gradeLevel} - ${c.section}`,
                classId: c.id
            }))
        );
    }, [classes]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeRange = { start: 7, end: 17 }; // 7 AM to 5 PM
    const hours = Array.from({ length: timeRange.end - timeRange.start + 1 }, (_, i) => timeRange.start + i);

    const getSlotStyle = (slot: ScheduleSlot) => {
        if (!slot.startTime || !slot.endTime) return { top: '0px', height: '0px', display: 'none' };

        try {
            const [startH, startM] = slot.startTime.split(':').map(Number);
            const [endH, endM] = slot.endTime.split(':').map(Number);

            if (isNaN(startH) || isNaN(endH)) return { top: '0px', height: '0px', display: 'none' };

            const startOffset = (startH - timeRange.start) * 60 + startM;
            const duration = (endH * 60 + endM) - (startH * 60 + startM);

            return {
                top: `${(startOffset / 60) * 60}px`, // 60px per hour
                height: `${(duration / 60) * 60}px`
            };
        } catch (e) {
            return { top: '0px', height: '0px', display: 'none' };
        }
    };

    const getSubjectColor = (subjectName: string) => {
        const colors = [
            'bg-red-100 text-red-700 border-red-200',
            'bg-orange-100 text-orange-700 border-orange-200',
            'bg-amber-100 text-amber-700 border-amber-200',
            'bg-green-100 text-green-700 border-green-200',
            'bg-emerald-100 text-emerald-700 border-emerald-200',
            'bg-teal-100 text-teal-700 border-teal-200',
            'bg-cyan-100 text-cyan-700 border-cyan-200',
            'bg-blue-100 text-blue-700 border-blue-200',
            'bg-indigo-100 text-indigo-700 border-indigo-200',
            'bg-violet-100 text-violet-700 border-violet-200',
            'bg-purple-100 text-purple-700 border-purple-200',
            'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
            'bg-pink-100 text-pink-700 border-pink-200',
            'bg-rose-100 text-rose-700 border-rose-200',
        ];
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" /> My Class Schedule
                </h3>
                <span className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                    Read Only
                </span>
            </div>

            <div className="flex-1 overflow-auto relative custom-scrollbar">
                <div className="min-w-[600px] p-4">
                    <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                        {/* Time Column */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            <div className="h-10 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10"></div>
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-xs text-slate-400 font-mono flex items-start justify-center pt-1">
                                    {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                                </div>
                            ))}
                        </div>

                        {/* Days Columns */}
                        {days.map(day => (
                            <div key={day} className="relative bg-slate-50/30 dark:bg-slate-900/30">
                                {/* Header */}
                                <div className="h-10 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                    {day.slice(0, 3)}
                                </div>

                                {/* Grid Lines */}
                                <div className="absolute inset-0 top-10 flex flex-col pointer-events-none">
                                    {hours.map(h => (
                                        <div key={h} className="h-[60px] border-b border-dashed border-slate-100 dark:border-slate-800 w-full"></div>
                                    ))}
                                </div>

                                {/* Content */}
                                <div className="relative top-0" style={{ height: `${hours.length * 60}px` }}>
                                    {allSlots.filter(s => s.day === day).map(slot => (
                                        <div
                                            key={`${slot.id}-${slot.classId}`}
                                            className={`absolute inset-x-1 rounded-md p-2 text-xs border shadow-sm overflow-hidden hover:z-20 hover:shadow-md transition-all ${getSubjectColor(slot.subjectName)}`}
                                            style={getSlotStyle(slot)}
                                            title={`${slot.subjectName} (${slot.startTime}-${slot.endTime})`}
                                        >
                                            <div className="font-bold truncate">{slot.subjectName}</div>
                                            <div className="opacity-75 truncate">{slot.roomName || 'TBA'}</div>
                                            {/* <div className="opacity-50 text-[10px] mt-0.5 truncate">{slot.className}</div> */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
