import React from 'react';
import { UserSettings } from '../../types';
import { SettingsCard, SettingToggle } from './SharedComponents';

interface AISettingsProps {
    settings: UserSettings;
    onSettingChange: (key: keyof UserSettings, value: any) => void;
}

const AVAILABLE_MODELS = [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemma-3-12b-it', label: 'Gemma 3 12B IT' },
    { value: 'gemma-3-27b-it', label: 'Gemma 3 27B IT' },
    { value: 'gemma-3-1b-it', label: 'Gemma 3 1B IT' },
    { value: 'gemini-robotics-er-1.5-preview', label: 'Gemini Robotics ER 1.5 (Preview)' },
    { value: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash Native Audio (Preview)' },
];

export const AISettings: React.FC<AISettingsProps> = ({ settings, onSettingChange }) => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">AI Intelligence</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Fine-tune how SURI-ARAL interacts with you.</p>
            </div>

            <SettingsCard title="Core Model" subtitle="Select the underlying AI model for text generation and reasoning.">
                <div className="p-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Active Model
                    </label>
                    <div className="relative">
                        <select
                            value={settings.aiModel || 'gemini-2.5-flash'}
                            onChange={(e) => onSettingChange('aiModel', e.target.value)}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                        >
                            {AVAILABLE_MODELS.map(model => (
                                <option key={model.value} value={model.value}>
                                    {model.label}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Note: Some models may maintain separate rate limits or availability. "Flash" models are recommended for speed.
                    </p>
                </div>
            </SettingsCard>

            <SettingsCard title="Capabilities" subtitle="Control what the AI is allowed to do.">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    <SettingToggle
                        label="Visual Learning Aids"
                        subtitle="Allow the AI to search the web and display relevant images to explain concepts."
                        checked={settings.showWebImages}
                        onChange={(val) => onSettingChange('showWebImages', val)}
                    />
                    <SettingToggle
                        label="Learning Memory Log"
                        subtitle="Automatically save chat sessions to your personal activity timeline for review."
                        checked={settings.saveHistory}
                        onChange={(val) => onSettingChange('saveHistory', val)}
                    />
                </div>
            </SettingsCard>

            <SettingsCard title="Response Depth" subtitle="Choose how detailed you want answers to be.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSettingChange('responseStyle', 'concise')}
                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${settings.responseStyle === 'concise'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg transform -translate-y-1 ring-1 ring-indigo-600/20'
                            : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 hover:border-indigo-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                    >
                        <div className={`font-bold text-lg mb-2 flex items-center gap-2 ${settings.responseStyle === 'concise' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            <span className="text-xl">⚡</span> Concise
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            Direct answers, short definitions, and bullet points. Best for quick reviews and fact-checking.
                        </p>
                    </button>
                    <button
                        onClick={() => onSettingChange('responseStyle', 'detailed')}
                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${settings.responseStyle === 'detailed'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg transform -translate-y-1 ring-1 ring-indigo-600/20'
                            : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 hover:border-indigo-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                    >
                        <div className={`font-bold text-lg mb-2 flex items-center gap-2 ${settings.responseStyle === 'detailed' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            <span className="text-xl">🧠</span> Detailed
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            In-depth explanations, examples, and Socratic questioning to verify understanding.
                        </p>
                    </button>
                </div>
            </SettingsCard>
        </div>
    );
};
