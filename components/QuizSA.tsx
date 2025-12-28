
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { QuizQuestion, QuizResult } from '../types';
import { generateQuizFromTopic, generateQuizFromFile, verifyMathAnswer, getQuizHint } from '../services/geminiService';
import { saveQuizToLibrary, saveQuizResult, loadQuizHistory } from '../services/databaseService';
import { QuizSetup } from './quiz/QuizSetup';
import { ActiveQuiz } from './quiz/ActiveQuiz';
import { QuizResults } from './quiz/QuizResults';
import { XIcon, SparklesIcon, ArrowDownIcon, TrendingUpIcon, HistoryIcon, AlertTriangleIcon, CheckCircleIcon, PlayIcon, PlusIcon, RefreshIcon, BarChart3Icon, TargetIcon, AwardIcon, ZapIcon } from './icons';
import { SmartMathText } from './MathRenderer';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface QuizSAProps {
    user: firebase.User;
}

// --- PERSONALIZED HUB COMPONENT ---
const QuizHub = ({ 
    history, 
    onStartNew, 
    onRetryTopic 
}: { 
    history: QuizResult[], 
    onStartNew: () => void, 
    onRetryTopic: (topic: string) => void 
}) => {
    const { stats, trendData, topicMastery } = useMemo(() => {
        if (history.length === 0) return { 
            stats: { total: 0, avg: 0, mastery: 0 }, 
            trendData: [], 
            topicMastery: [] 
        };
        
        const total = history.length;
        const avg = Math.round(history.reduce((a, b) => a + b.score, 0) / total);
        const mastery = history.filter(h => h.score >= 80).length;
        
        // Prepare Trend Data (Last 10 quizzes, chronological)
        const sortedHistory = [...history].sort((a, b) => a.date - b.date);
        const trendData = sortedHistory.slice(-10).map((h, i) => ({
            name: `Q${i + 1}`,
            score: h.score,
            date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            topic: h.topic
        }));

        // Group by topic to calculate mastery per subject
        const topicMap: Record<string, { totalScore: number, count: number, lastTaken: number }> = {};
        history.forEach(h => {
            // Normalize topic slightly to group similar ones (optional, currently strict)
            const key = h.topic; 
            if (!topicMap[key]) topicMap[key] = { totalScore: 0, count: 0, lastTaken: 0 };
            topicMap[key].totalScore += h.score;
            topicMap[key].count += 1;
            topicMap[key].lastTaken = Math.max(topicMap[key].lastTaken, h.date);
        });

        const topicMastery = Object.entries(topicMap).map(([topic, data]) => ({
            topic,
            avg: Math.round(data.totalScore / data.count),
            count: data.count,
            lastTaken: data.lastTaken
        })).sort((a, b) => a.avg - b.avg); // Sort by lowest score (weakest first)

        return { stats: { total, avg, mastery }, trendData, topicMastery };
    }, [history]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            {/* Header & Welcome */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        Assessment Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Track your performance analytics and mastery progress.
                    </p>
                </div>
                <button 
                    onClick={onStartNew}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" /> Create New Quiz
                </button>
            </div>

            {/* KPI Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <HistoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quizzes</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <TrendingUpIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Score</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.avg}%</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                            <AwardIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mastered</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.mastery} <span className="text-sm font-medium text-slate-400">quizzes</span></h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT: Charts & History */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Performance Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart3Icon className="w-5 h-5 text-indigo-500" /> Performance Trend
                            </h3>
                        </div>
                        <div className="h-[250px] w-full min-w-0">
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: number) => [`${value}%`, 'Score']}
                                            labelFormatter={(label, payload) => payload[0]?.payload.topic || label}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <BarChart3Icon className="w-10 h-10 mb-2" />
                                    <p className="text-sm">Complete quizzes to see your trend.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {history.length > 0 ? (
                                [...history].sort((a, b) => b.date - a.date).slice(0, 5).map((h, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                h.score >= 75 
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                : h.score >= 50 
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {h.score}%
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{h.topic}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(h.date).toLocaleDateString()} • {h.totalItems} items
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onRetryTopic(h.topic)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            title="Retake Quiz"
                                        >
                                            <RefreshIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-sm">No quiz history found.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Subject Mastery & Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <TargetIcon className="w-5 h-5 text-red-500" /> Focus Areas
                        </h3>
                        
                        {topicMastery.length > 0 ? (
                            <div className="space-y-5">
                                {topicMastery.slice(0, 4).map((item, i) => (
                                    <div key={i} className="group">
                                        <div className="flex justify-between items-end mb-1">
                                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={item.topic}>
                                                {item.topic}
                                            </h4>
                                            <span className={`text-xs font-bold ${
                                                item.avg >= 75 ? 'text-green-600' : item.avg >= 50 ? 'text-amber-500' : 'text-red-500'
                                            }`}>{item.avg}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    item.avg >= 75 ? 'bg-green-500' : item.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                }`} 
                                                style={{ width: `${item.avg}%` }}
                                            ></div>
                                        </div>
                                        <button 
                                            onClick={() => onRetryTopic(item.topic)}
                                            className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1 group-hover:border-indigo-200 dark:group-hover:border-indigo-800"
                                        >
                                            <ZapIcon className="w-3 h-3" /> Quick Practice
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <SparklesIcon className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500">Take more quizzes to unlock your mastery insights.</p>
                            </div>
                        )}
                    </div>

                    {/* Motivation / Streak Card (Placeholder for now or simple stat) */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                        <h3 className="font-bold text-lg relative z-10">Keep Learning!</h3>
                        <p className="text-sm text-indigo-100 mt-1 relative z-10 mb-4">Consistency is the key to mastery. Try a new topic today.</p>
                        <button 
                            onClick={onStartNew}
                            className="w-full py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors relative z-10"
                        >
                            Start Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const QuizSA = ({ user }: QuizSAProps) => {
    const [mode, setMode] = useState<'hub' | 'setup' | 'active' | 'results'>('hub');
    const [quizMode, setQuizMode] = useState<'practice' | 'exam'>('practice');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentQuizId, setCurrentQuizId] = useState<string | null>(null); 
    
    // User History Data
    const [history, setHistory] = useState<QuizResult[]>([]);
    
    // Setup State
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState(''); // New Title State
    const [file, setFile] = useState<File | null>(null);
    
    // Quiz Data
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, boolean>>({});
    const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
    
    // Proctor Chat State
    const [activeChatQuestionId, setActiveChatQuestionId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Record<string, { role: 'user' | 'model', content: string }[]>>({});
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Load History on Mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await loadQuizHistory(user.uid);
                setHistory(data.sort((a, b) => b.date - a.date));
            } catch (e) {
                console.error("Failed to load quiz history", e);
            }
        };
        fetchHistory();
    }, [user.uid, mode]); 

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTopic('');
            // Auto-set title to filename if empty
            if (!quizTitle) {
                setQuizTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
            }
            setErrorMsg(null);
        }
    };

    const startQuiz = async () => {
        if (!topic && !file) return;
        
        setLoading(true);
        setErrorMsg(null);
        setCurrentQuizId(null); 
        try {
            let generatedQuestions: QuizQuestion[] = [];
            
            // Determine effective title for saving
            const effectiveTitle = quizTitle || (file ? file.name.replace(/\.[^/.]+$/, "") : (topic.length > 30 ? 'Custom Quiz' : topic));

            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const result = e.target?.result;
                    if (typeof result === 'string') {
                        try {
                            const base64 = result.split(',')[1];
                            generatedQuestions = await generateQuizFromFile(base64, file.type);
                            setQuestions(generatedQuestions);
                            
                            const savedId = await saveQuizToLibrary(user.uid, effectiveTitle, generatedQuestions);
                            setCurrentQuizId(savedId);
                            
                            setMode('active');
                        } catch (err: any) {
                            console.error(err);
                            setErrorMsg("Failed to process file. " + (err.message || ''));
                        } finally {
                            setLoading(false);
                        }
                    }
                };
                reader.readAsDataURL(file);
            } else {
                generatedQuestions = await generateQuizFromTopic(topic);
                setQuestions(generatedQuestions);
                
                const savedId = await saveQuizToLibrary(user.uid, effectiveTitle, generatedQuestions);
                setCurrentQuizId(savedId);
                
                setMode('active');
                setLoading(false);
            }
        } catch (error: any) {
            console.error("Quiz Gen Error:", error);
            setErrorMsg("Failed to generate quiz. Please try again.");
            setLoading(false);
        }
    };
    
    const handleLoadFromLibrary = (qs: QuizQuestion[]) => {
        setQuestions(qs);
        setCurrentQuizId(null); 
        setMode('active');
    };

    const handleAnswer = async (questionId: string, answer: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question) return;

        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        
        let isCorrect = false;
        if (question.type === 'Formula') {
            isCorrect = await verifyMathAnswer(question.correctAnswer, answer);
        } else {
            isCorrect = answer === question.correctAnswer;
        }
        
        setResults(prev => ({ ...prev, [questionId]: isCorrect }));
        setShowExplanation(prev => ({ ...prev, [questionId]: true }));
    };

    const handleFinish = async () => {
        setMode('results');
        
        const correctCount = Object.values(results).filter(Boolean).length;
        const score = Math.round((correctCount / questions.length) * 100);
        
        // Determine final title for history
        const effectiveTitle = quizTitle || (file ? file.name.replace(/\.[^/.]+$/, "") : (topic.length > 40 ? 'Subject Quiz' : topic));
        
        await saveQuizResult(user.uid, currentQuizId || 'generated', effectiveTitle, score, questions.length);
    };

    const handleRetry = () => {
        setAnswers({});
        setResults({});
        setShowExplanation({});
        setCurrentIndex(0);
        setMode('active');
    };
    
    const handleNew = () => {
        setQuestions([]);
        setAnswers({});
        setResults({});
        setShowExplanation({});
        setCurrentIndex(0);
        setTopic('');
        setFile(null);
        setQuizTitle('');
        setMode('hub'); // Go back to Hub
    };

    const handleReviewQuestion = (index: number) => {
        setCurrentIndex(index);
        setMode('active');
        setQuizMode('practice'); 
    };

    const toggleChat = (qId: string, context?: string) => {
        if (activeChatQuestionId === qId && !context) {
            setActiveChatQuestionId(null);
        } else {
            setActiveChatQuestionId(qId);
            if (!chatHistory[qId] || chatHistory[qId].length === 0) {
                setChatHistory(prev => ({
                    ...prev,
                    [qId]: [{ role: 'model', content: "I'm your Proctor. What's your thought process on this problem?" }]
                }));
            }
            if (context) {
                handleChatSend(qId, context);
            }
        }
    };

    const handleChatSend = async (questionId: string, textOverride?: string) => {
        const text = textOverride || chatInput;
        if (!text.trim()) return;
        
        setIsChatLoading(true);
        const currentHistory = chatHistory[questionId] || [];
        const newHistory = [...currentHistory, { role: 'user' as const, content: text }];
        
        setChatHistory(prev => ({ ...prev, [questionId]: newHistory }));
        setChatInput('');

        try {
            const question = questions.find(q => q.id === questionId);
            const hint = await getQuizHint(question!, text);
            setChatHistory(prev => ({
                ...prev,
                [questionId]: [...newHistory, { role: 'model' as const, content: hint }]
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsChatLoading(false);
        }
    };

    // New Hub Handlers
    const handleStartFromHub = () => {
        setMode('setup');
        setTopic('');
        setQuizTitle('');
        setFile(null);
    };

    const handleRetryTopicFromHub = (topicToRetry: string) => {
        setTopic(topicToRetry);
        setQuizTitle(topicToRetry); // Pre-fill title
        setMode('setup');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 p-4 md:p-8 overflow-hidden flex flex-col relative">
            
            {/* Return Home Button for deep views */}
            {(mode === 'setup' || mode === 'active' || mode === 'results') && (
                <button 
                    onClick={() => setMode('hub')}
                    className="absolute top-4 left-4 md:left-8 z-50 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    title="Back to Dashboard"
                >
                   <XIcon className="w-5 h-5 text-slate-500" /> 
                </button>
            )}

            {mode === 'hub' && (
                <QuizHub 
                    history={history}
                    onStartNew={handleStartFromHub}
                    onRetryTopic={handleRetryTopicFromHub}
                />
            )}

            {mode === 'setup' && (
                <QuizSetup 
                    topic={topic} 
                    setTopic={setTopic} 
                    quizTitle={quizTitle}
                    setQuizTitle={setQuizTitle}
                    file={file} 
                    setFile={setFile} 
                    loading={loading} 
                    onStart={startQuiz}
                    onLoadFromLibrary={handleLoadFromLibrary}
                    onFileChange={handleFileChange}
                    onClearFile={(e) => { e.stopPropagation(); setFile(null); }}
                    errorMsg={errorMsg}
                    mode={quizMode}
                    setMode={setQuizMode}
                    userId={user.uid}
                />
            )}

            {mode === 'active' && questions.length > 0 && (
                <div className="max-w-7xl mx-auto w-full h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6 relative mt-8">
                    <ActiveQuiz 
                        question={questions[currentIndex]}
                        idx={currentIndex}
                        total={questions.length}
                        onAnswer={handleAnswer}
                        selectedAnswer={answers[questions[currentIndex].id]}
                        isCorrect={results[questions[currentIndex].id]}
                        showExplanation={showExplanation[questions[currentIndex].id]}
                        onToggleChat={toggleChat}
                        isChatOpen={activeChatQuestionId === questions[currentIndex].id}
                        onNext={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        onFinish={handleFinish}
                        mode={quizMode}
                    />

                    {/* Proctor Chat Overlay */}
                    <div className={`transition-all duration-500 ease-in-out flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden fixed md:relative inset-0 z-50 md:inset-auto md:z-auto ${activeChatQuestionId ? 'opacity-100 translate-y-0 md:translate-x-0 md:w-96' : 'opacity-0 translate-y-full md:translate-y-0 md:translate-x-10 md:w-0 border-0 pointer-events-none'}`}>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-indigo-500" /> Proctor
                            </h3>
                            <button onClick={() => setActiveChatQuestionId(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                            {(chatHistory[activeChatQuestionId || ''] || []).map((msg, i) => (
                                <div key={i} className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-sm ml-8' 
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-tl-sm mr-8 shadow-sm'
                                }`}>
                                    <SmartMathText text={msg.content} />
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex gap-1 p-2">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"/>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"/>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"/>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && activeChatQuestionId && handleChatSend(activeChatQuestionId)}
                                    placeholder="Ask for a hint..."
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <button 
                                    onClick={() => activeChatQuestionId && handleChatSend(activeChatQuestionId)}
                                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <ArrowDownIcon className="w-4 h-4 -rotate-90"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mode === 'results' && (
                <div className="mt-8">
                    <QuizResults 
                        questions={questions}
                        answers={answers}
                        results={results}
                        onRetry={handleRetry}
                        onReviewQuestion={handleReviewQuestion}
                    />
                </div>
            )}
            
             {mode === 'results' && (
                <div className="flex justify-center gap-4 pb-8">
                    <button 
                        onClick={handleNew}
                        className="px-6 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-bold"
                    >
                        Return to Dashboard
                    </button>
                </div>
             )}
        </div>
    );
};
