
import React, { useState, useEffect, useRef } from 'react';
import { createPersonaChat, sendPersonaMessage } from '../../services/ai/historyService';
import { SendIcon, UserIcon, SparklesIcon, XIcon } from '../icons';

interface PersonaChatProps {
    figure: { name: string, role: string, era: string, greeting: string };
    onClose: () => void;
}

export const PersonaChat = ({ figure, onClose }: PersonaChatProps) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'persona', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Init chat
        createPersonaChat(figure.name, figure.era, figure.role);
        setMessages([{ role: 'persona', text: figure.greeting }]);
    }, [figure]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await sendPersonaMessage(userMsg);
            setMessages(prev => [...prev, { role: 'persona', text: response }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-200 dark:border-amber-900/30 relative">
                {/* Historical texture overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-10 pointer-events-none z-0"></div>
                
                {/* Header */}
                <div className="p-6 border-b border-amber-100 dark:border-slate-800 bg-amber-50/50 dark:bg-slate-900 z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-serif text-xl font-bold border-2 border-white shadow-md">
                            {figure.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-amber-100">{figure.name}</h3>
                            <p className="text-xs text-amber-700 dark:text-amber-500 uppercase tracking-widest font-bold">{figure.era} • {figure.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-amber-100 dark:hover:bg-slate-800 rounded-full transition-colors text-amber-800 dark:text-amber-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-amber-100 dark:bg-amber-900 text-amber-800'}`}>
                                {msg.role === 'user' ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm font-serif max-w-[80%] ${
                                msg.role === 'user' 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tr-sm' 
                                : 'bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 rounded-tl-sm'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                                <SparklesIcon className="w-4 h-4 text-amber-600"/>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl rounded-tl-sm border border-amber-100 dark:border-amber-900/30">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white/80 dark:bg-slate-900/80 border-t border-amber-100 dark:border-slate-800 z-10 backdrop-blur-sm">
                    <div className="relative flex items-center gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            className="w-full pl-4 pr-12 py-3 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-serif placeholder-amber-900/30 dark:placeholder-slate-500 text-slate-800 dark:text-white"
                            placeholder={`Ask ${figure.name} something...`}
                            autoFocus
                        />
                        <button onClick={handleSend} className="absolute right-2 p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-md">
                            <SendIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
