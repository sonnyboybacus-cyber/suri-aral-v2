import React, { useState } from 'react';
import { Subject, WeeklyUnit, LearningCompetency, LearnSAContext } from '../../../types';
import { BrainCircuitIcon, PlusIcon, TrashIcon, EditIcon, CheckCircleIcon } from '../../icons';

interface CurriculumEditorProps {
    currentSubject: Omit<Subject, 'id' | 'deletedAt'>;
    setCurrentSubject: React.Dispatch<React.SetStateAction<Omit<Subject, 'id' | 'deletedAt'>>>;
    onLaunchTutor?: (context: LearnSAContext) => void;
    editingSubjectId: string | null;
}

const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

export const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
    currentSubject,
    setCurrentSubject,
    onLaunchTutor,
    editingSubjectId
}) => {
    const [activeQuarter, setActiveQuarter] = useState<string>('1st Quarter');
    const [editingWeek, setEditingWeek] = useState<WeeklyUnit | null>(null);

    const getCurrentQuarterData = () => {
        return currentSubject.curriculum?.find(q => q.quarter === activeQuarter) || { quarter: activeQuarter, weeks: [] };
    };

    const handleAddWeek = () => {
        const newWeek: WeeklyUnit = {
            id: crypto.randomUUID(),
            orderIndex: (getCurrentQuarterData().weeks.length || 0) + 1,
            weekLabel: `Week ${(getCurrentQuarterData().weeks.length || 0) + 1}`,
            contentTopic: '',
            contentStandard: '',
            performanceStandard: '',
            competencies: []
        };
        setEditingWeek(newWeek);
    };

    const handleDeleteWeek = (weekId: string) => {
        if (!confirm("Delete this week and its competencies?")) return;

        setCurrentSubject(prev => {
            const updatedCurriculum = [...(prev.curriculum || [])];
            const qIndex = updatedCurriculum.findIndex(q => q.quarter === activeQuarter);
            if (qIndex > -1) {
                updatedCurriculum[qIndex].weeks = updatedCurriculum[qIndex].weeks.filter(w => w.id !== weekId);
            }
            return { ...prev, curriculum: updatedCurriculum };
        });
    };

    const handleSaveWeek = () => {
        if (!editingWeek) return;
        if (!editingWeek.weekLabel || !editingWeek.contentTopic) {
            alert("Week Label and Content Topic are required.");
            return;
        }
        if (editingWeek.competencies.length === 0) {
            alert("Please add at least one competency.");
            return;
        }

        setCurrentSubject(prev => {
            let updatedCurriculum = [...(prev.curriculum || [])];
            let qIndex = updatedCurriculum.findIndex(q => q.quarter === activeQuarter);

            if (qIndex === -1) {
                updatedCurriculum.push({ quarter: activeQuarter, weeks: [] });
                qIndex = updatedCurriculum.length - 1;
            }

            const wIndex = updatedCurriculum[qIndex].weeks.findIndex(w => w.id === editingWeek.id);
            if (wIndex > -1) {
                updatedCurriculum[qIndex].weeks[wIndex] = editingWeek;
            } else {
                updatedCurriculum[qIndex].weeks.push(editingWeek);
            }

            updatedCurriculum[qIndex].weeks.sort((a, b) => a.orderIndex - b.orderIndex);

            return { ...prev, curriculum: updatedCurriculum };
        });

        setEditingWeek(null);
    };

    const handleLaunchAICourse = (week: WeeklyUnit) => {
        if (!onLaunchTutor) return;

        const contextData = `
        Subject: ${currentSubject.name} (${currentSubject.gradeLevel})
        Description: ${currentSubject.description}
        
        Week: ${week.weekLabel} - ${week.contentTopic}
        
        Standards:
        - Content: ${week.contentStandard}
        - Performance: ${week.performanceStandard}
        
        Learning Competencies:
        ${week.competencies.map(c => `- ${c.code}: ${c.description}`).join('\n')}
        `;

        onLaunchTutor({
            topic: week.contentTopic,
            contextData: contextData,
            subjectId: editingSubjectId || undefined,
            weekId: week.id
        });
    };

    const handleCompetencyChange = (index: number, field: keyof LearningCompetency, value: string) => {
        if (!editingWeek) return;
        const updated = [...editingWeek.competencies];
        updated[index] = { ...updated[index], [field]: value };
        setEditingWeek(prev => prev ? ({ ...prev, competencies: updated }) : null);
    };

    const handleRemoveCompetency = (index: number) => {
        if (!editingWeek) return;
        const updated = editingWeek.competencies.filter((_, i) => i !== index);
        setEditingWeek(prev => prev ? ({ ...prev, competencies: updated }) : null);
    };

    return (
        <div className="p-0 h-full flex flex-col">
            <div className="flex justify-center p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <div className="bg-white dark:bg-slate-700 p-1 rounded-lg inline-flex shadow-sm border border-slate-200 dark:border-slate-600">
                    {QUARTERS.map(q => (
                        <button
                            key={q}
                            onClick={() => { setActiveQuarter(q); setEditingWeek(null); }}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeQuarter === q ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Week List */}
                <div className={`${editingWeek ? 'hidden md:block w-1/3' : 'w-full'} border-r border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800`}>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Weeks</h3>
                            <button onClick={handleAddWeek} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {getCurrentQuarterData().weeks.length === 0 ? (
                            <div className="text-center py-10 px-4">
                                <p className="text-slate-400 text-sm italic">No weeks added for this quarter.</p>
                                <button onClick={handleAddWeek} className="mt-2 text-indigo-600 text-xs font-bold hover:underline">Add First Week</button>
                            </div>
                        ) : (
                            getCurrentQuarterData().weeks.map(week => (
                                <div
                                    key={week.id}
                                    onClick={() => setEditingWeek(week)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative ${editingWeek?.id === week.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200'
                                        : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">{week.weekLabel}</span>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{week.contentTopic || 'Untitled Topic'}</h4>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteWeek(week.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                            {week.competencies.length} Competencies
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleLaunchAICourse(week); }}
                                            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold rounded shadow-sm hover:scale-105 transition-transform"
                                        >
                                            <BrainCircuitIcon className="w-3 h-3" /> Start AI Course
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Week Editor Form */}
                {editingWeek && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center">
                                    <EditIcon className="w-5 h-5 mr-2 text-indigo-500" /> Edit Week Details
                                </h3>
                                <button
                                    onClick={() => handleLaunchAICourse(editingWeek)}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center"
                                >
                                    <BrainCircuitIcon className="w-3.5 h-3.5 mr-1.5" /> Launch in Learn SA
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Week Label</label>
                                    <input
                                        type="text"
                                        value={editingWeek.weekLabel}
                                        onChange={(e) => setEditingWeek({ ...editingWeek, weekLabel: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold"
                                        placeholder="e.g. Week 1-2"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Content Topic</label>
                                    <input
                                        type="text"
                                        value={editingWeek.contentTopic}
                                        onChange={(e) => setEditingWeek({ ...editingWeek, contentTopic: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium"
                                        placeholder="e.g. Principles of Design"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Content Standard</label>
                                    <textarea
                                        value={editingWeek.contentStandard}
                                        onChange={(e) => setEditingWeek({ ...editingWeek, contentStandard: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm h-24 resize-none"
                                        placeholder="The learner demonstrates understanding..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Performance Standard</label>
                                    <textarea
                                        value={editingWeek.performanceStandard}
                                        onChange={(e) => setEditingWeek({ ...editingWeek, performanceStandard: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm h-24 resize-none"
                                        placeholder="The learner is able to..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Learning Competencies</h3>
                                <button
                                    onClick={() => setEditingWeek(prev => prev ? ({
                                        ...prev,
                                        competencies: [...prev.competencies, { description: '', code: '' }]
                                    }) : null)}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center"
                                >
                                    <PlusIcon className="w-3 h-3 mr-1" /> Add Row
                                </button>
                            </div>

                            <div className="space-y-2">
                                {editingWeek.competencies.length === 0 && (
                                    <p className="text-slate-400 text-sm italic text-center py-4">No competencies added yet.</p>
                                )}
                                {editingWeek.competencies.map((comp, idx) => (
                                    <div key={idx} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={comp.description}
                                                onChange={(e) => handleCompetencyChange(idx, 'description', e.target.value)}
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                placeholder="Competency Description"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="text"
                                                value={comp.code}
                                                onChange={(e) => handleCompetencyChange(idx, 'code', e.target.value)}
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono"
                                                placeholder="Code"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const updated = editingWeek.competencies.filter((_, i) => i !== idx);
                                                setEditingWeek(prev => ({ ...prev!, competencies: updated }));
                                            }}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingWeek(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveWeek}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md transition-colors flex items-center"
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-2" /> Save Week
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
