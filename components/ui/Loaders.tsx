
import React from 'react';
import { BrainCircuitIcon } from '../icons';

export const LoadingScreen = () => (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-500 animate-fade-in overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/10 pointer-events-none" />

        <div className="relative flex flex-col items-center z-10">
            <div className="relative mb-8">
                {/* Spinning Ring */}
                <div className="absolute -inset-4 rounded-full border-[3px] border-indigo-100 dark:border-indigo-900"></div>
                <div className="absolute -inset-4 rounded-full border-[3px] border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>

                {/* Logo Container */}
                <div className="relative w-32 h-32 rounded-full shadow-2xl shadow-indigo-500/20 overflow-hidden bg-white dark:bg-slate-800 ring-4 ring-white dark:ring-slate-800">
                    <img
                        src="/DivisionLogo.png"
                        alt="Suri-Aral Logo"
                        className="w-full h-full object-cover animate-pulse"
                    />
                </div>
            </div>

            <h1 className="text-3xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 animate-fade-in-up">
                SURI-ARAL
            </h1>
            <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce"></div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                    Initializing Workspace...
                </p>
                <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            </div>
        </div>
    </div>
);

export const LogoutScreen = () => (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-700 animate-fade-in overflow-hidden">
        {/* Background ambient glow - Darker for logout */}
        <div className="absolute inset-0 bg-indigo-950/20 pointer-events-none" />

        <div className="relative flex flex-col items-center z-10">
            <div className="relative mb-8">
                {/* Reverse Spinning Ring for 'Shutting Down' feel */}
                <div className="absolute -inset-4 rounded-full border-[3px] border-indigo-900/50"></div>
                <div className="absolute -inset-4 rounded-full border-[3px] border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-[spin_1s_linear_infinite_reverse]"></div>

                {/* Logo Container */}
                <div className="relative w-32 h-32 rounded-full shadow-2xl shadow-indigo-500/10 overflow-hidden bg-slate-800 ring-4 ring-slate-800 grayscale-[0.5]">
                    <img
                        src="/DivisionLogo.png"
                        alt="Suri-Aral Logo"
                        className="w-full h-full object-cover animate-pulse"
                    />
                </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">
                See you soon
            </h2>

            <div className="flex flex-col items-center gap-2 text-indigo-300/80">
                <p className="text-xs font-mono tracking-widest uppercase animate-pulse">
                    Securely closing session...
                </p>
            </div>
        </div>

        <div className="absolute bottom-10 text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">
            Suri-Aral AI Suite
        </div>
    </div>
);
