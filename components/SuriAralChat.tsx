
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
// CSS is loaded via index.html to prevent module loading errors
// import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from './MathRenderer';
import { 
    Send, Paperclip, X, Bot, User as UserIcon, BrainCircuit, ScrollText, 
    BarChart3, PenTool, GraduationCap, BookOpen, Sparkles, NotebookPen 
} from 'lucide-react';

// --- Types ---
import { ChatMessage, PinnedNote, UserSettings, GamificationProfile, UserDailyMissions } from '../types';
// --- Services ---
import { sendMessageToTutor, resetTutorChat, generateReplySuggestions, createTutorChat } from '../services/geminiService';
import { subscribeToGamification, subscribeToMissions, subscribeToNotebook, getDailyMissions, logUserActivity, awardXP } from '../services/databaseService';
// --- Components ---
import { GamificationBar } from './GamificationBar';
import { MissionBoard } from './MissionBoard';

// ==========================================
// 1. THE SAFE & SOPHISTICATED PARSER
// ==========================================
// This parser handles Markdown and Math safely without risky regex loops.
const SafeParseRenderer = ({ content }: { content: string }) => {
    // Split by newline to process list items safely
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        // 1. Handle Lists (Line-by-line processing prevents ReDoS freezes)
        if (trimmed.match(/^[\-\*]\s/)) {
            inList = true;
            const itemContent = trimmed.replace(/^[\-\*]\s/, '');
            listItems.push(
                <li key={`li-${index}`} className="flex items-start gap-2 mb-2">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                    <span><InlineParse text={itemContent} /></span>
                </li>
            );
        } else {
            // Close list if open
            if (inList) {
                elements.push(<ul key={`ul-${index}`} className="my-4 pl-2">{listItems}</ul>);
                listItems = [];
                inList = false;
            }

            // 2. Handle Headers
            if (trimmed.startsWith('### ')) {
                elements.push(<h3 key={index} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100"><InlineParse text={trimmed.substring(4)} /></h3>);
            } else if (trimmed.startsWith('## ')) {
                elements.push(<h2 key={index} className="text-xl font-extrabold mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700"><InlineParse text={trimmed.substring(3)} /></h2>);
            } 
            // 3. Handle Block Math ($$)
            else if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
                 elements.push(
                    <div key={index} className="my-4 overflow-x-auto py-2 text-center">
                         <BlockMath math={trimmed.slice(2, -2)} errorColor={'#cc0000'} />
                    </div>
                 );
            }
            // 4. Handle Code Blocks (Simple detection)
            else if (trimmed.startsWith('```')) {
                 // A simpler implementation for code blocks to avoid complexity here. 
                 // Ideally, gather lines between ``` tags. For now, treating as pre.
                 elements.push(<pre key={index} className="bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto text-sm my-2"><code>{trimmed.replace(/```/g,'')}</code></pre>)
            }
            // 5. Standard Paragraphs (ignore empty lines)
            else if (trimmed.length > 0) {
                elements.push(<p key={index} className="mb-2 leading-relaxed"><InlineParse text={line} /></p>);
            }
        }
    });

    // Flush remaining list if ended on a list item
    if (inList) {
        elements.push(<ul key="ul-end" className="my-4 pl-2">{listItems}</ul>);
    }

    return <>{elements}</>;
};

// Helper for inline styles (Bold, Italic, Inline Math)
const InlineParse = ({ text }: { text: string }) => {
    // Split by inline math markers ($) first
    const parts = text.split(/(\$[^\$]+\$)/g);
    
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={i} math={part.slice(1, -1)} errorColor={'#cc0000'} />;
                }
                // Handle Bold (**) and Italic (*) safely
                const boldParts = part.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((subPart, j) => {
                    if (subPart.startsWith('**') && subPart.endsWith('**')) {
                        return <strong key={`${i}-${j}`} className="font-bold text-indigo-900 dark:text-indigo-300">{subPart.slice(2, -2)}</strong>;
                    }
                     const italicParts = subPart.split(/(\*.*?\*)/g);
                     return italicParts.map((italPart, k) => {
                         if (italPart.startsWith('*') && italPart.endsWith('*')) {
                              return <em key={`${i}-${j}-${k}`} className="italic text-slate-600 dark:text-slate-400">{italPart.slice(1, -1)}</em>
                         }
                         return italPart;
                     })
                });
            })}
        </>
    );
};


// ==========================================
// 2. MEMOIZED MESSAGE BUBBLE (Performance Key)
// ==========================================
// This component only re-renders if its specific props change, stopping input lag.
const MessageBubble = React.memo(({ content, role, images }: { content: string, role: string, images?: string[] }) => {
    const isUser = role === 'user';

    // Clean hidden XP tags before rendering
    const displayContent = useMemo(() => content.replace(/\[\[AWARD_XP:.*?\]\]/g, ''), [content]);

    return (
        <div className={`flex gap-4 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up group`}>
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/50 dark:border-slate-800/50 backdrop-blur-md ${
                isUser ? 'bg-indigo-100/80 dark:bg-slate-700/80' : 'bg-white/80 dark:bg-slate-800/80'
            }`}>
                {isUser ? <UserIcon className="w-5 h-5 text-indigo-600 dark:text-slate-300" /> : <Bot className="w-5 h-5 text-indigo-600" />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%]`}>
                <div className={`px-6 py-5 shadow-sm backdrop-blur-md text-sm md:text-[15px] ${
                    isUser 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'
                }`}>
                    {images && images.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                            {images.map((img, i) => (
                                <img key={i} src={`data:image/png;base64,${img}`} className="h-40 rounded-lg border border-slate-200/50 shadow-sm object-cover" alt="attachment" />
                            ))}
                        </div>
                    )}
                    {/* Use the Safe Parser Component */}
                    <div className={isUser ? 'font-medium' : 'prose prose-sm dark:prose-invert max-w-none'}>
                        <SafeParseRenderer content={displayContent} />
                    </div>
                </div>
            </div>
        </div>
    );
});


// ==========================================
// 3. MAIN COMPONENT
// ==========================================

interface SuriAralChatProps {
    user: User;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    chatMode: 'tutor' | 'history' | 'stats' | 'writing' | 'exam_prep' | 'reading';
    setChatMode: React.Dispatch<React.SetStateAction<any>>;
    resumeData?: any;
    onResumeHandled?: () => void;
    userSettings?: UserSettings | null;
}

const SuriAralChat = ({ user, messages, setMessages, chatMode, setChatMode, resumeData, onResumeHandled, userSettings }: SuriAralChatProps) => {
    // --- State ---
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [xpAward, setXpAward] = useState<{ amount: number, reason: string } | null>(null);
    const [showNotebook, setShowNotebook] = useState(false);
    
    // Data Subscriptions
    const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
    const [dailyMissions, setDailyMissions] = useState<UserDailyMissions | null>(null);
    const [notebookNotes, setNotebookNotes] = useState<PinnedNote[]>([]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // --- File Helper ---
    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // --- EFFECTS ---

    // 1. Data Subscriptions (Run once on user change)
    useEffect(() => {
        if (!user) return;
        const unsubGame = subscribeToGamification(user.uid, setGamificationProfile);
        const unsubMissions = subscribeToMissions(user.uid, setDailyMissions);
        const unsubNotes = subscribeToNotebook(user.uid, setNotebookNotes);
        getDailyMissions(user.uid).then(setDailyMissions);

        return () => { unsubGame(); unsubMissions(); unsubNotes(); };
    }, [user]);

    // 2. Handle Resume Logic (Isolated to prevent infinite loops)
    useEffect(() => {
        if (resumeData) {
            // Use a functional update to check current state vs incoming state to prevent loops
            setChatMode((prevMode: string) => prevMode !== resumeData.mode ? resumeData.mode : prevMode);
            setMessages(resumeData.messages);
            if (onResumeHandled) onResumeHandled();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeData]); // Only depend on resumeData existence/change


    // 3. Initialize Chat Service & Greetings (Skips if resuming)
    useEffect(() => {
        if (resumeData) return; // Don't re-init if resuming

        createTutorChat(chatMode, userSettings?.responseStyle, userSettings?.language as any);
        
        if (messages.length === 0) {
            const greetings: Record<string, string> = {
                tutor: "Hello! I'm your AI Tutor. What subject are we exploring today?",
                history: "Welcome to the archives. Ask me about any historical event.",
                stats: "Data Analyst ready. Paste your dataset or ask a statistical question.",
                writing: "Writing Assistant online. Need help refining your text?",
                exam_prep: "Exam Coach ready. Let's review! What topic should I quiz you on?",
                reading: "Reading Coach here. Paste a text to analyze or ask for a reading passage."
            };
            setMessages([{ role: 'model', content: greetings[chatMode] || greetings.tutor }]);
        }
        setSuggestions([]); // Clear suggestions on mode switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatMode, userSettings]); // Intentionally exclude resumeData

    // 4. Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    // --- HANDLERS ---

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if ((!textToSend.trim() && !selectedFile) || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: textToSend };
        
        // Optimistic update for attachment image
        if (selectedFile && selectedFile.type.startsWith('image/')) {
             const objectUrl = URL.createObjectURL(selectedFile);
             readFileAsBase64(selectedFile).then(base64 => {
                 setMessages(prev => [...prev, { ...userMessage, images: [base64] }]);
             });
        } else {
             setMessages(prev => [...prev, userMessage]);
        }

        setInput('');
        setSuggestions([]);
        setSelectedFile(null);
        setIsLoading(true);
        // Reset textarea height
        if(inputRef.current) inputRef.current.style.height = 'auto';


        try {
            let attachment;
            if (selectedFile) {
                const base64 = await readFileAsBase64(selectedFile);
                attachment = { mimeType: selectedFile.type, data: base64 };
            }

            // Robust sending wrapper
            let response;
            try {
                response = await sendMessageToTutor(textToSend, attachment);
            } catch (e) {
                console.warn("Session lost, resetting connection...");
                resetTutorChat();
                createTutorChat(chatMode, userSettings?.responseStyle, userSettings?.language as any);
                response = await sendMessageToTutor(textToSend, attachment);
            }

            const { text: responseText, images } = response;

            // Silent XP Handling
            let cleanText = responseText;
            const xpMatch = responseText.match(/\[\[AWARD_XP:\s*(\d+)(?:,\s*reason:\s*"(.*?)")?\]\]/);
            if (xpMatch && user) {
                const amount = parseInt(xpMatch[1]);
                const reason = xpMatch[2] || "Completing a task";
                awardXP(user.uid, amount);
                setXpAward({ amount, reason });
                setTimeout(() => setXpAward(null), 4000);
                // Don't show the tag in the chat
                cleanText = responseText.replace(xpMatch[0], '').trim();
            }

            const modelMessage: ChatMessage = { role: 'model', content: cleanText, images };
            setMessages(prev => [...prev, modelMessage]);

            // Logging
            if (user) {
                logUserActivity(user.uid, {
                    type: 'TUTOR',
                    title: `${chatMode.charAt(0).toUpperCase() + chatMode.slice(1)} Session`,
                    subtitle: textToSend.substring(0, 30) + "...",
                    contextData: { chatMode, messages: [] } // Pass empty messages to avoid circular size issues in logs if needed, or minimal context
                });
            }

            generateReplySuggestions(cleanText).then(setSuggestions);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "**Connection Error.** I'm having trouble reaching the server. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // Auto-resize textarea
        if(inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`; // Max height ~128px
        }
    };

    // --- RENDER HELPERS ---

    const modeIcons = {
        tutor: BrainCircuit, history: ScrollText, stats: BarChart3, 
        writing: PenTool, exam_prep: GraduationCap, reading: BookOpen
    };

    const ModeButton = ({ mode, label }: { mode: string, label: string }) => {
        const Icon = modeIcons[mode as keyof typeof modeIcons] || BrainCircuit;
        const isActive = chatMode === mode;
        return (
            <button
                onClick={() => { if(!isActive && !isLoading) { setChatMode(mode); setMessages([]); }}}
                disabled={isLoading}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                    isActive 
                    ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-sm'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Icon className={`w-4 h-4 mr-3 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`} />
                {label}
            </button>
        );
    };

    // --- JSX ---
    return (
        <div className="flex h-[calc(100vh-6rem)] w-full bg-slate-50/40 dark:bg-slate-900/40 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50 backdrop-blur-xl overflow-hidden relative font-sans">
            
            {/* LEFT SIDEBAR (Glassmorphism) */}
            <div className="hidden md:flex w-72 flex-col border-r border-white/30 dark:border-slate-700/30 bg-white/30 dark:bg-slate-900/30">
                {/* Gamification Header */}
                {gamificationProfile && user && (
                    <div className="p-5 border-b border-white/30 dark:border-slate-700/30 backdrop-blur-md bg-white/10 dark:bg-slate-800/10">
                        <GamificationBar profile={gamificationProfile} userName={user.displayName || 'Student'} />
                    </div>
                )}

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-0.5">
                    <p className="px-4 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Modes</p>
                    <ModeButton mode="tutor" label="AI Tutor" />
                    <ModeButton mode="history" label="History Archives" />
                    <ModeButton mode="stats" label="Data Analyst" />
                    <ModeButton mode="writing" label="Writing Coach" />
                    <ModeButton mode="exam_prep" label="Exam Prep" />
                    <ModeButton mode="reading" label="Reading Lab" />
                    
                    <div className="mt-6 pt-4 border-t border-white/20 dark:border-slate-700/30">
                        <p className="px-4 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Missions</p>
                        <div className="px-2">
                            <MissionBoard userId={user.uid} missionsData={dailyMissions} />
                        </div>
                    </div>
                </div>

                 {/* Notebook Toggle */}
                 <div className="p-4 border-t border-white/30 dark:border-slate-700/30 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md">
                    <button 
                        onClick={() => setShowNotebook(true)}
                        className="w-full py-2.5 px-4 rounded-xl border border-indigo-100/50 dark:border-slate-700 bg-indigo-50/50 dark:bg-slate-800/50 hover:bg-indigo-100/80 dark:hover:bg-slate-700 transition-all flex items-center justify-center font-semibold text-sm text-indigo-900 dark:text-indigo-200 group"
                    >
                        <NotebookPen className="w-4 h-4 mr-2 text-indigo-500 group-hover:rotate-12 transition-transform" /> Open Notebook
                    </button>
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col relative z-10">
                
                {/* Floating Header */}
                <header className="absolute top-4 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl rounded-full shadow-sm border border-white/50 dark:border-slate-700/50">
                        <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            {chatMode.replace('_', ' ')}
                        </span>
                    </div>
                    
                    {/* XP Popup */}
                    {xpAward && (
                        <div className="absolute top-12 animate-fade-in-up px-4 py-2 bg-amber-100/90 border border-amber-200 text-amber-800 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 backdrop-blur-md">
                            <Sparkles className="w-4 h-4 text-amber-500" /> +{xpAward.amount} XP
                        </div>
                    )}
                </header>

                {/* Messages Canvas */}
                <div className="flex-1 overflow-y-auto p-6 pt-24 pb-36 space-y-6 scroll-smooth custom-scrollbar relative md:px-12 lg:px-20">
                    {messages.map((msg, idx) => (
                        // Using Memoized Component here is crucial
                        <MessageBubble key={idx} content={msg.content} role={msg.role} images={msg.images} />
                    ))}
                    
                    {isLoading && (
                        <div className="flex gap-4 max-w-4xl mx-auto animate-pulse items-start">
                            <div className="w-9 h-9 rounded-full bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700/50"></div>
                            <div className="bg-white/40 dark:bg-slate-800/40 h-12 w-48 rounded-2xl rounded-tl-sm"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Floating Input Capsule (Bottom) */}
                <div className="absolute bottom-0 inset-x-0 pb-6 pt-12 px-4 flex justify-center bg-gradient-to-t from-slate-100/80 via-slate-100/40 to-transparent dark:from-slate-900/90 dark:via-slate-900/50 pointer-events-none">
                    <div className="w-full max-w-3xl pointer-events-auto flex flex-col gap-2">
                        
                        {/* Suggestions Chips */}
                        {suggestions.length > 0 && !isLoading && (
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar px-2 justify-start md:justify-center">
                                {suggestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => chatMode === 'exam_prep' ? setInput(q) : handleSend(q)}
                                        className="shrink-0 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-indigo-100/50 dark:border-slate-700 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Bar */}
                        <div className="relative flex items-end gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 pl-4 rounded-[2rem] shadow-xl shadow-indigo-900/5 border border-white/50 dark:border-slate-700/50 ring-1 ring-slate-200/50 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
                            
                            {/* File Upload */}
                            <div className="flex items-center pb-1">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} accept="image/*,application/pdf" />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-full transition-colors ${selectedFile ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Textarea */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={selectedFile ? `Attached: ${selectedFile.name}` : "Ask SURI-ARAL anything..."}
                                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 max-h-32 text-[15px] text-slate-800 dark:text-slate-200 placeholder-slate-400 font-medium custom-scrollbar"
                                rows={1}
                                style={{ minHeight: '44px' }}
                                disabled={isLoading}
                            />

                            {/* Send Button */}
                            <button
                                onClick={() => handleSend()}
                                disabled={isLoading || (!input.trim() && !selectedFile)}
                                className={`m-1 p-3 rounded-full shadow-sm transition-all ${
                                    isLoading || (!input.trim() && !selectedFile)
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 hover:scale-105 active:scale-95'
                                }`}
                            >
                                <Send className={`w-5 h-5 ${isLoading ? 'animate-pulse' : 'ml-0.5'}`} />
                            </button>
                                
                            {/* Remove File Button */}
                            {selectedFile && (
                                <button onClick={() => setSelectedFile(null)} className="absolute -top-3 right-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-sm">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Simple Notebook Overlay */}
            {showNotebook && (
                 <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-10 animate-fade-in-up">
                     <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 relative">
                         <button onClick={()=>setShowNotebook(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                         <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><NotebookPen className="text-indigo-500"/> Notebook</h2>
                         <p className="text-slate-500 mb-6">Your pinned notes will appear here. (AI generated notes)</p>
                         <div className="max-h-96 overflow-y-auto custom-scrollbar p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                              {notebookNotes.length === 0 ? (
                                  <p className="text-center text-slate-400 italic">No notes yet.</p>
                              ) : (
                                  notebookNotes.map(n => (
                                      <div key={n.id} className="mb-3 p-4 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-slate-100 dark:border-slate-700">
                                          <div className="prose prose-sm dark:prose-invert max-w-none">
                                              <SafeParseRenderer content={n.content} />
                                          </div>
                                          <p className="text-xs text-slate-400 mt-2 text-right">{new Date(n.timestamp).toLocaleDateString()}</p>
                                      </div>
                                  ))
                              )}
                         </div>
                     </div>
                 </div>
            )}

        </div>
    );
};

export default SuriAralChat;
