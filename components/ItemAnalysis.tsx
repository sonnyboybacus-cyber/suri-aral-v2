import React from 'react';
import firebase from 'firebase/compat/app';
import { AIContext, ChatMessage } from '../types';
// New Import
import { useUser } from '../contexts/UserContext';
import { hasPermission } from '../config/PermissionMatrix'; // Unified Permission Check
import { generateItemAnalysisReport, generateAnswerSheet } from '../services/pdfGenerator';
import { ProgressAnalysisModal } from './item-analysis/ProgressModal';
import { AnalysisResults } from './item-analysis/AnalysisResults';
import {
    XIcon, SaveIcon, SpinnerIcon, FolderIcon, TrashIcon, FileTextIcon,
    BrainCircuitIcon, CheckCircleIcon, AlertTriangleIcon, LightbulbIcon, SparklesIcon, CopyIcon
} from './icons';

// New Components & Hook
import { useItemAnalysis } from './item-analysis/useItemAnalysis';
import { AnalysisSetup } from './item-analysis/AnalysisSetup';
import { ScoreEncoder } from './item-analysis/ScoreEncoder';
import { RemedialGenerator } from './item-analysis/RemedialGenerator';
import { ConsolidatedView } from './item-analysis/ConsolidatedView';
import { SessionPortal } from './item-analysis/SessionPortal';

interface ItemAnalysisProps {
    user: firebase.User;
    onStartAnalysis: (context: AIContext) => void;
    chatMessages: ChatMessage[];
    onGenerateLessonPlan?: (data: any) => void;
}

export const ItemAnalysis = ({ user, onStartAnalysis, chatMessages, onGenerateLessonPlan }: ItemAnalysisProps) => {
    const { role, userProfile } = useUser();
    const {
        // State
        metadata, setMetadata,
        students, setStudents,
        analysisResults,
        testQuestions,
        activeTab, setActiveTab,
        isLoading, isSaving, isExtracting,
        isMappingCompetencies, isGeneratingRemedial,
        schools, classes, teachers, subjects,
        // selectedClassId, setSelectedClassId, // Not explicitly used in view, handled in hook handlers
        sessions, showLoadModal, setShowLoadModal,
        selectedClassId, // Exposed for UI Sync
        aiAnalysisReport, remedialQuestions, questionAnalysis,
        showQuestionAnalysis, setShowQuestionAnalysis,
        showRemedialModal, setShowRemedialModal,
        isRemedialCopied,
        selectedStudentForProgress, setSelectedStudentForProgress,
        isLoadingProgress,

        // Handlers
        calculateAnalysis,
        handleExtractQuestions,
        handleMapCompetencies,
        handleGenerateRemedial,
        handleQuestionAnalysis,
        handleSaveSession,
        handleLoadSession,
        handleDeleteSession,
        handleRecordScoresToHistory,
        handleInitializeStudents,
        handleCopyRemedial,
        handleSchoolSelect,
        handleClassSelect,
        handleSubjectSelect,
        handleDeleteProgress,
        handleExtractQuestions: onQuestionFileSelect, // Alias for consistent naming
        handleOpenProgress,
        handleAnswerKeyChange,
        // Integration
        questionBanks,
        tosList,
        selectedBankId,
        selectedTOSId,
        handleBankSelect,
        handleTOSSelect,
        handleLinkTOSToBank,
        isLoadingBanks,
        isLoadingTOS
    } = useItemAnalysis(user, onStartAnalysis, chatMessages);

    // Permission Check
    const canViewConsolidated = hasPermission(role, 'view_consolidated_report', userProfile);

    // Pass-through specific handlers that might need event adaptation or simple args
    const onSchoolSelectAdapt = (e: React.ChangeEvent<HTMLSelectElement>) => handleSchoolSelect(e);
    const onClassSelectAdapt = (e: React.ChangeEvent<HTMLSelectElement>) => handleClassSelect(e);
    const onSubjectSelectAdapt = (e: React.ChangeEvent<HTMLSelectElement>) => handleSubjectSelect(e);
    const onQuestionFileSelectAdapt = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleExtractQuestions(e.target.files[0]);
    };

    // PDF Export Logic
    const handleExportReportPDF = () => {
        generateItemAnalysisReport(metadata, students, analysisResults, aiAnalysisReport);
    };

    const handlePrintAnswerSheet = () => {
        generateAnswerSheet(metadata);
    };

    const handleStartAIAnalysis = () => {
        if (analysisResults.length === 0) return;
        onStartAnalysis({
            metadata,
            students,
            analysisResults,
            questions: testQuestions
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 p-4 md:p-8 transition-colors duration-300">
            {/* Session Portal (Replaces old Load Modal) */}
            <SessionPortal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                sessions={sessions}
                onLoad={handleLoadSession}
                onDelete={handleDeleteSession}
            />

            {/* Question Analysis Modal */}
            {showQuestionAnalysis && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-[95vw] md:w-full md:max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] animate-scale-up overflow-hidden">
                        <div className="px-4 py-4 md:px-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                                    <BrainCircuitIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Deep Item Analysis</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">AI-driven pedagogical breakdown</p>
                                </div>
                            </div>
                            <button onClick={() => setShowQuestionAnalysis(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                            {!questionAnalysis ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-4">
                                        <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
                                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <SparklesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                        </div>
                                    </div>
                                    <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-1">Analyzing Item...</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">Deconstructing core concepts, misconceptions, and strategies.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center">
                                            <LightbulbIcon className="w-4 h-4 mr-2" /> Core Concept
                                        </h4>
                                        <p className="text-base text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                                            {questionAnalysis.analysis.coreConcept}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl p-5 border border-red-100 dark:border-red-900/30">
                                            <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4 flex items-center">
                                                <AlertTriangleIcon className="w-4 h-4 mr-2" /> Common Misconceptions
                                            </h4>
                                            <ul className="space-y-3">
                                                {questionAnalysis.analysis.commonMisconceptions.map((m, i) => (
                                                    <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                                                        <span className="leading-relaxed">{m}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30">
                                            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center">
                                                <CheckCircleIcon className="w-4 h-4 mr-2" /> Remedial Strategies
                                            </h4>
                                            <ul className="space-y-3">
                                                {questionAnalysis.analysis.teachingSuggestions.map((s, i) => (
                                                    <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                                        <span className="leading-relaxed">{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {questionAnalysis.suggestedQuestions && questionAnalysis.suggestedQuestions.length > 0 && (
                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Suggested Inquiries</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {questionAnalysis.suggestedQuestions.map((q, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600">
                                                        {q}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Remedial Modal */}
            {showRemedialModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-[95vw] md:w-full md:max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-scale-up overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Remedial Questions</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generated based on least mastered competencies</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCopyRemedial}
                                    className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isRemedialCopied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'}`}
                                >
                                    {isRemedialCopied ? <CheckCircleIcon className="w-4 h-4 mr-1.5" /> : <CopyIcon className="w-4 h-4 mr-1.5" />}
                                    {isRemedialCopied ? 'Copied!' : 'Copy All'}
                                </button>
                                <button onClick={() => setShowRemedialModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
                            {remedialQuestions.map((q, i) => (
                                <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                            Question {i + 1}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            Target: {q.targetedConcept}
                                        </span>
                                    </div>
                                    <p className="font-medium text-lg text-slate-800 dark:text-slate-100 mb-6 leading-relaxed">{q.question}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                        {q.options.map((opt, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border text-sm font-medium transition-colors ${opt === q.correctAnswer
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                <span className="font-bold mr-3 opacity-60">{String.fromCharCode(65 + idx)}.</span> {opt}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex gap-3">
                                        <div className="mt-0.5"><BrainCircuitIcon className="w-4 h-4 text-indigo-500" /></div>
                                        <div>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Explanation</span>
                                            {q.explanation}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedStudentForProgress && (
                <ProgressAnalysisModal
                    key={selectedStudentForProgress.id}
                    student={selectedStudentForProgress}
                    onClose={() => setSelectedStudentForProgress(null)}
                    isLoading={isLoadingProgress}
                    onDelete={(id) => handleDeleteProgress(selectedStudentForProgress.id, id)}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm sticky top-2 z-30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white">
                            <FileTextIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                Item Analysis
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Assessment Evaluation & AI Insights Engine
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowLoadModal(true)}
                            className="group flex items-center px-6 py-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500"
                        >
                            <FolderIcon className="w-4 h-4 mr-2 text-indigo-500 group-hover:scale-110 transition-transform" />
                            Open Portal
                        </button>
                        <button
                            onClick={handleSaveSession}
                            disabled={isSaving}
                            className={`
                                relative overflow-hidden flex items-center px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none
                                ${isSaving
                                    ? 'bg-indigo-400 text-white cursor-wait'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50'
                                }
                            `}
                        >
                            {/* Animated Background Shimmer */}
                            {!isSaving && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] hover:animate-[shimmer_1.5s_infinite]"></div>}

                            {isSaving ? (
                                <>
                                    <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                                    <span>Syncing...</span>
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="w-4 h-4 mr-2" />
                                    <span>Save Workspace</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[85vh] md:h-auto md:min-h-[700px]">
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4 md:px-6 pt-4 overflow-x-auto custom-scrollbar relative z-30 shrink-0 w-full">
                        {['config', 'scores', 'results', 'consolidated'].filter(tab => {
                            if (tab === 'consolidated') {
                                return canViewConsolidated;
                            }
                            return true;
                        }).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`
                                    relative px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all rounded-t-2xl mr-2 whitespace-nowrap cursor-pointer flex-shrink-0
                                    ${activeTab === tab
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}
                                `}
                            >
                                {tab === 'config' && 'Setup & Metadata'}
                                {tab === 'scores' && 'Score Entry'}
                                {tab === 'results' && 'Item Analysis'}
                                {tab === 'consolidated' && 'Consolidated Report'}
                                {activeTab === tab && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content Views */}
                    <div className="p-6 md:p-8 min-h-[500px] flex-1">
                        {activeTab === 'config' && (
                            <AnalysisSetup
                                metadata={metadata}
                                onMetadataChange={setMetadata}
                                schools={schools}
                                classes={classes}
                                teachers={teachers}
                                subjects={subjects}
                                onSchoolSelect={onSchoolSelectAdapt}
                                onClassSelect={onClassSelectAdapt}
                                onSubjectSelect={onSubjectSelectAdapt}
                                onQuestionFileSelect={onQuestionFileSelectAdapt}
                                onMapCompetencies={handleMapCompetencies}
                                handleAnswerKeyChange={handleAnswerKeyChange}
                                isExtracting={isExtracting}
                                isMappingCompetencies={isMappingCompetencies}
                                testQuestions={testQuestions}
                                // Integration Props
                                questionBanks={questionBanks}
                                tosList={tosList}
                                selectedBankId={selectedBankId}
                                selectedTOSId={selectedTOSId}
                                onBankSelect={handleBankSelect}
                                onTOSSelect={handleTOSSelect}
                                handleLinkTOSToBank={handleLinkTOSToBank}
                                isLoadingBanks={isLoadingBanks}
                                isLoadingTOS={isLoadingTOS}
                                selectedClassId={selectedClassId}
                            />
                        )}

                        {activeTab === 'scores' && (
                            <ScoreEncoder
                                students={students}
                                metadata={metadata}
                                onStudentsChange={setStudents}
                                onCalculate={calculateAnalysis}
                                onRecordHistory={handleRecordScoresToHistory}
                                onPrintSheet={handlePrintAnswerSheet}
                                onOpenProgress={handleOpenProgress}
                                isSaving={isSaving}
                            />
                        )}

                        {activeTab === 'results' && (
                            <AnalysisResults
                                analysisResults={analysisResults}
                                students={students}
                                metadata={metadata}
                                onStartAI={handleStartAIAnalysis}
                                onGenerateRemedial={handleGenerateRemedial}
                                onExtractCompetencies={handleMapCompetencies}
                                isGeneratingRemedial={isGeneratingRemedial}
                                isMappingCompetencies={isMappingCompetencies}
                                onViewCompetency={() => { }}
                                onGenerateLessonPlanFromItem={(item) => onGenerateLessonPlan?.(item)}
                                onPrintReport={handleExportReportPDF}
                                onOpenQuestionAnalysis={handleQuestionAnalysis}
                                aiAnalysisReport={aiAnalysisReport}
                                onRecordHistory={handleRecordScoresToHistory}
                                tosList={tosList}
                                selectedTOSId={selectedTOSId}
                                onTOSSelect={handleTOSSelect}
                            />
                        )}

                        {activeTab === 'consolidated' && (
                            <ConsolidatedView userId={user.uid} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
