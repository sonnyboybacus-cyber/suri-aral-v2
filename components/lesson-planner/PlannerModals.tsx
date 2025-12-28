import React from 'react';
import { SparklesIcon, XIcon, SearchIcon, PlusIcon, SpinnerIcon, LayersIcon, CheckCircleIcon, ClipboardListIcon, TableIcon, HelpIcon } from '../icons';
import { Rubric } from '../../types';

interface PlannerModalsProps {
    // Resource Finder
    showResourceModal: boolean;
    setShowResourceModal: (show: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: { title: string, uri: string }[];
    isSearchingResources: boolean;
    handleSearchResources: (e: React.FormEvent) => void;
    handleAddResource: (res: { title: string, uri: string }) => void;

    // Differentiation
    showDiffModal: boolean;
    setShowDiffModal: (show: boolean) => void;
    diffVariations: { remedial: string, average: string, enrichment: string } | null;
    setDiffVariations: (vars: any) => void; // Using any for setter simplicity or exact type
    isGeneratingDiff: boolean;
    activeDiffTab: 'remedial' | 'average' | 'enrichment';
    setActiveDiffTab: (tab: 'remedial' | 'average' | 'enrichment') => void;
    handleApplyDiff: () => void;
    handleAppendAllDiff: () => void;

    // Assessment
    showAssessmentModal: boolean;
    setShowAssessmentModal: (show: boolean) => void;
    assessmentTab: 'rubric' | 'quiz';
    setAssessmentTab: (tab: 'rubric' | 'quiz') => void;
    rubricType: 'analytic' | 'holistic';
    setRubricType: (type: 'analytic' | 'holistic') => void;
    generatedRubric: Rubric | null;
    quizItems: { question: string, options: string[], answer: string }[] | null;
    quizCount: number;
    setQuizCount: (count: number) => void;
    isGeneratingAssessment: boolean;
    handleGenerateRubric: () => void;
    handleGenerateQuiz: () => void;
    handleAppendRubric: () => void;
    handleAppendQuiz: () => void;
}

export const PlannerModals: React.FC<PlannerModalsProps> = ({
    showResourceModal, setShowResourceModal,
    searchQuery, setSearchQuery,
    searchResults,
    isSearchingResources,
    handleSearchResources,
    handleAddResource,

    showDiffModal, setShowDiffModal,
    diffVariations, setDiffVariations,
    isGeneratingDiff,
    activeDiffTab, setActiveDiffTab,
    handleApplyDiff,
    handleAppendAllDiff,

    showAssessmentModal, setShowAssessmentModal,
    assessmentTab, setAssessmentTab,
    rubricType, setRubricType,
    generatedRubric,
    quizItems,
    quizCount, setQuizCount,
    isGeneratingAssessment,
    handleGenerateRubric,
    handleGenerateQuiz,
    handleAppendRubric,
    handleAppendQuiz
}) => {
    return (
        <>
            {/* RESOURCE FINDER MODAL */}
            {showResourceModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-indigo-500" /> Resource Finder
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Google Search Grounding</p>
                            </div>
                            <button onClick={() => setShowResourceModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSearchResources} className="relative">
                                <SearchIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="Search topic (e.g. Photosynthesis for Grade 4)"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isSearchingResources || !searchQuery.trim()}
                                    className="absolute right-2 top-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {isSearchingResources ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                            {searchResults.length === 0 && !isSearchingResources ? (
                                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                    <SearchIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Enter a topic to find educational resources.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {searchResults.map((res, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group shadow-sm">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{res.title}</h4>
                                            <a href={res.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate block mb-3">
                                                {res.uri}
                                            </a>
                                            <button
                                                onClick={() => handleAddResource(res)}
                                                className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <PlusIcon className="w-3 h-3" /> Add to Plan
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isSearchingResources && (
                                <div className="flex justify-center py-12">
                                    <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DIFFERENTIATION WIZARD MODAL */}
            {showDiffModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <LayersIcon className="w-5 h-5 text-indigo-500" /> Differentiated Instruction Generator
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">AI-tailored strategies for diverse learners</p>
                            </div>
                            <button onClick={() => setShowDiffModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {isGeneratingDiff ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
                                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                </div>
                                <p className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">Analyzing Lesson Content...</p>
                                <p className="text-xs text-slate-400 mt-2">Generating remedial, average, and enrichment tracks.</p>
                            </div>
                        ) : diffVariations ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <button
                                        onClick={() => setActiveDiffTab('remedial')}
                                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${activeDiffTab === 'remedial' ? 'border-green-500 text-green-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        Remedial (Simplified)
                                    </button>
                                    <button
                                        onClick={() => setActiveDiffTab('average')}
                                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${activeDiffTab === 'average' ? 'border-blue-500 text-blue-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        Average (Standard)
                                    </button>
                                    <button
                                        onClick={() => setActiveDiffTab('enrichment')}
                                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${activeDiffTab === 'enrichment' ? 'border-purple-500 text-purple-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        Enrichment (Advanced)
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
                                    <textarea
                                        value={diffVariations[activeDiffTab]}
                                        onChange={(e) => setDiffVariations({ ...diffVariations, [activeDiffTab]: e.target.value })}
                                        className="w-full h-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm leading-relaxed shadow-sm font-medium"
                                    />
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Review and edit the AI suggestion before applying.</span>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleAppendAllDiff}
                                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Append All as Appendix
                                        </button>
                                        <button
                                            onClick={handleApplyDiff}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Apply {activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} to Plan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <p className="text-slate-500">Something went wrong. Please try again.</p>
                                <button onClick={() => setShowDiffModal(false)} className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ASSESSMENT MAKER MODAL */}
            {showAssessmentModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[85vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <ClipboardListIcon className="w-5 h-5 text-emerald-500" /> Assessment Tools
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Generate Rubrics and Quizzes instantly.</p>
                            </div>
                            <button onClick={() => setShowAssessmentModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setAssessmentTab('rubric')}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all border-b-2 flex items-center justify-center gap-2 ${assessmentTab === 'rubric' ? 'border-emerald-500 text-emerald-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <TableIcon className="w-4 h-4" /> Rubric Maker
                            </button>
                            <button
                                onClick={() => setAssessmentTab('quiz')}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all border-b-2 flex items-center justify-center gap-2 ${assessmentTab === 'quiz' ? 'border-blue-500 text-blue-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <HelpIcon className="w-4 h-4" /> Quiz Generator
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar relative">
                            {isGeneratingAssessment && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">Generating Content...</p>
                                </div>
                            )}

                            {assessmentTab === 'rubric' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rubric Type</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rubricType"
                                                        checked={rubricType === 'analytic'}
                                                        onChange={() => setRubricType('analytic')}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Analytic (Detailed Grid)</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rubricType"
                                                        checked={rubricType === 'holistic'}
                                                        onChange={() => setRubricType('holistic')}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Holistic (Single Scale)</span>
                                                </label>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleGenerateRubric}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-4 h-4" /> Generate
                                        </button>
                                    </div>

                                    {generatedRubric && (
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in-up">
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                                <h4 className="font-bold text-center text-slate-800 dark:text-white uppercase tracking-wider">{generatedRubric.title}</h4>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase font-bold text-xs">
                                                        <tr>
                                                            <th className="px-4 py-3">Criteria</th>
                                                            {generatedRubric.criteria[0].levels.map((l, i) => (
                                                                <th key={i} className="px-4 py-3">{l.score} pts</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {generatedRubric.criteria.map((c, i) => (
                                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 w-1/4">{c.name}</td>
                                                                {c.levels.map((l, j) => (
                                                                    <td key={j} className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs leading-relaxed align-top">{l.description}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {assessmentTab === 'quiz' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Number of Items</label>
                                            <div className="flex gap-2">
                                                {[5, 10, 15].map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setQuizCount(n)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${quizCount === n ? 'bg-indigo-100 text-indigo-700 border-indigo-200 border' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
                                                    >
                                                        {n} Items
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleGenerateQuiz}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-4 h-4" /> Generate
                                        </button>
                                    </div>

                                    {quizItems && (
                                        <div className="space-y-4 animate-fade-in-up">
                                            {quizItems.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <div className="flex gap-3">
                                                        <span className="font-bold text-slate-400">{idx + 1}.</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-slate-800 dark:text-white mb-3">{item.question}</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {item.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className={`p-2 rounded border text-xs ${opt === item.answer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300'}`}>
                                                                        {String.fromCharCode(65 + oIdx)}. {opt}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAssessmentModal(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            {assessmentTab === 'rubric' && generatedRubric && (
                                <button
                                    onClick={handleAppendRubric}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Append Rubric to Plan
                                </button>
                            )}
                            {assessmentTab === 'quiz' && quizItems && (
                                <button
                                    onClick={handleAppendQuiz}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Append Quiz to Plan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
