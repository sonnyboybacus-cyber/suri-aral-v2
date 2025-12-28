import React from 'react';
import { BugIcon, MailIcon } from '../icons';

export const SupportSettings: React.FC = () => {
    return (
        <div className="space-y-10 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Support</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">We're here to help you succeed.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <a
                    href="mailto:support@suriaral.com?subject=Bug Report"
                    className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-xl transition-all group"
                >
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BugIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Report a Bug</span>
                    <span className="text-xs text-slate-400 mt-2">Something not working?</span>
                </a>
                <a
                    href="mailto:contact@suriaral.com"
                    className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-xl transition-all group"
                >
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <MailIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Contact Us</span>
                    <span className="text-xs text-slate-400 mt-2">General inquiries</span>
                </a>
            </div>

            <div className="text-center pt-10 border-t border-slate-200/50 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SURI-ARAL v1.2.3</p>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-2">Built with Gemini 2.5 AI</p>
            </div>
        </div>
    );
};
