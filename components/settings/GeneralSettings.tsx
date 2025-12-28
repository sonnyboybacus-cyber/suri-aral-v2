import React from 'react';
import { UserSettings } from '../../types';
import { SettingsCard, LanguageChip } from './SharedComponents';
import { MonitorIcon, SunIcon, MoonIcon } from '../icons';

interface GeneralSettingsProps {
    settings: UserSettings;
    onSettingChange: (key: keyof UserSettings, value: any) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onSettingChange }) => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Look & Feel</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Customize your workspace environment.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsCard title="Interface Theme" subtitle="Select your preferred color scheme.">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'light', icon: <SunIcon className="w-5 h-5 mb-2" />, label: 'Light' },
                            { id: 'dark', icon: <MoonIcon className="w-5 h-5 mb-2" />, label: 'Dark' },
                            { id: 'system', icon: <MonitorIcon className="w-5 h-5 mb-2" />, label: 'Auto' },
                        ].map((themeOption) => (
                            <button
                                key={themeOption.id}
                                onClick={() => onSettingChange('theme', themeOption.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 h-28 ${settings.theme === themeOption.id
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-600/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800'
                                    }`}
                            >
                                {themeOption.icon}
                                <span className="text-xs font-bold">{themeOption.label}</span>
                            </button>
                        ))}
                    </div>
                </SettingsCard>

                <SettingsCard title="Language" subtitle="Choose your primary language.">
                    <div className="flex flex-col gap-3">
                        <LanguageChip
                            lang="English (International)"
                            selected={settings.language === 'english'}
                            onClick={() => onSettingChange('language', 'english')}
                        />
                        <LanguageChip
                            lang="Filipino / Tagalog"
                            selected={settings.language === 'filipino'}
                            onClick={() => onSettingChange('language', 'filipino')}
                        />
                    </div>
                </SettingsCard>
            </div>

            <SettingsCard title="Typography" subtitle="Adjust the font size for better readability.">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400">Preview</span>
                    </div>
                    <p className={`text-slate-800 dark:text-slate-200 leading-relaxed font-medium transition-all ${settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'medium' ? 'text-base' : 'text-lg'
                        }`}>
                        The quick brown fox jumps over the lazy dog.
                    </p>
                </div>

                <div className="px-2">
                    <div className="relative h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full mb-8">
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                onSettingChange('fontSize', val === 0 ? 'small' : val === 1 ? 'medium' : 'large');
                            }}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-30"
                        />
                        <div
                            className="absolute h-full bg-indigo-500 rounded-full transition-all duration-300 z-10"
                            style={{ width: settings.fontSize === 'small' ? '0%' : settings.fontSize === 'medium' ? '50%' : '100%' }}
                        />
                        <div
                            className="absolute h-6 w-6 bg-white border-4 border-indigo-500 rounded-full shadow-lg top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none z-20"
                            style={{ left: settings.fontSize === 'small' ? '0%' : settings.fontSize === 'medium' ? '50%' : '100%', transform: 'translate(-50%, -50%)' }}
                        />

                        {/* Ticks */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 -z-0"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 -z-0"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 -z-0"></div>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Compact</span>
                        <span>Standard</span>
                        <span>Large</span>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};
