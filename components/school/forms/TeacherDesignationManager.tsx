import React, { useState, useMemo } from 'react';
import { Teacher } from '../../../types';
import { BriefcaseIcon, PlusIcon, XIcon } from '../../icons';

interface TeacherDesignationManagerProps {
    teachers: Teacher[];
    assignedTeacherIds: string[];
    currentSchoolId?: string;
    onAssign: (id: string) => void;
    onUnassign: (id: string) => void;
}

const getTeacherFullName = (t: Teacher) => `${t.lastName}, ${t.firstName} ${t.middleName || ''}`.trim();

export const TeacherDesignationManager: React.FC<TeacherDesignationManagerProps> = ({
    teachers,
    assignedTeacherIds,
    currentSchoolId,
    onAssign,
    onUnassign
}) => {
    const [availableSearch, setAvailableSearch] = useState('');
    const [assignedSearch, setAssignedSearch] = useState('');

    const availableTeachers = useMemo(() => {
        return teachers
            .filter(t => !assignedTeacherIds.includes(t.id) && t.schoolId !== currentSchoolId)
            .filter(t => getTeacherFullName(t).toLowerCase().includes(availableSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [teachers, assignedTeacherIds, availableSearch, currentSchoolId]);

    const assignedTeachers = useMemo(() => {
        return teachers
            .filter(t => assignedTeacherIds.includes(t.id) || t.schoolId === currentSchoolId)
            .filter(t => getTeacherFullName(t).toLowerCase().includes(assignedSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [teachers, assignedTeacherIds, assignedSearch, currentSchoolId]);

    return (
        <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-4 flex items-center">
                <BriefcaseIcon className="w-4 h-4 mr-2 text-indigo-500" />
                Faculty Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Teachers */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Available Pool</span>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{availableTeachers.length}</span>
                    </div>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <input
                            type="text"
                            placeholder="Filter teachers..."
                            value={availableSearch}
                            onChange={e => setAvailableSearch(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {availableTeachers.map(t => (
                            <li key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        {t.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getTeacherFullName(t)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onAssign(t.id)}
                                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {availableTeachers.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No teachers found.</li>}
                    </ul>
                </div>

                {/* Assigned Teachers */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Assigned Faculty</span>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{assignedTeachers.length}</span>
                    </div>
                    <div className="p-2 border-b border-indigo-100 dark:border-indigo-800">
                        <input
                            type="text"
                            placeholder="Filter assigned..."
                            value={assignedSearch}
                            onChange={e => setAssignedSearch(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {assignedTeachers.map(t => (
                            <li key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-900/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                        {t.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{getTeacherFullName(t)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onUnassign(t.id)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {assignedTeachers.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No teachers assigned yet.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};
