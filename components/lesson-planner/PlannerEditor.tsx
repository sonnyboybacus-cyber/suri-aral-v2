import React from 'react';
import { LessonPlan } from '../../types';
import { ArrowDownIcon, FileTextIcon, SpinnerIcon, SaveIcon, PrinterIcon, SearchIcon } from '../icons';
import { generateLessonPlanPDF, generateDLLPDF } from '../../services/pdfGenerator';
import { DLLEditorGrid } from './DLLEditorGrid';
import { PlanSectionsEditor } from './PlanSectionsEditor';
import { usePlannerAI } from './usePlannerAI';
import { PlannerModals } from './PlannerModals';

interface PlannerEditorProps {
    plan: LessonPlan;
    onUpdate: (field: keyof LessonPlan, value: any) => void;
    onSave: () => void;
    onExport: () => void;
    onBack: () => void;
    onOpenLibrary: () => void;
    isSaving: boolean;
    currentPlanId: string | null;
}

export const PlannerEditor = ({
    plan,
    onUpdate,
    onSave,
    onExport,
    onBack,
    onOpenLibrary,
    isSaving,
    currentPlanId
}: PlannerEditorProps) => {

    // AI & Modals Logic extracted to custom hook
    const ai = usePlannerAI(plan, onUpdate);
    const isDLL = plan.type === 'DLL';

    const handleExport = () => {
        if (isDLL) {
            generateDLLPDF(plan);
        } else {
            generateLessonPlanPDF(plan);
        }
    };

    return (
        <div className="animate-fade-in-up max-w-full mx-auto px-4">
            {/* STICKY ACTION BAR */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 mb-8 flex justify-between items-center max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors flex items-center font-bold text-sm"
                    >
                        <ArrowDownIcon className="w-4 h-4 mr-2 rotate-90" /> Back
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 flex items-center gap-2">
                            {plan.topic || 'Untitled Plan'}
                            <span className="text-[10px] uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">{plan.type || 'DLP'}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{plan.gradeLevel} • {plan.learningArea}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={ai.handleOpenResourceFinder}
                        className="hidden md:flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-sm transition-colors border border-indigo-200 dark:border-indigo-800"
                    >
                        <SearchIcon className="w-4 h-4 mr-2" /> Find Resources
                    </button>
                    <button
                        onClick={onOpenLibrary}
                        className="hidden md:flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors"
                    >
                        <FileTextIcon className="w-4 h-4 mr-2 text-indigo-500" /> Library
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md transition-all"
                    >
                        {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                        {currentPlanId ? 'Save Changes' : 'Save Draft'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition-all"
                    >
                        <PrinterIcon className="w-4 h-4 mr-2" /> Export PDF
                    </button>
                </div>
            </div>

            {/* MAIN EDITOR AREA */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 md:p-12 space-y-12 max-w-6xl mx-auto">
                {isDLL ? (
                    // DLL MODE (Horizontal Table)
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Weekly Schedule</h3>
                            <p className="text-sm text-slate-500">Edit content for each day.</p>
                        </div>
                        <DLLEditorGrid plan={plan} onUpdate={onUpdate} />
                    </>
                ) : (
                    // DLP MODE (Vertical Document)
                    <PlanSectionsEditor
                        plan={plan}
                        onUpdate={onUpdate}
                        onDifferentiate={ai.handleDifferentiate}
                        onAssessment={() => ai.setShowAssessmentModal(true)}
                    />
                )}

                {/* SIGNATORIES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 mt-8 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                        <input
                            type="text"
                            value={plan.preparedBy}
                            onChange={e => onUpdate('preparedBy', e.target.value)}
                            className="font-bold text-center border-b-2 border-slate-300 dark:border-slate-600 outline-none bg-transparent w-3/4 uppercase pb-2 text-lg focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Prepared By</p>
                    </div>
                    <div className="text-center">
                        <input
                            type="text"
                            value={plan.notedBy}
                            onChange={e => onUpdate('notedBy', e.target.value)}
                            className="font-bold text-center border-b-2 border-slate-300 dark:border-slate-600 outline-none bg-transparent w-3/4 uppercase pb-2 text-lg focus:border-indigo-500 transition-colors"
                            placeholder="PRINCIPAL'S NAME"
                        />
                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Noted By</p>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <PlannerModals {...ai} />
        </div>
    );
};
