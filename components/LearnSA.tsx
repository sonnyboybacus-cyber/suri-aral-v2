
import React, { useState, useRef, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { Curriculum, ChatMessage, LearningModule, GamificationProfile, UserDailyMissions, Subject, LearningStyle, LearningJourney, LearnSAContext } from '../types';
import { generateCurriculum, createTutorChat, sendMessageToTutor } from '../services/ai/tutorService';
import { generateSpeech, rewriteForAudio } from '../services/ai/audioService';
import { subscribeToGamification, subscribeToMissions, getDailyMissions, loadSubjects, loadLearningJourneys, saveLearningJourney, updateLearningJourneyProgress, deleteLearningJourney, awardXP } from '../services/databaseService';
import { GamificationBar } from './GamificationBar';
import { BrainCircuitIcon, SparklesIcon, SendIcon, UserIcon, BotIcon, ChevronDownIcon, LockIcon, CheckCircleIcon, PaperclipIcon, XIcon, SpinnerIcon, AlertTriangleIcon, MenuIcon, BookOpenIcon, GridIcon, TrashIcon, PlusIcon, SpeakerIcon } from './icons';
import { BlockMath, InlineMath } from './MathRenderer';

interface LearnSAProps {
    user: firebase.User;
    initialContext?: LearnSAContext | null;
}

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

async function decodeAudioData(base64Data: string, ctx: AudioContext): Promise<AudioBuffer> {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
        float32[i] = dataInt16[i] / 32768.0;
    }
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    return buffer;
}

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface TutorBubbleProps {
    content: string;
    role: string;
    onPlayAudio: (text: string) => void | Promise<void>;
    isPlayingAudio: boolean;
    isAudioLoading: boolean;
}

const RenderWithMath = ({ text, className = "" }: { text: string, className?: string }) => {
    if (!text) return null;
    let processedText = text;
    if (!text.includes('$')) {
        const mathPattern = /(?:\\(?:frac|lim|int|sum|prod|sqrt|sin|cos|tan|theta|alpha|beta|pi|infty|sigma|delta|gamma|omega))/;
        if (mathPattern.test(text)) {
            processedText = processedText.replace(
                /(?<!\$)\\(lim|int|sum|prod|frac|sqrt|sin|cos|tan|theta|alpha|beta|pi|infty|sigma|delta|gamma|omega)(?:_\{[^}]+\}|_[a-zA-Z0-9])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*/g,
                (match) => `$${match}$`
            );
            if (text.trim().startsWith('\\') && !processedText.includes('$')) {
                 processedText = `$$${text}$$`;
            }
        }
    }
    const parts = processedText.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <div key={i} className="my-4 overflow-x-auto flex justify-center"><BlockMath math={part.slice(2, -2)} /></div>;
                }
                if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={i} math={part.slice(1, -1)} />;
                }
                const subParts = part.split(/(\*\*.*?\*\*)/g);
                return (
                    <span key={i}>
                        {subParts.map((sub, j) => {
                            if (sub.startsWith('**') && sub.endsWith('**')) {
                                return <strong key={j} className="font-bold text-indigo-900 dark:text-indigo-300">{sub.slice(2, -2)}</strong>;
                            }
                            return sub;
                        })}
                    </span>
                );
            })}
        </span>
    );
};

const TutorBubble: React.FC<TutorBubbleProps> = ({ content, role, onPlayAudio, isPlayingAudio, isAudioLoading }) => {
    const isUser = role === 'user';
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
                    <RenderWithMath text={content} />
                    {!isUser && (
                        <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                            <button 
                                onClick={() => onPlayAudio(content)}
                                disabled={isPlayingAudio || isAudioLoading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors"
                            >
                                {isPlayingAudio ? <Waveform /> : isAudioLoading ? <SpinnerIcon className="w-2 h-2 animate-spin text-indigo-500" /> : <><SpeakerIcon className="w-3 h-3" /> Listen</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const LearnSA = ({ user, initialContext }: LearnSAProps) => {
    const [view, setView] = useState<'library' | 'creator' | 'classroom'>('library');
    
    const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
    const [dailyMissions, setDailyMissions] = useState<UserDailyMissions | null>(null);
    const [savedJourneys, setSavedJourneys] = useState<LearningJourney[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
    
    const [topicInput, setTopicInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [learningStyle, setLearningStyle] = useState<LearningStyle>('Academic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Linked Context State
    const [linkedContextData, setLinkedContextData] = useState<string>('');
    const [linkedSubjectId, setLinkedSubjectId] = useState<string | undefined>(undefined);
    const [linkedWeekId, setLinkedWeekId] = useState<string | undefined>(undefined);

    const [activeJourney, setActiveJourney] = useState<LearningJourney | null>(null);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isMobileModulesOpen, setIsMobileModulesOpen] = useState(false);
    
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const subData = await loadSubjects();
                setSubjects(subData.filter(s => !s.deletedAt));
                
                const journeys = await loadLearningJourneys(user.uid);
                setSavedJourneys(journeys.sort((a, b) => b.lastAccessed - a.lastAccessed));
                
                setIsLoadingLibrary(false);
            } catch (e) {
                console.error(e);
            }
        };
        init();

        const unsubGame = subscribeToGamification(user.uid, setGamificationProfile);
        const unsubMissions = subscribeToMissions(user.uid, setDailyMissions);
        getDailyMissions(user.uid).then(setDailyMissions);

        return () => { unsubGame(); unsubMissions(); };
    }, [user]);

    useEffect(() => {
        if (initialContext) {
            setTopicInput(initialContext.topic);
            setLinkedContextData(initialContext.contextData);
            setLinkedSubjectId(initialContext.subjectId);
            setLinkedWeekId(initialContext.weekId);
            setView('creator');
        }
    }, [initialContext]);

    useEffect(() => {
        if (view === 'classroom') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, view]);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    };

    const handleDeleteJourney = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this course?")) {
            await deleteLearningJourney(user.uid, id);
            setSavedJourneys(prev => prev.filter(j => j.id !== id));
        }
    };

    const handleCreateJourney = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicInput.trim() && !selectedFile) return;

        setIsGenerating(true);
        setErrorMsg(null);

        try {
            let fileData = undefined;
            if (selectedFile) {
                const base64 = await readFileAsBase64(selectedFile);
                fileData = { mimeType: selectedFile.type, data: base64 };
            }

            const curriculum = await generateCurriculum(
                topicInput || "Uploaded Content", 
                fileData, 
                linkedContextData, 
                learningStyle
            );

            const newJourneyId = await saveLearningJourney(user.uid, curriculum, learningStyle);
            const newJourney: LearningJourney = {
                id: newJourneyId,
                topic: curriculum.topic,
                style: learningStyle,
                totalModules: curriculum.modules.length,
                completedModules: 0,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                curriculumData: curriculum,
                linkedSubjectId,
                linkedWeekId
            };

            setSavedJourneys(prev => [newJourney, ...prev]);
            setActiveJourney(newJourney);
            setChatMessages([]);
            setView('classroom');
            
            // Clear context
            setLinkedContextData('');
            setLinkedSubjectId(undefined);
            setLinkedWeekId(undefined);

        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || "Failed to create course.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnterClassroom = (journey: LearningJourney) => {
        setActiveJourney(journey);
        setChatMessages([]); 
        setActiveModuleId(null);
        setView('classroom');
        createTutorChat('sa_tutor', 'detailed', 'english', `Topic: ${journey.topic}. Style: ${journey.style}`);
    };

    const handleStartModule = async (module: LearningModule) => {
        if (module.status === 'locked') return;
        
        setActiveModuleId(module.id);
        setIsChatLoading(true);
        setIsMobileModulesOpen(false);

        const prompt = `Starting Module ${module.order}: "${module.title}". 
        Description: ${module.description}. 
        Please introduce this topic using the "${activeJourney?.style}" learning style.`;

        try {
            const response = await sendMessageToTutor(prompt);
            setChatMessages([{ role: 'model', content: response.text }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleCompleteModule = async () => {
        if (!activeJourney || !activeModuleId) return;
        
        const currentModules = [...activeJourney.curriculumData.modules];
        const modIndex = currentModules.findIndex(m => m.id === activeModuleId);
        
        if (modIndex > -1) {
            currentModules[modIndex].status = 'completed';
            if (modIndex + 1 < currentModules.length) {
                currentModules[modIndex + 1].status = 'active';
            }

            const completedCount = currentModules.filter(m => m.status === 'completed').length;
            const updatedCurriculum = { ...activeJourney.curriculumData, modules: currentModules };

            const updatedJourney = { ...activeJourney, completedModules: completedCount, curriculumData: updatedCurriculum };
            setActiveJourney(updatedJourney);
            setSavedJourneys(prev => prev.map(j => j.id === updatedJourney.id ? updatedJourney : j));

            await updateLearningJourneyProgress(user.uid, activeJourney.id, completedCount, updatedCurriculum);
            await awardXP(user.uid, 100);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsChatLoading(true);

        try {
            const response = await sendMessageToTutor(userMsg);
            setChatMessages(prev => [...prev, { role: 'model', content: response.text }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handlePlayAudio = async (text: string) => {
        if (isPlayingAudio) {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }
            setIsPlayingAudio(false);
            return;
        }
        setIsAudioLoading(true);
        try {
            const audioText = await rewriteForAudio(text);
            const base64Audio = await generateSpeech(audioText);
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') await ctx.resume();
            const buffer = await decodeAudioData(base64Audio, ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => { setIsPlayingAudio(false); audioSourceRef.current = null; };
            audioSourceRef.current = source;
            source.start(0);
            setIsPlayingAudio(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAudioLoading(false);
        }
    };

    if (view === 'library') {
        return (
            <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">My Learning Journeys</h1>
                        <p className="text-slate-500 dark:text-slate-400">Continue where you left off or explore new topics.</p>
                    </div>
                    <button 
                        onClick={() => {
                            setLinkedContextData('');
                            setLinkedSubjectId(undefined);
                            setLinkedWeekId(undefined);
                            setTopicInput('');
                            setView('creator');
                        }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" /> New Course
                    </button>
                </header>

                {isLoadingLibrary ? (
                    <div className="flex justify-center py-20"><SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500"/></div>
                ) : savedJourneys.length === 0 ? (
                    <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <BrainCircuitIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">No Active Courses</h3>
                        <p className="text-sm text-slate-400 mb-6">Start your first AI-powered learning journey today.</p>
                        <button onClick={() => setView('creator')} className="text-indigo-600 font-bold hover:underline">Create Course</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedJourneys.map(journey => {
                            const percent = Math.round((journey.completedModules / journey.totalModules) * 100);
                            return (
                                <div key={journey.id} onClick={() => handleEnterClassroom(journey)} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${percent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                                    <div className="flex justify-between items-start mb-4 pl-3">
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-md">{journey.style}</span>
                                            {journey.linkedSubjectId && (
                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1">
                                                    <CheckCircleIcon className="w-3 h-3" /> Official
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={(e) => handleDeleteJourney(e, journey.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 pl-3 line-clamp-2 h-14">{journey.topic}</h3>
                                    <div className="pl-3 mt-4">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                            <span>Progress</span>
                                            <span>{percent}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">{journey.completedModules} of {journey.totalModules} Modules</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'creator') {
        return (
            <div className="flex items-center justify-center min-h-full p-4">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-up">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Design Your Course</h2>
                        <button onClick={() => setView('library')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6"/></button>
                    </div>
                    
                    <form onSubmit={handleCreateJourney} className="p-8 space-y-8">
                        {errorMsg && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
                                <AlertTriangleIcon className="w-5 h-5"/> {errorMsg}
                            </div>
                        )}

                        {linkedContextData ? (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-green-800 dark:text-green-200 mb-1">Curriculum Aligned Mode</h4>
                                    <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                                        This course will be strictly generated based on the official learning competencies and standards from the selected subject module.
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">1. Topic</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={topicInput}
                                    onChange={e => setTopicInput(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none pl-12"
                                    placeholder="e.g. Advanced Calculus, History of Rome..."
                                    autoFocus
                                    disabled={!!linkedContextData} 
                                />
                                <BrainCircuitIcon className="absolute left-4 top-4.5 w-5 h-5 text-indigo-500"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">2. Learning Style</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'Academic', icon: <BookOpenIcon className="w-5 h-5"/>, desc: "Formal, rigorous, detailed" },
                                    { id: 'Socratic', icon: <UserIcon className="w-5 h-5"/>, desc: "Guided by questions" },
                                    { id: 'ELI5', icon: <SparklesIcon className="w-5 h-5"/>, desc: "Simple analogies" },
                                    { id: 'Practical', icon: <GridIcon className="w-5 h-5"/>, desc: "Real-world application" }
                                ].map(style => (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => setLearningStyle(style.id as any)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${learningStyle === style.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1 font-bold">
                                            {style.icon} {style.id}
                                        </div>
                                        <div className="text-xs opacity-70">{style.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!linkedContextData && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">3. Source Material (Optional)</label>
                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${selectedFile ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                                    <input type="file" className="hidden" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} accept=".pdf,image/*,text/plain" />
                                    {selectedFile ? (
                                        <div className="flex items-center gap-2 text-indigo-600 font-bold"><PaperclipIcon className="w-4 h-4"/> {selectedFile.name}</div>
                                    ) : (
                                        <div className="text-slate-400 text-sm font-medium flex flex-col items-center gap-1"><PlusIcon className="w-6 h-6"/> <span>Upload PDF or Image</span></div>
                                    )}
                                </label>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isGenerating || (!topicInput.trim() && !selectedFile)}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5"/>}
                            {isGenerating ? 'Designing Curriculum...' : 'Start Learning Journey'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 relative">
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('library')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <ChevronDownIcon className="w-5 h-5 rotate-90 text-slate-500"/>
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{activeJourney?.topic}</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{activeJourney?.style} Mode</p>
                            {activeJourney?.linkedSubjectId && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-bold uppercase">Official</span>}
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsMobileModulesOpen(!isMobileModulesOpen)} className="md:hidden p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <MenuIcon className="w-5 h-5"/>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={`absolute md:relative inset-y-0 left-0 w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 z-30 ${isMobileModulesOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Course Progress</span>
                            <span>{Math.round(((activeJourney?.completedModules || 0) / (activeJourney?.totalModules || 1)) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${((activeJourney?.completedModules || 0) / (activeJourney?.totalModules || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {activeJourney?.curriculumData.modules.map((mod, idx) => {
                            const isActive = activeModuleId === mod.id;
                            const isLocked = mod.status === 'locked';
                            const isDone = mod.status === 'completed';
                            
                            return (
                                <div 
                                    key={mod.id} 
                                    onClick={() => handleStartModule(mod)}
                                    className={`p-4 rounded-xl border transition-all relative ${
                                        isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500' :
                                        isLocked ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed' :
                                        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 cursor-pointer'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Module {idx + 1}</span>
                                        {isDone && <CheckCircleIcon className="w-4 h-4 text-green-500"/>}
                                        {isLocked && <LockIcon className="w-3 h-3 text-slate-400"/>}
                                    </div>
                                    <h4 className={`font-bold text-sm leading-tight ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{mod.title}</h4>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                        {gamificationProfile && <GamificationBar profile={gamificationProfile} userName={user.displayName || 'Student'} />}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative w-full">
                    {!activeModuleId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <BookOpenIcon className="w-16 h-16 text-slate-300 mb-4"/>
                            <p className="text-lg font-medium text-slate-500">Select an active module to begin.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar pb-32">
                                {chatMessages.map((msg, idx) => (
                                    <TutorBubble 
                                        key={idx} 
                                        content={msg.content} 
                                        role={msg.role} 
                                        onPlayAudio={handlePlayAudio}
                                        isPlayingAudio={isPlayingAudio}
                                        isAudioLoading={isAudioLoading}
                                    />
                                ))}
                                {isChatLoading && (
                                    <div className="flex gap-3 animate-pulse max-w-3xl mx-auto">
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200"></div>
                                        <div className="h-10 w-24 bg-white/50 rounded-xl"></div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            <div className="p-4 md:p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                <div className="max-w-3xl mx-auto space-y-4">
                                    {activeJourney?.curriculumData.modules.find(m => m.id === activeModuleId)?.status !== 'completed' && (
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={handleCompleteModule}
                                                className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" /> Mark Module Complete
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ask a question or respond..."
                                            className="flex-1 p-4 bg-slate-100 dark:bg-slate-900 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner text-slate-800 dark:text-white placeholder-slate-400"
                                            disabled={isChatLoading}
                                            autoFocus
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || isChatLoading}
                                            className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <SendIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
