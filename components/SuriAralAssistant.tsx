
import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, XIcon, UserIcon, MinusIcon, SquareIcon, MaximizeIcon, RestoreIcon, SparklesIcon, SendIcon, ChevronDownIcon, MessageSquareIcon } from './icons';
import { ChatMessage, AssistantContext } from '../types';
import { getInitialAssistantMessage, continueAssistantChat, initAssistantChat } from '../services/geminiService';
import { loadSchools, loadTeachers, loadClasses, loadSubjects, loadStudents_SF1 } from '../services/databaseService';
import { auth } from '../services/firebase';

interface SuriAralAssistantProps {
    isInsightsOpen: boolean;
}

// Helper to parse highlighted text (security safe)
const parseHighlightedText = (text: string): string => {
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const styledText = escapedText
        .replace(/&lt;highlight&gt;(.*?)&lt;\/highlight&gt;/g, '<strong class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md mx-0.5 border border-indigo-100 dark:border-indigo-800">$1</strong>')
        // Convert bullet points to nice list items
        .replace(/^\s*[\-\*]\s+(.*)$/gm, '<li class="flex items-start gap-2 mb-1"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span><span>$1</span></li>');
    
    return styledText;
};

const SuriAralAssistant = ({ isInsightsOpen }: SuriAralAssistantProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load Context Data on Mount (Privacy-First Aggregation)
    useEffect(() => {
        const initContext = async () => {
            if (!auth.currentUser) return;
            try {
                const [schools, teachers, students, classes, subjects] = await Promise.all([
                    loadSchools(auth.currentUser.uid),
                    loadTeachers(auth.currentUser.uid),
                    loadStudents_SF1(auth.currentUser.uid),
                    loadClasses(auth.currentUser.uid),
                    loadSubjects()
                ]);

                // PRIVACY RULE: We only calculate counts. We DO NOT pass names.
                const activeSchool = schools.find(s => !s.deletedAt) || schools[0];
                const context: AssistantContext = {
                    schoolName: activeSchool?.schoolName || "SURI-ARAL School",
                    location: activeSchool?.location?.address || "Philippines",
                    schoolYear: activeSchool?.schoolYear || "Current",
                    totalStudents: students.filter(s => !s.deletedAt).length,
                    totalTeachers: teachers.filter(t => !t.deletedAt).length,
                    activeClasses: classes.filter(c => !c.deletedAt).length,
                    totalSubjects: subjects.filter(s => !s.deletedAt).length
                };

                await initAssistantChat(context);
            } catch (e) {
                console.error("Failed to init assistant context", e);
            }
        };
        initContext();
    }, []);

    const getInitialMessage = async () => {
        setIsLoading(true);
        try {
            const { response, suggestedQuestions } = await getInitialAssistantMessage();
            setMessages([{ role: 'model', content: response }]);
            setSuggestedQuestions(suggestedQuestions);
        } catch (error: any) {
            console.error("Failed to initialize AI Chat:", error);
            let msg = "Connection unavailable. Please check your network.";
            
            // Check for Rate Limit (429) or Resource Exhausted errors
            const errStr = JSON.stringify(error);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
                msg = "I'm currently experiencing high traffic. Please try again in a few moments.";
            }

            setMessages([{
                role: 'model',
                content: msg
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        setIsMinimized(false);
        setIsMaximized(false);
        if (nextState && messages.length === 0) {
            getInitialMessage();
        }
    };
    
    const handleToggleMinimize = () => {
        const nextMinimized = !isMinimized;
        setIsMinimized(nextMinimized);
        if (nextMinimized) setIsMaximized(false);
    };

    const handleToggleMaximize = () => {
        const nextMaximized = !isMaximized;
        setIsMaximized(nextMaximized);
        if (nextMaximized) setIsMinimized(false);
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || userInput;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: textToSend };
        const currentMessages = [...messages, userMessage];
        
        setMessages(currentMessages);
        setUserInput('');
        setSuggestedQuestions([]);
        setIsLoading(true);

        try {
            const { response, suggestedQuestions } = await continueAssistantChat(messages, textToSend);
            const modelMessage: ChatMessage = { role: 'model', content: response };
            setMessages(prev => [...prev, modelMessage]);
            setSuggestedQuestions(suggestedQuestions || []);
        } catch (error: any) {
            console.error('SURI-ARAL Assistant error:', error);
            let msg = 'I encountered an error. Please try again.';
            
            // Check for Rate Limit (429) or Resource Exhausted errors
            const errStr = JSON.stringify(error);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
                msg = "I'm currently overloaded with requests. Please wait a moment and try again.";
            }

            const errorMessage: ChatMessage = { role: 'model', content: msg };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const positionClasses = isInsightsOpen
        ? 'right-[calc(450px+1.5rem+1rem)]' // Insights width + offset
        : 'right-6';

    const windowContainerClasses = isMinimized
        ? `fixed bottom-6 ${positionClasses} w-72 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700 flex flex-col z-[100] animate-fade-in-up overflow-hidden transition-all duration-300 group cursor-pointer`
        : isMaximized
        ? `fixed top-20 bottom-6 left-6 ${positionClasses} bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700 flex flex-col z-[100] animate-fade-in-up overflow-hidden transition-all duration-300`
        : `fixed bottom-24 ${positionClasses} w-[400px] h-[600px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/30 dark:border-slate-700/50 flex flex-col z-[100] animate-fade-in-up overflow-hidden transition-all duration-300 ring-1 ring-black/5`;

    return (
        <>
            {!isOpen && (
                <button
                    onClick={handleToggle}
                    className={`fixed bottom-6 ${positionClasses} px-5 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-700 text-slate-800 dark:text-white rounded-full shadow-xl shadow-indigo-500/10 flex items-center gap-3 z-50 hover:scale-105 transition-all group`}
                    aria-label="Open Assistant"
                >
                    <div className="relative">
                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-ping opacity-75"></span>
                    </div>
                    <span className="font-bold text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Assistant
                        <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded-md uppercase tracking-wider">New AI</span>
                    </span>
                </button>
            )}
            
            {isOpen && (
                <div className={windowContainerClasses} onClick={isMinimized ? handleToggleMinimize : undefined}>
                    
                    {/* Minimized View */}
                    {isMinimized ? (
                        <div className="flex items-center justify-between px-4 h-full w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <BotIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Assistant</h3>
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">Active</p>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        // Expanded View
                        <>
                            <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50 dark:border-slate-700/50 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <SparklesIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white leading-none tracking-tight">Suri-Aral</h3>
                                        <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-1">Concierge AI</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50/50 dark:bg-slate-800/50 p-1 rounded-lg border border-white/50 dark:border-slate-700/50">
                                    <button onClick={handleToggleMaximize} className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all">
                                        {isMaximized ? <RestoreIcon className="w-3.5 h-3.5" /> : <MaximizeIcon className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={handleToggleMinimize} className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all">
                                        <MinusIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={handleToggle} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30 scroll-smooth">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                                        {msg.role === 'model' ? (
                                            // AI Message - Editorial Style
                                            <div className="max-w-[90%]">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Assistant</span>
                                                </div>
                                                <div className="text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                                                    <span dangerouslySetInnerHTML={{ __html: parseHighlightedText(msg.content) }} />
                                                </div>
                                            </div>
                                        ) : (
                                            // User Message - Modern Bubble
                                            <div className="max-w-[85%] bg-slate-900 dark:bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md text-sm font-medium">
                                                {msg.content}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-start gap-3 animate-pulse">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-100 dark:border-slate-700/50 flex-shrink-0">
                                {suggestedQuestions.length > 0 && !isLoading && (
                                    <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar mb-1 no-scrollbar">
                                        {suggestedQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(q)}
                                                className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="relative flex items-center group">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                        placeholder="Ask anything..."
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all shadow-inner"
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !userInput.trim()}
                                        className="absolute right-1.5 p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                                    >
                                        <SendIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default SuriAralAssistant;
