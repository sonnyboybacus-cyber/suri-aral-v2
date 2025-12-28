import React from 'react';
import { ClassInfo } from '../../types';
import {
    EditIcon, TrashIcon, SchoolIcon, UserIcon,
    CalendarIcon, FileSpreadsheetIcon, UsersIcon
} from '../icons';
import { UndoIcon } from '../UndoIcon';

interface ClassCardProps {
    classInfo: ClassInfo;
    schoolName: string;
    adviserName: string;
    activeTab: 'active' | 'deleted';
    onEdit?: (c: ClassInfo) => void;
    onDelete?: (c: ClassInfo) => void;
    onRestore: (id: string) => void | Promise<void>;
    onSchedule: (id: string) => void;
    onRecord: (id: string) => void;
    isTeacher?: boolean;
    canViewRecord?: boolean;
    canViewSchedule?: boolean;
    onEnter?: (id: string) => void;
}

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const getTimeRemaining = (deletedAt?: number): string => {
    if (!deletedAt) return "";
    const now = Date.now();
    const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);
    if (timeLeft <= 0) return "Expired";
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
};

export const ClassCard: React.FC<ClassCardProps> = ({
    classInfo,
    schoolName,
    adviserName,
    activeTab,
    onEdit,
    onDelete,
    onRestore,
    onSchedule,
    onRecord,
    isTeacher,
    canViewRecord = true,
    canViewSchedule = true,
    onEnter
}) => {
    // Determine if clickable (Student mode or Teacher entering class)
    const isClickable = !!onEnter;

    const handleEnter = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (onEnter) onEnter(classInfo.id);
    };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col h-full hover:-translate-y-1">
            <div className={`h-1 w-full ${isTeacher ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-md mb-2 border border-indigo-100 dark:border-indigo-800">
                            {classInfo.gradeLevel}
                        </span>
                        <h3
                            className={`text-xl font-bold text-slate-800 dark:text-white font-serif leading-tight ${isClickable ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors' : ''}`}
                            onClick={isClickable ? handleEnter : undefined}
                        >
                            {classInfo.section}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">{classInfo.schoolYear || 'SY ???'}</p>
                    </div>

                    {/* Action Menu */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-700/50 p-1 rounded-lg shadow-sm">
                        {activeTab === 'active' ? (
                            <>
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(classInfo)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"
                                        title="Edit Class"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(classInfo)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"
                                        title="Delete Class"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={() => onRestore(classInfo.id)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                                title="Restore Class"
                            >
                                <UndoIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3 flex-1 mb-6">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Join Code</span>
                            <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400 tracking-wider">
                                {classInfo.joinCode || '------'}
                            </span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(classInfo.joinCode || '');
                                alert("Code copied!");
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"
                            title="Copy Code"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>

                    <div className="flex items-start text-sm text-slate-600 dark:text-slate-300 group/item">
                        <SchoolIcon className="w-4 h-4 mr-2.5 text-slate-400 mt-0.5 group-hover/item:text-indigo-500 transition-colors" />
                        <span className="truncate font-medium">{schoolName || <span className="text-slate-400 italic">Unassigned School</span>}</span>
                    </div>
                    {!isTeacher && (
                        <div className="flex items-start text-sm text-slate-600 dark:text-slate-300 group/item">
                            <UserIcon className="w-4 h-4 mr-2.5 text-slate-400 mt-0.5 group-hover/item:text-indigo-500 transition-colors" />
                            <span className="truncate font-medium">{adviserName || <span className="text-slate-400 italic">No Adviser</span>}</span>
                        </div>
                    )}
                </div>

                {/* Footer Stats & Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <UsersIcon className="w-4 h-4" />
                        <span className="text-sm font-bold">{classInfo.studentIds?.length || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Students</span>
                    </div>

                    {activeTab === 'deleted' ? (
                        <span className="text-xs font-mono text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            {getTimeRemaining(classInfo.deletedAt)}
                        </span>
                    ) : (
                        <div className="flex gap-2">
                            {onEnter && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEnter(classInfo.id); }}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                >
                                    Enter
                                </button>
                            )}
                            {canViewSchedule && (
                                <button
                                    onClick={() => onSchedule(classInfo.id)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                    title="Manage Schedule"
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                </button>
                            )}
                            {canViewRecord && (
                                <button
                                    onClick={() => onRecord(classInfo.id)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 transition-colors"
                                    title="Class Record"
                                >
                                    <FileSpreadsheetIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};