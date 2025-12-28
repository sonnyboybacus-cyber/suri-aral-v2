import React from 'react';
import { TrashIcon } from '../../icons';

interface DeleteSchoolModalProps {
    isOpen: boolean;
    schoolName: string;
    onClose: () => void;
    onExample: () => void;
}

export const DeleteSchoolModal: React.FC<DeleteSchoolModalProps> = ({
    isOpen,
    schoolName,
    onClose,
    onExample
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-scale-up border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100 dark:border-red-900/30">
                    <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete School?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    Are you sure you want to remove <strong>{schoolName}</strong>? It will be moved to the recycle bin.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onExample}
                        className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
