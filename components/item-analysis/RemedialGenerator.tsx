import React from 'react';
import { ItemAnalysisResult } from '../../types';
import { AlertTriangleIcon, SparklesIcon, FileTextIcon } from '../icons';

interface RemedialGeneratorProps {
    analysisResults: ItemAnalysisResult[];
    onGenerate: () => void;
    isGenerating: boolean;
}

export const RemedialGenerator: React.FC<RemedialGeneratorProps> = ({
    analysisResults,
    onGenerate,
    isGenerating
}) => {
    // Filter for least mastered items (MPS < 50)
    const leastMastered = analysisResults.filter(r => r.mps < 50);

    if (analysisResults.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <FileTextIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Data Available</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Please run the analysis first to generate remedial questions.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {/* Left Column: Least Mastered Competencies */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <AlertTriangleIcon className="w-5 h-5 text-red-500" />
                    Least Mastered Skills
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {leastMastered.length} items identified as least mastered (MPS &lt; 50%).
                </p>

                {leastMastered.length === 0 ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-300 text-sm font-medium text-center">
                        🎉 Great job! No least mastered skills found.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {leastMastered.map((item) => (
                            <div key={item.itemNumber} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                        Item {item.itemNumber}
                                    </span>
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                        {item.mps.toFixed(1)}% MPS
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                    {item.competency || 'No competency mapped'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Column: AI Generation Controls */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-2">AI Remedial Generation</h3>
                        <p className="text-indigo-100 mb-6 max-w-lg">
                            Automatically create targeted remedial questions and materials for the identified least mastered skills.
                        </p>

                        <button
                            onClick={onGenerate}
                            disabled={isGenerating || leastMastered.length === 0}
                            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:transform-none"
                        >
                            <SparklesIcon className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                            {isGenerating ? 'Generating Remedial Materials...' : 'Generate Remedial Content'}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">How it works</h4>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                            <span>Analyzes student response patterns to identify specific misconceptions.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                            <span>Maps least mastered items to their underlying competencies.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                            <span>Generates new practice questions targeting those specific gaps.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
