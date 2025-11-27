
import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Curriculum, ChatMessage, LearningModule } from '../types';
import { generateCurriculum, createTutorChat, sendMessageToTutor, resetTutorChat, generateSpeech, rewriteForAudio } from '../services/geminiService';
import { BrainCircuitIcon, SparklesIcon, SendIcon, UserIcon, BotIcon, ChevronDownIcon, LockIcon, CheckCircleIcon, PaperclipIcon, XIcon, HeadphonesIcon, VolumeXIcon, SpeakerIcon } from './icons';
import { BlockMath, InlineMath } from './MathRenderer';

interface LearnSAProps {
    user: User;
    initialTopic?: string;
}

// Waveform Component
const Waveform = () => (
    <div className="flex gap-0.5 items-end h-4">
        <div className="w-0.5 bg-indigo-500 animate-[wave_1s_ease-in-out_infinite] h-2"></div>
        <div className="w-0.5 bg-indigo-500 animate-[wave_1.2s_ease-in-out_infinite] h-3"></div>
        <div className="w-0.5 bg-indigo-500 animate-[wave_0.8s_ease-in-out_infinite] h-1"></div>
        <style>{`
            @keyframes wave {
                0%, 100% { height: 20%; }
                50% { height: 100%; }
            }
        `}</style>
    </div>
);

// Helper to decode base64 audio data
async function decodeAudioData(base64Data: string, ctx: AudioContext): Promise<AudioBuffer> {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // Manual PCM decoding (Float32)
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
        float32[i] = dataInt16[i] / 32768.0;
    }
    
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    return buffer;
}

interface TutorBubbleProps {
    content: string;
    role: string;
    onPlayAudio: (text: string) => void | Promise<void>;
    isPlayingAudio: boolean;
    isAudioLoading: boolean;
}

const TutorBubble: React.FC<TutorBubbleProps> = ({ content, role, onPlayAudio, isPlayingAudio, isAudioLoading }) => {
    const isUser = role === 'user';
    
    // Simple parser for basic formatting
    const parseContent = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|\$.*?\$)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-indigo-900 dark:text-indigo-300">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('$') && part.endsWith('$')) {
                return <span key={i} className="px-1"><InlineMath math={part.slice(1, -1)} /></span>;
            }
            return part;
        });
    };

    return (
        <div className={`flex gap-4 max-w-3xl mx-auto ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up group`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${isUser ? 'bg-indigo-100 border-indigo-200' : 'bg-white border-slate-200'}`}>
                {isUser ? <UserIcon className="w-4 h-4 text-indigo-600" /> : <BotIcon className="w-4 h-4 text-indigo-600" />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[80%]`}>
                <div className={`relative px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
                    isUser 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm font-medium' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm font-serif'
                }`}>
                    {parseContent(content)}
                    
                    {/* Audio Trigger (Only for Model) */}
                    {!isUser && (
                        <div className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                                onClick={() => onPlayAudio(content)}
                                disabled={isPlayingAudio || isAudioLoading}
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {isPlayingAudio ? (
                                    <Waveform />
                                ) : isAudioLoading ? (
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                ) : (
                                    <>
                                        <SpeakerIcon className="w-3 h-3" />
                                        Listen
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LearnSA = ({ user, initialTopic }: LearnSAProps) => {
    const [topicInput, setTopicInput] = useState(initialTopic || '');
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    // Audio State
    const [isHandsFree, setIsHandsFree] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<number | null>(null); // Using index as ID for simplicity here
    const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileInputRef = useRef<HTMLInputElement>(null);

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const executeGeneration = async (topic: string, file?: File) => {
        setIsGenerating(true);
        try {
            let fileData;
            if (file) {
                const base64 = await readFileAsBase64(file);
                fileData = { mimeType: file.type, data: base64 };
            }

            const newCurriculum = await generateCurriculum(topic, fileData);
            setCurriculum(newCurriculum);
            
            if (newCurriculum.modules.length > 0) {
                setActiveModuleId(newCurriculum.modules[0].id);
            }
        } catch (error) {
            console.error(error);
            alert("Could not generate curriculum. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-generate if initialTopic is provided on mount
    useEffect(() => {
        if (initialTopic) {
            setTopicInput(initialTopic);
            executeGeneration(initialTopic);
        }
    }, [initialTopic]);

    // Initialize Audio Context on user interaction (first click)
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const stopAudio = () => {
        if (currentSourceRef.current) {
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }
        setPlayingMessageId(null);
        setLoadingAudioId(null);
    };

    const handlePlayAudio = async (text: string, index: number) => {
        initAudio();
        
        // Toggle off if clicking same message
        if (playingMessageId === index) {
            stopAudio();
            return;
        }

        stopAudio(); // Stop any previous
        setLoadingAudioId(index);

        try {
            // Step 1: Rewrite for Audio (Optimizer Layer)
            // This handles LaTeX/Code by converting to conceptual explanation
            const script = await rewriteForAudio(text);
            
            // Step 2: Generate Audio
            const audioBase64 = await generateSpeech(script);
            
            // Step 3: Decode & Play
            if (audioContextRef.current) {
                const buffer = await decodeAudioData(audioBase64, audioContextRef.current);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                
                source.onended = () => {
                    setPlayingMessageId(null);
                    currentSourceRef.current = null;
                };
                
                currentSourceRef.current = source;
                setLoadingAudioId(null);
                setPlayingMessageId(index);
                source.start(0);
            }
        } catch (e) {
            console.error("Audio playback failed:", e);
            setLoadingAudioId(null);
            setPlayingMessageId(null);
            alert("Could not play audio.");
        }
    };

    // Hands-Free Logic: Auto-play new model messages
    useEffect(() => {
        if (isHandsFree && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const lastIdx = messages.length - 1;
            
            // Only play if it's a model message and not already playing/loading
            if (lastMsg.role === 'model' && playingMessageId !== lastIdx && loadingAudioId !== lastIdx) {
                // Small delay to allow UI to settle and feel natural
                const timer = setTimeout(() => {
                    handlePlayAudio(lastMsg.content, lastIdx);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [messages, isHandsFree]);

    // Clean up audio on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Initialize Chat when a module becomes active
    useEffect(() => {
        if (activeModuleId && curriculum) {
            const module = curriculum.modules.find(m => m.id === activeModuleId);
            if (module) {
                resetTutorChat();
                createTutorChat('sa_tutor');
                
                const introMessage = `Welcome to Module ${module.order}: **${module.title}**. ${module.description} Let's begin.`;
                setMessages([{ role: 'model', content: introMessage }]);
                
                const contextPrompt = `I am starting Module ${module.order}: "${module.title}". The topic is "${curriculum.topic}". Please introduce the first concept of this module warmly and ask a Socratic question.`;
                sendMessageToTutor(contextPrompt).then(res => {
                    setMessages(prev => [...prev, { role: 'model', content: res.text }]);
                });
            }
        }
    }, [activeModuleId, curriculum]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatLoading]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                setSelectedFile(file);
            } else {
                alert("Please upload an image or PDF file.");
            }
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicInput.trim() && !selectedFile) return;
        await executeGeneration(topicInput, selectedFile || undefined);
        setSelectedFile(null);
    };

    const handleSendMessage = async () => {
        if ((!chatInput.trim() && !selectedFile) || isChatLoading) return;
        
        // Stop audio if user interrupts
        stopAudio();

        const text = chatInput;
        setChatInput('');
        const currentFile = selectedFile;
        setSelectedFile(null); 
        
        setMessages(prev => [...prev, { role: 'user', content: text || (currentFile ? `[Attached: ${currentFile.name}]` : '') }]);
        setIsChatLoading(true);

        try {
            let attachment;
            if (currentFile) {
                const base64 = await readFileAsBase64(currentFile);
                attachment = { mimeType: currentFile.type, data: base64 };
            }

            const response = await sendMessageToTutor(text, attachment);
            const cleanText = response.text.replace(/\[\[.*?\]\]/g, '').trim();
            setMessages(prev => [...prev, { role: 'model', content: cleanText }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I'm having trouble connecting. Please try again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const markModuleComplete = (moduleId: string) => {
        if (!curriculum) return;
        const updatedModules = curriculum.modules.map(m => {
            if (m.id === moduleId) return { ...m, status: 'completed' as const };
            return m;
        });
        
        const currentIndex = updatedModules.findIndex(m => m.id === moduleId);
        if (currentIndex < updatedModules.length - 1) {
            updatedModules[currentIndex + 1].status = 'active';
            setActiveModuleId(updatedModules[currentIndex + 1].id);
        }
        
        setCurriculum({ ...curriculum, modules: updatedModules });
    };

    if (!curriculum) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
                <div className="max-w-xl w-full text-center space-y-8 animate-fade-in-up">
                    <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 rotate-3">
                        <BrainCircuitIcon className="w-10 h-10 text-white" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                            Learn SA
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">
                            What do you want to master today?
                        </p>
                    </div>

                    <form 
                        onSubmit={handleGenerate} 
                        className={`relative group transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {selectedFile && (
                            <div className="absolute -top-3 left-6 z-20 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium flex items-center shadow-sm animate-fade-in">
                                <span className="max-w-[150px] truncate mr-2">{selectedFile.name}</span>
                                <button type="button" onClick={handleRemoveFile} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        <input 
                            type="text" 
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            placeholder={selectedFile ? "Describe this document..." : "e.g. Thermodynamics, French Revolution..."}
                            className={`w-full p-6 pr-24 bg-white dark:bg-slate-800 border-2 ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-700'} rounded-2xl shadow-lg text-lg text-black dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300`}
                            disabled={isGenerating}
                        />
                        
                        <div className="absolute right-4 top-4 flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                title="Attach PDF or Image"
                            >
                                <PaperclipIcon className="w-5 h-5" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf" 
                                onChange={handleFileSelect}
                            />

                            <button 
                                type="submit"
                                disabled={isGenerating || (!topicInput.trim() && !selectedFile)}
                                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <SparklesIcon className="w-6 h-6 animate-spin" /> : <SendIcon className="w-6 h-6" />}
                            </button>
                        </div>
                    </form>
                    
                    <p className="text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                        Powered by SA Tutor Intelligence
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-200">
            
            {/* LEFT PANE: The Path */}
            <div className="w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 shadow-xl">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <button onClick={() => setCurriculum(null)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest mb-4 flex items-center transition-colors">
                        <ChevronDownIcon className="w-4 h-4 mr-1 rotate-90" /> Back to Search
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
                        {curriculum.topic}
                    </h1>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        {curriculum.modules.length} Modules • Personalized Path
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8">
                        {curriculum.modules.map((module, index) => {
                            const isActive = module.id === activeModuleId;
                            const isCompleted = module.status === 'completed';
                            const isLocked = module.status === 'locked';

                            return (
                                <div 
                                    key={module.id} 
                                    className={`relative pl-6 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                                >
                                    <div className={`absolute -left-[21px] top-1 w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center transition-all duration-500 ${
                                        isActive 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' 
                                        : isCompleted 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : isLocked ? <LockIcon className="w-4 h-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
                                    </div>

                                    <div className={`transition-all ${isActive ? 'translate-x-2' : ''}`}>
                                        <h3 className={`text-lg font-serif font-bold mb-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {module.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
                                            {module.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{Math.round((curriculum.modules.filter(m => m.status === 'completed').length / curriculum.modules.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-1000 ease-out" 
                            style={{ width: `${(curriculum.modules.filter(m => m.status === 'completed').length / curriculum.modules.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: The Conversation */}
            <div className="flex-1 flex flex-col relative bg-slate-50/50 dark:bg-slate-900/50">
                
                {/* Hands-Free Toggle Header */}
                <div className="absolute top-0 inset-x-0 z-20 flex justify-center pt-4 pointer-events-none">
                    <button 
                        onClick={() => { 
                            setIsHandsFree(!isHandsFree); 
                            initAudio(); // Ensure audio context is ready
                        }}
                        className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all duration-300 border ${
                            isHandsFree 
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 scale-105' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {isHandsFree && <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>}
                        <HeadphonesIcon className={`w-4 h-4 ${isHandsFree ? 'text-white' : ''}`} />
                        <span className="text-xs font-bold uppercase tracking-wide">
                            {isHandsFree ? 'Hands-Free On' : 'Enable Hands-Free'}
                        </span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 custom-scrollbar scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">
                            Preparing your lesson...
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <TutorBubble 
                                    key={idx} 
                                    content={msg.content} 
                                    role={msg.role} 
                                    onPlayAudio={(text) => handlePlayAudio(text, idx)}
                                    isPlayingAudio={playingMessageId === idx}
                                    isAudioLoading={loadingAudioId === idx}
                                />
                            ))}
                            {isChatLoading && (
                                <div className="flex gap-4 max-w-3xl mx-auto">
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                                        <BotIcon className="w-4 h-4 text-indigo-600 animate-pulse" />
                                    </div>
                                    <div className="bg-white/50 h-10 w-32 rounded-2xl animate-pulse"></div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-20" />
                        </>
                    )}
                </div>

                {/* Floating Input Area */}
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 flex justify-center">
                    <div className="w-full max-w-3xl relative">
                        {activeModuleId && curriculum.modules.find(m => m.id === activeModuleId)?.status !== 'completed' && (
                            <button 
                                onClick={() => activeModuleId && markModuleComplete(activeModuleId)}
                                className="absolute -top-12 right-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors shadow-sm border border-indigo-100"
                            >
                                I've mastered this, Next Module &rarr;
                            </button>
                        )}
                        
                        {/* Stop Audio Control if Playing */}
                        {playingMessageId !== null && (
                            <button 
                                onClick={stopAudio}
                                className="absolute -top-12 left-0 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-red-600 transition-colors animate-fade-in"
                            >
                                <VolumeXIcon className="w-4 h-4" /> Stop Audio
                            </button>
                        )}
                        
                        <div 
                            className={`relative flex items-end bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-indigo-900/5 border transition-all ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-700'} p-2 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {/* File Preview Token */}
                            {selectedFile && (
                                <div className="absolute -top-3 left-4 z-20 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium flex items-center shadow-sm animate-fade-in">
                                    <span className="max-w-[150px] truncate mr-2">{selectedFile.name}</span>
                                    <button onClick={handleRemoveFile} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Attachment Button */}
                            <button 
                                onClick={() => chatFileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors mb-0.5"
                                title="Attach image or file"
                            >
                                <PaperclipIcon className="w-5 h-5" />
                            </button>
                            <input 
                                type="file" 
                                ref={chatFileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf" 
                                onChange={handleFileSelect}
                            />

                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder={selectedFile ? "Ask about this file..." : "Type your answer..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-base text-black dark:text-white placeholder:text-slate-400 font-medium"
                                disabled={isChatLoading}
                                autoFocus
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={(!chatInput.trim() && !selectedFile) || isChatLoading}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-transform active:scale-95 disabled:opacity-50 disabled:transform-none shadow-md mb-0.5"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearnSA;
