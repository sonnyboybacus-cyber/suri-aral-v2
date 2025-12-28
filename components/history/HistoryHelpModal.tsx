import React from 'react';
import { XIcon, ScrollIcon, NetworkIcon, ColumnsIcon, UserIcon, ActivityIcon } from '../icons';

interface HistoryHelpModalProps {
    onClose: () => void;
}

export const HistoryHelpModal = ({ onClose }: HistoryHelpModalProps) => {
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">History SA Guide</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">How to use the interactive archives.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                    
                    {/* Timelines */}
                    <section className="flex gap-6">
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl h-fit text-indigo-600 dark:text-indigo-400">
                            <ScrollIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Data Stream Timeline</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                The timeline visualizes events along a central spine. 
                                <span className="block mt-2 pl-3 border-l-2 border-indigo-500">
                                    <strong>Interaction:</strong> Hover over any event card to highlight its position on the historical stream. Global events appear on the right with a distinctive style to provide context.
                                </span>
                            </p>
                            <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-500 font-mono">
                                Try: "Timeline of the Industrial Revolution 1760-1840"
                            </div>
                        </div>
                    </section>

                    {/* Network Graph */}
                    <section className="flex gap-6">
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl h-fit text-emerald-600 dark:text-emerald-400">
                            <NetworkIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Causal Network Graph</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                A physics-based simulation of historical cause and effect.
                                <span className="block mt-2 pl-3 border-l-2 border-emerald-500">
                                    <strong>Nodes:</strong> Represent key events or concepts. <span className="text-indigo-500 font-bold">Purple</span> is the central topic, <span className="text-amber-500 font-bold">Amber</span> are causes, and <span className="text-emerald-500 font-bold">Green</span> are effects.
                                    <br/>
                                    <strong>Interaction:</strong> Drag nodes to rearrange the web. Hover over a node to dim unrelated connections (Concept Isolation).
                                </span>
                            </p>
                            <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-500 font-mono">
                                Try: "Causes and Effects of the Cold War"
                            </div>
                        </div>
                    </section>

                    {/* Persona */}
                    <section className="flex gap-6">
                        <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl h-fit text-purple-600 dark:text-purple-400">
                            <UserIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Persona Chat</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                Interview a historical figure simulated by AI. They will respond using knowledge and language appropriate for their era.
                            </p>
                            <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-500 font-mono">
                                Tip: Ask them about their motivations or how they view modern interpretations of their actions.
                            </div>
                        </div>
                    </section>
                    
                    {/* Prompting Tips */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3 flex items-center">
                            <ActivityIcon className="w-5 h-5 mr-2" /> Prompt Engineering for History
                        </h4>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-disc pl-5">
                            <li>Be specific with dates to get cleaner timelines (e.g., "1800-1900").</li>
                            <li>Use keywords like "Compare", "Timeline", or "Causes" to trigger specific visualizations.</li>
                            <li>If the output is too broad, try narrowing the scope (e.g., instead of "WWII", try "The Pacific Theater 1941-1945").</li>
                        </ul>
                    </div>

                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg"
                    >
                        Explore History
                    </button>
                </div>
            </div>
        </div>
    );
};