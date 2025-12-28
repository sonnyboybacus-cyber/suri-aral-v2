import React, { useState } from 'react';
import { LessonPlan } from '../../types';
import { 
    XIcon, SearchIcon, CalendarIcon, TrashIcon 
} from '../icons';

interface PlanLibraryModalProps {
    savedPlans: LessonPlan[];
    onClose: () => void;
    onLoad: (plan: LessonPlan) => void;
    onDelete: (e: React.MouseEvent, planId: string) => void;
    deleteConfirmId: string | null;
    onCancelDelete: (e: React.MouseEvent) => void;
    onConfirmDelete: () => void;
}

export const PlanLibraryModal = ({
    savedPlans,
    onClose,
    onLoad,
    onDelete,
    deleteConfirmId,
    onCancelDelete,
    onConfirmDelete
}: PlanLibraryModalProps) => {
    const [planSearch, setPlanSearch] = useState('');

    const filteredSavedPlans = savedPlans.filter(p => 
        p.topic.toLowerCase().includes(planSearch.toLowerCase()) || 
        p.learningArea.toLowerCase().includes(planSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up relative">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lesson Plan Library</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Search plans..." 
                            value={planSearch}
                            onChange={(e) => setPlanSearch(e.target.value)}
                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filteredSavedPlans.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No plans found.</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSavedPlans.map((p, idx) => (
                                <div 
                                    key={p.id || idx} 
                                    onClick={() => onLoad(p)}
                                    className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-500 cursor-pointer transition-all hover:shadow-md group relative"
                                >
                                    <div className="flex justify-between items-start pr-8">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors">{p.topic}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.learningArea} • {p.gradeLevel} • {p.quarter}</p>
                                        </div>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            {new Date(p.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => onDelete(e, p.id)}
                                        className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Plan"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* DELETE CONFIRMATION MODAL (OVERLAY) */}
                {deleteConfirmId && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center z-[110] p-6 rounded-xl">
                        <div className="text-center max-w-sm w-full animate-fade-in-up">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Lesson Plan?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Are you sure you want to permanently delete this plan? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={onCancelDelete}
                                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={onConfirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};