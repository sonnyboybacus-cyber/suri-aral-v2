
import React, { useMemo } from 'react';
import { Student } from '../../types';
import { XIcon, TrendingUpIcon, SpinnerIcon, TrashIcon } from '../icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ProgressAnalysisModal = ({ student, onClose, isLoading, onDelete }: { student: Student, onClose: () => void, isLoading?: boolean, onDelete?: (id: string) => void }) => {
    const historyData = useMemo(() => {
        if (student.progressHistory && student.progressHistory.length > 0) {
            return student.progressHistory.map(h => ({
                date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                score: (h.score / h.totalItems) * 100,
                raw: h.score,
                total: h.totalItems,
                title: h.testName,
                id: h.id
            }));
        }
        return [];
    }, [student.progressHistory]);

    const stats = useMemo(() => {
        if (historyData.length === 0) return { avg: 0, high: 0, count: 0 };
        const total = historyData.reduce((acc, curr) => acc + curr.score, 0);
        const max = Math.max(...historyData.map(h => h.score));
        return {
            avg: Math.round(total / historyData.length),
            high: Math.round(max),
            count: historyData.length
        };
    }, [historyData]);

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-[95vw] md:w-full md:max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{student.name}</h2>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Performance Analytics</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            <TrendingUpIcon className="w-12 h-12 mb-2 opacity-50" />
                            <p>No historical data recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Average Score</div>
                                    <div className={`text-2xl font-black ${stats.avg >= 75 ? 'text-green-500' : stats.avg >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {stats.avg}%
                                    </div>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Highest Score</div>
                                    <div className="text-2xl font-black text-indigo-500">{stats.high}%</div>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total Tests</div>
                                    <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{stats.count}</div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 h-64 md:h-80">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Performance Trend</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={historyData}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* History List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white px-1">Recent Activity</h3>
                                {historyData.slice().reverse().map((record, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{record.title}</h4>
                                            <p className="text-xs text-slate-500">{record.date}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right whitespace-nowrap">
                                                <span className="block font-bold text-indigo-600 dark:text-indigo-400">{record.score.toFixed(0)}%</span>
                                                <span className="text-[10px] text-slate-400">{record.raw}/{record.total} items</span>
                                            </div>
                                            <button
                                                onClick={() => onDelete?.(record.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Record"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
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
