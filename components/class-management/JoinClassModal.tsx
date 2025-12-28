
import React, { useState } from 'react';
import { joinClassByCode } from '../../services/databaseService';
import { XIcon, KeyIcon, SpinnerIcon, CheckCircleIcon } from '../icons';

interface JoinClassModalProps {
    userId: string;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const JoinClassModal = ({ userId, onClose, onSuccess }: JoinClassModalProps) => {
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!joinCode.trim() || joinCode.length < 6) {
            setError('Please enter a valid 6-character code.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await joinClassByCode(userId, joinCode.toUpperCase());
            if (result.success) {
                onSuccess(result.message);
                onClose();
            } else {
                setError(result.message);
            }
        } catch (e) {
            setError("Failed to join. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-scale-up relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="text-center mb-6 pt-4">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                        <KeyIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Join a Class</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                        Enter the 6-character access code provided by your teacher.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => {
                                setJoinCode(e.target.value.toUpperCase());
                                setError('');
                            }}
                            placeholder="e.g. QX7Y2M"
                            maxLength={6}
                            className={`w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700
                                ${error
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 text-red-600'
                                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-800 dark:text-white'
                                }`}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm font-medium text-center animate-shake flex items-center justify-center gap-2">
                            <span>•</span> {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || joinCode.length < 6}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Join Class
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-4">
                        Ask your teacher for the code if you don't have one.
                    </p>
                </form>
            </div>
        </div>
    );
};
