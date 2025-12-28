import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, UserSettings, Teacher, SettingsTab } from '../types';
import { saveUserSettings, loadUserSettings, loadTeachers, ensureTeacherRecord } from '../services/databaseService';
import { SettingsIcon, MonitorIcon, MessageSquareIcon, BellIcon, HelpIcon, UserIcon, SpinnerIcon, XIcon, LogOutIcon, BookOpenIcon, SchoolIcon } from './icons';
import { SidebarItem } from './settings/SharedComponents';
import { GeneralSettings } from './settings/GeneralSettings';
import { AISettings } from './settings/AISettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { HelpSettings } from './settings/HelpSettings';
import { SupportSettings } from './settings/SupportSettings';
import { ProfileSettings } from './settings/ProfileSettings';



interface SettingsViewProps {
    user: firebase.User;
    role: UserRole;
    onSettingsChange?: (settings: UserSettings) => void;
    onClose: () => void;
    onLogout: () => void;

    initialTab?: SettingsTab;
}

const SettingsView = ({ user, role, onSettingsChange, onClose, onLogout, initialTab = 'general' }: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [settings, setSettings] = useState<UserSettings>({
        theme: 'dark',
        fontSize: 'medium',
        language: 'english',
        showWebImages: true,
        saveHistory: true,
        responseStyle: 'detailed',
        studyReminderTime: '20:00',
        pushNotifications: true
    } as any);

    const [isLoading, setIsLoading] = useState(true);
    // teacherProfile State (Maintained here for Sidebar sync)
    const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);

    // Initial Load & Self-Healing
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                // Load user settings
                const loadedSettings = await loadUserSettings(user.uid);
                if (loadedSettings) setSettings(loadedSettings);

                // Load teacher profile
                const teachers = await loadTeachers(user.uid);
                let myRecord = teachers.find(t => t.linkedAccountId === user.uid || t.email === user.email);

                // SELF-HEALING: If no record exists for this User/Admin, create one automatically.
                if (!myRecord && (role === 'admin' || role === 'teacher')) {
                    await ensureTeacherRecord(user, role);
                    // Reload to get the new record
                    const updatedTeachers = await loadTeachers(user.uid);
                    myRecord = updatedTeachers.find(t => t.linkedAccountId === user.uid || t.email === user.email);
                }

                if (myRecord) {
                    setTeacherProfile(myRecord);
                }
            } catch (error) {
                console.error("Failed to load profile settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [user, role]);

    const handleSettingChange = (key: keyof UserSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        // Auto-save preference changes immediately for a snappy feel
        saveUserSettings(user.uid, newSettings);

        // Persist AI Model specifically to LocalStorage for non-React services
        if (key === 'aiModel') {
            localStorage.setItem('suri_ai_model', value);
        }

        // Notify parent for immediate theme/font application
        if (key === 'theme' || key === 'fontSize' || key === 'language') {
            if (onSettingsChange) onSettingsChange(newSettings);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="flex items-center justify-center p-4 md:p-8 h-full overflow-hidden">
            {/* Floating Hub Container */}
            <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-700/50 flex overflow-hidden ring-1 ring-black/5 dark:ring-white/5">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all backdrop-blur-sm group shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700"
                    title="Close Settings"
                >
                    <XIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>

                {/* Sidebar Navigation */}
                <aside className="w-72 bg-slate-50/80 dark:bg-slate-950/50 border-r border-slate-200/60 dark:border-slate-800 flex flex-col p-6 backdrop-blur-md hidden md:flex">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <SettingsIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-slate-800 dark:text-white leading-none text-lg tracking-tight">Settings</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Control Center</p>
                        </div>
                    </div>

                    <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                        <SidebarItem id="general" icon={<MonitorIcon className="w-5 h-5" />} label="General & Appearance" isActive={activeTab === 'general'} onClick={setActiveTab} />
                        <SidebarItem id="ai_tutor" icon={<MessageSquareIcon className="w-5 h-5" />} label="AI Tutor Intelligence" isActive={activeTab === 'ai_tutor'} onClick={setActiveTab} />
                        <SidebarItem id="account" icon={<UserIcon className="w-5 h-5" />} label="Account & Security" isActive={activeTab === 'account'} onClick={setActiveTab} />
                        <SidebarItem id="notifications" icon={<BellIcon className="w-5 h-5" />} label="Notifications" isActive={activeTab === 'notifications'} onClick={setActiveTab} />
                        <SidebarItem id="documentation" icon={<BookOpenIcon className="w-5 h-5" />} label="User Manual" isActive={activeTab === 'documentation'} onClick={setActiveTab} />
                        <SidebarItem id="support" icon={<HelpIcon className="w-5 h-5" />} label="Support" isActive={activeTab === 'support'} onClick={setActiveTab} />

                    </nav>

                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800 space-y-3">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <LogOutIcon className="w-5 h-5" />
                            </div>
                            <span>Sign Out</span>
                        </button>

                        <div className="flex items-center gap-3 px-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-default">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-600 flex-shrink-0">
                                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-bold text-slate-500 text-xs">{user.displayName?.charAt(0)}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{teacherProfile?.firstName || user.displayName || 'User'}</p>
                                <p className="text-[9px] text-slate-400 truncate font-medium">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 md:p-12 relative scroll-smooth custom-scrollbar bg-white/50 dark:bg-transparent">
                    {/* Mobile Nav Header (Visible only on small screens) */}
                    <div className="md:hidden mb-6">
                        <div className="flex overflow-x-auto gap-2 pb-2 mb-4 custom-scrollbar">
                            {['general', 'ai_tutor', 'account', 'notifications', 'documentation', 'support'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as SettingsTab)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                >
                                    {tab.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-100 dark:border-red-800 mb-6"
                        >
                            <LogOutIcon className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>

                    <div className="max-w-2xl mx-auto pb-20">
                        {activeTab === 'general' && <GeneralSettings settings={settings} onSettingChange={handleSettingChange} />}
                        {activeTab === 'account' && <ProfileSettings user={user} role={role} teacherProfile={teacherProfile} onUpdateProfile={(data) => setTeacherProfile(data)} onLogout={onLogout} />}
                        {activeTab === 'ai_tutor' && <AISettings settings={settings} onSettingChange={handleSettingChange} />}
                        {activeTab === 'notifications' && <NotificationSettings settings={settings} onSettingChange={handleSettingChange} />}
                        {activeTab === 'documentation' && <HelpSettings />}
                        {activeTab === 'support' && <SupportSettings />}
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(75, 85, 99, 0.5); }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>
        </div>
    );
};

export default SettingsView;