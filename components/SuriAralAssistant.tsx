
import React, { useState, useEffect, useRef } from 'react';
import { BotIcon, SendIcon, XIcon, SparklesIcon, ChevronDownIcon } from './icons';
import { AssistantContext, ChatMessage } from '../types';
import { initAssistantChat, getInitialAssistantMessage, continueAssistantChat } from '../services/geminiService';
import { loadSchools, loadClasses, loadStudents_SF1, loadTeachers } from '../services/databaseService';
import { auth } from '../services/firebase';

interface SuriAralAssistantProps {
    isInsightsOpen?: boolean;
}

const SuriAralAssistant = ({ isInsightsOpen }: SuriAralAssistantProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Assistant Context
    useEffect(() => {
        const initialize = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                // Fetch context data to ground the AI
                const [schools, classes, students, teachers] = await Promise.all([
                    loadSchools(user.uid),
                    loadClasses(user.uid),
                    loadStudents_SF1(user.uid),
                    loadTeachers(user.uid)
                ]);

                const activeSchool = schools.find(s => !s.deletedAt) || schools[0];
                
                const context: AssistantContext = {
                    schoolName: activeSchool?.schoolName || 'Suri-Aral School',
                    location: activeSchool?.location?.address || 'Philippines',
                    schoolYear: activeSchool?.schoolYear || '2024-2025',
                    totalStudents: students.filter(s => !s.deletedAt).length,
                    totalTeachers: teachers.filter(t => !t.deletedAt).length,
                    activeClasses: classes.filter(c => !c.deletedAt).length,
                    totalSubjects: 0 // Optional optimization
                };

                await initAssistantChat(context);
                const initial = await getInitialAssistantMessage();
                
                setMessages([{ role: 'model', content: initial.response }]);
                setSuggestions(initial.suggestedQuestions);
                setIsInitialized(true);
            } catch (error) {
                console.error("Failed to init assistant:", error);
                setMessages([{ role: 'model', content: "I'm having trouble connecting to the school database. Basic features are still available." }]);
                setIsInitialized(true);
            }
        };

        // Only initialize when opened to save resources
        if (isOpen && !isInitialized) {
            initialize();
        }
    }, [isOpen, isInitialized]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (textOverride?: string) => {
        const text = textOverride || input;
        if (!text.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]);
        setIsLoading(true);

        try {
            const response = await continueAssistantChat(messages, text);
            setMessages(prev => [...prev, { role: 'model', content: response.response }]);
            setSuggestions(response.suggestedQuestions || []);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isInitialized && !isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-20 md:bottom-6 ${isInsightsOpen ? 'right-4 md:right-96 md:mr-4' : 'right-4 md:right-6'} z-[50] w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group`}
                title="Open Assistant"
            >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-75"></div>
                <SparklesIcon className="w-6 h-6 text-white relative z-10" />
            </button>
        );
    }

    return (
        <>
            {/* Minimized Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-20 md:bottom-6 ${isInsightsOpen ? 'right-4 md:right-96 md:mr-4' : 'right-4 md:right-6'} z-[50] w-14 h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center`}
                >
                    <BotIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed inset-0 z-[100] md:inset-auto md:bottom-6 md:right-6 md:w-96 md:h-[500px] md:max-h-[80vh] bg-white dark:bg-slate-900 md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-scale-up`}>
                    
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center text-white flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <SparklesIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">SURI-ARAL Assistant</h3>
                                <p className="text-[10px] text-indigo-100 opacity-80">School Intelligence Agent</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <ChevronDownIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                        {!isInitialized ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">Connecting to school database...</span>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                        {msg.role === 'user' ? <div className="w-3 h-3 bg-slate-500 rounded-full" /> : <BotIcon className="w-3 h-3 text-indigo-600" />}
                                    </div>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs md:text-sm leading-relaxed ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-1">
                                    <BotIcon className="w-3 h-3 text-indigo-600" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && !isLoading && (
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
                            {suggestions.map((s, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleSend(s)}
                                    className="whitespace-normal text-left h-auto max-w-[220px] px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex-shrink-0"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                        <div className="relative flex items-center gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="Ask anything..." 
                                className="flex-1 pl-4 pr-10 py-2.5 bg-slate-100 dark:bg-slate-900 border-transparent rounded-xl text-sm focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                disabled={isLoading || !isInitialized}
                            />
                            <button 
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading || !isInitialized}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuriAralAssistant;
