import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { HistoryResponse } from '../types';
import { generateHistoryAnalysis } from '../services/geminiService';
import { 
    HourglassIcon, SearchIcon, SparklesIcon, SpinnerIcon, 
    TableIcon, ColumnsIcon, ScrollIcon, NetworkIcon, UserIcon, HelpIcon
} from './icons';
import { TimelineView } from './history/TimelineView';
import { NetworkGraph } from './history/NetworkGraph';
import { PersonaChat } from './history/PersonaChat';
import { HistoryHelpModal } from './history/HistoryHelpModal';

interface HistorySAProps {
    user: firebase.User;
}

export const HistorySA = ({ user }: HistorySAProps) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
    const [showPersonaChat, setShowPersonaChat] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHistoryData(null);
        setShowPersonaChat(false);
        
        try {
            const data = await generateHistoryAnalysis(query);
            setHistoryData(data);
        } catch (error) {
            console.error(error);
            setHistoryData({
                type: 'text',
                title: 'Error',
                summary: 'An unexpected error occurred. Please check your connection and try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // --- COMPARISON & TABLE VIEWS ---
    const ComparisonView = ({ data }: { data: NonNullable<HistoryResponse['comparisonData']> }) => {
        if (!data || !data.points || data.points.length === 0) return <div className="text-center p-10 text-slate-500">No data.</div>;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-400 uppercase text-xs tracking-widest pt-2">Criteria</div>
                    <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400 font-serif">{data.subjectA}</div>
                    <div className="text-xl font-bold text-teal-700 dark:text-teal-400 font-serif">{data.subjectB}</div>
                </div>
                <div className="space-y-4">
                    {data.points.map((point, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-4 items-stretch group">
                            <div className="flex items-center justify-center p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 text-sm text-center shadow-inner">{point.criteria}</div>
                            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 shadow-sm text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{point.subjectA}</div>
                            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-900/30 shadow-sm text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{point.subjectB}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const TableView = ({ data }: { data: NonNullable<HistoryResponse['tableData']> }) => {
        if (!data || !data.rows) return <div className="text-center p-10 text-slate-500">No data.</div>;

        return (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            {data.headers.map((header, idx) => (
                                <th key={idx} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 relative">
            
            {showHelp && <HistoryHelpModal onClose={() => setShowHelp(false)} />}

            {/* Persona Chat Overlay */}
            {showPersonaChat && historyData?.keyFigure && (
                <PersonaChat figure={historyData.keyFigure} onClose={() => setShowPersonaChat(false)} />
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                            <HourglassIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight">History SA</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Timelines, Comparisons, and Archives Engine</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowHelp(true)}
                        className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-110 text-slate-500 transition-all"
                        title="User Guide"
                    >
                        <HelpIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto z-10">
                    <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-20 transition-opacity duration-500 ${isLoading ? 'opacity-40 animate-pulse' : ''}`}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center p-2 border border-white/20 dark:border-slate-700">
                        <div className="pl-4 text-slate-400"><SearchIcon className="w-6 h-6" /></div>
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Explore: 'Timeline of the Space Race' or 'Causes of WWI'"
                            className="w-full p-4 bg-transparent border-none focus:ring-0 text-lg placeholder-slate-400 text-slate-800 dark:text-white font-medium"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2 shadow-lg"
                        >
                            {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                            {isLoading ? 'Analyzing...' : 'Explore'}
                        </button>
                    </div>
                </form>

                {/* Content Area */}
                {historyData ? (
                    <div className="animate-fade-in-up space-y-8 pb-20">
                        
                        {/* Header & Persona Trigger */}
                        <div className={`bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden ${['Error', 'Service Busy'].includes(historyData.title) ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 border border-slate-200 dark:border-slate-600">
                                    {historyData.type === 'timeline' && <><ScrollIcon className="w-4 h-4"/> Interactive Timeline</>}
                                    {historyData.type === 'comparison' && <><ColumnsIcon className="w-4 h-4"/> Comparison Matrix</>}
                                    {historyData.type === 'graph' && <><NetworkIcon className="w-4 h-4"/> Causal Network</>}
                                    {historyData.type === 'table' && <><TableIcon className="w-4 h-4"/> Data Archive</>}
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-6 tracking-tight">{historyData.title}</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">{historyData.summary}</p>
                                
                                {historyData.keyFigure && (
                                    <div className="mt-8 flex justify-center">
                                        <button 
                                            onClick={() => setShowPersonaChat(true)}
                                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-200 to-yellow-400 hover:from-amber-300 hover:to-yellow-500 text-amber-900 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 group border-2 border-white/50"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            Chat with {historyData.keyFigure.name}
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Background Decor */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
                        </div>

                        {/* Visualization Container */}
                        {historyData.type !== 'text' && (
                            <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-white/50 dark:border-slate-700 p-2 shadow-inner">
                                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-700 overflow-hidden min-h-[500px]">
                                    {historyData.type === 'timeline' && historyData.timelineData && (
                                        <TimelineView events={historyData.timelineData} globalEvents={historyData.globalContextData} />
                                    )}
                                    {historyData.type === 'graph' && historyData.graphData && (
                                        <NetworkGraph nodes={historyData.graphData.nodes} edges={historyData.graphData.edges} />
                                    )}
                                    {historyData.type === 'comparison' && historyData.comparisonData && (
                                        <div className="p-4 md:p-10">
                                            <ComparisonView data={historyData.comparisonData} />
                                        </div>
                                    )}
                                    {historyData.type === 'table' && historyData.tableData && (
                                        <div className="p-4 md:p-10">
                                            <TableView data={historyData.tableData} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : !isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-fade-in">
                         <button onClick={() => setQuery("Timeline of the French Revolution")} className="p-8 text-center border border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all group flex flex-col items-center">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ScrollIcon className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Visual Timelines</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">"Timeline of the French Revolution"</p>
                        </button>
                         <button onClick={() => setQuery("Causes of the Cold War")} className="p-8 text-center border border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all group flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <NetworkIcon className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Causal Networks</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">"Causes of the Cold War"</p>
                        </button>
                         <button onClick={() => setQuery("Compare Roman Empire vs Han Dynasty")} className="p-8 text-center border border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-lg transition-all group flex flex-col items-center">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ColumnsIcon className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Comparisons</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">"Rome vs Han Dynasty"</p>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};