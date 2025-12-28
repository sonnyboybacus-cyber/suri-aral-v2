import React, { useState } from 'react';
import { Subject, LearnSAContext } from '../../../types';
import { XIcon, SpinnerIcon, EditIcon, PlusIcon } from '../../icons';
import { SubjectGeneralForm } from '../forms/SubjectGeneralForm';
import { CurriculumEditor } from '../forms/CurriculumEditor';

interface SubjectFormModalProps {
    isOpen: boolean;
    editingSubjectId: string | null;
    currentSubject: Omit<Subject, 'id' | 'deletedAt'>;
    setCurrentSubject: React.Dispatch<React.SetStateAction<Omit<Subject, 'id' | 'deletedAt'>>>;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onLaunchTutor?: (context: LearnSAContext) => void;
}

export const SubjectFormModal: React.FC<SubjectFormModalProps> = ({
    isOpen,
    editingSubjectId,
    currentSubject,
    setCurrentSubject,
    isSaving,
    onClose,
    onSubmit,
    onLaunchTutor
}) => {
    const [modalTab, setModalTab] = useState<'general' | 'curriculum'>('general');

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentSubject(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up max-h-[90vh]">

                <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                            {editingSubjectId ? `Edit Subject: ${currentSubject.code}` : 'Add New Subject'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage curriculum details and guide.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                    <button
                        onClick={() => setModalTab('general')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'general' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        General Information
                    </button>
                    <button
                        onClick={() => setModalTab('curriculum')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'curriculum' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Curriculum Guide
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {modalTab === 'general' ? (
                        <SubjectGeneralForm
                            currentSubject={currentSubject}
                            onChange={handleInputChange}
                        />
                    ) : (
                        <CurriculumEditor
                            currentSubject={currentSubject}
                            setCurrentSubject={setCurrentSubject}
                            editingSubjectId={editingSubjectId}
                            onLaunchTutor={onLaunchTutor}
                        />
                    )}
                </div>

                <footer className="flex justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3 flex-shrink-0">
                    <button onClick={onClose} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : (editingSubjectId ? <EditIcon className="w-4 h-4 mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />)}
                        {isSaving ? 'Saving...' : (editingSubjectId ? 'Update Subject' : 'Create Subject')}
                    </button>
                </footer>
            </div>
        </div>
    );
};
