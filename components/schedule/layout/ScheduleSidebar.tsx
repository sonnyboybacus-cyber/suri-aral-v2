import React from 'react';
import {
    CalendarIcon, UsersIcon, BriefcaseIcon, GridIcon, CheckCircleIcon,
    FilterIcon, MegaphoneIcon, TrashIcon, ChevronDownIcon
} from '../../icons';
import { SchoolInfo, Teacher } from '../../../types';
import { getTeacherName } from '../ScheduleUtils';

interface ScheduleSidebarProps {
    viewMode: 'matrix' | 'calendar' | 'faculty' | 'facilities' | 'availability';
    setViewMode: (mode: 'matrix' | 'calendar' | 'faculty' | 'facilities' | 'availability') => void;

    // Filters
    selectedSchoolId: string;
    setSelectedSchoolId: (id: string) => void;
    selectedGradeLevel: string;
    setSelectedGradeLevel: (grade: string) => void;
    selectedTeacherId: string;
    setSelectedTeacherId: (id: string) => void;

    // Data
    schools: SchoolInfo[];
    gradeLevels: string[];
    teachers: Teacher[];

    // Actions
    onShowCalendarManager: () => void;
    onShowEventModal: () => void;
    onClearAll: () => void;

    // Permissions/Context
    showSchoolFilter: boolean;
}

export const ScheduleSidebar: React.FC<ScheduleSidebarProps> = ({
    viewMode, setViewMode,
    selectedSchoolId, setSelectedSchoolId,
    selectedGradeLevel, setSelectedGradeLevel,
    selectedTeacherId, setSelectedTeacherId,
    schools, gradeLevels, teachers,
    onShowCalendarManager, onShowEventModal, onClearAll,
    showSchoolFilter
}) => {

    const navItems = [
        { id: 'matrix', label: 'Class Matrix', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'calendar', label: 'School Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
        { id: 'faculty', label: 'Faculty Load', icon: <BriefcaseIcon className="w-4 h-4" /> },
        { id: 'facilities', label: 'Facilities', icon: <GridIcon className="w-4 h-4" /> },
        { id: 'availability', label: 'Conflict Checker', icon: <CheckCircleIcon className="w-4 h-4" /> }
    ];

    return (
        <aside className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full overflow-y-auto flex flex-col gap-6 p-6 relative z-10">

            {/* View Navigation */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Views</h3>
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setViewMode(item.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${viewMode === item.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            {/* Icon styling adjustment for active state */}
                            {React.cloneElement(item.icon as React.ReactElement, { className: `w-4 h-4 ${viewMode === item.id ? 'text-white' : 'text-current'}` })}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Global Filters */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Filters</h3>

                {showSchoolFilter && (
                    <div className="px-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">School</label>
                        <div className="relative">
                            <select
                                value={selectedSchoolId}
                                onChange={(e) => setSelectedSchoolId(e.target.value)}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                            >
                                <option value="">All Schools</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {(viewMode === 'matrix' || viewMode === 'calendar') && (
                    <div className="px-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">Grade Level</label>
                        <div className="relative">
                            <select
                                value={selectedGradeLevel}
                                onChange={(e) => setSelectedGradeLevel(e.target.value)}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                            >
                                <option value="All">All Grades</option>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {(viewMode === 'faculty' || viewMode === 'matrix') && (
                    <div className="px-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">Teacher</label>
                        <div className="relative">
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                            >
                                <option value="">All Teachers</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{getTeacherName(teachers, t.id)}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <button onClick={onShowCalendarManager} className="w-full flex items-center justify-center p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 gap-2 active:scale-95">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="text-sm font-bold">Manage Events</span>
                </button>

                <button onClick={onClearAll} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold">
                    <TrashIcon className="w-4 h-4" /> Clear Schedules
                </button>
            </div>
        </aside>
    );
};
