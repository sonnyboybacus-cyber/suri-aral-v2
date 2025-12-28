import React, { useState, useMemo, useEffect } from 'react';
import { SchoolInfo } from '../../../types';
import { SearchIcon, SchoolIcon, PinIcon, EditIcon, TrashIcon } from '../../icons';
import { UndoIcon } from '../../UndoIcon';

interface SchoolListProps {
    schools: SchoolInfo[];
    activeTab: 'active' | 'deleted';
    searchQuery: string;
    onEdit: (school: SchoolInfo) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onAddNew?: () => void;
}

const ITEMS_PER_PAGE = 12;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const SchoolList: React.FC<SchoolListProps> = ({
    schools,
    activeTab,
    searchQuery,
    onEdit,
    onDelete,
    onRestore,
    onAddNew
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    const activeSchools = useMemo(() => schools.filter(s => !s.deletedAt), [schools]);
    const deletedSchools = useMemo(() => schools.filter(s => s.deletedAt), [schools]);

    const filteredSchools = useMemo(() => {
        const sourceList = activeTab === 'active' ? activeSchools : deletedSchools;
        if (!searchQuery.trim()) {
            return sourceList;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return sourceList.filter(s =>
            s.schoolName.toLowerCase().includes(lowercasedQuery) ||
            s.schoolId.toLowerCase().includes(lowercasedQuery) ||
            (s.location?.address || '').toLowerCase().includes(lowercasedQuery)
        );
    }, [activeSchools, deletedSchools, activeTab, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
    const paginatedSchools = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSchools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredSchools, currentPage]);

    const getTimeRemaining = (deletedAt?: number): string => {
        if (!deletedAt) return "";
        const now = Date.now();
        const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);
        if (timeLeft <= 0) return "Expired";
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h remaining`;
    };

    if (filteredSchools.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <SchoolIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {searchQuery ? `No matches for "${searchQuery}"` : (activeTab === 'active' ? 'No active schools.' : 'Recycle bin is empty.')}
                </p>
                {activeTab === 'active' && !searchQuery && onAddNew && (
                    <button onClick={onAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                        Create your first school
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedSchools.map(school => (
                    <div key={school.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>

                        <div className="flex justify-between items-start mb-3 pl-3">
                            <div>
                                <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md font-mono mb-2">
                                    ID: {school.schoolId}
                                </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeTab === 'active' ? (
                                    <>
                                        <button onClick={() => onEdit(school)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(school.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => onRestore(school.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
                                        <UndoIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 dark:text-white font-serif leading-tight mb-2 pl-3">
                            {school.schoolName}
                        </h3>

                        <div className="pl-3 mb-4 flex-1">
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                                <PinIcon className="w-3 h-3 mr-1.5" />
                                <span className="line-clamp-1">{school.location?.address || 'No location set'}</span>
                            </div>
                            <p className="text-xs text-slate-400">{school.district}, {school.division}</p>
                        </div>

                        <div className="pl-3 mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                            <div>
                                <span className="font-bold text-slate-600 dark:text-slate-300">{school.assignedTeacherIds?.length || 0}</span> Teachers
                            </div>
                            {activeTab === 'deleted' && (
                                <span className="font-mono text-red-500 font-medium">
                                    {getTimeRemaining(school.deletedAt)}
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
