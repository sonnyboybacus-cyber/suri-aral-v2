import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { MailIcon, KeyIcon, EyeIcon, EyeOffIcon, SpinnerIcon, BrainCircuitIcon } from '../icons';

interface LoginFormProps {
    onSuccess: () => void;
    onRegisterClick: () => void;
    onForgotClick: () => void;
}

export const LoginForm = ({ onSuccess, onRegisterClick, onForgotClick }: LoginFormProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await auth.signInWithEmailAndPassword(email, password);
            onSuccess();
        } catch (err: any) {
            console.error("Login incorrect", err);
            // Friendly error messages
            const code = err.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError("Incorrect email or password.");
            } else if (code === 'auth/too-many-requests') {
                setError("Too many attempts. Account temporarily locked.");
            } else if (code === 'auth/user-disabled') {
                setError("This account has been disabled.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Welcome Back</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Sign in to your learning dashboard</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-shake border border-red-100 dark:border-red-800">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                        Email Address
                    </label>
                    <div className="relative group">
                        <MailIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Password
                        </label>
                        <button
                            type="button"
                            onClick={onForgotClick}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <div className="relative group">
                        <KeyIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="mt-8 text-center animate-fade-in">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={onRegisterClick}
                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-1"
                    >
                        Create account
                    </button>
                </p>
            </div>
        </div>
    );
};
