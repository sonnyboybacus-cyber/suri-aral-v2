import React from 'react';
import { SettingsTab } from '../../types';

export interface SidebarItemProps {
    id: SettingsTab;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: (id: SettingsTab) => void;
}

export const SidebarItem = ({ id, icon, label, isActive, onClick }: SidebarItemProps) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            }`}
    >
        {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
        )}
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'group-hover:scale-105'}`}>
            {icon}
        </div>
        <span className="tracking-wide text-sm">{label}</span>
    </button>
);

export const SettingToggle = ({ label, subtitle, checked, onChange }: { label: string, subtitle: string, checked: boolean, onChange: (val: boolean) => void }) => (
    <div className="flex items-center justify-between py-5 group cursor-pointer" onClick={() => onChange(!checked)}>
        <div className="pr-8 flex-1">
            <h4 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-spring ${checked ? 'translate-x-6' : 'translate-x-1'
                }`} />
        </div>
    </div>
);

export const LanguageChip = ({ lang, selected, onClick }: { lang: string, selected: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 border flex items-center justify-center ${selected
            ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-500/30'
            : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'
            }`}
    >
        {lang}
    </button>
);

export const SettingsCard = ({ title, subtitle, children, className = "" }: { title?: string, subtitle?: string, children: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}>
        {(title || subtitle) && (
            <div className="px-8 pt-8 pb-4">
                {title && <h3 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">{title}</h3>}
                {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
            </div>
        )}
        <div className="p-8 pt-2">
            {children}
        </div>
    </div>
);
