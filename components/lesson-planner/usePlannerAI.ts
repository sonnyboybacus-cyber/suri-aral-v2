import { useState } from 'react';
import { LessonPlan, Rubric } from '../../types';
import { searchEducationalResources, generateDifferentiation, generateRubric, generateQuiz } from '../../services/ai/plannerService';

export const usePlannerAI = (
    plan: LessonPlan,
    onUpdate: (field: keyof LessonPlan, value: any) => void
) => {
    // --- Resource Finder State ---
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ title: string, uri: string }[]>([]);
    const [isSearchingResources, setIsSearchingResources] = useState(false);

    // --- Differentiation State ---
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [diffVariations, setDiffVariations] = useState<{ remedial: string, average: string, enrichment: string } | null>(null);
    const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);
    const [activeDiffTab, setActiveDiffTab] = useState<'remedial' | 'average' | 'enrichment'>('remedial');

    // --- Assessment Maker State ---
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [assessmentTab, setAssessmentTab] = useState<'rubric' | 'quiz'>('rubric');
    const [rubricType, setRubricType] = useState<'analytic' | 'holistic'>('analytic');
    const [generatedRubric, setGeneratedRubric] = useState<Rubric | null>(null);
    const [quizItems, setQuizItems] = useState<{ question: string, options: string[], answer: string }[] | null>(null);
    const [quizCount, setQuizCount] = useState(5);
    const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);

    const isDLL = plan.type === 'DLL';

    // --- Resource Handlers ---
    const handleOpenResourceFinder = () => {
        setSearchQuery(plan.topic || '');
        setSearchResults([]);
        setShowResourceModal(true);
    };

    const handleSearchResources = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearchingResources(true);
        try {
            const results = await searchEducationalResources(searchQuery);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingResources(false);
        }
    };

    const handleAddResource = (res: { title: string, uri: string }) => {
        const newResource = `• ${res.title} - ${res.uri}`;
        if (isDLL) {
            if (plan.dllWeek && plan.dllWeek.length > 0) {
                const newWeek = [...plan.dllWeek];
                newWeek[0].resources = newWeek[0].resources ? `${newWeek[0].resources}\n${newResource}` : newResource;
                onUpdate('dllWeek', newWeek);
            }
        } else {
            const updatedResources = plan.otherResources
                ? `${plan.otherResources}\n${newResource}`
                : newResource;
            onUpdate('otherResources', updatedResources);
        }
    };

    // --- Differentiation Handlers ---
    const handleDifferentiate = async () => {
        setIsGeneratingDiff(true);
        setShowDiffModal(true);
        try {
            const content = `${plan.lessonProper || ''}\n\n${plan.groupActivity || ''}`;
            const result = await generateDifferentiation(plan.topic || 'General', content);
            setDiffVariations(result);
        } catch (e) {
            console.error(e);
            alert("Failed to generate differentiation.");
            setShowDiffModal(false);
        } finally {
            setIsGeneratingDiff(false);
        }
    };

    const handleApplyDiff = () => {
        if (!diffVariations) return;
        const selectedContent = diffVariations[activeDiffTab];
        const newContent = `${plan.lessonProper || ''}\n\n### Differentiated Instruction (${activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)})\n${selectedContent}`;
        onUpdate('lessonProper', newContent);
        setShowDiffModal(false);
    };

    const handleAppendAllDiff = () => {
        if (!diffVariations) return;
        const newContent = `${plan.lessonProper || ''}\n\n### Differentiated Instruction\n\n**Remedial:**\n${diffVariations.remedial}\n\n**Average:**\n${diffVariations.average}\n\n**Enrichment:**\n${diffVariations.enrichment}`;
        onUpdate('lessonProper', newContent);
        setShowDiffModal(false);
    };

    // --- Assessment Handlers ---
    const handleGenerateRubric = async () => {
        setIsGeneratingAssessment(true);
        try {
            const objectives = `${plan.objectivesKnowledge || ''}\n${plan.objectivesPsychomotor || ''}\n${plan.objectivesAffective || ''}`;
            const result = await generateRubric(objectives, rubricType);
            setGeneratedRubric(result);
        } catch (e) {
            console.error(e);
            alert("Failed to generate rubric.");
        } finally {
            setIsGeneratingAssessment(false);
        }
    };

    const handleGenerateQuiz = async () => {
        setIsGeneratingAssessment(true);
        try {
            const content = `${plan.topic || ''}\n\n${plan.concepts || ''}\n\n${plan.lessonProper || ''}`;
            const result = await generateQuiz(content, quizCount);
            setQuizItems(result);
        } catch (e) {
            console.error(e);
            alert("Failed to generate quiz.");
        } finally {
            setIsGeneratingAssessment(false);
        }
    };

    const handleAppendRubric = () => {
        if (!generatedRubric) return;
        let text = `\n\n### Rubric: ${generatedRubric.title}\n\n`;

        if (rubricType === 'analytic') {
            text += `| Criteria | ${generatedRubric.criteria[0].levels.map(l => `${l.score} pts`).join(' | ')} |\n`;
            text += `| --- | ${generatedRubric.criteria[0].levels.map(() => '---').join(' | ')} |\n`;
            generatedRubric.criteria.forEach(c => {
                text += `| ${c.name} | ${c.levels.map(l => l.description).join(' | ')} |\n`;
            });
        } else {
            text += `| Score | Description |\n| --- | --- |\n`;
            generatedRubric.criteria[0].levels.forEach(l => {
                text += `| ${l.score} | ${l.description} |\n`;
            });
        }

        onUpdate('assessment', (plan.assessment || '') + text);
        setShowAssessmentModal(false);
    };

    const handleAppendQuiz = () => {
        if (!quizItems) return;
        let text = `\n\n### Assessment Quiz\n\n`;
        let key = `\n\n**Answer Key:**\n`;

        quizItems.forEach((item, i) => {
            text += `${i + 1}. ${item.question}\n`;
            item.options.forEach((opt, j) => {
                text += `   ${String.fromCharCode(65 + j)}. ${opt}\n`;
            });
            text += `\n`;
            key += `${i + 1}. ${item.answer}\n`;
        });

        onUpdate('assessment', (plan.assessment || '') + text + key);
        setShowAssessmentModal(false);
    };

    return {
        // Resource Finder
        showResourceModal, setShowResourceModal,
        searchQuery, setSearchQuery,
        searchResults,
        isSearchingResources,
        handleOpenResourceFinder,
        handleSearchResources,
        handleAddResource,

        // Differentiation
        showDiffModal, setShowDiffModal,
        diffVariations, setDiffVariations,
        isGeneratingDiff,
        activeDiffTab, setActiveDiffTab,
        handleDifferentiate,
        handleApplyDiff,
        handleAppendAllDiff,

        // Assessment
        showAssessmentModal, setShowAssessmentModal,
        assessmentTab, setAssessmentTab,
        rubricType, setRubricType,
        generatedRubric,
        quizItems,
        quizCount, setQuizCount,
        isGeneratingAssessment,
        handleGenerateRubric,
        handleGenerateQuiz,
        handleAppendRubric,
        handleAppendQuiz
    };
};
