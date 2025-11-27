
import React, { useState, useCallback, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from './services/firebase';
import { AIContext, ChatMessage, UserRole, View, UserSettings } from './types';
import { subscribeToUserRole, syncTeacherAccountLink, checkAndIncrementStreak, loadUserSettings } from './services/databaseService';
import { ItemAnalysis } from './components/ItemAnalysis';
import AiChatWindow from './components/AiChatWindow';
import SuriAralAssistant from './components/SuriAralAssistant';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import StudentRegistration from './components/StudentRegistration';
import TeacherInformation from './components/TeacherInformation';
import ClassInformation from './components/ClassInformation';
import SchoolInformation from './components/SchoolInformation';
import SubjectManager from './components/SubjectManager';
import ActivityLogView from './components/ActivityLogView';
import NotificationView from './components/NotificationView';
import SettingsView from './components/SettingsView';
import SideNav from './components/SideNav';
import Footer from './components/Footer';
import { SunIcon, MoonIcon, LogOutIcon, BrainCircuitIcon, SettingsIcon, GridIcon, CheckCircleIcon } from './components/icons';
import NotificationCenter from './components/NotificationCenter';
import { Announcements } from './components/Announcements';
import LessonPlanner from './components/LessonPlanner';
import LearnSA from './components/LearnSA';
import { StudyPlanner } from './components/StudyPlanner';
import { HistorySA } from './components/HistorySA';
import { DataSA } from './components/DataSA';
import { ReadingSA } from './components/ReadingSA';
import QuizSA from './components/QuizSA';
import { GlobalModalManager } from './components/GlobalModals';

type Theme = 'light' | 'dark';
type GlobalModalType = 'privacy' | 'terms' | 'help' | 'bug' | null;

// Sophisticated Loading Screen with Neural Network Vibe
const LoadingScreen = () => (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-500">
        <div className="relative flex flex-col items-center">
            {/* Neural Network Animation */}
            <div className="w-32 h-32 relative mb-8">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-700 opacity-50" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-700 opacity-50" />
                    
                    {/* Pulsing Nodes */}
                    <circle cx="50" cy="20" r="3" className="text-indigo-500 fill-current animate-pulse" />
                    <circle cx="80" cy="50" r="3" className="text-purple-500 fill-current animate-pulse [animation-delay:0.2s]" />
                    <circle cx="50" cy="80" r="3" className="text-cyan-500 fill-current animate-pulse [animation-delay:0.4s]" />
                    <circle cx="20" cy="50" r="3" className="text-emerald-500 fill-current animate-pulse [animation-delay:0.6s]" />
                    
                    {/* Connecting Lines */}
                    <path d="M50 20 L80 50 L50 80 L20 50 Z" fill="none" stroke="url(#gradient)" strokeWidth="1" className="opacity-60 animate-[spin_10s_linear_infinite] origin-center" />
                    
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                </svg>
                
                {/* Central Logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuitIcon className="w-8 h-8 text-slate-800 dark:text-white" />
                </div>
            </div>

            <h1 className="text-3xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                SURI-ARAL
            </h1>
            <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce"></div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                    Initializing Neural Core...
                </p>
                <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            </div>
        </div>
    </div>
);

// Sophisticated Logout Screen
const LogoutScreen = () => (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-700 animate-fade-in">
        <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 relative mb-8 flex items-center justify-center">
                {/* Shrinking Ring */}
                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <div className="absolute inset-2 border-2 border-purple-500/50 rounded-full"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-indigo-500/50 animate-pulse">
                    <CheckCircleIcon className="w-8 h-8 text-indigo-400" />
                </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">
                See you soon
            </h2>
            
            <div className="flex flex-col items-center gap-2 text-indigo-300/80">
                <p className="text-xs font-mono tracking-widest uppercase animate-pulse">
                    Securely closing session...
                </p>
            </div>
        </div>
        
        <div className="absolute bottom-10 text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">
            Suri-Aral AI Suite
        </div>
    </div>
);

const App = () => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false); // New state for logout sequence
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatMinimized, setIsChatMinimized] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);
    const [aiContext, setAiContext] = useState<AIContext | null>(null);
    
    // Context for Learn SA Deep Linking
    const [learnSaTopic, setLearnSaTopic] = useState<string>('');
    
    // Separate chat states for AI insights
    const [insightsMessages, setInsightsMessages] = useState<ChatMessage[]>([]);

    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    
    // Global Modal State
    const [activeModal, setActiveModal] = useState<GlobalModalType>(null);

    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        // Default to 'dark' if no preference is saved
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
                // If we were logging out, and we see a user, it might be a re-auth or initial load.
                // Ensure we clear the logout state if we are successfully logged in.
                if (!isLoggingOut) setLoadingAuth(true);
                
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

                syncTeacherAccountLink(currentUser).catch(err => console.error("Sync error:", err));
                
                checkAndIncrementStreak(currentUser.uid).then(result => {
                    if (result.message) console.log(result.message);
                });

                roleUnsubscribe = subscribeToUserRole(currentUser.uid, (role) => {
                    setUserRole(role);
                    setTimeout(() => setLoadingAuth(false), 1500);
                });
            } else {
                // User is null (logged out or not logged in)
                setUser(null);
                setUserRole(null);
                setLoadingAuth(false);
                // Ensure logout screen persists for a moment if it was triggered manually
            }
        });

        return () => {
            unsubscribe();
            if (roleUnsubscribe) roleUnsubscribe();
        };
    }, [isLoggingOut]);

    const handleLogout = () => {
        setIsLoggingOut(true);
        // Artificial delay to show the beautiful logout screen
        setTimeout(() => {
            auth.signOut()
                .then(() => {
                    setIsLoggingOut(false);
                    // Reset key states
                    setActiveView('dashboard');
                    setAiContext(null);
                    setInsightsMessages([]);
                })
                .catch(error => {
                    console.error("Logout Error:", error);
                    setIsLoggingOut(false);
                });
        }, 2000); // 2 seconds delay
    };

    const handleStartAnalysis = useCallback((context: AIContext) => {
        setAiContext(context);
        setInsightsMessages([]); // Start fresh insights session
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

    const handleLaunchTutor = (topic: string) => {
        setLearnSaTopic(topic);
        setActiveView('learnSA');
    };

    const renderActiveView = () => {
        if (userRole === 'teacher' && ['schoolInformation', 'teacherInformation', 'subjectManagement', 'activityLog'].includes(activeView)) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800 max-w-md">
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Access Restricted</h2>
                        <p className="text-slate-600 dark:text-slate-300 text-sm">You do not have permission to view this administrative module.</p>
                    </div>
                </div>
            );
        }

        switch(activeView) {
            case 'dashboard': return <Dashboard user={user!} role={userRole!} setActiveView={setActiveView as any} onLaunchTutor={handleLaunchTutor} />;
            case 'studentRegistration': return <StudentRegistration user={user!} />;
            case 'teacherInformation': return <TeacherInformation user={user!} />;
            case 'classInformation': return <ClassInformation user={user!} />;
            case 'schoolInformation': return <SchoolInformation user={user!} />;
            case 'subjectManagement': return <SubjectManager user={user!} />;
            // These are now handled in full-screen mode block, but kept here as fallback logic
            case 'itemAnalysis': return <ItemAnalysis user={user!} onStartAnalysis={handleStartAnalysis} chatMessages={insightsMessages} />;
            case 'lessonPlanner': return <LessonPlanner user={user!} />;
            case 'learnSA': return <LearnSA user={user!} initialTopic={learnSaTopic} />;
            case 'dataSA': return <DataSA user={user!} onStartAnalysis={handleStartAnalysis} />;
            case 'historySA': return <HistorySA user={user!} />;
            case 'quizSA': return <QuizSA user={user!} />;
            
            case 'announcements': return <Announcements user={user!} role={userRole!} />;
            case 'activityLog': return <ActivityLogView user={user!} role={userRole!} />;
            case 'notifications': return <NotificationView user={user!} onNavigate={setActiveView as any} />;
            case 'readingSA': return <ReadingSA user={user!} />;
            case 'studyPlanner': return <StudyPlanner userId={user!.uid} onClose={() => setActiveView('dashboard')} isStandalone={true} onLaunchTutor={handleLaunchTutor} />;
            case 'settings': return <SettingsView user={user!} role={userRole!} onSettingsChange={handleSettingsChange} onClose={() => setActiveView('dashboard')} />;
            default: return <Dashboard user={user!} role={userRole!} setActiveView={setActiveView as any} onLaunchTutor={handleLaunchTutor} />;
        }
    };

    if (isLoggingOut) return <LogoutScreen />;
    if (loadingAuth) return <LoadingScreen />;
    if (!user) return <LoginPage />;

    // Full screen modes (Learn SA, Data SA, Item Analysis, Lesson Planner, History SA, Reading SA, Study Planner, Quiz SA) - Remove SideNav
    if (activeView === 'learnSA' || activeView === 'dataSA' || activeView === 'itemAnalysis' || activeView === 'lessonPlanner' || activeView === 'historySA' || activeView === 'readingSA' || activeView === 'studyPlanner' || activeView === 'quizSA') {
        return (
            <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 animate-fade-in overflow-y-auto custom-scrollbar relative">
                <button 
                    onClick={() => setActiveView('dashboard')}
                    className="fixed top-4 right-4 z-50 p-2 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-md backdrop-blur-sm hover:scale-105 transition-all border border-slate-200 dark:border-slate-700 group"
                    title="Return to Dashboard"
                >
                    <GridIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:rotate-90 transition-transform" />
                </button>
                
                {activeView === 'learnSA' && (
                    <LearnSA user={user} initialTopic={learnSaTopic} />
                )}

                {activeView === 'dataSA' && (
                    <div className="min-h-screen">
                        <DataSA user={user} onStartAnalysis={handleStartAnalysis} />
                    </div>
                )}

                {activeView === 'itemAnalysis' && (
                    <div className="min-h-screen">
                        <ItemAnalysis user={user} onStartAnalysis={handleStartAnalysis} chatMessages={insightsMessages} />
                    </div>
                )}

                {activeView === 'lessonPlanner' && (
                    <div className="min-h-screen">
                        <LessonPlanner user={user} />
                    </div>
                )}

                {activeView === 'historySA' && (
                    <div className="min-h-screen">
                        <HistorySA user={user} />
                    </div>
                )}

                {activeView === 'readingSA' && (
                    <div className="min-h-screen">
                        <ReadingSA user={user} />
                    </div>
                )}

                {activeView === 'studyPlanner' && (
                    <div className="min-h-screen">
                        <StudyPlanner userId={user.uid} onClose={() => setActiveView('dashboard')} isStandalone={true} onLaunchTutor={handleLaunchTutor} />
                    </div>
                )}

                {activeView === 'quizSA' && (
                    <div className="min-h-screen">
                        <QuizSA user={user} />
                    </div>
                )}
                
                {/* Overlays for Data SA & Item Analysis (Chat) */}
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
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300 selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-white">
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

            {/* Global Modals Overlay */}
            <GlobalModalManager activeModal={activeModal} onClose={() => setActiveModal(null)} />

            {/* Sidebar Navigation */}
            <SideNav activeView={activeView} setActiveView={setActiveView} role={userRole!} />
            
            {/* Main Content Column */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50/50 dark:bg-slate-900/50">
                
                {/* Glassmorphism Header */}
                <header className="h-16 sticky top-0 z-40 flex justify-between items-center px-6 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
                                <BrainCircuitIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
                                SURI-ARAL
                            </span>
                         </div>
                         {userRole && (
                             <span className={`hidden md:inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                                 userRole === 'admin' 
                                 ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' 
                                 : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                             }`}>
                                 {userRole}
                             </span>
                         )}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
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
                                className={`p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${activeView === 'settings' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                title="Settings"
                            >
                                <SettingsIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                                title="Logout"
                            >
                                <LogOutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>
                
                {/* Scrollable Main Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                    <div className="min-h-full flex flex-col max-w-7xl mx-auto w-full">
                        {/* Page Content with Transition */}
                        <div className="flex-1 p-4 md:p-8 animate-slide-up" key={activeView}>
                            {renderActiveView()}
                        </div>
                        
                        <Footer onOpenModal={setActiveModal} />
                    </div>
                </main>
            </div>
            
            {/* Overlays */}
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
        </div>
    );
};

export default App;
