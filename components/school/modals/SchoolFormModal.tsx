import React, { useState } from 'react';
import { SchoolInfo, Teacher } from '../../../types';
import { XIcon, SpinnerIcon, EditIcon, PlusIcon } from '../../icons';
import { SchoolGeneralForm } from '../forms/SchoolGeneralForm';
import { SchoolFacilitiesForm } from '../forms/SchoolFacilitiesForm';

interface SchoolFormModalProps {
    isOpen: boolean;
    editingSchoolId: string | null;
    currentSchool: Omit<SchoolInfo, 'id' | 'deletedAt'>;
    setCurrentSchool: React.Dispatch<React.SetStateAction<Omit<SchoolInfo, 'id' | 'deletedAt'>>>;
    teachers: Teacher[];
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const SchoolFormModal: React.FC<SchoolFormModalProps> = ({
    isOpen,
    editingSchoolId,
    currentSchool,
    setCurrentSchool,
    teachers,
    isSaving,
    onClose,
    onSubmit
}) => {
    const [modalTab, setModalTab] = useState<'profile' | 'facilities'>('profile');

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentSchool(prev => ({ ...prev, [name]: value }));
    };

    const handleAssignTeacher = (teacherId: string) => {
        setCurrentSchool(prev => ({ ...prev, assignedTeacherIds: [...prev.assignedTeacherIds, teacherId] }));
    };

    const handleUnassignTeacher = (teacherId: string) => {
        setCurrentSchool(prev => ({ ...prev, assignedTeacherIds: prev.assignedTeacherIds.filter(id => id !== teacherId) }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-up">

                {/* Header */}
                <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                            {editingSchoolId ? 'Edit School Profile' : 'Add New School'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure institutional details and facilities.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                    <button
                        onClick={() => setModalTab('profile')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'profile' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        General Profile
                    </button>
                    <button
                        onClick={() => setModalTab('facilities')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'facilities' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Facilities & Map
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {modalTab === 'profile' ? (
                        <SchoolGeneralForm
                            currentSchool={currentSchool}
                            teachers={teachers}
                            onChange={handleInputChange}
                            onAssignTeacher={handleAssignTeacher}
                            onUnassignTeacher={handleUnassignTeacher}
                        />
                    ) : (
                        <SchoolFacilitiesForm
                            currentSchool={currentSchool}
                            setCurrentSchool={setCurrentSchool}
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
                        {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : (editingSchoolId ? <EditIcon className="w-4 h-4 mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />)}
                        {isSaving ? 'Saving...' : (editingSchoolId ? 'Update School' : 'Create School')}
                    </button>
                </footer>
            </div>
        </div>
    );
};
