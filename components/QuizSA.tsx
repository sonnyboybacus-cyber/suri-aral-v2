
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { QuizQuestion } from '../types';
import { generateQuizFromTopic, generateQuizFromFile, verifyMathAnswer, getQuizHint } from '../services/geminiService';
import { PuzzleIcon, UploadIcon, BrainCircuitIcon, CheckCircleIcon, XIcon, ChevronDownIcon, MessageSquareIcon, SparklesIcon, ArrowDownIcon, CalculatorIcon } from './icons';
import { BlockMath, InlineMath } from './MathRenderer';

interface QuizSAProps {
    user: User;
}

// --- HELPER COMPONENTS ---

const RenderWithMath = ({ text, className = "" }: { text: string, className?: string }) => {
    if (!text) return null;

    const trimmed = text.trim();

    // Robust Heuristic for Standalone Complex Math (Auto-detection for raw LaTeX inputs)
    // Catches expressions starting with common LaTeX commands even if not wrapped in $$
    const isStandaloneComplexMath = 
        !trimmed.includes('$') && 
        /(^\\[a-zA-Z]+|\\lim|\\int|\\sum|\\frac)/.test(trimmed) && 
        (trimmed.includes('\\frac') || trimmed.includes('\\lim') || trimmed.includes('\\int') || trimmed.includes('\\sum') || trimmed.length > 30);

    if (isStandaloneComplexMath) {
        return <div className={`my-4 overflow-x-auto flex justify-center ${className}`}><BlockMath math={trimmed} /></div>;
    }

    // 1. Split by Block Math ($$ ... $$) and Inline Math ($ ... $)
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                // Handle Block Math
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <div key={i} className="my-4 overflow-x-auto flex justify-center"><BlockMath math={part.slice(2, -2)} /></div>;
                }
                // Handle Explicit Inline Math
                if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={i} math={part.slice(1, -1)} />;
                }

                // 2. Heuristic for Unwrapped LaTeX within text
                // Catches fragments like "\frac{1}{2}" inside a sentence even if user forgot $...$
                const hasLatexCommand = /\\(lim|int|sum|frac|sqrt|sin|cos|tan|log|ln|infty|alpha|beta|gamma|theta|pi|sigma|mu|partial|cdot|times|div|approx|neq|leq|geq|to|rightarrow|leftarrow|Rightarrow|Leftarrow|implies|subset|in|forall|exists)/.test(part);
                
                // Check for structural indicators (braces, sub/super scripts)
                const hasMathStructure = /[\{\}\^_\\]/.test(part);

                if (hasLatexCommand && hasMathStructure) {
                     // Render unwrapped fragments as inline math
                     return <InlineMath key={i} math={part} />;
                }

                // Render plain text
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

// --- SUB-COMPONENTS (Extracted to prevent re-render bugs) ---

const SetupView = ({ 
    topic, 
    setTopic, 
    file, 
    setFile, 
    loading, 
    onStart, 
    onFileChange, 
    onClearFile 
}: { 
    topic: string, 
    setTopic: (t: string) => void, 
    file: File | null, 
    setFile: (f: File | null) => void, 
    loading: boolean, 
    onStart: () => void, 
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onClearFile: (e: React.MouseEvent) => void
}) => (
    <div className="max-w-2xl mx-auto mt-12 animate-fade-in-up text-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3 transform hover:rotate-6 transition-transform duration-500">
            <PuzzleIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Quiz SA</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            The interactive assessment engine. Upload exam papers or generate topic-based mastery quizzes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mb-10">
            {/* Topic Card */}
            <div 
                className={`p-6 rounded-2xl border-2 transition-all cursor-text group bg-white dark:bg-slate-800 ${!file ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-100'}`}
                onClick={() => setFile(null)}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${!file ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                        <BrainCircuitIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Topic Mastery</h3>
                </div>
                <input 
                    type="text" 
                    placeholder="e.g. Thermodynamics, Calculus..." 
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    disabled={!!file}
                />
            </div>

            {/* File Card */}
            <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer group relative overflow-hidden bg-white dark:bg-slate-800 ${file ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${file ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                        <UploadIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">From Exam Paper</h3>
                </div>
                <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={onFileChange}
                    accept=".pdf,image/*"
                />
                <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 flex items-center justify-between">
                    <span className="truncate font-medium">{file ? file.name : "Upload PDF / Image"}</span>
                    {file && <button onClick={onClearFile} className="z-20 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><XIcon className="w-4 h-4 text-slate-500"/></button>}
                </div>
            </div>
        </div>

        <button 
            onClick={onStart}
            disabled={loading || (!topic && !file)}
            className="w-full max-w-xs py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
        >
            {loading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Initializing Engine...</span>
                </>
            ) : (
                <>
                    <span>Start Assessment</span>
                    <ArrowDownIcon className="w-5 h-5 -rotate-90" />
                </>
            )}
        </button>
    </div>
);

const QuestionCard = ({ 
    question, 
    idx, 
    total, 
    isActive, 
    onAnswer, 
    selectedAnswer, 
    isCorrect, 
    showExplanation,
    onToggleChat,
    isChatOpen,
    onNext,
    onPrev
}: { 
    question: QuizQuestion, 
    idx: number, 
    total: number, 
    isActive: boolean, 
    onAnswer: (qId: string, ans: string) => void,
    selectedAnswer?: string,
    isCorrect?: boolean,
    showExplanation?: boolean,
    onToggleChat: (qId: string, context?: string) => void,
    isChatOpen: boolean,
    onNext: () => void,
    onPrev: () => void
}) => {
    if (!isActive) return null;

    return (
        <div className="flex-1 flex flex-col h-full animate-fade-in bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700">
                <div 
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
                    style={{ width: `${((idx + 1) / total) * 100}%` }}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Question {idx + 1} of {total}</span>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        question.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' : 
                        question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-green-50 text-green-600 border-green-100'
                    }`}>
                        {question.difficulty}
                    </div>
                </div>

                {/* Question Body */}
                <div className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-slate-900 dark:text-white leading-relaxed">
                        <RenderWithMath text={question.questionText} />
                    </h2>
                </div>

                {/* Options */}
                <div className="space-y-4 max-w-3xl">
                    {question.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswer === opt;
                        const isAnswered = !!selectedAnswer;
                        
                        let statusClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/50";
                        if (isSelected) {
                            statusClass = isCorrect 
                                ? "bg-green-50 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500" 
                                : "bg-red-50 dark:bg-red-900/20 border-red-500 ring-1 ring-red-500";
                        } else if (isAnswered && opt === question.correctAnswer && !isCorrect) {
                            statusClass = "bg-green-50 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500 border-dashed";
                        }

                        return (
                            <div key={optIdx} className="flex items-stretch gap-3 group">
                                <button 
                                    onClick={() => !isAnswered && onAnswer(question.id, opt)}
                                    disabled={isAnswered}
                                    className={`flex-1 p-5 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden ${statusClass}`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                                                isSelected 
                                                ? (isCorrect ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white') 
                                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500'
                                            }`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className={`text-lg font-medium ${isAnswered && opt === question.correctAnswer ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                <RenderWithMath text={opt} />
                                            </span>
                                        </div>
                                        {isSelected && (
                                            isCorrect 
                                            ? <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            : <XIcon className="w-6 h-6 text-red-500" />
                                        )}
                                    </div>
                                </button>
                                
                                {/* Per-Option Discuss Toggle */}
                                <button
                                    onClick={() => onToggleChat(question.id, `I'm confused about option ${String.fromCharCode(65 + optIdx)}: "${opt}". Can you explain why it is right or wrong?`)}
                                    className={`px-3 rounded-xl border-2 border-transparent hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-1 ${isChatOpen ? 'opacity-50' : ''}`}
                                    title="Discuss this option"
                                >
                                    <MessageSquareIcon className="w-5 h-5" />
                                    <span className="text-[9px] font-bold uppercase tracking-wide hidden md:block">Discuss</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Logic Evaluation / Explanation */}
                {showExplanation && (
                    <div className={`mt-10 p-6 rounded-2xl border-l-4 animate-fade-in-up ${isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            {question.type === 'Formula' && <CalculatorIcon className="w-5 h-5 text-slate-500"/>}
                            <h4 className={`font-bold text-lg ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                {isCorrect ? "Correct Analysis" : "Concept Gap Detected"}
                            </h4>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                            <RenderWithMath text={question.explanation} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                <button 
                    onClick={onPrev}
                    disabled={idx === 0}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                >
                    Previous
                </button>
                
                <button 
                    onClick={() => onToggleChat(question.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        isChatOpen 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                        : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700'
                    }`}
                >
                    <SparklesIcon className="w-4 h-4" />
                    {isChatOpen ? 'Close Proctor' : 'Ask Proctor'}
                </button>

                <button 
                    onClick={onNext}
                    disabled={idx === total - 1}
                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    Next Question
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const QuizSA = ({ user }: QuizSAProps) => {
    const [mode, setMode] = useState<'setup' | 'active' | 'review'>('setup');
    const [loading, setLoading] = useState(false);
    
    // Setup State
    const [topic, setTopic] = useState('');
    const [file, setFile] = useState<File | null>(null);
    
    // Quiz State
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, boolean>>({});
    const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
    
    // Socratic Chat State
    const [activeChatQuestionId, setActiveChatQuestionId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Record<string, { role: 'user' | 'model', content: string }[]>>({});
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // File Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTopic('');
        }
    };

    const startQuiz = async () => {
        if (!topic && !file) return;
        
        setLoading(true);
        try {
            let generatedQuestions: QuizQuestion[] = [];
            
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const result = e.target?.result;
                    if (typeof result === 'string') {
                        try {
                            const base64 = result.split(',')[1];
                            generatedQuestions = await generateQuizFromFile(base64, file.type);
                            setQuestions(generatedQuestions);
                            setMode('active');
                        } catch (err) {
                            console.error(err);
                            alert("Failed to process file.");
                        } finally {
                            setLoading(false);
                        }
                    }
                };
                reader.readAsDataURL(file);
            } else {
                generatedQuestions = await generateQuizFromTopic(topic);
                setQuestions(generatedQuestions);
                setMode('active');
                setLoading(false);
            }
        } catch (error) {
            console.error("Quiz Gen Error:", error);
            alert("Failed to generate quiz. Please try again.");
            setLoading(false);
        }
    };

    const handleAnswer = async (questionId: string, answer: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question) return;

        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        
        // Python Symbolic Verification Check
        let isCorrect = false;
        if (question.type === 'Formula') {
            // This calls the "SymPy" simulator in Gemini
            isCorrect = await verifyMathAnswer(question.correctAnswer, answer);
        } else {
            isCorrect = answer === question.correctAnswer;
        }
        
        setResults(prev => ({ ...prev, [questionId]: isCorrect }));
        setShowExplanation(prev => ({ ...prev, [questionId]: true }));
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
            // If context is provided (e.g. clicked "Discuss" on Option B), pre-fill or auto-send
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 p-4 md:p-8 overflow-hidden flex flex-col">
            
            {mode === 'setup' && (
                <SetupView 
                    topic={topic} 
                    setTopic={setTopic} 
                    file={file} 
                    setFile={setFile} 
                    loading={loading} 
                    onStart={startQuiz}
                    onFileChange={handleFileChange}
                    onClearFile={(e) => { e.stopPropagation(); setFile(null); }}
                />
            )}

            {mode === 'active' && (
                <div className="max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex gap-6">
                    {/* Main Question Area */}
                    <QuestionCard 
                        question={questions[currentIndex]} 
                        idx={currentIndex}
                        total={questions.length}
                        isActive={true}
                        onAnswer={handleAnswer}
                        selectedAnswer={answers[questions[currentIndex].id]}
                        isCorrect={results[questions[currentIndex].id]}
                        showExplanation={showExplanation[questions[currentIndex].id]}
                        onToggleChat={toggleChat}
                        isChatOpen={activeChatQuestionId === questions[currentIndex].id}
                        onNext={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    />

                    {/* Socratic Chat Drawer */}
                    <div className={`transition-all duration-500 ease-in-out flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ${activeChatQuestionId ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10 border-0'}`}>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-indigo-500" /> Proctor
                            </h3>
                            <button onClick={() => setActiveChatQuestionId(null)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                            {(chatHistory[activeChatQuestionId || ''] || []).map((msg, i) => (
                                <div key={i} className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-sm ml-8' 
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-tl-sm mr-8 shadow-sm'
                                }`}>
                                    <RenderWithMath text={msg.content} />
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

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
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
        </div>
    );
};

export default QuizSA;
