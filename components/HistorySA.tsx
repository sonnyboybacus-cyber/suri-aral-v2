
import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { HistoryResponse, TimelineEvent, ComparisonPoint } from '../types';
import { generateHistoryAnalysis } from '../services/geminiService';
import { HourglassIcon, SearchIcon, SparklesIcon, SpinnerIcon, TableIcon, ColumnsIcon, ScrollIcon } from './icons';

interface HistorySAProps {
    user: User;
}

export const HistorySA = ({ user }: HistorySAProps) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHistoryData(null);
        try {
            const data = await generateHistoryAnalysis(query);
            setHistoryData(data);
        } catch (error) {
            console.error(error);
            alert("Could not analyze historical data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- VISUALIZATION COMPONENTS ---

    const TimelineView = ({ events }: { events: TimelineEvent[] }) => (
        <div className="relative py-10 px-4 overflow-x-auto custom-scrollbar">
            {/* Central Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-200 dark:bg-indigo-900 transform -translate-y-1/2 min-w-max"></div>
            
            <div className="flex gap-12 min-w-max items-center pt-8 pb-8 px-8">
                {events.map((event, idx) => (
                    <div key={idx} className={`relative flex flex-col ${idx % 2 === 0 ? 'justify-end mb-20' : 'justify-start mt-20'} group w-64`}>
                        
                        {/* Node Dot */}
                        <div className={`absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm z-10 transition-all duration-300 group-hover:scale-125 group-hover:bg-indigo-600 bg-indigo-400 ${idx % 2 === 0 ? 'top-full mt-8' : 'bottom-full mb-8'}`}></div>
                        
                        {/* Connector Line */}
                        <div className={`absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-indigo-300/50 dark:bg-indigo-700/50 h-8 ${idx % 2 === 0 ? 'top-full' : 'bottom-full'}`}></div>

                        {/* Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group-hover:border-indigo-300 dark:group-hover:border-indigo-700">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
                                {event.year}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2">{event.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                                {event.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ComparisonView = ({ data }: { data: NonNullable<HistoryResponse['comparisonData']> }) => (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-400 uppercase text-xs tracking-widest pt-2">Criteria</div>
                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400 font-serif">{data.subjectA}</div>
                <div className="text-xl font-bold text-teal-700 dark:text-teal-400 font-serif">{data.subjectB}</div>
            </div>
            
            <div className="space-y-4">
                {data.points.map((point, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 items-stretch group">
                        {/* Criteria Column */}
                        <div className="flex items-center justify-center p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 text-sm text-center shadow-inner">
                            {point.criteria}
                        </div>
                        
                        {/* Subject A Column */}
                        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 shadow-sm group-hover:shadow-md transition-shadow text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {point.subjectA}
                        </div>
                        
                        {/* Subject B Column */}
                        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-900/30 shadow-sm group-hover:shadow-md transition-shadow text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {point.subjectB}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const TableView = ({ data }: { data: NonNullable<HistoryResponse['tableData']> }) => (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        {data.headers.map((header, idx) => (
                            <th key={idx} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <header className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg">
                        <HourglassIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">History SA</h1>
                        <p className="text-slate-500 dark:text-slate-400">Timelines, Comparisons, and Archives Engine</p>
                    </div>
                </header>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
                    <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 transition-opacity duration-500 ${isLoading ? 'opacity-40' : ''}`}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center p-2 border border-white/20 dark:border-slate-700">
                        <div className="pl-4 text-slate-400">
                            <SearchIcon className="w-6 h-6" />
                        </div>
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g. 'Timeline of the Space Race' or 'Compare WW1 vs WW2'"
                            className="w-full p-4 bg-transparent border-none focus:ring-0 text-lg placeholder-slate-400 text-slate-800 dark:text-white"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                        >
                            {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                            {isLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>
                </form>

                {/* Content Area */}
                {historyData && (
                    <div className="animate-fade-in-up space-y-8">
                        
                        {/* Title & Summary Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                                {historyData.type === 'timeline' && <><ScrollIcon className="w-4 h-4"/> Timeline Mode</>}
                                {historyData.type === 'comparison' && <><ColumnsIcon className="w-4 h-4"/> Comparison Mode</>}
                                {historyData.type === 'table' && <><TableIcon className="w-4 h-4"/> Data View</>}
                            </div>
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">
                                {historyData.title}
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                                {historyData.summary}
                            </p>
                        </div>

                        {/* Visualization Container */}
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-white/50 dark:border-slate-700 p-2 shadow-inner">
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-700 p-6 md:p-10 min-h-[400px]">
                                {historyData.type === 'timeline' && historyData.timelineData && (
                                    <TimelineView events={historyData.timelineData} />
                                )}
                                {historyData.type === 'comparison' && historyData.comparisonData && (
                                    <ComparisonView data={historyData.comparisonData} />
                                )}
                                {historyData.type === 'table' && historyData.tableData && (
                                    <TableView data={historyData.tableData} />
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {!historyData && !isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 opacity-60">
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <ScrollIcon className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                            <h3 className="font-bold text-sm mb-1">Dynamic Timelines</h3>
                            <p className="text-xs text-slate-500">"Timeline of Ancient Egypt"</p>
                        </div>
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <ColumnsIcon className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                            <h3 className="font-bold text-sm mb-1">Deep Comparisons</h3>
                            <p className="text-xs text-slate-500">"Capitalism vs Socialism"</p>
                        </div>
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <TableIcon className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                            <h3 className="font-bold text-sm mb-1">Data Tables</h3>
                            <p className="text-xs text-slate-500">"List of Monarchs of England"</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
