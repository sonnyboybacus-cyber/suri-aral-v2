import React from 'react';
import { CalendarIcon } from '../../icons';

interface ScheduleHeaderProps {
    title: string;
    subtitle: string;
    rightContent?: React.ReactNode;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ title, subtitle, rightContent }) => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pt-2">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                    <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {rightContent}
            </div>
        </header>
    );
};
