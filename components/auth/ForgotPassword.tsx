import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { MailIcon, SpinnerIcon, KeyIcon, ArrowLeftIcon } from '../icons';

interface ForgotPasswordProps {
    onBack: () => void;
}

export const ForgotPassword = ({ onBack }: ForgotPasswordProps) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await auth.sendPasswordResetEmail(email);
            setIsSent(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Please enter a valid email address.");
            } else {
                setError("Failed to send reset email. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <div className="w-full max-w-md mx-auto p-4 animate-fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MailIcon className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Check your mail</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        We have sent a password reset link to <br />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span>
                    </p>
                    <button
                        onClick={onBack}
                        className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Login
                    </button>
                    <p className="mt-6 text-xs text-slate-400">
                        Didn't receive the email? Check your spam folder or try again.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform rotate-3">
                    <KeyIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Forgot Password?</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">
                    No worries! Enter your email and we'll send you reset instructions.
                </p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-shake">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                        Email Address
                    </label>
                    <div className="relative group">
                        <MailIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                    </button>

                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full py-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Login
                    </button>
                </div>
            </form>
        </div>
    );
};
