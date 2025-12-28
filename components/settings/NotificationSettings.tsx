import React from 'react';
import { UserSettings } from '../../types';
import { SettingsCard, SettingToggle } from './SharedComponents';

interface NotificationSettingsProps {
    settings: UserSettings;
    onSettingChange: (key: keyof UserSettings, value: any) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onSettingChange }) => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Notifications</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Stay on top of your schedule.</p>
            </div>

            <SettingsCard title="Alerts & Reminders" subtitle="Manage how you receive updates.">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    <SettingToggle
                        label="System Notifications"
                        subtitle="Receive in-app alerts for announcements, grades, and system updates."
                        checked={(settings as any).pushNotifications || false}
                        onChange={(val) => onSettingChange('pushNotifications', val)}
                    />

                    <div className="py-6 flex items-center justify-between">
                        <div className="pr-8 flex-1">
                            <h4 className="text-base font-bold text-slate-800 dark:text-white">Daily Study Reminder</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">We'll nudge you to review your material at this time.</p>
                        </div>
                        <div>
                            <input
                                type="time"
                                value={settings.studyReminderTime}
                                onChange={(e) => onSettingChange('studyReminderTime', e.target.value)}
                                className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};
