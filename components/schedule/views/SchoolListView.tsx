import React from 'react';
import { SchoolInfo, ClassInfo, Teacher } from '../../../types';
import { getTeacherName } from '../ScheduleUtils';
import { SchoolIcon } from '../../icons';

interface SchoolListViewProps {
    schools: SchoolInfo[];
    classes: ClassInfo[];
    teachers: Teacher[];
    onSelectSchool: (schoolId: string) => void;
}

export const SchoolListView: React.FC<SchoolListViewProps> = ({
    schools,
    classes,
    teachers,
    onSelectSchool
}) => {
    if (schools.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400 italic">
                No schools found. Add a school in School Information to get started.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
            {schools.map(school => {
                const schoolClasses = classes.filter(c => c.schoolId === school.id);
                const teacherCount = school.assignedTeacherIds?.length || 0;
                const roomCount = school.rooms?.length || 0;

                return (
                    <div
                        key={school.id}
                        onClick={() => onSelectSchool(school.id)}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                        <div className="mb-4">
                            <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2">
                                {school.schoolId}
                            </span>
                            <h3 className="font-serif font-bold text-xl text-slate-800 dark:text-white transition-colors line-clamp-2 h-14">
                                {school.schoolName}
                            </h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm text-slate-400">
                                    <SchoolIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Principal</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                        {getTeacherName(teachers, school.principalId).split(',')[0] || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="block text-lg font-bold text-slate-700 dark:text-slate-200">{schoolClasses.length}</span>
                                    <span className="text-[9px] text-slate-400 uppercase">Sections</span>
                                </div>
                                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="block text-lg font-bold text-slate-700 dark:text-slate-200">{teacherCount}</span>
                                    <span className="text-[9px] text-slate-400 uppercase">Faculty</span>
                                </div>
                                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="block text-lg font-bold text-slate-700 dark:text-slate-200">{roomCount}</span>
                                    <span className="text-[9px] text-slate-400 uppercase">Rooms</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center group-hover:underline">
                                View Sections &rarr;
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
