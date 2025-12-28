
import React, { useState, useRef, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { AdvancedAnalysisResult, AIContext, AnalysisTier, StatTableRow } from '../types';
import { performAdvancedAnalysis } from '../services/geminiService';
import {
    BarChart3Icon, LineChartIcon, ScatterPlotIcon, FileSpreadsheetIcon,
    SigmaIcon, TrendingUpIcon, BrainCircuitIcon, UploadIcon,
    SparklesIcon, SpinnerIcon, XIcon, FileTextIcon, PieChartIcon,
    GridIcon, TableIcon, ArrowUpIcon, LayersIcon
} from './icons';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
    ReferenceLine
} from 'recharts';
import jsPDF from 'jspdf';

interface DataSAProps {
    user: firebase.User;
    onStartAnalysis: (context: AIContext) => void;
}

const TIER_CONFIG: Record<AnalysisTier, { label: string, icon: React.ReactNode, desc: string, color: string }> = {
    descriptive: { label: "Descriptive", icon: <BarChart3Icon className="w-5 h-5" />, desc: "Distribution & Basics", color: "indigo" },
    inferential: { label: "Inferential", icon: <SigmaIcon className="w-5 h-5" />, desc: "Hypothesis Testing", color: "emerald" },
    regression: { label: "Regression", icon: <ScatterPlotIcon className="w-5 h-5" />, desc: "Correlations", color: "purple" },
    predictive: { label: "Predictive", icon: <TrendingUpIcon className="w-5 h-5" />, desc: "Forecasting", color: "amber" },
    multivariate: { label: "Multivariate", icon: <GridIcon className="w-5 h-5" />, desc: "Clustering (PCA)", color: "cyan" }
};

// --- SUB-COMPONENTS ---

const StatTable = ({ title, rows }: { title: string, rows: StatTableRow[] }) => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm animate-fade-in-up">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
            <TableIcon className="w-4 h-4 text-slate-400" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {(rows || []).map((row, idx) => (
                <div key={idx} className={`flex justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${row.significance ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{row.label}</span>
                    <span className={`font-mono font-bold ${row.significance ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                        {row.value} {row.significance && '*'}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

export const DataSA = ({ user, onStartAnalysis }: DataSAProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Analysis State
    const [activeTier, setActiveTier] = useState<AnalysisTier>('descriptive');
    const [analysis, setAnalysis] = useState<AdvancedAnalysisResult | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileLoad(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileLoad(e.target.files[0]);
        }
    };

    const handleFileLoad = (uploadedFile: File) => {
        setFile(uploadedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setFileContent(text);
            // Auto-trigger initial descriptive analysis
            runAnalysis(text, 'descriptive');
        };
        reader.readAsText(uploadedFile);
    };

    const runAnalysis = async (data: string, tier: AnalysisTier) => {
        setIsLoading(true);
        setActiveTier(tier);
        setAnalysis(null); // Clear previous to show loading state fully

        try {
            const result = await performAdvancedAnalysis(data, tier);
            setAnalysis(result);
        } catch (error) {
            console.error(error);
            alert("Analysis failed. Please check your data format.");
        } finally {
            setIsLoading(false);
        }
    };

    // Use global chat handler instead of local state
    const handleOpenInsights = () => {
        if (!analysis) return;
        onStartAnalysis({
            advancedAnalysisResult: analysis
        });
    };

    const renderVisualization = () => {
        if (!analysis || !analysis.chartData || analysis.chartData.length === 0) return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No visual data generated.
            </div>
        );

        const CommonProps = {
            data: analysis.chartData,
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };

        const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

        // SAFE ACCESS: Ensure dataKeys exists, or infer it from the first data point
        const safeDataKeys = (analysis.dataKeys && analysis.dataKeys.length > 0)
            ? analysis.dataKeys
            : (analysis.chartData[0] ? Object.keys(analysis.chartData[0]).filter(k => k !== 'name' && k !== analysis.xAxisKey) : []);

        if (safeDataKeys.length === 0) return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Insufficient data dimensions to plot.
            </div>
        );

        switch (analysis.chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey={analysis.xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            {safeDataKeys.map((key, idx) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    name={analysis.legendMapping?.[key] || key}
                                    fill={colors[idx % colors.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart {...CommonProps}>
                            <defs>
                                {safeDataKeys.map((key, idx) => (
                                    <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey={analysis.xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            {safeDataKeys.map((key, idx) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={analysis.legendMapping?.[key] || key}
                                    stroke={colors[idx % colors.length]}
                                    fillOpacity={1}
                                    fill={`url(#color${key})`}
                                    strokeWidth={3}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'scatter':
                const scatterYKey = safeDataKeys[0];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" dataKey={analysis.xAxisKey} name={analysis.xAxisKey} stroke="#94a3b8" fontSize={12} />
                            <YAxis type="number" dataKey={scatterYKey} name={analysis.legendMapping?.[scatterYKey] || scatterYKey} stroke="#94a3b8" fontSize={12} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <Scatter name={analysis.legendMapping?.[scatterYKey] || scatterYKey} data={analysis.chartData} fill="#6366f1" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case 'composed':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey={analysis.xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            {safeDataKeys.map((key, idx) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={analysis.legendMapping?.[key] || key}
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={3}
                                    dot={false}
                                    strokeDasharray={key === 'value2' ? "5 5" : ""} // Assume value2 is prediction/trend
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            default:
                return <div className="flex items-center justify-center h-full text-slate-400">Chart type not supported.</div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
                            <LayersIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">Data SA Studio</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Statistical Analysis Engine</p>
                        </div>
                    </div>
                    {file && (
                        <button
                            onClick={() => { setFile(null); setFileContent(''); setAnalysis(null); }}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center"
                        >
                            <XIcon className="w-4 h-4 mr-2" /> Close Project
                        </button>
                    )}
                </header>

                {!file ? (
                    // Upload Zone
                    <div
                        className={`mt-12 border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer group ${isDragging
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.json" onChange={handleFileSelect} />

                        <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <UploadIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                            Drag & Drop Dataset
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            Supports CSV or JSON. The Studio will automatically detect data types and suggest analysis tiers.
                        </p>
                    </div>
                ) : (
                    // Studio Interface
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px] animate-fade-in-up">

                        {/* Sidebar: Analysis Tiers */}
                        <div className="w-full lg:w-64 flex flex-col gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Analysis Tiers</div>
                            {(Object.keys(TIER_CONFIG) as AnalysisTier[]).map(tier => (
                                <button
                                    key={tier}
                                    onClick={() => runAnalysis(fileContent, tier)}
                                    disabled={isLoading}
                                    className={`p-3 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group ${activeTier === tier
                                            ? `bg-${TIER_CONFIG[tier].color}-600 text-white shadow-md`
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                                        }`}
                                    style={{
                                        backgroundColor: activeTier === tier ? undefined : undefined,
                                        background: activeTier === tier ? `var(--color-${TIER_CONFIG[tier].color}-600)` : undefined
                                    }}
                                >
                                    <div className={`p-1.5 rounded-lg ${activeTier === tier ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-white'}`}>
                                        {TIER_CONFIG[tier].icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{TIER_CONFIG[tier].label}</div>
                                        <div className={`text-[10px] ${activeTier === tier ? 'text-white/80' : 'text-slate-400'}`}>{TIER_CONFIG[tier].desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Main Stage */}
                        <div className="flex-1 flex flex-col gap-6 min-w-0">

                            {/* Insight Bar */}
                            {analysis && (
                                <div className={`border rounded-xl p-5 flex items-start gap-4 shadow-sm animate-fade-in ${analysis.tier === 'inferential' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                        analysis.tier === 'predictive' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                            'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'
                                    }`}>
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm shrink-0">
                                        <SparklesIcon className={`w-5 h-5 ${analysis.tier === 'inferential' ? 'text-emerald-500' : 'text-indigo-500'
                                            }`} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 uppercase tracking-wide opacity-80">AI Insight</h4>
                                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                            {analysis.insight}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenInsights}
                                        className="ml-auto px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all whitespace-nowrap flex items-center gap-2"
                                    >
                                        <BrainCircuitIcon className="w-4 h-4" /> Ask Insights
                                    </button>
                                </div>
                            )}

                            {/* Chart Area */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative flex flex-col min-h-[400px]">
                                {isLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 backdrop-blur-sm rounded-2xl">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
                                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                        </div>
                                        <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-4 animate-pulse">Running Python Statistical Models...</p>
                                    </div>
                                ) : null}

                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Visual Analysis</h3>
                                    <div className="flex gap-2">
                                        {analysis?.rSquared && (
                                            <span className="text-xs font-mono bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                                                R² = {analysis.rSquared}
                                            </span>
                                        )}
                                        {analysis?.pValue !== undefined && (
                                            <span className={`text-xs font-mono px-2 py-1 rounded border ${analysis.pValue < 0.05
                                                    ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                                                    : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                                                }`}>
                                                p = {analysis.pValue}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0">
                                    {renderVisualization()}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Stats Tables */}
                        {analysis && (
                            <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto custom-scrollbar animate-fade-in-right">
                                {analysis.summaryTable && (
                                    <StatTable title={analysis.summaryTable.title} rows={analysis.summaryTable.rows} />
                                )}

                                {analysis.tier === 'inferential' && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase mb-2">Hypothesis Test</h4>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate pr-2" title={analysis.testName}>{analysis.testName || 'T-Test'}</span>
                                            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {analysis.pValue !== undefined ? analysis.pValue : '-'}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                            {(analysis.pValue || 1) < 0.05 ? "Significant Result" : "Not Significant"}
                                        </div>
                                    </div>
                                )}

                                {analysis.tier === 'regression' && analysis.equation && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Model Equation</h4>
                                        <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 break-all leading-relaxed">
                                            {analysis.equation}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};
