
import React from 'react';

interface FooterProps {
    onOpenModal: (type: 'privacy' | 'terms' | 'help' | 'bug') => void;
}

const Footer = ({ onOpenModal }: FooterProps) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-6 px-8 mt-auto bg-white/50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Left Side: Branding & Copyright */}
                <div className="flex items-center gap-3 order-2 md:order-1">
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                        &copy; {currentYear} <span className="font-bold text-slate-700 dark:text-slate-300">SURI-ARAL</span>. All rights reserved.
                    </p>
                    <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800">
                        v1.2.3 Stable
                    </span>
                </div>

                {/* Right Side: Quick Links */}
                <div className="flex flex-wrap justify-center gap-6 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide order-1 md:order-2">
                    <button onClick={() => onOpenModal('privacy')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</button>
                    <button onClick={() => onOpenModal('terms')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</button>
                    <button onClick={() => onOpenModal('help')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Help</button>
                    <button onClick={() => onOpenModal('bug')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Report Bug</button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
