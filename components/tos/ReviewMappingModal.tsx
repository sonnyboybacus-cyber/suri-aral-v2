import React, { useState } from 'react';
import { Question, DepEdCompetency } from '../../types/questionBank';
import { CheckCircleIcon, AlertTriangleIcon, ChevronDownIcon, WandIcon } from '../icons';

export interface AIMappingResult {
    question: Question;
    suggestedCompetency: DepEdCompetency | null;
    suggestedCognitiveLevel: string;
    reasoning?: string;
    confidence?: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mappings: AIMappingResult[]) => void;
    mappings: AIMappingResult[];
    availableCompetencies: DepEdCompetency[];
}

export const ReviewMappingModal: React.FC<Props> = ({
    isOpen, onClose, onConfirm, mappings: initialMappings, availableCompetencies
}) => {
    const [mappings, setMappings] = useState<AIMappingResult[]>(initialMappings);

    React.useEffect(() => {
        setMappings(initialMappings);
    }, [initialMappings]);

    if (!isOpen) return null;

    const handleCompetencyChange = (index: number, code: string) => {
        const competency = availableCompetencies.find(c => c.code === code) || null;
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], suggestedCompetency: competency };
        setMappings(newMappings);
    };

    const handleCognitiveChange = (index: number, level: string) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], suggestedCognitiveLevel: level };
        setMappings(newMappings);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <WandIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review AI Alignments</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                The AI has analyzed {mappings.length} questions against your curriculum. Please verify the matches.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-4">Question</div>
                    <div className="col-span-4">Competency</div>
                    <div className="col-span-2">Cognitive Level</div>
                    <div className="col-span-2">Reasoning</div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-black/20">
                    {mappings.map((m, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors items-start">

                            {/* Question Preview */}
                            <div className="col-span-4 pr-4">
                                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium line-clamp-3 mb-1">
                                    {m.question.questionText}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                                    {m.question.questionType}
                                </span>
                            </div>

                            {/* Competency Selector */}
                            <div className="col-span-4">
                                <select
                                    value={m.suggestedCompetency?.code || ''}
                                    onChange={(e) => handleCompetencyChange(idx, e.target.value)}
                                    className={`w-full text-sm p-2 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${!m.suggestedCompetency
                                            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                        }`}
                                >
                                    <option value="">-- No Match Found --</option>
                                    {availableCompetencies.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.code} - {c.learningCompetency.substring(0, 60)}...
                                        </option>
                                    ))}
                                </select>
                                {m.suggestedCompetency && (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {m.suggestedCompetency.learningCompetency}
                                    </p>
                                )}
                            </div>

                            {/* Cognitive Level Selector */}
                            <div className="col-span-2">
                                <select
                                    value={m.suggestedCognitiveLevel}
                                    onChange={(e) => handleCognitiveChange(idx, e.target.value)}
                                    className="w-full text-sm p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'].map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Reasoning */}
                            <div className="col-span-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                    "{m.reasoning || 'No reasoning provided.'}"
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(mappings)}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        Confirm & Import
                    </button>
                </div>
            </div>
        </div>
    );
};
