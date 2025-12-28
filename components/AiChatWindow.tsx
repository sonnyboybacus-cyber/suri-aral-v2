
import React, { useState, useEffect, useRef } from 'react';
import { AIContext, ChatMessage } from '../types';
import { startAnalysisChat, continueAnalysisChat } from '../services/ai/dataService';
import { BotIcon, UserIcon, XIcon, MinusIcon, MaximizeIcon, RestoreIcon, SparklesIcon, SendIcon, BrainCircuitIcon, TrendingUpIcon } from './icons';

interface AiChatWindowProps {
    context: AIContext | null;
    onClose: () => void;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    isMaximized: boolean;
    onToggleMaximize: () => void;
}

// Enhanced markdown to HTML parser with sophisticated styling
const parseMarkdown = (text: string): string => {
    let processingText = text;

    // 1. JSON Artifact Extraction / Cleanup
    if (processingText.includes('"analysisReport":')) {
        const match = processingText.match(/"analysisReport"\s*:\s*"([\s\S]*?)(?=",\s*"suggestedQuestions"|"\s*\}|$)/);
        if (match && match[1]) {
            processingText = match[1];
        } else {
            processingText = processingText
                .replace(/^[\s\S]*"analysisReport":\s*"/, '')
                .replace(/",\s*"suggestedQuestions"[\s\S]*$/, '')
                .replace(/",\s*"suggested"[\s\S]*$/, ''); 
        }
    }

    // 2. Pre-processing & Unescaping
    let html = processingText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/^"|"$/g, '')
        .replace(/^[\s\n]*[{[,]\s*/, '')
        .replace(/[\s\n]*[}\],]\s*$/, '')
        .trim();

    // 3. HTML Escape
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 4. Formatting
    html = html.replace(/^```(\w*)\n([\s\S]*?)\n```/gm, (match, lang, code) => {
        return `<div class="my-6 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md group"><div class="px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-widest flex justify-between items-center"><span>${lang || 'CODE'}</span><div class="flex gap-1.5"><div class="w-2 h-2 rounded-full bg-red-500/20"></div><div class="w-2 h-2 rounded-full bg-yellow-500/20"></div><div class="w-2 h-2 rounded-full bg-green-500/20"></div></div></div><pre class="p-5 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed"><code class="font-mono">${code}</code></pre></div>`;
    });

    html = html.replace(/^\|(.+)\|\n\|( *[-:]+ *\|)+([\s\S]*?)(?=\n\n|\n*$)/gm, (match) => {
        const rows = match.trim().split('\n');
        const headerRow = rows[0];
        const bodyRows = rows.slice(2);
        const tableHead = `<thead class="bg-slate-50/80 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-bold tracking-wider"><tr>${headerRow.split('|').slice(1, -1).map(h => `<th class="px-6 py-4 text-left">${h.trim()}</th>`).join('')}</tr></thead>`;
        const tableBody = `<tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">${bodyRows.map(row => `<tr>${row.split('|').slice(1, -1).map(c => `<td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 leading-normal">${c.trim()}</td>`).join('')}</tr>`).join('')}</tbody>`;
        return `<div class="my-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm bg-white/50 dark:bg-slate-800/30"><div class="overflow-x-auto"><table class="w-full border-collapse">${tableHead}${tableBody}</table></div></div>`;
    });

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-800 dark:text-white mt-8 mb-4 tracking-tight flex items-center"><span class="w-1 h-5 bg-indigo-500 rounded-full mr-3"></span>$1</h3>')
               .replace(/^## (.*$)/gim, '<h2 class="text-xl font-extrabold text-slate-900 dark:text-white mt-10 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 tracking-tight">$1</h2>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-1.5 py-0.5 rounded-md mx-0.5 border border-indigo-100 dark:border-indigo-500/20 shadow-sm inline-block leading-snug">$1</span>')
               .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600 dark:text-slate-400 font-serif">$1</em>');

    html = html.replace(/^\s*[\-\*] (.*)/gm, '<li class="flex items-start gap-3 mb-3 group"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform"></span><span class="flex-1 leading-7 text-slate-700 dark:text-slate-300">$1</span></li>')
               .replace(/(<li.*?>.*<\/li>)\n?/g, '<ul class="my-6 pl-1 space-y-1">$1</ul>');

    html = html.replace(/^\s*\d+\. (.*)/gm, '<li class="flex items-start gap-3 mb-3 list-decimal-item"><span class="flex-1 leading-7 text-slate-700 dark:text-slate-300">$1</span></li>')
               .replace(/(<li class="flex items-start gap-3 mb-3 list-decimal-item">.*<\/li>)\n?/g, '<ol class="list-decimal list-outside ml-6 my-6 space-y-1 text-slate-700 dark:text-slate-300 marker:text-indigo-500 marker:font-bold font-medium">$1</ol>');

    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.match(/^<(div|ul|ol|table|h[1-6])/)) return block;
        return block.trim() ? `<p class="mb-6 text-slate-600 dark:text-slate-300 leading-7 tracking-normal text-[15px]">${block.replace(/\n/g, '<br />')}</p>` : '';
    }).join('');

    return html;
};

const AiChatWindow = ({ context, onClose, messages, setMessages, isMinimized, onToggleMinimize, isMaximized, onToggleMaximize }: AiChatWindowProps) => {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (context && messages.length === 0) {
            const generateInitialInsights = async () => {
                setIsLoading(true);
                try {
                    const { analysisReport, suggestedQuestions } = await startAnalysisChat(context);
                    setMessages([{ role: 'model', content: analysisReport }]);
                    setSuggestedQuestions(suggestedQuestions);
                } catch (error) {
                    console.error('Error in initial analysis:', error);
                    setMessages([{ role: 'model', content: 'Unable to generate insights at this moment. Please try again later.' }]);
                } finally {
                    setIsLoading(false);
                }
            };
            generateInitialInsights();
        }
    }, [context, messages.length, setMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || userInput;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setSuggestedQuestions([]); 
        setIsLoading(true);

        try {
            const response = await continueAnalysisChat(textToSend);
            const modelMessage: ChatMessage = { role: 'model', content: response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I encountered a connection issue. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Minimized View
    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-80 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700 z-[100] flex items-center px-4 cursor-pointer transition-all duration-300 hover:scale-105 group"
                onClick={onToggleMinimize}
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-4 group-hover:rotate-12 transition-transform">
                    <BrainCircuitIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">SURI-ARAL Insights</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span> Analysis Active
                    </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // Responsive Main View
    const mainClass = isMaximized 
        ? "fixed inset-0 md:inset-4 z-[100] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl md:rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700 transition-all duration-500"
        : "fixed inset-0 z-[100] md:inset-auto md:bottom-6 md:right-6 md:w-[500px] md:h-[750px] md:max-h-[85vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl md:rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-700 transition-all duration-500";

    return (
        <div className={mainClass}>
            {/* Header */}
            <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100/50 dark:border-slate-800/50 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm md:rounded-t-[2.5rem]">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            AI Insights
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                            Data Analysis Agent
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                    <button onClick={onToggleMaximize} className="hidden md:block p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all" title={isMaximized ? "Restore" : "Maximize"}>
                        {isMaximized ? <RestoreIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={onToggleMinimize} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all" title="Minimize">
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition-all" title="Close">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 custom-scrollbar scroll-smooth bg-slate-50/30 dark:bg-slate-900/20">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 md:gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up group`}>
                        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center shadow-sm mt-1 transition-transform group-hover:scale-105 ${
                            msg.role === 'user' 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
                        }`}>
                            {msg.role === 'user' ? <UserIcon className="w-4 h-4 md:w-5 md:h-5" /> : <BotIcon className="w-4 h-4 md:w-5 md:h-5" />}
                        </div>
                        <div className={`max-w-[85%] shadow-sm transition-all duration-300 ${
                            msg.role === 'user' 
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 md:p-5 shadow-lg shadow-slate-500/10' 
                            : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 rounded-2xl rounded-tl-sm p-4 md:p-8 text-slate-700 dark:text-slate-200 shadow-xl shadow-indigo-500/5'
                        }`}>
                            {msg.role === 'user' 
                                ? <p className="text-sm md:text-base leading-relaxed font-medium">{msg.content}</p> 
                                : <div className="prose prose-slate dark:prose-invert max-w-none font-sans text-sm md:text-base" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                            }
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-5 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-1">
                            <BotIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-2xl rounded-tl-sm flex items-center gap-2 border border-slate-100 dark:border-slate-700/50">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 md:rounded-b-[2.5rem] flex-shrink-0">
                <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
                    {/* Suggestions */}
                    {suggestedQuestions.length > 0 && !isLoading && (
                        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar snap-x">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setUserInput(q)}
                                    className="snap-start shrink-0 px-3 py-2 md:px-4 md:py-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 text-[10px] md:text-xs font-bold rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 whitespace-normal text-left h-auto max-w-[240px] leading-tight flex items-center gap-2"
                                >
                                    <TrendingUpIcon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                                    <span>{q}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Field */}
                    <div className="relative flex items-end gap-2 bg-white dark:bg-slate-800 backdrop-blur-xl p-2 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-slate-200/80 dark:border-slate-700/80 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/40">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), handleSend())}
                            placeholder="Ask a follow-up question..."
                            className="flex-1 pl-4 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white text-sm font-medium placeholder-slate-400 resize-none max-h-32 custom-scrollbar"
                            rows={1}
                            style={{ minHeight: '48px' }}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !userInput.trim()}
                            className="mb-1 p-3 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiChatWindow;
