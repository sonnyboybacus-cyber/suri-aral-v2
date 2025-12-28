
import React from 'react';
import { ClockIcon, CheckCircleIcon } from '../icons';
import { ClassInfo } from '../../types';

interface TeacherScheduleWidgetProps {
    date?: Date;
    classes: ClassInfo[]; // We pass the teacher's classes here
}

export const TeacherScheduleWidget = ({ classes }: TeacherScheduleWidgetProps) => {
    // Logic to filter/sort classes by today's schedule would go here. 
    // For now, we list active classes as "Today's Schedule" for demo purposes 
    // or mock a schedule if the class data doesn't have detailed times yet.

    // Using the 'schedule' field from ClassInfo if available, otherwise defaulting.
    const todaysClasses = classes.slice(0, 4); // Limit to 4 for widget

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-emerald-500" /> My Schedule
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">Today</span>
            </div>

            <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 space-y-6">
                {todaysClasses.length > 0 ? todaysClasses.map((cls, index) => (
                    <div key={cls.id} className="relative group">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 mb-0.5">
                                {(cls.schedule && cls.schedule.length > 0)
                                    ? `${cls.schedule[0].startTime} - ${cls.schedule[0].endTime}`
                                    : "Time TBD"}
                            </p>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-indigo-500 transition-colors">
                                {cls.section} - {cls.gradeLevel}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {cls.subjects?.length > 0 ? cls.subjects[0].name : "Advisory Class"}
                            </p>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-slate-400 italic">No classes scheduled for today.</p>
                )}
            </div>

            {todaysClasses.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Next: {todaysClasses[0].section} (Advisory)</span>
                    </div>
                </div>
            )}
        </div>
    );
};
