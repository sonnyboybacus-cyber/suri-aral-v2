
import React from 'react';
import { Question, QuestionOption } from '../../types/questionBank';
import { XIcon, SparklesIcon, CheckCircleIcon } from '../icons';

interface Props {
    original: Partial<Question>;
    improved: Partial<Question>;
    changes: string[];
    onAccept: () => void;
    onCancel: () => void;
}

export const SuggestionModal: React.FC<Props> = ({
    original,
    improved,
    changes,
    onAccept,
    onCancel
}) => {
    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-lg">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">AI Construction & Grammar Review</h3>
                            <p className="text-sm text-slate-500">Review suggested improvements before applying them.</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary of Changes */}
                    {changes.length > 0 ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Suggested Improvements</h4>
                            <ul className="space-y-1">
                                {changes.map((change, idx) => (
                                    <li key={idx} className="text-sm text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                                        <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-center text-slate-500">
                            No significant changes detected. The question looks good!
                        </div>
                    )}

                    {/* Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original */}
                        <div className="space-y-4">
                            <div className="text-xs font-bold text-slate-400 uppercase text-center bg-slate-100 dark:bg-slate-700/50 py-1 rounded-lg">Original</div>

                            {/* Question Text */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question</label>
                                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{original.questionText}</p>
                            </div>

                            {/* Options */}
                            {original.options && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Options</label>
                                    {original.options.map(opt => (
                                        <div key={opt.letter} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex gap-2">
                                            <span className="font-bold text-slate-400 text-xs mt-0.5">{opt.letter}.</span>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{opt.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Explanation */}
                            {original.explanation && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Explanation</label>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{original.explanation}</p>
                                </div>
                            )}
                        </div>

                        {/* Improved */}
                        <div className="space-y-4">
                            <div className="text-xs font-bold text-violet-500 uppercase text-center bg-violet-50 dark:bg-violet-900/20 py-1 rounded-lg">Improved With AI</div>

                            {/* Improved Question Text */}
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-violet-100 dark:border-violet-900/50 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-100 to-transparent dark:from-violet-900/30 opacity-50"></div>
                                <label className="block text-[10px] font-bold text-violet-400 uppercase mb-1">Question</label>
                                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{improved.questionText}</p>
                            </div>

                            {/* Improved Options */}
                            {improved.options && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-violet-400 uppercase">Options</label>
                                    {improved.options.map(opt => (
                                        <div key={opt.letter} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-violet-100 dark:border-violet-900/50 flex gap-2 items-start">
                                            <span className="font-bold text-violet-500 text-xs mt-0.5">{opt.letter}.</span>
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{opt.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Improved Explanation */}
                            {improved.explanation && (
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-violet-100 dark:border-violet-900/50">
                                    <label className="block text-[10px] font-bold text-violet-400 uppercase mb-1">Explanation</label>
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{improved.explanation}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                    >
                        Keep Original
                    </button>
                    <button
                        onClick={onAccept}
                        className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Apply Improvements
                    </button>
                </div>
            </div>
        </div>
    );
};
