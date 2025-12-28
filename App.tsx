
import React, { useState, useCallback, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from './services/firebase';
import { AIContext, ChatMessage, UserRole, View, UserSettings, LearnSAContext } from './types';
import { subscribeToUserStatus, syncTeacherAccountLink, checkAndIncrementStreak, loadUserSettings, ensureTeacherRecord } from './services/databaseService';
import LoginPage from './components/LoginPage';
import SideNav from './components/SideNav';
import Footer from './components/Footer';
import { SunIcon, MoonIcon, BrainCircuitIcon, SettingsIcon, GridIcon, MenuIcon, PlusIcon } from './components/icons';
import { JoinClassModal } from './components/class-management/JoinClassModal';
import { loadClasses } from './services/databaseService';
import NotificationCenter from './components/NotificationCenter';
import { LearnSA } from './components/LearnSA';
import { StudyPlanner } from './components/StudyPlanner';
import { HistorySA } from './components/HistorySA';
import { DataSA } from './components/DataSA';
import { ReadingSA } from './components/ReadingSA';
import { QuizSA } from './components/QuizSA';
import { ItemAnalysis } from './components/ItemAnalysis';
import LessonPlanner from './components/LessonPlanner';
import { QuestionBankManager } from './components/question-bank/QuestionBankManager';
import { TOSManager } from './components/tos/TOSManager';
import { GlobalModalManager } from './components/GlobalModals';
import SuriAralAssistant from './components/SuriAralAssistant';
import AiChatWindow from './components/AiChatWindow';
import { MobileNav } from './components/MobileNav';
import { LoadingScreen, LogoutScreen } from './components/ui/Loaders';
import { ViewManager } from './components/ViewManager';

type Theme = 'light' | 'dark';
type GlobalModalType = 'privacy' | 'terms' | 'help' | 'bug' | null;

import { UserContext } from './contexts/UserContext';
import { UserProfile } from './types/core';

export const App = () => {
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // New State
    const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isLoggingOutRef = React.useRef(false); // Ref to track logout state without re-triggering effect
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatMinimized, setIsChatMinimized] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);
    const [aiContext, setAiContext] = useState<AIContext | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [learnSaContext, setLearnSaContext] = useState<LearnSAContext | null>(null);

    const [lessonPlanContext, setLessonPlanContext] = useState<{ topic: string, learningArea: string, gradeLevel: string, competency: string } | null>(null);

    const [insightsMessages, setInsightsMessages] = useState<ChatMessage[]>([]);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [activeModal, setActiveModal] = useState<GlobalModalType>(null);
    const [isJoinClassModalOpen, setIsJoinClassModalOpen] = useState(false); // Global Join Class Modal

    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        return savedTheme || 'dark';
    });

    const applyTheme = (newTheme: Theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
        localStorage.setItem('theme', newTheme);
        setTheme(newTheme);
    };

    const applyFontScale = (size: 'small' | 'medium' | 'large') => {
        const root = window.document.documentElement;
        root.classList.remove('text-sm', 'text-base', 'text-lg');
        if (size === 'small') root.classList.add('text-sm');
        if (size === 'medium') root.classList.add('text-base');
        if (size === 'large') root.classList.add('text-lg');
    };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        let roleUnsubscribe: (() => void) | undefined;

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (roleUnsubscribe) {
                roleUnsubscribe();
                roleUnsubscribe = undefined;
            }

            if (currentUser) {
                // Check ref instead of state to avoid dependency cycle
                if (!isLoggingOutRef.current) setLoadingAuth(true);

                // Verify token validity to catch "auth/invalid-credential" early
                try {
                    await currentUser.getIdToken(true);
                } catch (e) {
                    console.warn("Session invalid, signing out:", e);
                    await auth.signOut();
                    setUser(null);
                    setLoadingAuth(false);
                    return;
                }

                setUser(currentUser);

                try {
                    const settings = await loadUserSettings(currentUser.uid);
                    setUserSettings(settings);

                    if (settings.theme === 'system') {
                        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        applyTheme(sysDark ? 'dark' : 'light');
                    } else {
                        applyTheme(settings.theme);
                    }
                    applyFontScale(settings.fontSize);
                } catch (e) {
                    console.error("Failed to load settings", e);
                }

                // Execute background syncs safely
                syncTeacherAccountLink(currentUser).catch(err => console.warn("Background teacher sync failed (harmless if not teacher):", err));

                // Start a timeout to ensure we don't get stuck loading forever if the profile is missing/slow
                const loadingTimeout = setTimeout(() => {
                    console.warn("Role loading timed out - forcing render");
                    setLoadingAuth(false);
                }, 5000);

                roleUnsubscribe = subscribeToUserStatus(currentUser.uid, (profile) => {
                    clearTimeout(loadingTimeout); // Clear timeout if we get data
                    if (profile) {
                        if (profile.disabled) {
                            console.warn("Account is disabled. Logging out.");
                            auth.signOut().then(() => {
                                alert("❌ ACCOUNT DISABLED\n\nYour account has been disabled by an administrator.\nPlease contact support for assistance.");
                                setUser(null);
                                setUserRole(null);
                                setUserProfile(null);
                            });
                            return;
                        }
                        setUserRole(profile.role);
                        setUserProfile(profile);

                        // Self-Healing & Record Assurance for Teachers/Admins
                        if (profile.role === 'teacher' || profile.role === 'admin') {
                            ensureTeacherRecord(currentUser, profile.role);
                        }

                    } else {
                        // Profile missing or failed to load
                        console.warn("User profile not found or empty");
                        setUserRole(null);
                        setUserProfile(null);
                    }
                    // Small delay to smooth out the transition
                    setTimeout(() => setLoadingAuth(false), 500);
                });
            } else {
                setUser(null);
                setUserRole(null);
                setUserProfile(null);
                setLoadingAuth(false);
            }
        });

        return () => {
            unsubscribe();
            if (roleUnsubscribe) roleUnsubscribe();
        };
    }, []); // Removed isLoggingOut dependency

    const handleLogout = async () => {
        isLoggingOutRef.current = true;
        setIsLoggingOut(true);
        // Short delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            await auth.signOut();
            // State will be cleared by onAuthStateChanged, but we force it here too for responsiveness
            setUser(null);
            setUserRole(null);
            setUserProfile(null);
            setAiContext(null);
            setInsightsMessages([]);
            setActiveView('dashboard'); // Reset view for next login
        } catch (error) {
            console.error("Logout Error:", error);
            // Force reload if signOut fails to ensure clean state
            window.location.reload();
        } finally {
            setIsLoggingOut(false);
            isLoggingOutRef.current = false;
        }
    };

    const handleStartAnalysis = useCallback((context: AIContext) => {
        setAiContext(context);
        setInsightsMessages([]);
        setIsChatOpen(true);
        setIsChatMinimized(false);
        setIsChatMaximized(false);
    }, []);

    const handleCloseChat = () => {
        setIsChatOpen(false);
        setIsChatMinimized(false);
        setIsChatMaximized(false);
    };

    const handleToggleChatMinimize = () => {
        const nextMinimized = !isChatMinimized;
        setIsChatMinimized(nextMinimized);
        if (nextMinimized) setIsChatMaximized(false);
    };

    const handleToggleChatMaximize = () => {
        const nextMaximized = !isChatMaximized;
        setIsChatMaximized(nextMaximized);
        if (nextMaximized) setIsChatMinimized(false);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    const handleSettingsChange = (newSettings: UserSettings) => {
        setUserSettings(newSettings);
        if (newSettings.theme === 'system') {
            const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(sysDark ? 'dark' : 'light');
        } else {
            applyTheme(newSettings.theme);
        }
        applyFontScale(newSettings.fontSize);
    };

    const handleLaunchTutor = (context: LearnSAContext) => {
        setLearnSaContext(context);
        setActiveView('learnSA');
    };

    const handleGenerateLessonPlan = (data: any) => {
        setLessonPlanContext(data);
        setActiveView('lessonPlanner');
    };

    if (isLoggingOut) return <LogoutScreen />;
    if (loadingAuth) return <LoadingScreen />;
    if (!user) return <LoginPage />;

    const commonProps = {
        user,
        role: userRole,
    };

    return (
        <UserContext.Provider value={{ user, role: userRole, userProfile, loading: loadingAuth }}>
            {(['learnSA', 'dataSA', 'itemAnalysis', 'lessonPlanner', 'historySA', 'readingSA', 'studyPlanner', 'quizSA', 'questionBank', 'tos'].includes(activeView)) ? (
                <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 animate-fade-in overflow-y-auto custom-scrollbar relative pt-safe pb-16 md:pb-0">
                    <button
                        onClick={() => setActiveView('dashboard')}
                        className="fixed top-4 right-4 z-50 p-2 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-md backdrop-blur-sm hover:scale-105 transition-all border border-slate-200 dark:border-slate-700 group mt-safe"
                        title="Return to Dashboard"
                    >
                        <GridIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:rotate-90 transition-transform" />
                    </button>

                    {activeView === 'learnSA' && <LearnSA user={user} initialContext={learnSaContext} />}
                    {activeView === 'dataSA' && <div className="min-h-screen"><DataSA user={user} onStartAnalysis={handleStartAnalysis} /></div>}
                    {activeView === 'itemAnalysis' && <div className="min-h-screen"><ItemAnalysis user={user} onStartAnalysis={handleStartAnalysis} chatMessages={insightsMessages} onGenerateLessonPlan={handleGenerateLessonPlan} /></div>}
                    {activeView === 'lessonPlanner' && <div className="min-h-screen"><LessonPlanner user={user} initialContext={lessonPlanContext} /></div>}
                    {activeView === 'historySA' && <div className="min-h-screen"><HistorySA user={user} /></div>}
                    {activeView === 'readingSA' && <div className="min-h-screen"><ReadingSA user={user} /></div>}
                    {activeView === 'studyPlanner' && <div className="min-h-screen"><StudyPlanner userId={user.uid} onClose={() => setActiveView('dashboard')} isStandalone={true} onLaunchTutor={(topic) => handleLaunchTutor({ topic, contextData: `General Topic: ${topic}` })} /></div>}
                    {activeView === 'quizSA' && <div className="min-h-screen"><QuizSA user={user} /></div>}
                    {activeView === 'questionBank' && <div className="min-h-screen"><QuestionBankManager user={user} /></div>}
                    {activeView === 'tos' && <div className="min-h-screen"><TOSManager user={user} /></div>}

                    {(activeView === 'dataSA' || activeView === 'itemAnalysis') && isChatOpen && aiContext && (
                        <AiChatWindow
                            context={aiContext}
                            onClose={handleCloseChat}
                            messages={insightsMessages}
                            setMessages={setInsightsMessages}
                            isMinimized={isChatMinimized}
                            onToggleMinimize={handleToggleChatMinimize}
                            isMaximized={isChatMaximized}
                            onToggleMaximize={handleToggleChatMaximize}
                        />
                    )}
                    <SuriAralAssistant isInsightsOpen={isChatOpen && !isChatMinimized} />

                    <MobileNav activeView={activeView} setActiveView={setActiveView} onToggleMenu={() => setIsMobileMenuOpen(true)} />
                    <SideNav activeView={activeView} setActiveView={setActiveView} role={userRole!} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} hiddenOnDesktop={true} user={user} userProfile={userProfile} />

                </div>
            ) : (
                <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300 selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-white pt-safe pb-safe">
                    <style>{`
                        @keyframes slide-up-fade {
                            0% { opacity: 0; transform: translateY(10px); }
                            100% { opacity: 1; transform: translateY(0); }
                        }
                        .animate-slide-up { animation: slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                        @keyframes scale-up {
                            0% { opacity: 0; transform: scale(0.95); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                        .animate-scale-up { animation: scale-up 0.3s ease-out forwards; }
                    `}</style>

                    <GlobalModalManager activeModal={activeModal} onClose={() => setActiveModal(null)} />

                    {/* SideNav rendered conditionally or with null role, handled inside but we ensure role is loaded before rendering ViewManager fully */}
                    {userRole && (
                        <SideNav activeView={activeView} setActiveView={setActiveView} role={userRole} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} user={user} userProfile={userProfile} />
                    )}

                    <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50/50 dark:bg-slate-900/50 h-screen overflow-hidden">
                        <header className="h-16 flex-shrink-0 flex justify-between items-center px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-colors z-20">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <MenuIcon className="w-6 h-6" />
                                </button>

                                <div className="flex items-center gap-2">
                                    <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
                                        <BrainCircuitIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 hidden sm:block">
                                        SURI-ARAL
                                    </span>
                                </div>
                                {userRole && (
                                    <span className={`hidden md:inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${userRole === 'admin'
                                        ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                        : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                        }`}>
                                        {userRole}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 md:gap-4">
                                {userRole === 'student' && (
                                    <button
                                        onClick={() => setIsJoinClassModalOpen(true)}
                                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                                        title="Join Class"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                )}

                                <NotificationCenter user={user} onNavigate={setActiveView} />

                                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleTheme}
                                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Toggle Theme"
                                    >
                                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => setActiveView('settings')}
                                        className={`hidden md:block p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${activeView === 'settings' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                        title="Settings"
                                    >
                                        <SettingsIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                            <div className="min-h-full flex flex-col max-w-7xl mx-auto w-full">
                                <div className="flex-1 p-4 md:p-8 animate-slide-up" key={activeView}>
                                    <ViewManager
                                        user={user}
                                        role={userRole}
                                        userProfile={userProfile}
                                        activeView={activeView}
                                        setActiveView={setActiveView}
                                        onLaunchTutor={handleLaunchTutor}
                                        onStartAnalysis={handleStartAnalysis}
                                        insightsMessages={insightsMessages}
                                        onSettingsChange={handleSettingsChange}
                                        learnSaContext={learnSaContext}
                                        lessonPlanContext={lessonPlanContext}
                                        onLogout={handleLogout}
                                        onGenerateLessonPlan={handleGenerateLessonPlan}
                                    />
                                </div>

                                <Footer onOpenModal={setActiveModal} />
                            </div>
                        </main>
                    </div>

                    {isChatOpen && aiContext && (
                        <AiChatWindow
                            context={aiContext}
                            onClose={handleCloseChat}
                            messages={insightsMessages}
                            setMessages={setInsightsMessages}
                            isMinimized={isChatMinimized}
                            onToggleMinimize={handleToggleChatMinimize}
                            isMaximized={isChatMaximized}
                            onToggleMaximize={handleToggleChatMaximize}
                        />
                    )}
                    <SuriAralAssistant isInsightsOpen={isChatOpen && !isChatMinimized} />

                    <MobileNav activeView={activeView} setActiveView={setActiveView} onToggleMenu={() => setIsMobileMenuOpen(true)} />

                    {/* Global Join Class Modal */}
                    {isJoinClassModalOpen && (
                        <JoinClassModal
                            userId={user.uid}
                            onClose={() => setIsJoinClassModalOpen(false)}
                            onSuccess={(msg) => {
                                alert(msg);
                                // We can trigger a refresh if needed, but ViewManager usually handles its own data loading.
                                // For simple UX, alert is enough, and navigating to 'classes' (which is technically ClassInformation view if we have it?)
                                // Active View 'classInfo' handles reloading on mount.
                            }}
                        />
                    )}
                </div>
            )}
        </UserContext.Provider>
    );
};
