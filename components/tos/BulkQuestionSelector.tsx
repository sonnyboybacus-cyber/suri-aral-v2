import React, { useState, useEffect } from 'react';
import { Question, QuestionBank } from '../../types/questionBank';
import { SearchIcon, CheckSquareIcon, SquareIcon, FilterIcon } from '../icons';
import { loadQuestionsByFilters } from '../../services/db/questionBank';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (questions: Question[]) => void;
    sourceBanks: QuestionBank[];
}

export const BulkQuestionSelector: React.FC<Props> = ({ isOpen, onClose, onSelect, sourceBanks }) => {
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && sourceBanks.length > 0 && !selectedBankId) {
            setSelectedBankId(sourceBanks[0].id);
        }
    }, [isOpen, sourceBanks, selectedBankId]);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!selectedBankId) return;
            setIsLoading(true);
            try {
                // Using existing service to load questions
                const data = await loadQuestionsByFilters(selectedBankId, { searchText: searchTerm });
                setQuestions(data);
            } catch (error) {
                console.error("Failed to load questions", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [selectedBankId, searchTerm]);

    const toggleQuestion = (id: string) => {
        const newSet = new Set(selectedQuestionIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedQuestionIds(newSet);
    };

    const toggleAll = () => {
        if (selectedQuestionIds.size === questions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(questions.map(q => q.id)));
        }
    };

    const handleConfirm = () => {
        const selected = questions.filter(q => selectedQuestionIds.has(q.id));
        onSelect(selected);
        onClose();
        // Reset selection on close? Optional.
        setSelectedQuestionIds(new Set());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Questions</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose questions to add to your TOS</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            {sourceBanks.map(bank => (
                                <option key={bank.id} value={bank.id}>{bank.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-emerald-600">{selectedQuestionIds.size}</span> selected
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No questions found in this bank.</div>
                    ) : (
                        questions.map(q => (
                            <div
                                key={q.id}
                                onClick={() => toggleQuestion(q.id)}
                                className={`group p-4 rounded-xl border cursor-pointer transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 ${selectedQuestionIds.has(q.id)
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedQuestionIds.has(q.id)
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-slate-300 dark:border-slate-600 text-transparent group-hover:border-emerald-400'
                                        }`}>
                                        <CheckSquareIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-900 dark:text-white font-medium line-clamp-2">{q.questionText}</p>
                                        <div className="mt-2 flex gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                {q.questionType.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center">
                    <button
                        onClick={toggleAll}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium px-2"
                    >
                        {selectedQuestionIds.size === questions.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedQuestionIds.size === 0}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Auto-Match & Add ({selectedQuestionIds.size})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
