
import React from 'react';
import { QuizQuestion } from '../../types';
import { SmartMathText, BlockMath } from '../MathRenderer';
import { CheckCircleIcon, XIcon, MessageSquareIcon, CalculatorIcon, SparklesIcon } from '../icons';

interface ActiveQuizProps {
    question: QuizQuestion;
    idx: number;
    total: number;
    onAnswer: (qId: string, ans: string) => void;
    selectedAnswer?: string;
    isCorrect?: boolean;
    showExplanation?: boolean;
    onToggleChat: (qId: string, context?: string) => void;
    isChatOpen: boolean;
    onNext: () => void;
    onPrev: () => void;
    onFinish: () => void;
    mode: 'practice' | 'exam';
}

export const ActiveQuiz = ({ 
    question, 
    idx, 
    total, 
    onAnswer, 
    selectedAnswer, 
    isCorrect, 
    showExplanation,
    onToggleChat,
    isChatOpen,
    onNext,
    onPrev,
    onFinish,
    mode
}: ActiveQuizProps) => {
    
    const showImmediateFeedback = mode === 'practice';
    
    return (
        <div className="flex-1 flex flex-col h-full animate-fade-in bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700">
                <div 
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
                    style={{ width: `${((idx + 1) / total) * 100}%` }}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Question {idx + 1} of {total}</span>
                    <div className="flex gap-2">
                         {mode === 'exam' && <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Exam Mode</span>}
                         <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            question.difficulty === 'Hard' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800' : 
                            question.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' : 
                            'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800'
                        }`}>
                            {question.difficulty}
                        </div>
                    </div>
                </div>

                {/* Question Body */}
                <div className="mb-10">
                    <h2 className="text-xl md:text-3xl font-serif font-medium text-slate-900 dark:text-white leading-relaxed">
                        <SmartMathText text={question.questionText} />
                    </h2>
                    
                    {/* Formula Context (Visual Enhancement) */}
                    {question.formulaContext && (
                        <div className="mt-8 animate-fade-in">
                            <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800 group transform transition-all hover:scale-[1.01]">
                                {/* Decorative Grid Background */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                                     style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                </div>
                                
                                <div className="relative z-10 p-6 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-4 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                                        <CalculatorIcon className="w-4 h-4" /> 
                                        Reference Equation
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar py-2 px-4">
                                        <BlockMath math={question.formulaContext} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Options */}
                <div className="space-y-4 max-w-3xl">
                    {question.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswer === opt;
                        const isAnswered = !!selectedAnswer;
                        
                        let statusClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/50";
                        
                        if (isSelected) {
                            if (showImmediateFeedback) {
                                statusClass = isCorrect 
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500" 
                                    : "bg-red-50 dark:bg-red-900/20 border-red-500 ring-1 ring-red-500";
                            } else {
                                statusClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500";
                            }
                        } else if (showImmediateFeedback && isAnswered && opt === question.correctAnswer && !isCorrect) {
                            statusClass = "bg-green-50 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500 border-dashed";
                        }

                        return (
                            <div key={optIdx} className="flex flex-col md:flex-row items-stretch gap-3 group">
                                <button 
                                    onClick={() => !isAnswered && onAnswer(question.id, opt)}
                                    disabled={isAnswered}
                                    className={`flex-1 p-4 md:p-5 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden ${statusClass}`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4 w-full">
                                            <span className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border transition-colors ${
                                                isSelected 
                                                ? (showImmediateFeedback && isCorrect ? 'bg-green-500 border-green-500 text-white' : (showImmediateFeedback ? 'bg-red-500 border-red-500 text-white' : 'bg-indigo-500 border-indigo-500 text-white')) 
                                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500'
                                            }`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className={`text-base md:text-lg font-medium flex-1 ${showImmediateFeedback && isAnswered && opt === question.correctAnswer ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                <SmartMathText text={opt} />
                                            </span>
                                        </div>
                                        {isSelected && showImmediateFeedback && (
                                            isCorrect 
                                            ? <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 ml-3" />
                                            : <XIcon className="w-6 h-6 text-red-500 flex-shrink-0 ml-3" />
                                        )}
                                    </div>
                                </button>
                                
                                {showImmediateFeedback && (
                                    <button
                                        onClick={() => onToggleChat(question.id, `I'm confused about option ${String.fromCharCode(65 + optIdx)}: "${opt}". Can you explain why it is right or wrong?`)}
                                        className={`px-3 py-2 md:py-0 rounded-xl border-2 border-transparent hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all flex md:flex-col items-center justify-center gap-1 ${isChatOpen ? 'opacity-50' : ''}`}
                                        title="Discuss this option"
                                    >
                                        <MessageSquareIcon className="w-5 h-5" />
                                        <span className="text-[9px] font-bold uppercase tracking-wide">Discuss</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Explanation Box */}
                {showExplanation && showImmediateFeedback && (
                    <div className={`mt-10 p-6 rounded-2xl border-l-4 animate-fade-in-up shadow-sm ${isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                {question.type === 'Formula' ? <CalculatorIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                            </div>
                            <h4 className={`font-bold text-lg ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                {isCorrect ? "Correct Analysis" : "Concept Gap Detected"}
                            </h4>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                            <SmartMathText text={question.explanation} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center gap-2">
                <button 
                    onClick={onPrev}
                    disabled={idx === 0}
                    className="px-4 md:px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-sm md:text-base"
                >
                    Prev
                </button>
                
                {showImmediateFeedback && (
                    <button 
                        onClick={() => onToggleChat(question.id)}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                            isChatOpen 
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                            : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        {isChatOpen ? 'Close Proctor' : 'Ask Proctor'}
                    </button>
                )}

                {idx === total - 1 ? (
                    <button 
                        onClick={onFinish}
                        className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-transform hover:scale-105 shadow-lg"
                    >
                        Finish Assessment
                    </button>
                ) : (
                    <button 
                        onClick={onNext}
                        className="px-4 md:px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};
