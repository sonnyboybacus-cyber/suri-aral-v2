// =========================================================================
// QUESTION BANK MANAGER - MAIN CONTAINER COMPONENT
// =========================================================================

import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { useQuestionBank } from './useQuestionBank';
import { QuestionList } from './QuestionListComponent';
import { QuestionEditor } from './QuestionEditorComponent';
import { QuestionImporter } from './QuestionImporterComponent';
import { Question, QuestionBank } from '../../types/questionBank';
import {
    BookOpenIcon, PlusIcon, TrashIcon, SearchIcon, FolderIcon,
    UploadIcon, XIcon, EditIcon, SpinnerIcon, CheckCircleIcon,
    ChevronDownIcon, FilterIcon, SparklesIcon, LayoutGridIcon, ChevronRightIcon
} from '../icons';
import { useAcademicConfig } from '../../hooks/useAcademicConfig';

// ---------------------------------------------------------------------------
// SIDEBAR COMPONENT (Chronological)
// ---------------------------------------------------------------------------

const BankSidebar: React.FC<{
    banks: QuestionBank[];
    selectedBankId: string | null;
    onSelectBank: (id: string) => void;
    user: firebase.User;
}> = ({ banks, selectedBankId, onSelectBank, user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'my'>('all');

    // Filter banks based on mode
    const filteredBanks = React.useMemo(() => {
        if (filterMode === 'my') {
            return banks.filter(b => b.createdBy === user.uid);
        }
        return banks;
    }, [banks, filterMode, user.uid]);

    // 1. Group Banks
    const grouped = React.useMemo(() => {
        if (searchTerm) return {}; // Skip grouping if searching
        const groups: Record<string, Record<string, QuestionBank[]>> = {};
        filteredBanks.forEach(bank => {
            const date = new Date(bank.createdAt || Date.now());
            const year = date.getFullYear().toString();
            const month = date.toLocaleString('default', { month: 'long' });

            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];
            groups[year][month].push(bank);
        });
        return groups;
    }, [filteredBanks, searchTerm]);

    // Filter for Search
    const searchResults = React.useMemo(() => {
        if (!searchTerm) return [];
        return banks.filter(b =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [banks, searchTerm]);

    // 2. State for Folders
    // Default: Expand current year and month
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        return {
            [currentYear]: true,
            [`${currentYear}-${currentMonth}`]: true
        };
    });

    const toggle = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Sort Years (Newest First)
    const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search libraries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Filter Toggle */}
            {!searchTerm && (
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                    <button
                        onClick={() => setFilterMode('all')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'all'
                            ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        All Banks
                    </button>
                    <button
                        onClick={() => setFilterMode('my')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'my'
                            ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        My Banks
                    </button>
                </div>
            )}

            {/* Search Results Mode */}
            {searchTerm ? (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                        {searchResults.length} Match{searchResults.length !== 1 && 'es'}
                    </p>
                    {searchResults.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No libraries found</div>
                    ) : (
                        searchResults.map(bank => (
                            <button
                                key={bank.id}
                                onClick={() => onSelectBank(bank.id)}
                                className={`w-full text-left p-3 rounded-xl transition-all border-l-2 ${selectedBankId === bank.id
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <div className="font-medium text-sm line-clamp-1">{bank.name}</div>
                                <div className="text-[10px] opacity-70 mt-1 flex gap-2">
                                    <span>{bank.subject}</span>
                                    <span>•</span>
                                    <span>{bank.gradeLevel}</span>
                                    {bank.createdBy !== user.uid && (
                                        <span className="ml-auto text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">
                                            {bank.createdByName ? `by ${bank.createdByName.split(' ')[0]}` : 'Shared'}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : (
                /* Chronological Mode */
                <div className="space-y-2">
                    {sortedYears.map(year => {
                        const isYearExpanded = expanded[year];
                        const months = Object.keys(grouped[year]).sort((a, b) => {
                            const dateA = new Date(`${a} 1, 2000`).getMonth();
                            const dateB = new Date(`${b} 1, 2000`).getMonth();
                            return dateB - dateA; // Descending
                        });

                        return (
                            <div key={year} className="space-y-1">
                                {/* YEAR FOLDER */}
                                <button
                                    onClick={() => toggle(year)}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider transition-colors"
                                >
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isYearExpanded ? '' : '-rotate-90'}`} />
                                    {year}
                                </button>

                                {isYearExpanded && (
                                    <div className="pl-2 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 ml-3">
                                        {months.map(month => {
                                            const monthKey = `${year}-${month}`;
                                            const isMonthExpanded = expanded[monthKey];
                                            const monthBanks = grouped[year][month];

                                            return (
                                                <div key={monthKey}>
                                                    {/* MONTH FOLDER */}
                                                    <button
                                                        onClick={() => toggle(monthKey)}
                                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                                                    >
                                                        {isMonthExpanded ? <FolderOpenIcon className="w-4 h-4 text-emerald-500" /> : <FolderIcon className="w-4 h-4 text-slate-400" />}
                                                        {month}
                                                        <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                            {monthBanks.length}
                                                        </span>
                                                    </button>

                                                    {/* BANKS LIST */}
                                                    {isMonthExpanded && (
                                                        <div className="pl-4 mt-1 space-y-1">
                                                            {monthBanks.map(bank => (
                                                                <button
                                                                    key={bank.id}
                                                                    onClick={() => onSelectBank(bank.id)}
                                                                    className={`w-full text-left p-3 rounded-xl transition-all border-l-2 ${selectedBankId === bank.id
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'
                                                                        }`}
                                                                >
                                                                    <div className="font-medium text-sm line-clamp-1">{bank.name}</div>
                                                                    <div className="text-[10px] opacity-70 mt-1 flex gap-2">
                                                                        <span>{bank.subject}</span>
                                                                        <span>•</span>
                                                                        <span>{bank.gradeLevel}</span>
                                                                        {bank.createdBy !== user.uid && (
                                                                            <span className="ml-auto text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">
                                                                                {bank.createdByName ? `by ${bank.createdByName.split(' ')[0]}` : 'Shared'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Icon helper
const FolderOpenIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </svg>
);

interface Props {
    user: firebase.User;
}

export const QuestionBankManager: React.FC<Props> = ({ user }) => {
    const {
        banks,
        selectedBankId,
        selectedBank,
        questions,
        filters,
        isLoading,
        isSaving,
        error,
        canEdit,
        subjects,
        schoolYears,
        setSelectedBankId,
        handleCreateBank,
        handleDeleteBank,
        handleAddQuestion,
        handleUpdateQuestion,
        handleDeleteQuestion,
        handleBulkImport,
        handleFilterChange,
        clearError,
        handleAISolve
    } = useQuestionBank(user);
    const { config } = useAcademicConfig();

    // Local UI state
    const [showNewBankModal, setShowNewBankModal] = useState(false);
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);
    const [showImporter, setShowImporter] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [newBankForm, setNewBankForm] = useState({
        name: '',
        subject: '',
        gradeLevel: '',
        quarter: '',
        schoolYear: '',
        description: '',
        isShared: true
    });

    const handleNewBankSubmit = async () => {
        if (!newBankForm.name || !newBankForm.subject || !newBankForm.gradeLevel || !newBankForm.quarter || !newBankForm.schoolYear) {
            alert('Please fill in all required fields');
            return;
        }
        await handleCreateBank(newBankForm);
        setShowNewBankModal(false);
        setNewBankForm({ name: '', subject: '', gradeLevel: '', quarter: '', schoolYear: '', description: '', isShared: true });
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setShowQuestionEditor(true);
    };

    const handleQuestionSave = async (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed'>) => {
        if (editingQuestion) {
            await handleUpdateQuestion(editingQuestion.id, question);
        } else {
            await handleAddQuestion(question);
        }
        setShowQuestionEditor(false);
        setEditingQuestion(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent dark:from-emerald-900/30 dark:via-slate-900/50 pointer-events-none" />
            <div className="absolute top-0 right-0 w-1/3 h-96 bg-gradient-to-bl from-blue-500/10 to-transparent dark:from-blue-900/20 pointer-events-none" />

            {/* Error Toast */}
            {error && (
                <div className="fixed top-24 right-8 z-50 bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-xl shadow-red-500/20 flex items-center gap-4 animate-slide-in-right border border-red-400/50">
                    <span className="font-medium">{error}</span>
                    <button onClick={clearError} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto p-6 lg:p-10 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl shadow-emerald-500/30 text-white transform group-hover:scale-105 transition-transform duration-300">
                                <BookOpenIcon className="w-10 h-10" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-serif font-bold text-slate-800 dark:text-white tracking-tight mb-2">
                                Question Bank
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                                AI Augmented Assessment Tools
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewBankModal(true)}
                        className="group relative px-6 py-3 bg-slate-900 dark:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <div className="flex items-center gap-2 relative z-10">
                            <PlusIcon className="w-5 h-5" />
                            <span>Create New Bank</span>
                        </div>
                    </button>
                </header>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-white/50 dark:border-slate-700/50 p-6 flex flex-col h-[calc(100vh-240px)] sticky top-8">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
                                <FolderIcon className="w-4 h-4" />
                                Your Libraries
                            </h3>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {isLoading && banks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                        <SpinnerIcon className="w-6 h-6 animate-spin text-emerald-500" />
                                        <span className="text-sm font-medium">Loading banks...</span>
                                    </div>
                                ) : banks.length === 0 ? (
                                    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <BookOpenIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No banks found</p>
                                        <button
                                            onClick={() => setShowNewBankModal(true)}
                                            className="mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:underline"
                                        >
                                            Create one now
                                        </button>
                                    </div>
                                ) : (
                                    <BankSidebar
                                        banks={banks}
                                        selectedBankId={selectedBankId}
                                        onSelectBank={setSelectedBankId}
                                        user={user}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {!selectedBank ? (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center group transition-all duration-500 hover:bg-white/70 dark:hover:bg-slate-800/70">
                                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                                    <LayoutGridIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-slate-700 dark:text-slate-200 mb-3">
                                    Select a Library
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                    Select a question bank from the sidebar to view, edit, or check its contents. Or create a new one to get started with your assessment.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {/* Hero Card */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl shadow-slate-900/10 text-white p-8 lg:p-10 border border-slate-700/50">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30">
                                                    {selectedBank.gradeLevel}
                                                </span>
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-blue-500/30">
                                                    {selectedBank.subject}
                                                </span>
                                                {selectedBank.schoolYear && (
                                                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-purple-500/30">
                                                        {selectedBank.schoolYear}
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-3xl font-serif font-bold mb-3 leading-tight">
                                                {selectedBank.name}
                                            </h2>
                                            {selectedBank.description && (
                                                <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                                                    {selectedBank.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-6 mt-8">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-bold text-white">{selectedBank.questionCount || 0}</span>
                                                    <span className="text-slate-400 font-medium">Questions</span>
                                                </div>
                                                <div className="h-8 w-px bg-slate-700" />
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-4xl font-bold ${selectedBank.createdBy === user.uid ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                        {selectedBank.createdBy === user.uid ? 'My Bank' : 'Global Bank'}
                                                    </span>
                                                </div>
                                                {selectedBank.createdBy !== user.uid && selectedBank.createdByName && (
                                                    <>
                                                        <div className="h-8 w-px bg-slate-700" />
                                                        <div className="flex flex-col justify-center">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Created By</span>
                                                            <span className="text-white font-medium">{selectedBank.createdByName}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 min-w-[160px]">
                                            {canEdit && (
                                                <>
                                                    <button
                                                        onClick={() => { setEditingQuestion(null); setShowQuestionEditor(true); }}
                                                        className="flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                                                    >
                                                        <PlusIcon className="w-5 h-5 mr-2" />
                                                        Add Question
                                                    </button>
                                                    <button
                                                        onClick={() => setShowImporter(true)}
                                                        className="flex items-center justify-center px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold backdrop-blur-sm transition-all border border-white/10 hover:border-white/20"
                                                    >
                                                        <UploadIcon className="w-5 h-5 mr-2" />
                                                        Import
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBank(selectedBank.id)}
                                                        className="flex items-center justify-center px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold backdrop-blur-sm transition-all border border-red-500/10 hover:border-red-500/30"
                                                    >
                                                        <TrashIcon className="w-5 h-5 mr-2" />
                                                        Delete Bank
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Questions List */}
                                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-white/50 dark:border-slate-700/50 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                                <FilterIcon className="w-4 h-4" />
                                            </div>
                                            Search & Filter
                                        </h3>
                                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                            {questions.length} Items Found
                                        </span>
                                    </div>

                                    <QuestionList
                                        questions={questions}
                                        filters={filters}
                                        onFilterChange={handleFilterChange}
                                        onEdit={canEdit ? handleEditQuestion : undefined}
                                        onDelete={canEdit ? handleDeleteQuestion : undefined}
                                        isLoading={isLoading}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Bank Modal */}
            {showNewBankModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100 animate-slide-up">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                                    <BookOpenIcon className="w-5 h-5" />
                                </div>
                                Create New Bank
                            </h3>
                            <button onClick={() => setShowNewBankModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bank Name *</label>
                                <input
                                    type="text"
                                    value={newBankForm.name}
                                    onChange={e => setNewBankForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                                    placeholder="e.g., Empowerment Technologies Q1"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Subject *</label>
                                    <div className="relative">
                                        <select
                                            value={newBankForm.subject}
                                            onChange={e => setNewBankForm(prev => ({ ...prev, subject: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select...</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.name} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{s.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Grade Level *</label>
                                    <div className="relative">
                                        <select
                                            value={newBankForm.gradeLevel}
                                            onChange={e => setNewBankForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select Grade...</option>
                                            {config?.gradeLevels?.map(g => (
                                                <option key={g} value={g} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{g}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quarter *</label>
                                    <div className="relative">
                                        <select
                                            value={newBankForm.quarter}
                                            onChange={e => setNewBankForm(prev => ({ ...prev, quarter: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select Quarter...</option>
                                            {(config?.quarters || ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']).map(q => (
                                                <option key={q} value={q} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{q}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">School Year *</label>
                                    <div className="relative">
                                        <select
                                            value={newBankForm.schoolYear}
                                            onChange={e => setNewBankForm(prev => ({ ...prev, schoolYear: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select Year...</option>
                                            {(config?.schoolYears || schoolYears).map(sy => (
                                                <option key={sy} value={sy} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{sy}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center h-[74px] mt-[22px]">
                                    <label className="flex items-center gap-3 cursor-pointer w-full">
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${newBankForm.isShared ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {newBankForm.isShared && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={newBankForm.isShared}
                                            onChange={e => setNewBankForm(prev => ({ ...prev, isShared: e.target.checked }))}
                                            className="hidden"
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Shared Resource</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">Allow others to view (Read-only)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewBankModal(false)}
                                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleNewBankSubmit}
                                disabled={isSaving}
                                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center transition-all"
                            >
                                {isSaving ? (
                                    <>
                                        <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Create Bank
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Editor Modal */}
            {showQuestionEditor && (
                <QuestionEditor
                    question={editingQuestion}
                    defaultMetadata={{
                        subject: selectedBank?.subject || '',
                        gradeLevel: selectedBank?.gradeLevel || ''
                    }}
                    onSave={handleQuestionSave}
                    onClose={() => { setShowQuestionEditor(false); setEditingQuestion(null); }}
                    isSaving={isSaving}
                    onAISolve={handleAISolve}
                />
            )}

            {/* Import Modal */}
            {showImporter && (
                <QuestionImporter
                    defaultMetadata={{
                        subject: selectedBank?.subject || '',
                        gradeLevel: selectedBank?.gradeLevel || ''
                    }}
                    onImport={handleBulkImport}
                    onClose={() => setShowImporter(false)}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};
