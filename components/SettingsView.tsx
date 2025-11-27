
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, UserSettings } from '../types';
import { saveUserSettings, loadUserSettings, sendNotification } from '../services/databaseService';
import { SettingsIcon, ShieldIcon, MonitorIcon, MessageSquareIcon, BellIcon, HelpIcon, UserIcon, SaveIcon, SpinnerIcon, MoonIcon, SunIcon, TypeIcon, LockIcon, BugIcon, MailIcon, XIcon, ChevronDownIcon, BookOpenIcon, FileTextIcon, PrinterIcon } from './icons';
import jsPDF from 'jspdf';

interface SettingsViewProps {
    user: firebase.User;
    role: UserRole;
    onSettingsChange?: (settings: UserSettings) => void;
    onClose: () => void;
}

type SettingsTab = 'general' | 'account' | 'ai_tutor' | 'notifications' | 'support' | 'documentation';

const SettingsView = ({ user, role, onSettingsChange, onClose }: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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
    const [isSaving, setIsSaving] = useState(false);
    
    // Profile Edit State
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const loaded = await loadUserSettings(user.uid);
            if (loaded) setSettings(loaded);
            setIsLoading(false);
        };
        init();
    }, [user.uid]);

    const handleSettingChange = (key: keyof UserSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        
        // Auto-save preference changes immediately for a snappy feel
        saveUserSettings(user.uid, newSettings); 
        
        // Notify parent for immediate theme/font application
        if (key === 'theme' || key === 'fontSize' || key === 'language') {
             if (onSettingsChange) onSettingsChange(newSettings);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            if (isEditingProfile) {
                await user.updateProfile({ displayName: displayName, photoURL: photoURL });
                setIsEditingProfile(false);
                sendNotification(user.uid, {
                    title: 'Profile Updated',
                    message: 'Your profile details have been saved.',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            if (!user.email) throw new Error("User email not found.");
            
            // Re-authenticate user to ensure security
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            
            // Update Password
            await user.updatePassword(newPassword);
            
            alert("Password updated successfully!");
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password update failed:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setPasswordError("Incorrect current password.");
            } else if (error.code === 'auth/weak-password') {
                setPasswordError("Password is too weak.");
            } else if (error.code === 'auth/too-many-requests') {
                setPasswordError("Too many attempts. Please try again later.");
            } else {
                setPasswordError(error.message || "Failed to update password.");
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDownloadManual = () => {
        const doc = new jsPDF();
        const margin = 20;
        let y = margin;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
            doc.setFontSize(fontSize);
            doc.setTextColor(color);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            
            const lines = doc.splitTextToSize(text, contentWidth);
            const lineHeight = fontSize * 0.5; 
            
            if (y + (lines.length * lineHeight) > 280) {
                doc.addPage();
                y = margin;
            }
            
            doc.text(lines, margin, y);
            y += (lines.length * lineHeight) + 5;
        };

        // Header
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("SURI-ARAL User Manual", margin, 25);
        
        y = 50;

        // Introduction
        addText("1. Introduction", 16, true, '#4338ca');
        addText("SURI-ARAL is an AI-augmented Learning Management System designed to streamline educational tasks. It combines traditional data management with advanced AI tools for analysis, planning, and personalized learning.", 11);
        y += 5;

        // AI Tools
        addText("2. AI Augmented Tools", 16, true, '#4338ca');
        
        addText("Learn SA (AI Tutor)", 12, true);
        addText("A personalized curriculum generator. Enter any topic to generate a structured 5-7 module learning path. Includes voice interaction and Socratic questioning.", 10);
        
        addText("Smart Lesson Planner", 12, true);
        addText("Generates detailed, DepEd-compliant Lesson Plans (DLP) in seconds. Supports 4As, Inductive, and Inquiry-based strategies. Exports to PDF.", 10);
        
        addText("Item Analysis AI", 12, true);
        addText("Analyzes test scores to calculate MPS (Mean Percentage Score) and identify least-mastered skills. Can generate remedial questions automatically.", 10);
        
        addText("History SA", 12, true);
        addText("Visualizes historical data using interactive timelines and comparison tables.", 10);
        
        addText("Data SA", 12, true);
        addText("A general-purpose statistical engine. Upload CSV/JSON datasets to auto-generate charts, find trends, and perform hypothesis testing.", 10);
        
        addText("Reading SA", 12, true);
        addText("Fluency coach. Records audio, analyzes pronunciation accuracy against a reference text, and calculates WPM (Words Per Minute).", 10);
        y += 5;

        // Data Management
        addText("3. Academic Management", 16, true, '#4338ca');
        addText("Student Information (SF1): Manage enrollment records. Supports recycling bin for accidental deletions.", 10);
        addText("Teacher Information: Manage faculty profiles and create user accounts for teachers.", 10);
        addText("Class Information: Organize sections, assign advisers, and manage subject loads.", 10);
        y += 5;

        // Support
        addText("4. Support", 16, true, '#4338ca');
        addText("For technical issues, navigate to Settings > Support to file a bug report or contact the administrator.", 10);

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        }

        doc.save("SURI-ARAL_User_Manual.pdf");
    };

    // --- UI Components ---

    const SidebarItem = ({ id, icon, label }: { id: SettingsTab, icon: React.ReactNode, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                activeTab === id 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            }`}
        >
            {activeTab === id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
            )}
            <div className={`transition-transform duration-300 ${activeTab === id ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'group-hover:scale-105'}`}>
                {icon}
            </div>
            <span className="tracking-wide text-sm">{label}</span>
        </button>
    );

    const SettingToggle = ({ label, subtitle, checked, onChange }: { label: string, subtitle: string, checked: boolean, onChange: (val: boolean) => void }) => (
        <div className="flex items-center justify-between py-5 group cursor-pointer" onClick={() => onChange(!checked)}>
            <div className="pr-8 flex-1">
                <h4 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
            </div>
            <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-spring ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`} />
            </div>
        </div>
    );

    const LanguageChip = ({ lang, selected, onClick }: { lang: string, selected: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                selected 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/30 transform scale-105' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
        >
            {lang}
        </button>
    );

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

                    <nav className="space-y-2 flex-1">
                        <SidebarItem id="general" icon={<MonitorIcon className="w-5 h-5" />} label="General & Appearance" />
                        <SidebarItem id="ai_tutor" icon={<MessageSquareIcon className="w-5 h-5" />} label="AI Tutor Intelligence" />
                        <SidebarItem id="account" icon={<UserIcon className="w-5 h-5" />} label="Account & Security" />
                        <SidebarItem id="notifications" icon={<BellIcon className="w-5 h-5" />} label="Notifications" />
                        <SidebarItem id="documentation" icon={<BookOpenIcon className="w-5 h-5" />} label="User Manual" />
                        <SidebarItem id="support" icon={<HelpIcon className="w-5 h-5" />} label="Support" />
                    </nav>

                    <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 px-2 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm cursor-default">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-600">
                                {photoURL ? <img src={photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-bold text-slate-500">{user.displayName?.charAt(0)}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.displayName || 'User'}</p>
                                <p className="text-[10px] text-slate-400 truncate font-medium">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 md:p-12 relative scroll-smooth custom-scrollbar bg-white/50 dark:bg-transparent">
                    {/* Mobile Nav Header (Visible only on small screens) */}
                    <div className="md:hidden mb-6 flex overflow-x-auto gap-2 pb-2 pr-10">
                        {['general', 'ai_tutor', 'account', 'notifications', 'documentation', 'support'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as SettingsTab)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                                {tab.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="max-w-2xl mx-auto">
                    
                    {/* GENERAL SETTINGS */}
                    {activeTab === 'general' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Look & Feel</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">Customize your workspace environment.</p>
                            </div>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 ml-1">Interface Theme</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'light', icon: <SunIcon className="w-6 h-6 mb-3"/>, label: 'Light' },
                                        { id: 'dark', icon: <MoonIcon className="w-6 h-6 mb-3"/>, label: 'Dark' },
                                        { id: 'system', icon: <MonitorIcon className="w-6 h-6 mb-3"/>, label: 'Auto' },
                                    ].map((themeOption) => (
                                        <button
                                            key={themeOption.id}
                                            onClick={() => handleSettingChange('theme', themeOption.id)}
                                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${
                                                settings.theme === themeOption.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-md transform -translate-y-1'
                                                : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {themeOption.icon}
                                            <span className="text-sm font-bold">{themeOption.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 ml-1">Language Preference</h3>
                                <div className="flex flex-wrap gap-3">
                                    <LanguageChip 
                                        lang="English (International)" 
                                        selected={settings.language === 'english'} 
                                        onClick={() => handleSettingChange('language', 'english')}
                                    />
                                    <LanguageChip 
                                        lang="Filipino / Tagalog" 
                                        selected={settings.language === 'filipino'} 
                                        onClick={() => handleSettingChange('language', 'filipino')}
                                    />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 ml-1">Typography</h3>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <TypeIcon className="w-5 h-5 text-slate-400" />
                                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                            {settings.fontSize === 'small' ? 'Compact' : settings.fontSize === 'medium' ? 'Standard' : 'Large'}
                                        </span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="2" 
                                            step="1"
                                            value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                handleSettingChange('fontSize', val === 0 ? 'small' : val === 1 ? 'medium' : 'large');
                                            }}
                                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div 
                                            className="absolute h-full bg-indigo-500 rounded-full transition-all duration-300"
                                            style={{ width: settings.fontSize === 'small' ? '0%' : settings.fontSize === 'medium' ? '50%' : '100%' }}
                                        />
                                        <div 
                                            className="absolute h-5 w-5 bg-white border-2 border-indigo-500 rounded-full shadow-md top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
                                            style={{ left: settings.fontSize === 'small' ? '0%' : settings.fontSize === 'medium' ? '50%' : '100%', transform: 'translate(-50%, -50%)' }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 mt-4 font-bold uppercase tracking-wide">
                                        <span>Aa Small</span>
                                        <span>Aa Standard</span>
                                        <span>Aa Large</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ACCOUNT SETTINGS */}
                    {activeTab === 'account' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Profile & Security</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">Manage your digital identity.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                                <div className="flex flex-col sm:flex-row items-start gap-8">
                                    <div className="relative group cursor-pointer mx-auto sm:mx-0">
                                        <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-600 shadow-xl transition-transform group-hover:scale-105">
                                            {photoURL ? <img src={photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-300">{user.displayName?.charAt(0)}</div>}
                                        </div>
                                        <div 
                                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                                            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="text-white text-xs font-bold uppercase tracking-wide">Change</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 w-full space-y-5">
                                        {isEditingProfile ? (
                                            <div className="space-y-5 animate-fade-in bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Display Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={displayName} 
                                                        onChange={e => setDisplayName(e.target.value)} 
                                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Photo URL</label>
                                                    <input 
                                                        type="text" 
                                                        value={photoURL} 
                                                        onChange={e => setPhotoURL(e.target.value)} 
                                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button onClick={() => setIsEditingProfile(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                                                    <button onClick={handleSaveProfile} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95">Save Changes</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="pt-2">
                                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user.displayName}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">{user.email}</p>
                                                <div className="flex flex-wrap gap-3">
                                                    <button 
                                                        onClick={() => setIsEditingProfile(true)}
                                                        className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm hover:shadow-md"
                                                    >
                                                        Edit Profile
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowPasswordModal(true)}
                                                        className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-transparent hover:border-indigo-200 text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow-sm"
                                                    >
                                                        Change Password
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI TUTOR SETTINGS */}
                    {activeTab === 'ai_tutor' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">AI Intelligence</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">Fine-tune how SURI-ARAL interacts with you.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 px-8">
                                <SettingToggle 
                                    label="Visual Learning Aids" 
                                    subtitle="Allow the AI to search the web and display relevant images to explain concepts."
                                    checked={settings.showWebImages} 
                                    onChange={(val) => handleSettingChange('showWebImages', val)} 
                                />
                                <SettingToggle 
                                    label="Learning Memory Log" 
                                    subtitle="Automatically save chat sessions to your personal activity timeline for review."
                                    checked={settings.saveHistory} 
                                    onChange={(val) => handleSettingChange('saveHistory', val)} 
                                />
                            </div>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 ml-1">Response Depth</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleSettingChange('responseStyle', 'concise')}
                                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                                            settings.responseStyle === 'concise' 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg transform -translate-y-1' 
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className={`font-bold text-lg mb-2 flex items-center gap-2 ${settings.responseStyle === 'concise' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                            <span className="text-xl">⚡</span> Concise
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                            Direct answers, short definitions, and bullet points. Best for quick reviews and fact-checking.
                                        </p>
                                    </button>
                                    <button 
                                        onClick={() => handleSettingChange('responseStyle', 'detailed')}
                                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                                            settings.responseStyle === 'detailed' 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg transform -translate-y-1' 
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className={`font-bold text-lg mb-2 flex items-center gap-2 ${settings.responseStyle === 'detailed' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                            <span className="text-xl">🧠</span> Detailed
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                            In-depth explanations, examples, and Socratic questioning to verify understanding.
                                        </p>
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Notifications</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">Stay on top of your schedule.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 px-8 py-2">
                                <SettingToggle 
                                    label="System Notifications" 
                                    subtitle="Receive in-app alerts for announcements, grades, and system updates."
                                    checked={(settings as any).pushNotifications || false} 
                                    onChange={(val) => handleSettingChange('pushNotifications', val)} 
                                />
                            </div>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 ml-1">Daily Study Routine</h3>
                                <div className="flex items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                                        <BellIcon className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">Study Reminder</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">We'll nudge you to review your material at this time.</p>
                                    </div>
                                    <input 
                                        type="time" 
                                        value={settings.studyReminderTime}
                                        onChange={(e) => handleSettingChange('studyReminderTime', e.target.value)}
                                        className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-base font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* DOCUMENTATION / USER MANUAL */}
                    {activeTab === 'documentation' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">User Manual</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-lg">Detailed guide to SURI-ARAL features.</p>
                                </div>
                                <button 
                                    onClick={handleDownloadManual}
                                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    <PrinterIcon className="w-4 h-4 mr-2" /> Download PDF
                                </button>
                            </header>

                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <h3>1. Introduction</h3>
                                <p>SURI-ARAL is an advanced educational management system integrating traditional school record-keeping with cutting-edge AI tools powered by Google Gemini. It is designed to assist teachers in analysis, planning, and student support.</p>

                                <h3>2. AI Augmented Tools</h3>
                                <div className="grid grid-cols-1 gap-6 not-prose mb-8">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Learn SA (AI Tutor)</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">A personalized learning companion. Enter any topic to generate a complete 5-7 module curriculum. Use the hands-free mode to listen to lessons.</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Smart Lesson Planner</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">Generates detailed, DepEd-compliant Lesson Plans (DLP) based on grade level, subject, and competency codes. Includes export to PDF function.</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-violet-600 dark:text-violet-400 mb-1">Item Analysis AI</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">Upload or input test scores to calculate Mean, MPS, and Difficulty Indices. The AI suggests remedial questions for least-mastered competencies.</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-teal-600 dark:text-teal-400 mb-1">Reading SA</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">Fluency and pronunciation coach. Records student audio, analyzes accuracy against text, and highlights mispronounced words.</p>
                                    </div>
                                </div>

                                <h3>3. Data Management</h3>
                                <ul className="list-disc pl-5 space-y-2 marker:text-indigo-500">
                                    <li><strong>Student Records (SF1):</strong> Manage student profiles, LRNs, and demographics. Supports recycle bin recovery for 7 days.</li>
                                    <li><strong>Class Management:</strong> Organize sections, assign subjects to teachers, and manage enrollment lists.</li>
                                    <li><strong>School Profile:</strong> (Admin Only) Configure school details, facilities, and faculty assignments.</li>
                                </ul>

                                <h3>4. Privacy & Security</h3>
                                <p>All student data processed by AI features is anonymized before transmission. Your passwords and personal data are encrypted. Use the 'Account' tab to update your credentials.</p>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT & ABOUT */}
                    {activeTab === 'support' && (
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SURI-ARAL v1.2.0</p>
                                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-2">Built with Gemini 2.5 AI</p>
                            </div>
                        </div>
                    )}
                    
                    </div>
                </main>
            </div>

            {/* PASSWORD MODAL (Overlay) */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/10 ring-1 ring-black/5">
                        <div className="p-8 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ensure your account stays secure.</p>
                                </div>
                                <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm text-slate-400 hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-6">
                                {passwordError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl text-sm font-medium flex items-start border border-red-100 dark:border-red-800/50">
                                        <span className="mr-2 text-lg">⚠️</span> {passwordError}
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Current Password</label>
                                    <input 
                                        type="password" 
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">New Password</label>
                                    <input 
                                        type="password" 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        disabled={isUpdatingPassword}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none flex justify-center items-center text-lg"
                                    >
                                        {isUpdatingPassword ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : null}
                                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
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
