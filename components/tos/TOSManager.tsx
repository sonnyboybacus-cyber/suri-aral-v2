// =========================================================================
// TABLE OF SPECIFICATIONS MANAGER - MAIN CONTAINER COMPONENT
// =========================================================================

import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { useTOS } from './useTOS';
import { useQuestionBank } from '../question-bank/useQuestionBank';
import { TOSEditor } from './TOSEditorComponent';
import {
    TableIcon, PlusIcon, TrashIcon, EditIcon, XIcon, SpinnerIcon,
    FolderIcon, CheckCircleIcon, ChevronDownIcon, BarChartIcon,
    PieChartIcon, SparklesIcon, LayoutGridIcon, SearchIcon, FolderOpenIcon
} from '../icons';
import { useAcademicConfig } from '../../hooks/useAcademicConfig';
import { TOS } from '../../types/questionBank';
import { ExamPreview } from './ExamPreview';

// =============================================================================
// SIDEBAR COMPONENT (Chronological Grouping)
// =============================================================================

const TOSSidebar: React.FC<{
    toss: TOS[];
    selectedTOSId: string | null;
    onSelectTOS: (id: string) => void;
    isLoading: boolean;
    onNewTOS: () => void;
    user: firebase.User;
}> = ({ toss, selectedTOSId, onSelectTOS, isLoading, onNewTOS, user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'my'>('all');

    // Filter Logic
    const filteredTOS = React.useMemo(() => {
        if (filterMode === 'my') {
            return toss.filter(t => t.createdBy === user.uid);
        }
        return toss; // Global View
    }, [toss, filterMode, user.uid]);

    // Grouping Logic
    const grouped = React.useMemo(() => {
        if (searchTerm) return {};
        const groups: Record<string, Record<string, TOS[]>> = {};

        filteredTOS.forEach(tos => {
            const year = tos.schoolYear || 'Unassigned';
            const quarter = tos.quarter || 'Unassigned';

            if (!groups[year]) groups[year] = {};
            if (!groups[year][quarter]) groups[year][quarter] = [];
            groups[year][quarter].push(tos);
        });

        return groups;
    }, [filteredTOS, searchTerm]);

    // Search Logic
    const searchResults = React.useMemo(() => {
        if (!searchTerm) return [];
        return toss.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [toss, searchTerm]);

    // Folder State
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        // Auto-expand mostly recent year
        const years = Array.from(new Set(toss.map(t => t.schoolYear || 'Unassigned'))).sort().reverse();
        return years.length > 0 ? { [years[0]]: true } : {};
    });

    const toggleFolder = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const sortedYears = Object.keys(grouped).sort().reverse(); // Newest years first

    return (
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-white/50 dark:border-slate-700/50 p-6 flex flex-col h-[calc(100vh-240px)] sticky top-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FolderIcon className="w-4 h-4" />
                    Blueprints Library
                </h3>
                <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    {filteredTOS.length}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search titles, subjects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
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
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setFilterMode('all')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'all'
                            ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        All TOS
                    </button>
                    <button
                        onClick={() => setFilterMode('my')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'my'
                            ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        My TOS
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {isLoading && toss.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500" />
                        <span className="text-sm font-medium">Loading outlines...</span>
                    </div>
                ) : toss.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <TableIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No TOS found</p>
                        <button
                            onClick={onNewTOS}
                            className="mt-4 text-amber-600 dark:text-amber-400 text-sm font-bold hover:underline"
                        >
                            Create one now
                        </button>
                    </div>
                ) : searchTerm ? (
                    // Search Results
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                            {searchResults.length} Match{searchResults.length !== 1 && 'es'}
                        </p>
                        {searchResults.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">No blueprints found</div>
                        ) : (
                            searchResults.map(tos => (
                                <TOSCard key={tos.id} tos={tos} isSelected={selectedTOSId === tos.id} onClick={() => onSelectTOS(tos.id)} currentUserId={user.uid} />
                            ))
                        )}
                    </div>
                ) : (
                    // Chronological Folders
                    <div className="space-y-2">
                        {sortedYears.map(year => {
                            const quarters = grouped[year];
                            const sortedQuarters = Object.keys(quarters).sort();
                            const isYearExpanded = expanded[year];

                            return (
                                <div key={year} className="space-y-1">
                                    <button
                                        onClick={() => toggleFolder(year)}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors group"
                                    >
                                        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isYearExpanded ? '' : '-rotate-90'}`} />
                                        {isYearExpanded ? (
                                            <FolderOpenIcon className="w-4 h-4 text-amber-500" />
                                        ) : (
                                            <FolderIcon className="w-4 h-4 text-slate-400 group-hover:text-amber-500/70" />
                                        )}
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{year}</span>
                                    </button>

                                    {isYearExpanded && (
                                        <div className="pl-4 space-y-4 border-l-2 border-slate-200 dark:border-slate-700 ml-3 py-1">
                                            {sortedQuarters.map(quarter => (
                                                <div key={quarter} className="space-y-1">
                                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">
                                                        {quarter}
                                                    </h5>
                                                    <div className="space-y-1 pl-1">
                                                        {quarters[quarter].map(tos => (
                                                            <TOSCard key={tos.id} tos={tos} isSelected={selectedTOSId === tos.id} onClick={() => onSelectTOS(tos.id)} currentUserId={user.uid} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const TOSCard: React.FC<{ tos: TOS; isSelected: boolean; onClick: () => void; currentUserId: string }> = ({ tos, isSelected, onClick, currentUserId }) => (
    <button
        onClick={onClick}
        className={`w-full group relative p-4 rounded-2xl transition-all duration-300 text-left border ${isSelected
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 border-transparent transform scale-[1.02]'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md'
            }`}
    >
        <div className="flex justify-between items-start mb-2">
            <h4 className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                {tos.title}
            </h4>
            {isSelected && (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
        </div>

        <div className={`flex flex-wrap items-center gap-2 text-xs mb-3 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
            <span className="bg-white/10 px-2 py-0.5 rounded-md">{tos.subject}</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-md">{tos.gradeLevel}</span>
            {tos.createdBy !== currentUserId && (
                <span className="ml-auto text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">
                    Shared
                </span>
            )}
        </div>

        <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
                className="h-full bg-white/80"
                style={{ width: `${Math.min(100, (tos.entries?.reduce((s, c) => s + (c.numberOfItems || 0), 0) || 0) / tos.totalItems * 100)}%` }}
            />
        </div>
    </button>
);

interface Props {
    user: firebase.User;
}

export const TOSManager: React.FC<Props> = ({ user }) => {
    const {
        tosList: toss,
        selectedTOSId,
        currentTOS: selectedTOS,
        isLoading,
        isSaving,
        error,
        canEdit,
        subjects,
        schoolYears,
        setSelectedTOSId,
        handleCreateTOS,
        handleDeleteTOS,
        handleAddEntry,
        handleUpdateEntry,
        handleDeleteEntry,
        handleAutoAssignPlacements: handleAutoAssign,
        handleAllocateQuestions,
        handleSmartAllocate,
        handleGenerateQuestions,
        loadCompetenciesForFilters,
        competencies,
        clearError
    } = useTOS(user);

    const {
        banks: allBanks,
        selectedBankId: sourceBankId,
        setSelectedBankId: setSourceBankId,
        questions
    } = useQuestionBank(user);
    const { config } = useAcademicConfig();

    // Filter banks by TOS Subject
    const sourceBanks = React.useMemo(() => {
        if (!selectedTOS) return [];
        return allBanks.filter(b => b.subject === selectedTOS.subject);
    }, [allBanks, selectedTOS]);

    // Local UI state
    const [showNewTOSModal, setShowNewTOSModal] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [newTOSForm, setNewTOSForm] = useState({
        title: '',
        subject: '',
        gradeLevel: '',
        schoolYear: '',
        gradingPeriod: '',
        totalItems: 50,
        isShared: true
    });

    const handleNewTOSSubmit = async () => {
        if (!newTOSForm.title || !newTOSForm.subject || !newTOSForm.gradeLevel || !newTOSForm.schoolYear || !newTOSForm.gradingPeriod) {
            alert('Please fill in all required fields');
            return;
        }
        await handleCreateTOS({
            ...newTOSForm,
            quarter: newTOSForm.gradingPeriod
        });
        setShowNewTOSModal(false);
        setNewTOSForm({
            title: '',
            subject: '',
            gradeLevel: '',
            schoolYear: '',
            gradingPeriod: '',
            totalItems: 50,
            isShared: true
        });
    };

    // Auto-select first bank if none selected
    React.useEffect(() => {
        if (showEditor && sourceBanks.length > 0 && !sourceBankId) {
            setSourceBankId(sourceBanks[0].id);
        }
    }, [showEditor, sourceBanks, sourceBankId, setSourceBankId]);

    // Calculate stats
    const totalItems = selectedTOS?.entries?.reduce((sum: number, c: any) => sum + (c.numberOfItems || 0), 0) || 0;
    const totalPercentage = 100; // Simplified for now
    const targetItems = selectedTOS?.totalItems || 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const progress = selectedTOS ? Math.min(100, (totalItems / targetItems) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Background Gradients (Amber/Orange Theme) */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent dark:from-amber-900/30 dark:via-slate-900/50 pointer-events-none" />
            <div className="absolute top-0 right-0 w-1/3 h-96 bg-gradient-to-bl from-red-500/10 to-transparent dark:from-red-900/20 pointer-events-none" />

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
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative p-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl shadow-amber-500/30 text-white transform group-hover:scale-105 transition-transform duration-300">
                                <TableIcon className="w-10 h-10" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-serif font-bold text-slate-800 dark:text-white tracking-tight mb-2">
                                Table of Specifications
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                                Blueprint Assessment Planner
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewTOSModal(true)}
                        className="group relative px-6 py-3 bg-slate-900 dark:bg-amber-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <div className="flex items-center gap-2 relative z-10">
                            <PlusIcon className="w-5 h-5" />
                            <span>Create New TOS</span>
                        </div>
                    </button>
                </header>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <TOSSidebar
                            toss={toss}
                            selectedTOSId={selectedTOSId}
                            onSelectTOS={setSelectedTOSId}
                            isLoading={isLoading}
                            onNewTOS={() => setShowNewTOSModal(true)}
                            user={user}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {!selectedTOS ? (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center group transition-all duration-500 hover:bg-white/70 dark:hover:bg-slate-800/70">
                                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                                    <LayoutGridIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-slate-700 dark:text-slate-200 mb-3">
                                    Select a Blueprint
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                    Choose a Table of Specifications from the sidebar to view, edit, or analyze its distribution.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {/* Hero Card */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl shadow-slate-900/10 text-white p-8 lg:p-10 border border-slate-700/50">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                    <div className="relative z-10 flex flex-col xl:flex-row justify-between gap-8">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-amber-500/30">
                                                    {selectedTOS.gradeLevel}
                                                </span>
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-blue-500/30">
                                                    {selectedTOS.subject}
                                                </span>
                                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-purple-500/30">
                                                    {selectedTOS.quarter}
                                                </span>
                                            </div>
                                            <h2 className="text-3xl font-serif font-bold mb-3 leading-tight">
                                                {selectedTOS.title}
                                            </h2>

                                            {/* Author Info */}
                                            {selectedTOS.createdBy !== user.uid && (
                                                <div className="flex items-center gap-3 mb-6">
                                                    <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-bold uppercase rounded">Shared TOS</span>
                                                    {selectedTOS.createdByName && (
                                                        <span className="text-sm font-bold text-white/70">
                                                            by {selectedTOS.createdByName}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Progress Stats */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Target</span>
                                                    <span className="text-2xl font-bold text-white">{selectedTOS.totalItems}</span>
                                                    <span className="text-xs text-slate-500 ml-1">Items</span>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Planned</span>
                                                    <span className={`text-2xl font-bold ${totalItems === selectedTOS.totalItems ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {totalItems}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-1">Items</span>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Weight</span>
                                                    <span className={`text-2xl font-bold ${Math.round(totalPercentage) === 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                        {totalPercentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Status</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${Math.abs(totalItems - selectedTOS.totalItems) < 1 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                                        <span className="text-sm font-bold text-white">
                                                            {Math.abs(totalItems - selectedTOS.totalItems) < 1 ? 'Complete' : 'Draft'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 min-w-[200px] xl:border-l xl:border-white/10 xl:pl-8 justify-center">
                                            {canEdit ? (
                                                <>
                                                    <button
                                                        onClick={() => { setShowEditor(true); }}
                                                        className="flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                                                    >
                                                        <EditIcon className="w-5 h-5 mr-2" />
                                                        Edit Planner
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTOS(selectedTOS.id)}
                                                        className="flex items-center justify-center px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold backdrop-blur-sm transition-all border border-red-500/10 hover:border-red-500/30"
                                                    >
                                                        <TrashIcon className="w-5 h-5 mr-2" />
                                                        Delete TOS
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <p className="text-sm text-slate-400 mb-2">View Only</p>
                                                    <p className="text-xs text-slate-500">You can view and analyze this blueprint, but only the creator or admin can edit it.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Editor / View Area handled by Subcomponent but we show summary here if not editing */}
                                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-white/50 dark:border-slate-700/50 p-6 h-[85vh] relative overflow-hidden flex flex-col">
                                    {showEditor ? (
                                        <TOSEditor
                                            tos={selectedTOS}
                                            canEdit={canEdit}
                                            onAddEntry={handleAddEntry}
                                            onUpdateEntry={handleUpdateEntry}
                                            onDeleteEntry={handleDeleteEntry}
                                            onAutoAssign={handleAutoAssign}
                                            isSaving={isSaving}
                                            onClose={() => setShowEditor(false)}
                                            competencies={competencies}
                                            onLoadCompetencies={() => loadCompetenciesForFilters({
                                                subject: selectedTOS.subject,
                                                gradeLevel: selectedTOS.gradeLevel,
                                                quarter: selectedTOS.quarter
                                            })}
                                            questions={questions}
                                            onAllocateQuestions={handleAllocateQuestions}
                                            onSmartAllocate={handleSmartAllocate}
                                            onGenerateQuestions={handleGenerateQuestions}
                                            onPreview={() => setShowPreview(true)}
                                            sourceBanks={sourceBanks}
                                            selectedSourceBankId={sourceBankId}
                                            onSelectSourceBank={setSourceBankId}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                                            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                                                <BarChartIcon className="w-12 h-12 text-amber-500 dark:text-amber-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                                {canEdit ? 'Ready to Map Competencies?' : 'Blueprint Overview'}
                                            </h3>
                                            <p className="text-slate-500 max-w-sm mx-auto">
                                                {canEdit
                                                    ? "Open the editor to add cognitive levels, assign items, and balance your assessment."
                                                    : "View the competency distribution and item allocation for this blueprint."}
                                            </p>
                                            <button
                                                onClick={() => setShowEditor(true)}
                                                className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl shadow-lg hover:transform hover:-translate-y-1 transition-all"
                                            >
                                                {canEdit ? 'Open Planner' : 'View Planner'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New TOS Modal */}
            {showNewTOSModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100 animate-slide-up">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                                    <TableIcon className="w-5 h-5" />
                                </div>
                                Create New TOS
                            </h3>
                            <button onClick={() => setShowNewTOSModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={newTOSForm.title}
                                    onChange={e => setNewTOSForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                                    placeholder="e.g., First Periodical Exam Blueprint"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Subject *</label>
                                    <div className="relative">
                                        <select
                                            value={newTOSForm.subject}
                                            onChange={e => setNewTOSForm(prev => ({ ...prev, subject: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none appearance-none"
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
                                            value={newTOSForm.gradeLevel}
                                            onChange={e => setNewTOSForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none appearance-none"
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
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Grading Period *</label>
                                    <div className="relative">
                                        <select
                                            value={newTOSForm.gradingPeriod}
                                            onChange={e => setNewTOSForm(prev => ({ ...prev, gradingPeriod: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select...</option>
                                            {(config?.quarters || ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']).map(period => (
                                                <option key={period} value={period} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{period}</option>
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
                                            value={newTOSForm.schoolYear}
                                            onChange={e => setNewTOSForm(prev => ({ ...prev, schoolYear: e.target.value }))}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select Year...</option>
                                            {(config?.schoolYears || schoolYears).map(sy => (
                                                <option key={sy} value={sy} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">{sy}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Target Total Items *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="200"
                                        value={newTOSForm.totalItems}
                                        onChange={e => setNewTOSForm(prev => ({ ...prev, totalItems: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${newTOSForm.isShared ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {newTOSForm.isShared && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={newTOSForm.isShared}
                                        onChange={e => setNewTOSForm(prev => ({ ...prev, isShared: e.target.checked }))}
                                        className="hidden"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Shared Resource</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Allow other teachers to view this blueprint (Read-only)</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewTOSModal(false)}
                                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleNewTOSSubmit}
                                disabled={isSaving}
                                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center transition-all"
                            >
                                {isSaving ? (
                                    <>
                                        <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Create TOS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exam Preview Modal */}
            {showPreview && selectedTOS && (
                <ExamPreview
                    tos={selectedTOS}
                    questions={questions}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};
