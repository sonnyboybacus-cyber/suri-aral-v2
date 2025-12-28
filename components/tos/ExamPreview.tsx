
import React, { useState } from 'react';
import { TOS, Question } from '../../types/questionBank';
import { PrinterIcon, XIcon, CheckCircleIcon } from '../icons';

interface Props {
    tos: TOS;
    questions: Question[];
    onClose: () => void;
}

export const ExamPreview: React.FC<Props> = ({ tos, questions, onClose }) => {
    const [showAnswerKey, setShowAnswerKey] = useState(false);

    // 1. Collect all allocated items and sort them
    const examItems = React.useMemo(() => {
        if (!tos.entries) return [];

        // Flatten entries to get all allocated IDs with placement info
        interface ExamItem {
            question: Question;
            entryIndex: number;
            placement: number; // 1-based index (target)
            contentIndex: number; // fallback sort
        }

        const items: ExamItem[] = [];

        tos.entries.forEach((entry, idx) => {
            if (!entry.allocatedQuestionIds) return;

            entry.allocatedQuestionIds.forEach((qId, qIdx) => {
                const q = questions.find(qu => qu.id === qId);
                if (q) {
                    // Start with simplified placement: currently just sequential based on entry order + internal order
                    // In a real placement logic, we'd use entry.itemPlacement array (e.g. [1, 5, 10])
                    // For now, we'll map sequential unless placements are explicit
                    // Actually, if itemPlacements are used, we should respect them.

                    // Simple Sort for this implementation: Group by Competency? No, Exam usually sequential.
                    // We'll just push them and let the user re-order later (which is a future feature).
                    // For now, order by Entry Order as "Part I, Part II" etc usually works best for structure.

                    items.push({
                        question: q,
                        entryIndex: idx,
                        placement: 0, // Todo
                        contentIndex: qIdx
                    });
                }
            });
        });

        return items;
    }, [tos, questions]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm overflow-hidden flex flex-col animate-fade-in">
            {/* Toolbar (Hidden when printing) */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center print:hidden shadow-xl z-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <PrinterIcon className="w-5 h-5 text-amber-500" />
                        Exam Preview
                    </h2>
                    <div className="bg-slate-700 h-6 w-px" />
                    <span className="text-slate-400 text-sm font-mono">{examItems.length} items</span>
                    <span className="text-slate-400 text-sm font-mono">•</span>
                    <span className="text-slate-400 text-sm">{tos.title}</span>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showAnswerKey ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                            {showAnswerKey && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input type="checkbox" checked={showAnswerKey} onChange={e => setShowAnswerKey(e.target.checked)} className="hidden" />
                        Show Answer Key
                    </label>

                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Print / Save PDF
                    </button>

                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Preview Document */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50 print:p-0 print:bg-white print:overflow-visible">
                <style>
                    {`
                        @media print {
                            @page { margin: 1in; }
                            body { background: white; color: black; -webkit-print-color-adjust: exact; }
                            .print-hidden { display: none !important; }
                        }
                    `}
                </style>

                <div className="max-w-[8.5in] mx-auto min-h-[11in] bg-white shadow-2xl print:shadow-none p-[1in] text-slate-900">
                    {/* Exam Header */}
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="font-bold text-2xl uppercase tracking-wide mb-1">{tos.schoolId || 'SURI ARAL ACADEMY'}</h1>
                        <p className="text-sm font-serif uppercase tracking-widest mb-4">Office of the Academic Affairs</p>

                        <h2 className="font-bold text-xl uppercase mt-6">{tos.title}</h2>
                        <div className="flex justify-between mt-4 text-sm font-bold border-t border-black pt-2">
                            <span>Subject: {tos.subject}</span>
                            <span>Grade: {tos.gradeLevel}</span>
                            <span>Date: ________________</span>
                        </div>
                        <div className="flex justify-between mt-2 text-sm font-bold">
                            <span>Name: __________________________________________________</span>
                            <span>Score: ________ / {tos.totalItems}</span>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mb-6">
                        <h3 className="font-bold uppercase text-sm mb-2">I. General Instructions</h3>
                        <p className="text-sm leading-relaxed">
                            Read each question carefully. Choose the best answer from the given choices.
                            Shade the circle corresponding to your answer on the answer sheet provided.
                            Avoid erasures.
                        </p>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                        {examItems.map((item, idx) => (
                            <div key={item.question.id} className="break-inside-avoid">
                                <div className="flex gap-2">
                                    <span className="font-bold min-w-[24px]">{idx + 1}.</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium mb-3">{item.question.questionText}</p>

                                        {/* Options */}
                                        {item.question.questionType === 'multiple_choice' && item.question.options ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 pl-2">
                                                {item.question.options.map(opt => (
                                                    <div key={opt.letter} className="text-sm flex gap-2">
                                                        <span className="font-bold">{opt.letter}.</span>
                                                        <span>{opt.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : item.question.questionType === 'true_false' ? (
                                            <div className="flex gap-8 pl-2 text-sm">
                                                <span>A. True</span>
                                                <span>B. False</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Answer Key (Conditional) */}
                    {showAnswerKey && (
                        <div className="mt-12 pt-8 border-t-2 border-black break-before-page">
                            <h2 className="font-bold text-center uppercase text-xl mb-6">Answer Key</h2>
                            <div className="columns-2 md:columns-4 gap-4">
                                {examItems.map((item, idx) => (
                                    <div key={item.question.id} className="text-sm mb-1 break-inside-avoid">
                                        <span className="font-bold mr-2">{idx + 1}.</span>
                                        <span className="font-mono font-bold">{item.question.correctAnswer}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
