import React from 'react';
import { LockIcon } from './icons';

interface AccessRestrictedProps {
    onBack?: () => void;
    title?: string;
    message?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
    onBack,
    title = "Access Restricted",
    message = "You do not have permission to view this module."
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md shadow-xl">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
                    <LockIcon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    {message}
                </p>

                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                    >
                        Go Back
                    </button>
                )}
            </div>
        </div>
    );
};
