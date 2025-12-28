// =========================================================================
// QUESTION EDITOR COMPONENT
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Question, QuestionOption, QuestionType } from '../../types/questionBank';
import { XIcon, PlusIcon, TrashIcon, SpinnerIcon, CheckCircleIcon, SparklesIcon, WandIcon } from '../icons';
import { improveQuestionWithAI } from '../../services/ai/questionBankService';
import { SuggestionModal } from './SuggestionModal';

interface Props {
    question: Question | null;  // null = create new
    defaultMetadata: {
        subject: string;
        gradeLevel: string;
    };
    onSave: (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed'>) => Promise<void>;
    onClose: () => void;
    isSaving: boolean;
    onAISolve: (question: string, options?: string[], type?: any) => Promise<{ correctAnswer: string; explanation: string }>;
}

// Constants for question types
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'identification', label: 'Identification' },
    { value: 'essay', label: 'Essay' }
];

export const QuestionEditor: React.FC<Props> = ({
    question,
    defaultMetadata,
    onSave,
    onClose,
    isSaving,
    onAISolve = async () => ({ correctAnswer: '', explanation: '' })
}) => {
    const [form, setForm] = useState({
        questionText: '',
        questionType: 'multiple_choice' as QuestionType,
        options: [
            { letter: 'A' as const, text: '' },
            { letter: 'B' as const, text: '' },
            { letter: 'C' as const, text: '' },
            { letter: 'D' as const, text: '' }
        ] as QuestionOption[],
        correctAnswer: '',
        explanation: '',
        subject: defaultMetadata.subject,
        gradeLevel: defaultMetadata.gradeLevel,
        quarter: '1st Quarter',
        tags: [] as string[]
    });

    const [isSolving, setIsSolving] = useState(false);
    const [isImproving, setIsImproving] = useState(false);

    // Restoration of improvement state if mistakenly removed
    const [improvementResult, setImprovementResult] = useState<{ improved: Partial<Question>, changes: string[] } | null>(null);
    // Auto-Map Logic Removed (Moved to TOS)

    // Populate form if editing
    useEffect(() => {
        if (question) {
            setForm({
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options || [
                    { letter: 'A', text: '' },
                    { letter: 'B', text: '' },
                    { letter: 'C', text: '' },
                    { letter: 'D' as const, text: '' }
                ],
                correctAnswer: question.correctAnswer,
                explanation: question.explanation || '',
                subject: question.subject,
                gradeLevel: question.gradeLevel,
                quarter: question.quarter || '1st Quarter',
                tags: question.tags || []
            });
        }
    }, [question]);

    const handleOptionChange = (letter: 'A' | 'B' | 'C' | 'D', text: string) => {
        setForm(prev => ({
            ...prev,
            options: prev.options.map(opt =>
                opt.letter === letter ? { ...opt, text } : opt
            )
        }));
    };

    const handleAutoSolve = async () => {
        if (!form.questionText) {
            alert('Please enter a question first.');
            return;
        }

        setIsSolving(true);
        try {
            const options = form.questionType === 'multiple_choice'
                ? form.options.map(o => `${o.letter}) ${o.text}`)
                : undefined;

            const result = await onAISolve(form.questionText, options, form.questionType);

            setForm(prev => ({
                ...prev,
                correctAnswer: formatAIAnswer(result.correctAnswer, form.questionType, prev.options),
                explanation: result.explanation
            }));
        } catch (e) {
            alert('AI could not solve this question. Please try again or fill manually.');
        } finally {
            setIsSolving(false);
        }
    };

    const formatAIAnswer = (aiAnswer: string, type: QuestionType, options: QuestionOption[]) => {
        if (type === 'multiple_choice') {
            // Try to match if AI gave full text or just letter
            const clean = aiAnswer.trim().toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(clean)) return clean;

            // Try to match text
            const match = options.find(o => aiAnswer.includes(o.text) || o.text.includes(aiAnswer));
            return match ? match.letter : aiAnswer; // Fallback
        }
        if (type === 'true_false') {
            const clean = aiAnswer.toLowerCase();
            if (clean.includes('true')) return 'True';
            if (clean.includes('false')) return 'False';
        }
        return aiAnswer;
    };

    const handleImproveQuestion = async () => {
        if (!form.questionText) {
            alert('Please enter a question first.');
            return;
        }

        setIsImproving(true);
        try {
            const currentQuestion: Partial<Question> = {
                questionText: form.questionText,
                questionType: form.questionType,
                options: form.questionType === 'multiple_choice' ? form.options : undefined,
                correctAnswer: form.correctAnswer,
                explanation: form.explanation,
            };

            const result = await improveQuestionWithAI(currentQuestion);
            setImprovementResult(result);
        } catch (e: any) {
            console.error("Improvement handling error:", e);
            alert(`Failed to improve question: ${e.message || "Unknown error"}`);
        } finally {
            setIsImproving(false);
        }
    };

    const applyImprovement = () => {
        if (!improvementResult) return;
        const { improved } = improvementResult;

        setForm(prev => ({
            ...prev,
            questionText: improved.questionText || prev.questionText,
            options: improved.options ? improved.options.map(o => ({
                letter: o.letter as any,
                text: o.text
            })) : prev.options,
            explanation: improved.explanation || prev.explanation
        }));
        setImprovementResult(null);
    };

    const handleSubmit = async () => {
        if (!form.questionText.trim()) {
            alert('Please enter a question');
            return;
        }
        if (form.questionType === 'multiple_choice' && !form.correctAnswer) {
            alert('Please select a correct answer');
            return;
        }

        await onSave({
            questionText: form.questionText,
            questionType: form.questionType,
            options: form.questionType === 'multiple_choice' ? form.options : undefined,
            correctAnswer: form.correctAnswer,
            explanation: form.explanation,
            subject: form.subject,
            gradeLevel: form.gradeLevel,
            createdBy: '', // Will be set by hook
            tags: form.tags,
            quarter: form.quarter,
            cognitiveLevel: 'Understanding', // Default value
            difficultyLevel: 'Average' // Default value
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {question ? 'Edit Question' : 'Add New Question'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Question Type */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Question Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleImproveQuestion}
                                    disabled={isImproving || !form.questionText}
                                    className="flex items-center gap-2 px-3 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-300 rounded-lg text-xs font-bold hover:bg-fuchsia-200 transition-colors disabled:opacity-50"
                                    title="Improve Grammar & Structure"
                                >
                                    <WandIcon className={`w-3 h-3 ${isImproving ? 'animate-pulse' : ''}`} />
                                    {isImproving ? 'Improving...' : 'Fix Grammar'}
                                </button>
                                <button
                                    onClick={handleAutoSolve}
                                    disabled={isSolving || !form.questionText}
                                    className="flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-lg text-xs font-bold hover:bg-violet-200 transition-colors disabled:opacity-50"
                                >
                                    <SparklesIcon className={`w-3 h-3 ${isSolving ? 'animate-spin' : ''}`} />
                                    {isSolving ? 'Solving...' : 'Ask AI to Answer'}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {QUESTION_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setForm(prev => ({ ...prev, questionType: type.value }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.questionType === type.value
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Question *</label>
                        <textarea
                            value={form.questionText}
                            onChange={e => setForm(prev => ({ ...prev, questionText: e.target.value }))}
                            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none h-32 placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Enter your question here..."
                        />
                    </div>

                    {/* Options (for Multiple Choice) */}
                    {form.questionType === 'multiple_choice' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Options</label>
                            <div className="space-y-3">
                                {form.options.map(opt => (
                                    <div key={opt.letter} className="flex items-center gap-3">
                                        <button
                                            onClick={() => setForm(prev => ({ ...prev, correctAnswer: opt.letter }))}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${form.correctAnswer === opt.letter
                                                ? 'bg-green-500 text-white ring-2 ring-green-300'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                }`}
                                            title={form.correctAnswer === opt.letter ? 'Correct Answer' : 'Click to set as correct'}
                                        >
                                            {opt.letter}
                                        </button>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={e => handleOptionChange(opt.letter, e.target.value)}
                                            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500"
                                            placeholder={`Option ${opt.letter}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Click the letter to mark the correct answer</p>
                        </div>
                    )}

                    {/* True/False Answer */}
                    {form.questionType === 'true_false' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correct Answer</label>
                            <div className="flex gap-3">
                                {['True', 'False'].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setForm(prev => ({ ...prev, correctAnswer: val }))}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${form.correctAnswer === val
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Identification/Essay Answer */}
                    {(form.questionType === 'identification' || form.questionType === 'essay') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                {form.questionType === 'identification' ? 'Correct Answer' : 'Model Answer / Rubric'}
                            </label>
                            <textarea
                                value={form.correctAnswer}
                                onChange={e => setForm(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none h-24 placeholder-slate-400 dark:placeholder-slate-500"
                                placeholder={form.questionType === 'identification' ? 'Enter the correct answer' : 'Enter model answer or grading rubric'}
                            />
                        </div>
                    )}

                    {/* Explanation */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Explanation (Optional)</label>
                        <textarea
                            value={form.explanation}
                            onChange={e => setForm(prev => ({ ...prev, explanation: e.target.value }))}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none h-20 placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Why is this the correct answer?"
                        />
                    </div>

                    {/* Competency Selection REMOVED */}

                    {/* Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quarter</label>
                            <select
                                value={form.quarter}
                                onChange={e => setForm(prev => ({ ...prev, quarter: e.target.value }))}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                            >
                                {['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'].map(q => (
                                    <option key={q} value={q} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{q}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center"
                    >
                        {isSaving && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                        {question ? 'Update Question' : 'Add Question'}
                    </button>
                </div>
            </div>
            {improvementResult && (
                <SuggestionModal
                    original={{
                        questionText: form.questionText,
                        options: form.questionType === 'multiple_choice' ? form.options : undefined,
                        explanation: form.explanation
                    }}
                    improved={improvementResult.improved}
                    changes={improvementResult.changes}
                    onAccept={applyImprovement}
                    onCancel={() => setImprovementResult(null)}
                />
            )}
        </div >
    );
};

// Helper Icon for Dropdown (Defining here if not imported, though imported above check)
const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);
