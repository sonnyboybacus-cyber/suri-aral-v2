// =========================================================================
// TOS EDITOR COMPONENT
// Premium Glassmorphism Design
// =========================================================================

import React, { useState } from 'react';
import { TOS, TOSEntry, CognitiveLevel, DepEdCompetency, Question, QuestionBank } from '../../types/questionBank';
import { useAcademicConfig } from '../../hooks/useAcademicConfig';
import {
    PlusIcon, TrashIcon, CheckSquareIcon, SearchIcon, AlertTriangleIcon, SpinnerIcon,
    ChevronDownIcon, UploadIcon
} from '../icons';

interface Props {
    tos: TOS;
    canEdit: boolean;
    competencies?: DepEdCompetency[];
    onLoadCompetencies?: (filters?: { quarter?: string; subject?: string; gradeLevel?: string }) => void;
    onAddEntry: (entry: Omit<TOSEntry, 'id'>) => Promise<void>;
    onUpdateEntry: (entryId: string, updates: Partial<TOSEntry>) => Promise<void>;
    onDeleteEntry: (entryId: string) => Promise<void>;
    onAutoAssign: () => Promise<void>;
    isSaving: boolean;
    onClose: () => void;
    // Allocation Props
    questions?: Question[];
    onAllocateQuestions?: (entryId: string, questionIds: string[]) => Promise<void>;
    onSmartAllocate?: (entry: TOSEntry, allQuestions: Question[]) => Promise<number>;
    onGenerateQuestions?: (entry: TOSEntry) => Promise<number>;
    onPreview?: () => void;
    // Source Selection
    sourceBanks?: QuestionBank[];
    selectedSourceBankId?: string | null;
    onSelectSourceBank?: (id: string) => void;
}


// const COGNITIVE_LEVELS: CognitiveLevel[] = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];

const EMPTY_ENTRY: Omit<TOSEntry, 'id'> = {
    competencyCode: '',
    contentStandard: '',
    performanceStandard: '',
    learningCompetency: '',
    cognitiveLevel: 'Understanding',
    numberOfItems: 1,
    itemPlacement: [],
    weight: 0
};

export const TOSEditor: React.FC<Props> = ({
    tos,
    canEdit,
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
    onAutoAssign,
    isSaving,
    onClose,
    competencies = [],
    onLoadCompetencies,
    questions = [],
    onAllocateQuestions,
    onSmartAllocate,
    onGenerateQuestions,
    onPreview,
    sourceBanks,
    selectedSourceBankId,
    onSelectSourceBank
}) => {
    const { config } = useAcademicConfig();
    const cognitiveLevels = config?.cognitiveLevels || ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];

    const [newEntry, setNewEntry] = useState<Omit<TOSEntry, 'id'>>(EMPTY_ENTRY);
    const [showAddForm, setShowAddForm] = useState(false);
    const [allocatingEntry, setAllocatingEntry] = useState<TOSEntry | null>(null);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    // Reset search when opening drawer
    React.useEffect(() => {
        if (allocatingEntry) setItemSearchTerm('');
    }, [allocatingEntry]);

    // Load competencies on mount or when add form opens (Strict Filter)
    React.useEffect(() => {
        if (onLoadCompetencies) {
            onLoadCompetencies({ quarter: tos.quarter });
        }
    }, [tos.quarter]);

    React.useEffect(() => {
        if (showAddForm && onLoadCompetencies) {
            onLoadCompetencies({ quarter: tos.quarter });
        }
    }, [showAddForm, tos.quarter]);

    const handleAddEntry = async () => {
        if (!newEntry.competencyCode || !newEntry.learningCompetency || newEntry.numberOfItems < 1) {
            alert('Please fill in competency code, learning competency, and number of items');
            return;
        }
        await onAddEntry(newEntry);
        setNewEntry(EMPTY_ENTRY);
        setShowAddForm(false);
    };

    const handleUpdateField = async (entryId: string, field: keyof TOSEntry, value: any) => {
        await onUpdateEntry(entryId, { [field]: value });
    };

    const getCognitiveColor = (level: CognitiveLevel) => {
        const colors: Record<CognitiveLevel, string> = {
            'Remembering': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
            'Understanding': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
            'Applying': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
            'Analyzing': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
            'Evaluating': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
            'Creating': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
        };
        return colors[level as string] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const totalItems = tos.entries?.reduce((sum, e) => sum + e.numberOfItems, 0) || 0;

    // Derived state to ensure drawer always shows live data (fixes checkbox lag)
    const activeEntry = allocatingEntry ? tos.entries?.find(e => e.id === allocatingEntry.id) : null;

    // Optimistic UI state for instant checkbox feedback
    const [optimisticAllocatedIds, setOptimisticAllocatedIds] = useState<string[]>([]);

    // Sync optimistic state when entry changes or real data updates
    React.useEffect(() => {
        if (activeEntry) {
            setOptimisticAllocatedIds(activeEntry.allocatedQuestionIds || []);
        }
    }, [activeEntry, activeEntry?.allocatedQuestionIds]);

    // Calculate IDs already used in OTHER competencies to prevent double-booking
    const globallyAllocatedIds = React.useMemo(() => {
        const ids = new Set<string>();
        if (!activeEntry) return ids;

        tos.entries?.forEach(e => {
            if (e.id !== activeEntry.id) {
                e.allocatedQuestionIds?.forEach(id => ids.add(id));
            }
        });
        return ids;
    }, [tos.entries, activeEntry?.id]);

    return (
        <div className="flex flex-col h-full relative">
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-1">Competency Map</h3>
                    <p className="text-sm text-slate-500">Define competencies and learning targets</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm">
                        Close
                    </button>
                    {canEdit && (
                        <>

                            <button
                                onClick={() => setShowAddForm(true)}
                                className="flex items-center px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Competency
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Table */}
            <div className={`flex-1 overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300`}>
                <div className="grid grid-cols-12 gap-0 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-2 p-4 border-r border-slate-100 dark:border-slate-700/50">Details</div>
                    <div className="col-span-3 p-4 border-r border-slate-100 dark:border-slate-700/50">Learning Competency</div>
                    <div className="col-span-3 p-4 border-r border-slate-100 dark:border-slate-700/50">Cognitive Level</div>
                    <div className="col-span-1 p-4 text-center border-r border-slate-100 dark:border-slate-700/50">Items</div>
                    <div className="col-span-2 p-4 text-center border-r border-slate-100 dark:border-slate-700/50">Allocation</div>
                    <div className="col-span-1 p-4 text-center">Actions</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {(!tos.entries || tos.entries.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <PlusIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-600 dark:text-slate-300">No competencies mapped yet</p>
                            <p className="text-sm mt-1">Start by adding your first learning competency</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {tos.entries.map((entry) => {
                                const allocatedCount = entry.allocatedQuestionIds?.length || 0;
                                const isFulfilled = allocatedCount >= entry.numberOfItems;
                                const isAllocating = allocatingEntry?.id === entry.id;

                                return (
                                    <div key={entry.id} className={`grid grid-cols-12 gap-0 group transition-colors ${isAllocating ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-amber-50/30 dark:hover:bg-amber-900/10'}`}>
                                        <div className="col-span-2 p-3 border-r border-slate-100 dark:border-slate-800/50">
                                            {canEdit ? (
                                                <input
                                                    type="text"
                                                    value={entry.competencyCode}
                                                    onChange={e => handleUpdateField(entry.id, 'competencyCode', e.target.value)}
                                                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                                    placeholder="Code"
                                                />
                                            ) : (
                                                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{entry.competencyCode}</span>
                                            )}
                                            {entry.itemPlacement && entry.itemPlacement.length > 0 && (
                                                <div className="mt-2 text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 p-1 rounded border border-slate-100 dark:border-slate-700/50">
                                                    No. {entry.itemPlacement.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-3 p-3 border-r border-slate-100 dark:border-slate-800/50">
                                            {canEdit ? (
                                                <textarea
                                                    value={entry.learningCompetency}
                                                    onChange={e => handleUpdateField(entry.id, 'learningCompetency', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none h-20"
                                                    placeholder="Enter learning competency..."
                                                />
                                            ) : (
                                                <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-3" title={entry.learningCompetency}>{entry.learningCompetency}</p>
                                            )}
                                        </div>
                                        <div className="col-span-3 p-3 border-r border-slate-100 dark:border-slate-800/50">
                                            {canEdit ? (
                                                <div className="relative">
                                                    <select
                                                        value={entry.cognitiveLevel}
                                                        onChange={e => handleUpdateField(entry.id, 'cognitiveLevel', e.target.value)}
                                                        className={`w-full pl-3 pr-8 py-2 text-xs font-bold rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${getCognitiveColor(entry.cognitiveLevel)}`}
                                                    >
                                                        {cognitiveLevels.map(level => (
                                                            <option key={level} value={level} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                                                                {level}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                                                </div>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs font-bold rounded border ${getCognitiveColor(entry.cognitiveLevel)}`}>
                                                    {entry.cognitiveLevel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-1 p-3 border-r border-slate-100 dark:border-slate-800/50 flex items-start justify-center">
                                            {canEdit ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={entry.numberOfItems}
                                                    onChange={e => handleUpdateField(entry.id, 'numberOfItems', parseInt(e.target.value) || 1)}
                                                    className="w-16 px-1 py-2 text-center text-sm font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                                />
                                            ) : (
                                                <span className="text-lg font-bold text-slate-800 dark:text-white">{entry.numberOfItems}</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 p-3 border-r border-slate-100 dark:border-slate-800/50 flex items-center justify-center">
                                            <button
                                                onClick={() => {
                                                    setAllocatingEntry(entry);
                                                }}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${(entry.allocatedQuestionIds?.length || 0) >= entry.numberOfItems
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}
                                            >
                                                <span>
                                                    {entry.allocatedQuestionIds?.length || 0}/{entry.numberOfItems} Select
                                                </span>
                                            </button>

                                        </div>
                                        <div className="col-span-1 p-3 flex items-start justify-center gap-1">
                                            {/* Smart Fill Button */}


                                            {canEdit && (
                                                <button
                                                    onClick={() => onDeleteEntry(entry.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group-hover:scale-110"
                                                    title="Remove Entry"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Stats - Sticky */}
                <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-xs text-slate-500">
                    <span>{tos.entries?.length || 0} Competencies mapped</span>
                    <div className="flex gap-4 items-center">
                        <span className="font-bold mr-4">Total Items: <span className="text-slate-800 dark:text-white text-base ml-1">{totalItems}</span></span>

                        {onPreview && (
                            <button
                                onClick={onPreview}
                                disabled={totalItems === 0}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <span className="hidden sm:inline">Preview Exam</span>
                                <span className="sm:hidden">Preview</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Allocation Drawer */}
            <div className={`absolute top-0 right-0 bottom-0 w-[450px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 transform transition-transform duration-300 z-10 flex flex-col overflow-hidden ${activeEntry ? 'translate-x-0' : 'translate-x-full'}`}>
                {activeEntry && (
                    <div className="flex-1 flex flex-col p-6 h-full overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">Item Allocation</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-[300px] truncate">{activeEntry.competencyCode}</p>
                            </div>
                            <button onClick={() => setAllocatingEntry(null)} className="text-slate-400 hover:text-slate-600">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Target</span>
                                <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{activeEntry.numberOfItems} items</span>
                            </div>
                            <div className="w-full bg-amber-200 dark:bg-amber-800 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-amber-500 h-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, ((optimisticAllocatedIds.length || 0) / activeEntry.numberOfItems) * 100)}%` }}
                                />
                            </div>

                            <div className="text-center mt-2 text-xs text-amber-600 dark:text-amber-300">
                                {((optimisticAllocatedIds.length || 0) >= activeEntry.numberOfItems)
                                    ? "Requirement met! 🎉"
                                    : `Need ${activeEntry.numberOfItems - (optimisticAllocatedIds.length || 0)} more questions`
                                }
                            </div>
                        </div>



                        {/* Question Picker Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="mb-4 space-y-3">
                                {/* Source Bank Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source Bank</label>
                                    <div className="relative">
                                        <select
                                            value={selectedSourceBankId || ''}
                                            onChange={(e) => onSelectSourceBank && onSelectSourceBank(e.target.value)}
                                            className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
                                        >
                                            <option value="">Select a Question Bank...</option>
                                            {sourceBanks?.map(bank => (
                                                <option key={bank.id} value={bank.id}>
                                                    {bank.name} ({bank.questionCount} {bank.questionCount === 1 ? 'item' : 'items'})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    {sourceBanks?.length === 0 && (
                                        <p className="text-[10px] text-amber-500 mt-1">
                                            No banks found for Subject: {tos.subject}
                                        </p>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    placeholder="Search questions..."
                                    value={itemSearchTerm}
                                    onChange={e => setItemSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-scroll custom-scrollbar space-y-2 pr-2 pb-24">
                                {!selectedSourceBankId ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                                            <SearchIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="font-bold text-sm text-slate-500 dark:text-slate-400">No Bank Selected</p>
                                        <p className="text-xs max-w-[200px] mx-auto mt-1">
                                            Please select a source bank above to view and allocate items.
                                        </p>
                                    </div>
                                ) : questions && questions.length > 0 ? (
                                    questions
                                        .filter(q => {
                                            const matchesCompetency = !activeEntry.competencyCode || q.competencyCode === activeEntry.competencyCode || !q.competencyCode;
                                            const matchesSearch = !itemSearchTerm || q.questionText.toLowerCase().includes(itemSearchTerm.toLowerCase());
                                            return matchesCompetency && matchesSearch;
                                        })
                                        .sort((a, b) => {
                                            const aSelected = optimisticAllocatedIds.includes(a.id);
                                            const bSelected = optimisticAllocatedIds.includes(b.id);
                                            if (aSelected !== bSelected) return aSelected ? -1 : 1;
                                            const aUsed = globallyAllocatedIds.has(a.id);
                                            const bUsed = globallyAllocatedIds.has(b.id);
                                            if (aUsed !== bUsed) return aUsed ? 1 : -1;
                                            return 0;
                                        })
                                        .map(q => {
                                            const isSelected = optimisticAllocatedIds.includes(q.id);
                                            const isUsedElsewhere = globallyAllocatedIds.has(q.id);
                                            return (
                                                <div
                                                    key={q.id}
                                                    onClick={() => {
                                                        if (!onAllocateQuestions || !activeEntry || isUsedElsewhere) return;

                                                        const currentIds = optimisticAllocatedIds;
                                                        const willSelect = !isSelected;

                                                        // Over-allocation Protection
                                                        if (willSelect && currentIds.length >= activeEntry.numberOfItems) {
                                                            alert(`Target of ${activeEntry.numberOfItems} items reached. Uncheck an item first.`);
                                                            return;
                                                        }

                                                        // Optimistic Update
                                                        const newIds = willSelect
                                                            ? [...currentIds, q.id]
                                                            : currentIds.filter(id => id !== q.id);

                                                        setOptimisticAllocatedIds(newIds); // Update UI instantly

                                                        // Background Server Update
                                                        onAllocateQuestions(activeEntry.id, newIds);
                                                    }}
                                                    className={`p-3 rounded-xl border transition-all ${isUsedElsewhere
                                                        ? 'bg-slate-50 dark:bg-slate-900 opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-800'
                                                        : 'cursor-pointer hover:border-amber-300'
                                                        } ${isSelected
                                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500/50'
                                                            : !isUsedElsewhere
                                                                ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                                                : ''
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors ${isSelected
                                                            ? 'bg-amber-500 border-amber-500'
                                                            : isUsedElsewhere
                                                                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                            }`}>
                                                            {isSelected && <CheckSquareIcon className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{q.questionText}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{q.questionType}</span>
                                                                {q.competencyCode && <span className="text-[10px] font-mono text-slate-400">{q.competencyCode}</span>}
                                                                {isUsedElsewhere && (
                                                                    <span className="text-[10px] font-bold text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                        <span>Already used</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        No questions available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Entry Modal Overlay */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-slide-up">
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Add New Competency</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select from Curriculum</label>
                                <div className="relative mb-4">
                                    <select
                                        value={newEntry.competencyCode}
                                        onChange={e => {
                                            const code = e.target.value;
                                            if (!code) return;
                                            const selectedComp = competencies.find(c => c.code === code);
                                            if (selectedComp) {
                                                setNewEntry(prev => ({
                                                    ...prev,
                                                    competencyCode: selectedComp.code,
                                                    learningCompetency: selectedComp.learningCompetency,
                                                    cognitiveLevel: selectedComp.suggestedCognitiveLevel || prev.cognitiveLevel,
                                                    contentStandard: selectedComp.contentStandard || '',
                                                    performanceStandard: selectedComp.performanceStandard || ''
                                                }));
                                            }
                                        }}

                                        className="w-full pl-3 pr-10 py-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none appearance-none cursor-pointer placeholder-slate-400 dark:placeholder-slate-500"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Choose a competency...</option>
                                        {competencies.length === 0 && <option disabled>No competencies found for this subject</option>}
                                        {competencies.map(c => (
                                            <option key={c.code} value={c.code} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                                                {c.code} - {c.learningCompetency.substring(0, 60)}{c.learningCompetency.length > 60 ? '...' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>

                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Competency Code *</label>
                                <input
                                    type="text"
                                    value={newEntry.competencyCode}
                                    onChange={e => setNewEntry(prev => ({ ...prev, competencyCode: e.target.value }))}

                                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder="e.g., EN11/12ES-Ia-1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Cognitive Level</label>
                                <div className="relative">
                                    <select
                                        value={newEntry.cognitiveLevel}
                                        onChange={e => setNewEntry(prev => ({ ...prev, cognitiveLevel: e.target.value as CognitiveLevel }))}

                                        className="w-full pl-3 pr-10 py-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                                    >
                                        {cognitiveLevels.map(level => (
                                            <option key={level} value={level} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                                                {level}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Learning Competency *</label>
                                <textarea
                                    value={newEntry.learningCompetency}
                                    onChange={e => setNewEntry(prev => ({ ...prev, learningCompetency: e.target.value }))}

                                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none h-24 placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder="Describe what the student should be able to do..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Target Items *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={newEntry.numberOfItems}
                                    onChange={e => setNewEntry(prev => ({ ...prev, numberOfItems: parseInt(e.target.value) || 1 }))}

                                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => { setShowAddForm(false); setNewEntry(EMPTY_ENTRY); }}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEntry}
                                disabled={isSaving}
                                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center"
                            >
                                {isSaving && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                                Add Competency
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
