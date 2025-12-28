import React from 'react';
import { LessonPlan } from '../../types';
import { EditableSection } from './PlannerShared.tsx';

interface DLLEditorGridProps {
    plan: LessonPlan;
    onUpdate: (field: keyof LessonPlan, value: any) => void;
}

export const DLLEditorGrid: React.FC<DLLEditorGridProps> = ({ plan, onUpdate }) => {
    if (!plan.dllWeek) return null;

    const updateDLLDay = (dayIndex: number, field: string, value: string) => {
        if (!plan.dllWeek) return;
        const newWeek = [...plan.dllWeek];
        newWeek[dayIndex] = { ...newWeek[dayIndex], [field]: value };
        onUpdate('dllWeek', newWeek);
    };

    return (
        <div className="overflow-x-auto pb-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-inner bg-slate-50/50 dark:bg-slate-900/30">
            <div className="min-w-[1600px] grid grid-cols-5 gap-4 p-4">
                {/* Headers */}
                {plan.dllWeek.map((day, idx) => (
                    <div key={idx} className="bg-slate-100 dark:bg-slate-700 p-3 rounded-t-lg text-center font-bold text-slate-700 dark:text-slate-200 uppercase text-sm border-b-2 border-indigo-500 shadow-sm">
                        {day.day}
                    </div>
                ))}

                {/* Objectives Row */}
                <div className="col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-2 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 rounded-md">I. Objectives</div>
                {plan.dllWeek.map((day, idx) => (
                    <div key={`obj-${idx}`} className="h-48">
                        <EditableSection
                            label=""
                            value={day.objectives}
                            onChange={(v: string) => updateDLLDay(idx, 'objectives', v)}
                            heightClass="h-44"
                        />
                    </div>
                ))}

                {/* Content Row */}
                <div className="col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-2 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 rounded-md mt-4">II. Content</div>
                {plan.dllWeek.map((day, idx) => (
                    <div key={`con-${idx}`} className="h-48">
                        <EditableSection
                            label=""
                            value={day.content}
                            onChange={(v: string) => updateDLLDay(idx, 'content', v)}
                            heightClass="h-44"
                        />
                    </div>
                ))}

                {/* Resources Row */}
                <div className="col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-2 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 rounded-md mt-4">III. Learning Resources</div>
                {plan.dllWeek.map((day, idx) => (
                    <div key={`res-${idx}`} className="h-48">
                        <EditableSection
                            label=""
                            value={day.resources}
                            onChange={(v: string) => updateDLLDay(idx, 'resources', v)}
                            heightClass="h-44"
                        />
                    </div>
                ))}

                {/* Procedures Row */}
                <div className="col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-2 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 rounded-md mt-4">IV. Procedures</div>
                {plan.dllWeek.map((day, idx) => (
                    <div key={`proc-${idx}`} className="h-96">
                        <EditableSection
                            label=""
                            value={day.procedures}
                            onChange={(v: string) => updateDLLDay(idx, 'procedures', v)}
                            heightClass="h-96"
                        />
                    </div>
                ))}

                {/* Remarks Row */}
                <div className="col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-2 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 rounded-md mt-4">V. Remarks</div>
                {plan.dllWeek.map((day, idx) => (
                    <div key={`rem-${idx}`} className="h-32">
                        <EditableSection
                            label=""
                            value={day.remarks}
                            onChange={(v: string) => updateDLLDay(idx, 'remarks', v)}
                            heightClass="h-28"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
