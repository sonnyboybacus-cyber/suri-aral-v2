import React, { useState, useEffect } from 'react';
import { LoginForm } from './auth/LoginForm';
import { ForgotPassword } from './auth/ForgotPassword';
import { RegisterWizard } from './auth/RegisterWizard';

const motivationalQuotes = [
    "The important thing is not to stop questioning. Curiosity has its own reason for existing. - Albert Einstein",
    "Education is not the learning of facts, but the training of the mind to think. - Albert Einstein",
    "I have not failed. I've just found 10,000 ways that won't work. - Thomas Edison",
    "Science is a way of thinking much more than it is a body of knowledge. - Carl Sagan",
    "Somewhere, something incredible is waiting to be known. - Carl Sagan"
];

const LoginPage = () => {
    const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
    const [quote, setQuote] = useState<string>("");
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    useEffect(() => {
        setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }, []);

    const handleSuccess = () => {
        setIsSuccess(true);
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-white dark:bg-slate-900 animate-fade-in overflow-hidden">
                {/* Background ambient glow */}
                <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/10 pointer-events-none" />

                <div className="relative mb-8">
                    {/* Spinning outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-indigo-300 border-l-transparent animate-spin" />

                    {/* Logo Container */}
                    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-xl overflow-hidden relative z-10 m-2">
                        <img src="/DivisionLogo.png" alt="Suri-Aral Logo" className="w-full h-full object-contain p-1 animate-pulse" />
                    </div>
                </div>

                <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight animate-fade-in-up">Initializing SURI-ARAL...</h2>
                <p className="text-slate-500 mt-2 font-medium animate-pulse">Preparing your workspace</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex overflow-hidden relative">

            {/* LEFT PANEL: HERO (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">

                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black opacity-90"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

                {/* Animated Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

                {/* Content */}
                <div className="relative z-10 max-w-lg text-white">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-8 border border-white/20 shadow-2xl overflow-hidden">
                        <img src="/DivisionLogo.png" alt="Suri-Aral Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter leading-tight mb-6">
                        Unlock your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Potential</span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed font-light mb-8">
                        Experience the future of education with SURI-ARAL. AI-augmented tools designed to personalize learning and streamline management.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-white/5 list-none rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">1</div>
                            <div>
                                <h4 className="font-bold">AI Tutor</h4>
                                <p className="text-xs text-slate-400">Personalized curriculum generation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-white/5 list-none rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">2</div>
                            <div>
                                <h4 className="font-bold">Smart Analysis</h4>
                                <p className="text-xs text-slate-400">Real-time performance tracking</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10">
                        <p className="font-medium italic text-slate-400">"{quote}"</p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: FORMS */}
            <div className="w-full lg:w-1/2 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth">
                <div className="min-h-full w-full flex flex-col items-center p-4 sm:p-8 lg:p-12 py-10">
                    <div className={`w-full transition-all duration-500 my-auto ${view === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
                        {/* Mobile Logo (Visible only on mobile/tablet) */}
                        <div className="lg:hidden flex justify-center mb-8 mt-4">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden border-2 border-slate-100 dark:border-slate-700">
                                    <img src="/DivisionLogo.png" alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SURI-ARAL</span>
                            </div>
                        </div>

                        {/* View Switcher */}
                        {view === 'login' && (
                            <LoginForm
                                onSuccess={handleSuccess}
                                onRegisterClick={() => setView('register')}
                                onForgotClick={() => setView('forgot')}
                            />
                        )}

                        {view === 'forgot' && (
                            <ForgotPassword
                                onBack={() => setView('login')}
                            />
                        )}

                        {view === 'register' && (
                            <RegisterWizard
                                onSuccess={() => setView('login')}
                                onCancel={() => setView('login')}
                            />
                        )}

                        <div className="mt-12 text-center pb-4">
                            <p className="text-xs text-slate-400">
                                &copy; 2025 SURI-ARAL Learning System. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
