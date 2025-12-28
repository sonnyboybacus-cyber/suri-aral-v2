import React, { useMemo, useState } from 'react';
import { Subject } from '../../../types';
import { EditIcon, TrashIcon, BookOpenIcon } from '../../icons';
import { UndoIcon } from '../../UndoIcon';

interface SubjectListProps {
    subjects: Subject[];
    activeTab: 'active' | 'deleted';
    searchQuery: string;
    onEdit: (subject: Subject) => void;
    onDelete: (subject: Subject) => void;
    onRestore: (subject: Subject) => void;
    onAddNew?: () => void;
    activeFilters?: {
        view: 'basic' | 'shs';
        track?: string;
        semester?: string;
    };
}

const ITEMS_PER_PAGE = 12;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const SubjectList: React.FC<SubjectListProps> = ({
    subjects,
    activeTab,
    searchQuery,
    onEdit,
    onDelete,
    onRestore,
    onAddNew,
    activeFilters
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    const isSHS = (grade: string) => {
        return grade === 'Grade 11' || grade === 'Grade 12' || grade === 'Senior High';
    };

    const getTimeRemaining = (deletedAt?: number): string => {
        if (!deletedAt) return "";
        const now = Date.now();
        const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);
        if (timeLeft <= 0) return "Expired";
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h remaining`;
    };

    const filteredSubjects = useMemo(() => {
        let filtered = subjects;

        // Active/Deleted Filter
        filtered = activeTab === 'active'
            ? filtered.filter(s => !s.deletedAt)
            : filtered.filter(s => s.deletedAt);

        // Curriculum View Filter
        if (activeFilters) {
            filtered = filtered.filter(s => {
                const isSubjectSHS = isSHS(s.gradeLevel);
                return activeFilters.view === 'shs' ? isSubjectSHS : !isSubjectSHS;
            });

            if (activeFilters.view === 'shs') {
                if (activeFilters.track) {
                    filtered = filtered.filter(s => s.track === activeFilters.track || s.classification === 'Core' || s.classification === 'Applied');
                }
                if (activeFilters.semester) {
                    filtered = filtered.filter(s => s.semester === activeFilters.semester);
                }
            }
        }

        // Search Filter
        if (searchQuery.trim()) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.code.toLowerCase().includes(lowercasedQuery) ||
                s.name.toLowerCase().includes(lowercasedQuery) ||
                s.department.toLowerCase().includes(lowercasedQuery) ||
                (s.gradeLevel && s.gradeLevel.toLowerCase().includes(lowercasedQuery))
            );
        }

        return filtered;
    }, [subjects, activeTab, searchQuery, activeFilters]);

    const totalPages = Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE);
    const paginatedSubjects = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSubjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredSubjects, currentPage]);

    if (filteredSubjects.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <BookOpenIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {searchQuery ? `No matches for "${searchQuery}"` : (activeTab === 'active' ? 'No active subjects.' : 'Recycle bin is empty.')}
                </p>
                {activeTab === 'active' && !searchQuery && onAddNew && (
                    <button onClick={onAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                        Add your first subject
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedSubjects.map(subject => (
                    <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${subject.classification === 'Core' ? 'bg-indigo-500' : subject.classification === 'Applied' ? 'bg-teal-500' : 'bg-purple-500'}`}></div>

                        <div className="flex justify-between items-start mb-3 pl-3">
                            <div>
                                <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md font-mono mb-2">
                                    {subject.code}
                                </span>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{subject.gradeLevel}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeTab === 'active' ? (
                                    <>
                                        <button onClick={() => onEdit(subject)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(subject)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => onRestore(subject)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
                                        <UndoIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 dark:text-white font-serif leading-tight mb-2 pl-3 line-clamp-2 h-12">
                            {subject.name}
                        </h3>

                        <div className="pl-3 mb-4 flex-1">
                            {subject.track && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 mr-2">
                                    {subject.track}
                                </span>
                            )}
                            {subject.classification && (
                                <span className={`text-[10px] px-2 py-1 rounded ${subject.classification === 'Core' ? 'bg-indigo-50 text-indigo-600' :
                                    subject.classification === 'Applied' ? 'bg-teal-50 text-teal-600' : 'bg-purple-50 text-purple-600'
                                    }`}>
                                    {subject.classification}
                                </span>
                            )}
                        </div>

                        <div className="pl-3 mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                            <span>{subject.department} Department</span>
                            {activeTab === 'deleted' && (
                                <span className="font-mono text-red-500 font-medium">
                                    {getTimeRemaining(subject.deletedAt)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                    <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                </div>
            )}
        </div>
    );
};
