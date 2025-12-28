// =========================================================================
// QUESTION LIST COMPONENT
// =========================================================================

import React, { useState } from 'react';
import { Question, CognitiveLevel, DifficultyLevel } from '../../types/questionBank';
import { SearchIcon, EditIcon, TrashIcon, SpinnerIcon, ChevronDownIcon, FilterIcon } from '../icons';

interface Filters {
    subject?: string;
    gradeLevel?: string;
    searchText?: string;
    groupBy?: 'none' | 'subject'; // Removed 'competency'
}

interface Props {
    questions: Question[];
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
    onEdit?: (question: Question) => void;
    onDelete?: (questionId: string) => void;
    isLoading: boolean;
}

const COGNITIVE_LEVELS: CognitiveLevel[] = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['Easy', 'Average', 'Difficult'];

export const QuestionList: React.FC<Props> = ({
    questions,
    filters,
    onFilterChange,
    onEdit,
    onDelete,
    isLoading
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters, questions]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    // Pagination Logic
    const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visibleQuestions = questions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Grouping Logic (Applied to VISIBLE questions only)
    const groupedQuestions = React.useMemo(() => {
        if (!filters.groupBy || filters.groupBy === 'none') {
            return { 'All Questions': visibleQuestions };
        }
        const groups: Record<string, Question[]> = {};
        visibleQuestions.forEach(q => {
            const key = (q.subject || 'Uncategorized'); // Removed competency grouping logic
            if (!groups[key]) groups[key] = [];
            groups[key].push(q);
        });
        return groups;
    }, [visibleQuestions, filters.groupBy]);

    // Helper functions removed or unused

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search */}
                <div className="md:col-span-6 relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={filters.searchText || ''}
                        onChange={e => onFilterChange({ ...filters, searchText: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                    />
                </div>

                {/* Filters Row REMOVED (Cognitive/Difficulty) */}

                {/* Group By Toggle */}

            </div>

            {/* Question List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <SpinnerIcon className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                        <p className="text-slate-400 font-medium">Loading questions...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FilterIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">No questions found</h4>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Try adjusting your filters or search terms, or add some new questions to this bank.
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedQuestions).map(([groupName, groupQuestions]) => (
                        <div key={groupName} className="space-y-3">
                            {/* Group Header */}
                            {filters.groupBy && filters.groupBy !== 'none' && (
                                <button
                                    onClick={() => toggleGroup(groupName)}
                                    className="w-full flex items-center gap-2 pl-2 mt-6 mb-2 group/header hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                                >
                                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${collapsedGroups[groupName] ? '-rotate-90' : ''}`} />
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        {groupName}
                                        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                            {groupQuestions.length}
                                        </span>
                                    </h4>
                                </button>
                            )}

                            {!collapsedGroups[groupName] && groupQuestions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className={`group bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all duration-300 ${expandedId === q.id
                                        ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start gap-5">
                                        {/* Number Badge */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${expandedId === q.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600'
                                            }`}>
                                            {questions.findIndex(allQ => allQ.id === q.id) + 1}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                                            >
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {/* Badges REMOVED */}
                                                </div>

                                                <p className={`text-base text-slate-800 dark:text-slate-100 font-medium leading-relaxed ${expandedId !== q.id ? 'line-clamp-2 text-slate-600 dark:text-slate-300' : ''}`}>
                                                    {q.questionText}
                                                </p>
                                            </div>

                                            {/* Expanded Details */}
                                            <div className={`grid transition-all duration-300 ease-in-out ${expandedId === q.id ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}>
                                                <div className="overflow-hidden">
                                                    {q.options && (
                                                        <div className="space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                                            {q.options.map(opt => (
                                                                <div
                                                                    key={opt.letter}
                                                                    className={`p-3 rounded-xl text-sm flex items-center transition-colors ${opt.letter === q.correctAnswer
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50'
                                                                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-transparent'
                                                                        }`}
                                                                >
                                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold mr-3 ${opt.letter === q.correctAnswer
                                                                        ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-white'
                                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                                        }`}>
                                                                        {opt.letter}
                                                                    </span>
                                                                    <span className="flex-1 font-medium">{opt.text}</span>
                                                                    {opt.letter === q.correctAnswer && (
                                                                        <span className="ml-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                                                                            Correct Answer
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {q.explanation && (
                                                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
                                                            <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Explanation</span>
                                                            <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                                                                {q.explanation}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button
                                                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
                                                title={expandedId === q.id ? "Collapse" : "Expand"}
                                            >
                                                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${expandedId === q.id ? 'rotate-180' : ''}`} />
                                            </button>
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(q)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                                    title="Edit Question"
                                                >
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(q.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                                    title="Delete Question"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Pagination */}
            {questions.length > 0 && (
                <div className="flex flex-col items-center gap-4 pt-8 pb-4 border-t border-slate-100 dark:border-slate-800 mt-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>

                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of <span className="text-slate-900 dark:text-white">{totalPages}</span>
                        </span>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, questions.length)} of {questions.length} questions
                    </p>
                </div>
            )}
        </div>
    );
};
