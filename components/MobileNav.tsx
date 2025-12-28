
import React from 'react';
import { View } from '../types';
import { HomeIcon, BrainCircuitIcon, BellIcon, SettingsIcon, MenuIcon } from './icons';

interface MobileNavProps {
    activeView: View;
    setActiveView: (view: View) => void;
    onToggleMenu: () => void;
}

export const MobileNav = ({ activeView, setActiveView, onToggleMenu }: MobileNavProps) => {
    
    const navItems = [
        { id: 'dashboard', icon: <HomeIcon className="w-5 h-5" />, label: 'Home' },
        { id: 'learnSA', icon: <BrainCircuitIcon className="w-5 h-5" />, label: 'AI Tutor' },
        { id: 'notifications', icon: <BellIcon className="w-5 h-5" />, label: 'Alerts' },
        { id: 'settings', icon: <SettingsIcon className="w-5 h-5" />, label: 'Settings' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                <button 
                    onClick={onToggleMenu}
                    className="flex flex-col items-center justify-center w-full h-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                    <MenuIcon className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>

                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as View)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                            activeView === item.id 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {item.icon}
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
