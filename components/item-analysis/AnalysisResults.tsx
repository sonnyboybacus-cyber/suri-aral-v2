
import React, { useState } from 'react';
import { ItemAnalysisResult, Student, TestMetadata } from '../../types';
import {
    BrainCircuitIcon, SparklesIcon, FileTextIcon, SearchIcon,
    PrinterIcon, BarChart3Icon, SpinnerIcon, EyeIcon, XIcon, PenToolIcon, BookOpenIcon, RefreshIcon, SaveIcon, LayoutGridIcon
} from '../icons';
import { generateAndDownloadRawScoreCSV, generateAndDownloadAnalysisCSV } from '../../services/csvHelper';

interface AnalysisResultsProps {
    analysisResults: ItemAnalysisResult[];
    students: Student[];
    metadata: TestMetadata;
    onStartAI: () => void;
    onGenerateRemedial: () => void;
    onExtractCompetencies: () => void;
    isGeneratingRemedial: boolean;
    isMappingCompetencies: boolean;
    onViewCompetency: (item: number, text: string) => void;
    onGenerateLessonPlanFromItem: (itemResult: ItemAnalysisResult) => void;
    onPrintReport: () => void;
    onOpenQuestionAnalysis: (itemNumber: number) => void;
    aiAnalysisReport?: string | null;
    onRecordHistory: () => void;
    tosList?: any[]; // Using any to avoid import cycles, or better import TOS type
    selectedTOSId?: string;
    onTOSSelect: (id: string) => void;
}

export const AnalysisResults = ({
    analysisResults,
    students,
    metadata,
    onStartAI,
    onGenerateRemedial,
    onExtractCompetencies,
    isGeneratingRemedial,
    isMappingCompetencies,
    onViewCompetency,
    onGenerateLessonPlanFromItem,
    onPrintReport,
    onOpenQuestionAnalysis,
    aiAnalysisReport,
    onRecordHistory,
    tosList,
    selectedTOSId,
    onTOSSelect
}: AnalysisResultsProps) => {

    // Local state for the "Rich Text" view modal
    const [viewingCompetency, setViewingCompetency] = useState<{ item: number, text: string } | null>(null);

    const meanScore = (students.reduce((acc, s) => acc + s.responses.reduce<number>((a, b) => a + b, 0), 0) / (students.length || 1)).toFixed(2);
    const mps = (analysisResults.reduce((acc, r) => acc + r.mps, 0) / (analysisResults.length || 1)).toFixed(2);
    const passingRate = ((students.filter(s => s.responses.reduce<number>((a, b) => a + b, 0) >= metadata.totalItems * 0.75).length / students.length) * 100).toFixed(0);

    const parseRichText = (text: string) => {
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    // Helper to parse markdown for the report view, filtering out suggestion artifacts
    const parseMarkdown = (text: string) => {
        if (!text) return null;

        // Remove "Suggested Questions" block if present
        let cleanText = text;
        const suggestionPattern = /(\n|^)(#{1,4}\s*)?Suggested (Questions|Follow-up|Replies).*/i;
        const match = text.match(suggestionPattern);
        if (match && match.index !== undefined) {
            cleanText = text.substring(0, match.index).trim();
        }

        let html = cleanText
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-700 dark:text-indigo-400">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-1">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-base font-extrabold mt-6 mb-3 text-slate-900 dark:text-white">$1</h2>')
            .replace(/^\s*[\-\*] (.*)/gm, '<li class="ml-4 list-disc marker:text-indigo-500 mb-1">$1</li>')
            .replace(/\n/g, '<br />');
        return <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="space-y-6">

            {/* RICH TEXT COMPETENCY MODAL */}
            {viewingCompetency && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-[90vw] md:w-full md:max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20 flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                                    Learning Competency
                                </h3>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase mt-1">Item #{viewingCompetency.item}</p>
                            </div>
                            <button onClick={() => setViewingCompetency(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <XIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="prose prose-slate dark:prose-invert prose-p:text-slate-700 dark:prose-p:text-slate-200 prose-p:font-serif prose-p:leading-relaxed">
                                <p>
                                    {parseRichText(viewingCompetency.text)}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex justify-end flex-shrink-0">
                            <button onClick={() => setViewingCompetency(null)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP ACTION TOOLBAR */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">

                {/* Left: Context / TOS Selector */}
                <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LayoutGridIcon className="h-4 w-4 text-amber-500" />
                        </div>
                        {selectedTOSId ? (
                            <div
                                className="w-full pl-10 pr-4 py-2 text-left bg-amber-100/50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-extrabold text-amber-900 dark:text-amber-100 shadow-sm ring-1 ring-amber-200 dark:ring-amber-800 flex justify-between items-center"
                            >
                                <span className="whitespace-nowrap">{tosList?.find(t => t.id === selectedTOSId)?.title || 'Unknown TOS'}</span>
                            </div>
                        ) : (
                            <select
                                value=""
                                onChange={(e) => onTOSSelect(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Select Competency Source...</option>
                                {tosList?.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">

                    {/* Primary Actions */}
                    <button
                        onClick={onGenerateRemedial}
                        disabled={isGeneratingRemedial}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 transition-all shadow-sm"
                        title="Generate Remedial Questions"
                    >
                        {isGeneratingRemedial ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <BrainCircuitIcon className="w-4 h-4" />}
                        <span className="hidden sm:inline">Remedial</span>
                    </button>

                    <button
                        onClick={onRecordHistory}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 transition-all shadow-sm"
                        title="Record Assessment Results to History"
                    >
                        <SaveIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Record Assessment</span>
                    </button>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    {/* Exports */}
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button onClick={() => generateAndDownloadRawScoreCSV(metadata, students)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-500 hover:text-green-600 transition-colors" title="Export Raw Scores (CSV)">
                            <FileTextIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => generateAndDownloadAnalysisCSV(metadata, analysisResults)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-500 hover:text-blue-600 transition-colors" title="Export Analysis Data (CSV)">
                            <BarChart3Icon className="w-4 h-4" />
                        </button>
                        <button onClick={onPrintReport} className="p-2 bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 rounded-md shadow-sm font-bold" title="Export PDF Report">
                            <PrinterIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><BarChart3Icon className="w-12 h-12" /></div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider z-10">Mean Score</span>
                    <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tight z-10">{meanScore}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><SparklesIcon className="w-12 h-12" /></div>
                    <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider z-10">MPS</span>
                    <div className="text-4xl font-black z-10">{mps}%</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><EyeIcon className="w-12 h-12" /></div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider z-10">Total Students</span>
                    <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tight z-10">{students.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><BrainCircuitIcon className="w-12 h-12" /></div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider z-10">Passing Rate</span>
                    <div className={`text-4xl font-black tracking-tight z-10 ${parseInt(passingRate) >= 75 ? 'text-green-600' : 'text-slate-800 dark:text-white'}`}>{passingRate}%</div>
                </div>
            </div>

            {/* MAIN CONTENT STACK */}
            <div className="space-y-8">

                {/* 1. DATA TABLE (FULL WIDTH) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <LayoutGridIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Item Performance Analysis</h3>
                                <p className="text-xs text-slate-500">Breakdown of student mastery per item</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{analysisResults.length} Items</span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-800/90 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correct</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-48">MPS</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interpretation</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Competency</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky right-0 z-30 bg-slate-50 dark:bg-slate-800 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {analysisResults.map(r => (
                                    <tr key={r.itemNumber} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">#{r.itemNumber}</td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-600 dark:text-slate-400">{r.totalCorrect}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${r.mps >= 75 ? 'bg-green-500' : r.mps >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${r.mps}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold w-10 text-right text-slate-700 dark:text-slate-300">{r.mps.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded border ${r.difficulty === 'Easy' ? 'bg-green-50 border-green-100 text-green-700' :
                                                r.difficulty === 'Moderate' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                                    'bg-red-50 border-red-100 text-red-700'
                                                }`}>
                                                {r.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded border ${r.interpretation?.includes('Mastered') && !r.interpretation?.includes('Least') ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                                                    r.interpretation?.includes('Nearing') ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                                        r.interpretation?.includes('Least') ? 'bg-slate-100 border-slate-200 text-slate-600' :
                                                            'bg-slate-50 border-slate-100 text-slate-500' // Default
                                                }`}>
                                                {r.interpretation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-left text-xs text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2 max-w-[300px]">
                                                <span className="truncate">{r.competency || '-'}</span>
                                                {r.competency && (
                                                    <button onClick={() => setViewingCompetency({ item: r.itemNumber, text: r.competency || '' })} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center sticky right-0 z-20 bg-white dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800">
                                            <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onOpenQuestionAnalysis(r.itemNumber)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-indigo-600 shadow-sm border border-transparent hover:border-slate-200 transition-all" title="Detailed Analysis">
                                                    <BrainCircuitIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onGenerateLessonPlanFromItem(r)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 shadow-sm border border-transparent hover:border-slate-200 transition-all" title="Lesson Plan">
                                                    <PenToolIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. AI INSIGHTS REPORT (FULL WIDTH BELOW TABLE) */}
                <div id="ai-insights-section" className="scroll-mt-6">
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden min-h-[300px]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 opacity-10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6">
                                <div>
                                    <h3 className="font-bold text-2xl flex items-center gap-3">
                                        <SparklesIcon className="w-6 h-6 text-yellow-400 animate-pulse" />
                                        AI Performance Analysis
                                    </h3>
                                    <p className="text-indigo-200 text-sm mt-2 max-w-2xl">
                                        Deep dive into student performance with automated insights. Identify mastery gaps, learning patterns, and get tailored instructional recommendations.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    {aiAnalysisReport ? (
                                        <button
                                            onClick={onStartAI}
                                            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-lg text-sm font-bold text-indigo-200 transition-all flex items-center gap-2"
                                        >
                                            <RefreshIcon className="w-4 h-4" />
                                            Regenerate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={onStartAI}
                                            className="px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold font-lg shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-5 h-5" />
                                            Generate Full Report
                                        </button>
                                    )}
                                </div>
                            </div>

                            {aiAnalysisReport ? (
                                <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 backdrop-blur-sm shadow-inner">
                                    <div className="prose prose-invert prose-lg max-w-none prose-p:leading-relaxed prose-h3:text-indigo-200 prose-ul:text-slate-300 prose-li:marker:text-indigo-400">
                                        {parseMarkdown(aiAnalysisReport)}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                    <div className="p-5 bg-white/5 rounded-full mb-6 ring-1 ring-white/10">
                                        <BrainCircuitIcon className="w-12 h-12 text-indigo-300" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">No Analysis Generated Yet</h4>
                                    <p className="text-indigo-200 max-w-md mx-auto mb-6">
                                        Click the button above to let Suri-Aral analyze your data and generate a comprehensive report.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
