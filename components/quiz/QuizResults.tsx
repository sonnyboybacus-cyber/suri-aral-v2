
import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { CheckCircleIcon, XIcon, BrainCircuitIcon, RefreshIcon, SpinnerIcon, ArrowDownIcon, SparklesIcon, FileTextIcon, CopyIcon } from '../icons';
import { analyzeKnowledgeGaps } from '../../services/geminiService';

interface QuizResultsProps {
    questions: QuizQuestion[];
    answers: Record<string, string>;
    results: Record<string, boolean>;
    onRetry: () => void;
    onReviewQuestion: (index: number) => void;
}

// Helper for Syntax Highlighting JSON
const SyntaxHighlighter = ({ data }: { data: any }) => {
    const json = JSON.stringify(data, null, 2);
    
    const highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-amber-500 dark:text-amber-400'; // Number
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-sky-600 dark:text-sky-400 font-bold'; // Key
                if (match.includes('"formulaContext"')) cls = 'text-pink-600 dark:text-pink-400 font-bold';
                if (match.includes('"correctAnswer"')) cls = 'text-emerald-600 dark:text-emerald-400 font-bold';
            } else {
                cls = 'text-green-600 dark:text-green-300'; // String
                // Highlight LaTeX content specifically for educational visibility
                if (match.includes('\\\\')) cls = 'text-purple-600 dark:text-purple-300';
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400 font-bold'; // Boolean
        } else if (/null/.test(match)) {
            cls = 'text-gray-500'; // Null
        }
        return `<span class="${cls}">${match}</span>`;
    });

    return (
        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap font-medium text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: highlighted }}></pre>
    );
};

export const QuizResults = ({ questions, answers, results, onRetry, onReviewQuestion }: QuizResultsProps) => {
    const total = questions.length;
    const correctCount = Object.values(results).filter(Boolean).length;
    const score = Math.round((correctCount / total) * 100);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [gapAnalysis, setGapAnalysis] = useState<{ summary: string, gaps: string[], recommendation: string } | null>(null);
    const [showJson, setShowJson] = useState(false);
    const [copied, setCopied] = useState(false);

    const getGrade = (s: number) => {
        if (s >= 90) return 'A';
        if (s >= 80) return 'B';
        if (s >= 70) return 'C';
        if (s >= 60) return 'D';
        return 'F';
    };

    const grade = getGrade(score);
    const colorClass = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';

    const handleGapAnalysis = async () => {
        setIsAnalyzing(true);
        const mistakes = questions
            .filter(q => !results[q.id])
            .map(q => ({
                question: q.questionText,
                userAnswer: answers[q.id] || "No Answer",
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            }));
        
        if (mistakes.length === 0) {
            setGapAnalysis({
                summary: "Perfect score! No gaps detected.",
                gaps: [],
                recommendation: "Proceed to the next difficulty level."
            });
            setIsAnalyzing(false);
            return;
        }

        try {
            const analysis = await analyzeKnowledgeGaps(mistakes);
            setGapAnalysis(analysis);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCopyJson = () => {
        navigator.clipboard.writeText(JSON.stringify(questions, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto w-full animate-fade-in-up pb-12">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                
                {/* Header Scorecard */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 text-center border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Assessment Complete</h2>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                             <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-700"/>
                                <circle 
                                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                                    strokeDasharray="283" 
                                    strokeDashoffset={283 - (283 * score / 100)} 
                                    className={`${colorClass} transition-all duration-1000 ease-out transform -rotate-90 origin-center`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-black ${colorClass}`}>{score}%</span>
                                <span className="text-sm font-bold text-slate-400 mt-1">Grade {grade}</span>
                            </div>
                        </div>

                        <div className="text-left space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{correctCount}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Correct</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600">
                                    <XIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{total - correctCount}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Incorrect</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question Grid */}
                <div className="p-8">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Question Review</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                        {questions.map((q, i) => (
                            <button 
                                key={i}
                                onClick={() => onReviewQuestion(i)}
                                className={`aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-transform hover:scale-110 ${
                                    results[q.id] 
                                    ? 'bg-green-500 text-white shadow-green-500/30 shadow-md' 
                                    : 'bg-red-500 text-white shadow-red-500/30 shadow-md'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Insights */}
                <div className="p-8 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                            <BrainCircuitIcon className="w-6 h-6 text-indigo-500" /> Knowledge Gap Analysis
                        </h3>
                        {!gapAnalysis && (
                            <button 
                                onClick={handleGapAnalysis}
                                disabled={isAnalyzing}
                                className="px-5 py-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg shadow-sm text-sm flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                {isAnalyzing ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                Analyze Weakness
                            </button>
                        )}
                    </div>

                    {gapAnalysis && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {gapAnalysis.summary}
                                </p>
                            </div>
                            
                            {gapAnalysis.gaps.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
                                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-3">Detected Gaps</h4>
                                        <ul className="space-y-2">
                                            {gapAnalysis.gaps.map((gap, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                    <ArrowDownIcon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                                    {gap}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3">Recommended Action</h4>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {gapAnalysis.recommendation}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* JSON Data Inspector (Visualized) */}
                <div className="bg-slate-100 dark:bg-black/30 border-t border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setShowJson(!showJson)}
                        className="w-full py-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        <FileTextIcon className="w-4 h-4" />
                        {showJson ? 'Hide' : 'Show'} Underlying Data Structure
                    </button>
                    
                    {showJson && (
                        <div className="p-6 animate-fade-in border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1117]">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">JSON Object Model</h4>
                                    <p className="text-[10px] text-slate-500">
                                        Visualizing the "JSON as Container" pattern with Formula Context highlighted.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleCopyJson}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                >
                                    {copied ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500"/> : <CopyIcon className="w-3.5 h-3.5"/>}
                                    {copied ? 'Copied' : 'Copy Data'}
                                </button>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0d1117] p-4 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                                <SyntaxHighlighter data={questions} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 flex justify-center border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button 
                        onClick={onRetry}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
                    >
                        <RefreshIcon className="w-5 h-5" />
                        Start New Quiz
                    </button>
                </div>
            </div>
        </div>
    );
};
