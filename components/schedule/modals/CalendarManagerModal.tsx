import React from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile } from '../../../types';
import { CalendarManager } from '../../CalendarManager';

interface CalendarManagerModalProps {
    isOpen: boolean;
    user: any; // Relaxed type to avoid version conflicts
    userProfile: UserProfile | null;
    selectedSchoolId?: string; // Added prop
    onClose: () => void;
}

export const CalendarManagerModal: React.FC<CalendarManagerModalProps> = ({
    isOpen,
    user,
    userProfile,
    selectedSchoolId,
    onClose
}) => {
    if (!isOpen) return null;

    if (!userProfile) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Profile Not Loaded</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">We couldn't load your user profile information. Please check your internet connection or try refreshing the page.</p>
                    <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-5xl h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-scale-up flex flex-col">
                <CalendarManager
                    user={user}
                    userProfile={userProfile}
                    selectedSchoolId={selectedSchoolId}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};
