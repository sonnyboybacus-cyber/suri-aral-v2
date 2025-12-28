
import React, { useState, useEffect, useMemo } from 'react';
import { loadSession, listSessions } from '../../services/databaseService';
import { aggregateSessions, ConsolidatedData } from '../../services/analysisAggregation';
import { SessionInfo } from '../../types';
// UPDATED IMPORT: Using the facade
// UPDATED IMPORT: Using the facade
import { useUser } from '../../contexts/UserContext';
import { hasPermission } from '../../config/PermissionMatrix'; // Unified Permission Check
import { generateDepartmentalInsights } from '../../services/geminiService';
import {
    FilterIcon, SpinnerIcon, BarChart3Icon, TrendingUpIcon,
    AlertTriangleIcon, SparklesIcon, FileTextIcon, SchoolIcon, LockIcon
} from '../icons';
import { generateConsolidatedReportPDF } from '../../services/pdfGenerator';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ConsolidatedViewProps {
    userId: string;
}

export const ConsolidatedView = ({ userId }: ConsolidatedViewProps) => {
    const { role, userProfile } = useUser(); // Get full profile
    const canAccess = hasPermission(role, 'view_consolidated_report', userProfile);

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <LockIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Access Denied</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    You do not have permission to view the Consolidated Departmental Report. Please contact your administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isAggregating, setIsAggregating] = useState(false);
    const [consolidatedData, setConsolidatedData] = useState<ConsolidatedData | null>(null);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

    // Filters
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(''); // NEW: School Filter

    useEffect(() => {
        const fetchList = async () => {
            setIsLoadingList(true);
            try {
                const list = await listSessions(userId);
                setSessions(list);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingList(false);
            }
        };
        fetchList();
    }, [userId]);

    // 1. Grade Options
    const gradeOptions = useMemo(() => {
        const grades = new Set(sessions.map(s => s.gradeLevel).filter(Boolean));
        return Array.from(grades).sort((a, b) => {
            const strA = a || '';
            const strB = b || '';
            return strA.localeCompare(strB, undefined, { numeric: true });
        });
    }, [sessions]);

    // 2. Subject Options
    const subjectOptions = useMemo(() => {
        if (!selectedGrade) return [];
        return Array.from(new Set(sessions.filter(s => s.gradeLevel === selectedGrade).map(s => s.subject))).sort();
    }, [sessions, selectedGrade]);

    // 3. Exam Options
    const examOptions = useMemo(() => {
        if (!selectedGrade || !selectedSubject) return [];
        return Array.from(new Set(sessions.filter(s =>
            s.gradeLevel === selectedGrade &&
            s.subject === selectedSubject
        ).map(s => s.titleOfExamination))).sort();
    }, [sessions, selectedGrade, selectedSubject]);

    // 4. School Options (NEW - Derived from Consolidated Data or Pre-filter?)
    // Actually, it's better to filter schools AFTER aggregation to allow dynamic drilling
    // But for the initial dropdown, we can derive from sessions if wanted.
    // For now, let's keep the filter inside the report view (post-generation) or pre-generation?
    // The requirement implies generating a report for ALL schools, then filtering. 
    // Let's allow users to generate the full report first.

    const handleGenerateReport = async () => {
        if (!selectedGrade || !selectedSubject || !selectedExam) {
            alert("Please select Grade, Subject, and Exam.");
            return;
        }

        setIsAggregating(true);
        setConsolidatedData(null);
        setAiInsight(null);
        setSelectedSchool(''); // Reset school filter on new generation

        try {
            const targetSessions = sessions.filter(s =>
                s.gradeLevel === selectedGrade &&
                s.subject === selectedSubject &&
                s.titleOfExamination === selectedExam
            );

            if (targetSessions.length === 0) {
                alert("No matching sessions found.");
                setIsAggregating(false);
                return;
            }

            const promises = targetSessions.map(s => loadSession(userId, s.id));
            const fullSessions = (await Promise.all(promises)).filter(s => s !== null) as any[];

            const result = aggregateSessions(fullSessions);
            setConsolidatedData(result);

        } catch (error) {
            console.error("Aggregation Failed:", error);
            alert("Failed to generate report.");
        } finally {
            setIsAggregating(false);
        }
    };

    // Derived Display Data based on School Filter
    const displayData = useMemo(() => {
        if (!consolidatedData) return null;

        if (selectedSchool) {
            // Drill-down: Show Sections for specific school
            const schoolData = consolidatedData.schools.find(s => s.name === selectedSchool);
            return {
                title: `${selectedSchool} - Section Performance`,
                type: 'Section',
                items: schoolData ? schoolData.sections : []
            };
        } else {
            // High-Level: Show Schools
            return {
                title: 'School Performance Summary',
                type: 'School',
                items: consolidatedData.schools
            };
        }
    }, [consolidatedData, selectedSchool]);

    const handleGenerateAI = async () => {
        if (!consolidatedData) return;
        setIsGeneratingInsight(true);
        try {
            const insight = await generateDepartmentalInsights(consolidatedData);
            setAiInsight(insight);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingInsight(false);
        }
    };

    const handleExportPDF = () => {
        if (!consolidatedData) return;
        generateConsolidatedReportPDF(consolidatedData, aiInsight);
    };

    const parseMarkdown = (text: string) => {
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^### (.*$)/gim, '<h3 class="font-bold mt-4 mb-2 text-indigo-700 dark:text-indigo-400">$1</h3>')
            .replace(/^\d\. (.*$)/gim, '<li class="list-decimal ml-5 mb-1">$1</li>')
            .replace(/^- (.*$)/gim, '<li class="list-disc ml-5 mb-1">$1</li>')
            .replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {/* Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <FilterIcon className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wide text-sm">Departmental Report Filters</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    {/* Filters */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">1. Grade Level</label>
                        <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">-- Select Grade --</option>
                            {gradeOptions.map(g => <option key={g as string} value={g as string}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2. Subject</label>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedGrade} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                            <option value="">-- Select Subject --</option>
                            {subjectOptions.map(s => <option key={s as string} value={s as string}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">3. Exam Period</label>
                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} disabled={!selectedSubject} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                            <option value="">-- Select Exam --</option>
                            {examOptions.map(e => <option key={e as string} value={e as string}>{e}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isAggregating || isLoadingList || !selectedExam}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isAggregating ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <BarChart3Icon className="w-4 h-4" />}
                            Generate
                        </button>

                        {consolidatedData && (
                            <button
                                onClick={handleExportPDF}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                                title="Export PDF"
                            >
                                <FileTextIcon className="w-4 h-4" />
                                PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {consolidatedData && (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><TrendingUpIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Overall MPS</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">{consolidatedData.overallMPS.toFixed(2)}%</h3>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><FileTextIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Total Students</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">{consolidatedData.totalStudents}</h3>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-violet-50 dark:bg-violet-900/30 text-violet-600 rounded-xl"><SchoolIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Schools</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">{consolidatedData.schools.length}</h3>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl"><AlertTriangleIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Total Sections</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">{consolidatedData.totalSections}</h3>
                            </div>
                        </div>
                    </div>

                    {/* SCHOOL FILTER BAR */}
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <SchoolIcon className="w-5 h-5 text-slate-500" />
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">View Data For:</span>
                        </div>
                        <select
                            value={selectedSchool}
                            onChange={e => setSelectedSchool(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                        >
                            <option value="">All Schools (Aggregated)</option>
                            {consolidatedData.schools.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* DYNAMIC CHART & TABLE */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* CHART */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-[500px] flex flex-col">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex justify-between items-center">
                                {displayData?.title}
                                <span className="text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{displayData?.type} Level Analysis</span>
                            </h3>
                            <div className="flex-1 w-full min-h-0"> {/* Vital for responsiveness */}
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayData?.items} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="mps" name="MPS" radius={[0, 4, 4, 0]} barSize={20}>
                                            {displayData?.items.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.mps >= 75 ? '#10b981' : entry.mps >= 50 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* COMPETENCIES (Global for now, could be filtered too if API supported it) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Least Mastered Skills (Global)</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                {consolidatedData.competencies
                                    .filter(c => c.interpretation === 'Not Mastered' || c.interpretation === 'Least Mastered')
                                    .sort((a, b) => a.mps - b.mps)
                                    .slice(0, 15)
                                    .map((c, idx) => (
                                        <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg group hover:bg-red-100 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400">Item #{c.itemNumber}</span>
                                                <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{c.mps.toFixed(0)}%</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 group-hover:line-clamp-none transition-all" title={c.description}>
                                                {c.description}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Section */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <SparklesIcon className="w-6 h-6 text-yellow-400" /> Departmental Insights
                                </h3>
                                {!aiInsight && (
                                    <button
                                        onClick={handleGenerateAI}
                                        disabled={isGeneratingInsight}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 backdrop-blur-sm"
                                    >
                                        {isGeneratingInsight ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                        Analyze Data
                                    </button>
                                )}
                            </div>

                            {aiInsight ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {parseMarkdown(aiInsight)}
                                </div>
                            ) : (
                                <p className="text-indigo-200 text-sm">
                                    Click "Analyze Data" to have the AI identify universal learning gaps, anomalies across schools/sections, and suggest grade-level interventions.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
