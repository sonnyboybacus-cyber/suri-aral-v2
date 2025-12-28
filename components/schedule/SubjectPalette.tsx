
import React from 'react';
import { ClassSubject, Teacher } from '../../types';
import { CalendarIcon, CoffeeIcon } from '../icons';

interface SubjectPaletteProps {
    subjects: ClassSubject[];
    teachers: Teacher[];
    onDragStart: (type: string) => void;
    onDragEnd: () => void;
}

export const SubjectPalette = ({ subjects, teachers, onDragStart, onDragEnd }: SubjectPaletteProps) => {
    return (
        <div className="w-72 border-r border-slate-200 dark:border-slate-700 h-full flex flex-col bg-white dark:bg-slate-800 shadow-xl z-20 hidden md:flex">

            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Master Schedule Tools</h3>

                <div className="space-y-3">
                    <div
                        draggable
                        onDragStart={() => onDragStart('Lecture')}
                        onDragEnd={onDragEnd}
                        className="p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:shadow-lg transition-all group bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2 border-dashed border-indigo-300/50 dark:border-indigo-700/50 hover:border-indigo-500 dark:hover:border-indigo-400"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white dark:bg-slate-600 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white">Official Class</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Recurring Subject Block</div>
                            </div>
                        </div>
                    </div>

                    <div
                        draggable
                        onDragStart={() => onDragStart('Break')}
                        onDragEnd={onDragEnd}
                        className="p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:shadow-lg transition-all group bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl shadow-sm text-slate-500 dark:text-slate-300">
                                <CoffeeIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white">Standard Break</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Recess / Lunch</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>Note:</strong> This editor is for the <em>Recurring Weekly Routine</em>. Temporary events like Quizzes or Holidays should be managed in the Calendar or Lesson Planner.
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Available Subjects</h3>
                    <div className="space-y-2">
                        {subjects.map(sub => (
                            <div key={sub.id} className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-between group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{sub.name}</span>
                            </div>
                        ))}
                        {subjects.length === 0 && <p className="text-xs text-slate-400 italic">No subjects assigned.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
