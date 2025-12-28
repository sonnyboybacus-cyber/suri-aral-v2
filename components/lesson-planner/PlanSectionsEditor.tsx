import React from 'react';
import { LessonPlan } from '../../types';
import { LayersIcon, ClipboardListIcon } from '../icons';
import { EditableSection } from './PlannerShared.tsx';

interface PlanSectionsEditorProps {
    plan: LessonPlan;
    onUpdate: (field: keyof LessonPlan, value: any) => void;
    onDifferentiate: () => void;
    onAssessment: () => void;
}

export const PlanSectionsEditor: React.FC<PlanSectionsEditorProps> = ({
    plan,
    onUpdate,
    onDifferentiate,
    onAssessment
}) => {
    return (
        <div className="space-y-12">
            {/* I. OBJECTIVES */}
            <section>
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">I</span> Objectives
                </h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <EditableSection
                            label="Content Standards"
                            value={plan.contentStandards}
                            onChange={(v: string) => onUpdate('contentStandards', v)}
                        />
                        <EditableSection
                            label="Performance Standards"
                            value={plan.performanceStandards}
                            onChange={(v: string) => onUpdate('performanceStandards', v)}
                        />
                        <EditableSection
                            label="Learning Competencies"
                            value={plan.learningCompetencies}
                            onChange={(v: string) => onUpdate('learningCompetencies', v)}
                        />
                    </div>

                    {/* CATEGORIZED OBJECTIVES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <EditableSection
                            label={<><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Knowledge (Cognitive)</>}
                            value={plan.objectivesKnowledge}
                            onChange={(v) => onUpdate('objectivesKnowledge', v)}
                            heightClass="h-48"
                            placeholder="What will the student know?"
                        />
                        <EditableSection
                            label={<><span className="w-2 h-2 bg-teal-500 rounded-full"></span> Psychomotor (Skills)</>}
                            value={plan.objectivesPsychomotor}
                            onChange={(v) => onUpdate('objectivesPsychomotor', v)}
                            heightClass="h-48"
                            placeholder="What will the student perform?"
                        />
                        <EditableSection
                            label={<><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Affective (Attitude)</>}
                            value={plan.objectivesAffective}
                            onChange={(v) => onUpdate('objectivesAffective', v)}
                            heightClass="h-48"
                            placeholder="What values will be exhibited?"
                        />
                    </div>
                </div>
            </section>

            {/* II. CONTENT */}
            <section>
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">II</span> Content
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EditableSection
                        label="Topic"
                        value={plan.topic}
                        onChange={(v) => onUpdate('topic', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                    <EditableSection
                        label="Key Concepts"
                        value={plan.concepts}
                        onChange={(v) => onUpdate('concepts', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                </div>
            </section>

            {/* III. LEARNING RESOURCES */}
            <section>
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">III</span> Learning Resources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <EditableSection
                        label="Teacher's Guide Pages"
                        value={plan.refGuidePages}
                        onChange={(v) => onUpdate('refGuidePages', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                    <EditableSection
                        label="Learner's Material Pages"
                        value={plan.refLearnerPages}
                        onChange={(v) => onUpdate('refLearnerPages', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                    <EditableSection
                        label="Textbook Pages"
                        value={plan.refTextbookPages}
                        onChange={(v) => onUpdate('refTextbookPages', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                    <EditableSection
                        label="Other Resources"
                        value={plan.otherResources}
                        onChange={(v) => onUpdate('otherResources', v)}
                        isSimple
                        heightClass="h-auto"
                    />
                </div>
            </section>

            {/* IV. PROCEDURES */}
            <section>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center">
                        <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">IV</span> Procedures ({plan.strategy})
                    </h3>
                    <button
                        onClick={onDifferentiate}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                        <LayersIcon className="w-4 h-4 mr-2" /> Differentiate
                    </button>
                </div>
                <div className="space-y-8">
                    <EditableSection
                        label="A. Preparatory Activities"
                        value={plan.preparatoryActivities}
                        onChange={(v) => onUpdate('preparatoryActivities', v)}
                        heightClass="h-64"
                        placeholder="Drill, Review, Motivation..."
                    />
                    <EditableSection
                        label="B. Presentation"
                        value={plan.presentation}
                        onChange={(v) => onUpdate('presentation', v)}
                        heightClass="h-64"
                        placeholder="Presenting the new lesson..."
                    />
                    <EditableSection
                        label="C. Lesson Proper"
                        value={plan.lessonProper}
                        onChange={(v) => onUpdate('lessonProper', v)}
                        heightClass="h-96"
                        placeholder="Developmental activities, discussion, analysis..."
                    />
                    <EditableSection
                        label="D. Application"
                        value={plan.groupActivity}
                        onChange={(v) => onUpdate('groupActivity', v)}
                        heightClass="h-64"
                        placeholder="Group activities, abstraction..."
                    />
                </div>
            </section>

            {/* V. ASSESSMENT */}
            <section>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center">
                        <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">V</span> Evaluation
                    </h3>
                    <button
                        onClick={onAssessment}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                        <ClipboardListIcon className="w-4 h-4 mr-2" /> Assessment Tools
                    </button>
                </div>
                <EditableSection
                    label="Assessment Strategy"
                    value={plan.assessment}
                    onChange={(v) => onUpdate('assessment', v)}
                    heightClass="h-64"
                    placeholder="Quiz, Formative Assessment details..."
                />
            </section>

            {/* VI. ASSIGNMENT */}
            <section>
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded mr-3 font-sans">VI</span> Assignment
                </h3>
                <EditableSection
                    label="Agreement"
                    value={plan.assignment}
                    onChange={(v) => onUpdate('assignment', v)}
                    heightClass="h-32"
                    placeholder="Homework..."
                />
            </section>
        </div>
    );
};
