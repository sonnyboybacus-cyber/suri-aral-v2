
import React from 'react';
import { TestMetadata, SchoolInfo, ClassInfo, Teacher, Subject } from '../../types';
import { QuestionBank, TOS } from '../../types/questionBank';
import { AnalysisSetup } from './AnalysisSetup';
import { CheckCircleIcon, ChevronDownIcon, FileTextIcon, KeyIcon, LibraryIcon, SchoolIcon, SettingsIcon, UserIcon } from '../icons';
import { OMR_ITEM_OPTIONS } from '../../services/omrEngine';

interface AnalysisConfigProps {
    metadata: TestMetadata;
    setMetadata: React.Dispatch<React.SetStateAction<TestMetadata>>;
    schools: SchoolInfo[];
    classes: ClassInfo[];
    teachers: Teacher[];
    subjects: Subject[];
    onSchoolSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onClassSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onSubjectSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onInitialize: () => void;
    // Integration Props
    questionBanks?: QuestionBank[];
    tosList?: TOS[];
    selectedBankId?: string;
    selectedTOSId?: string;
    onBankSelect?: (bankId: string) => void;
    onTOSSelect?: (tosId: string) => void;
    isLoadingBanks?: boolean;
    isLoadingTOS?: boolean;
}

export const AnalysisConfig = ({
    metadata,
    setMetadata,
    schools,
    classes,
    teachers,
    subjects,
    onSchoolSelect,
    onClassSelect,
    onSubjectSelect,
    onInitialize,
    questionBanks,
    tosList,
    selectedBankId,
    selectedTOSId,
    onBankSelect,
    onTOSSelect,
    isLoadingBanks,
    isLoadingTOS
}: AnalysisConfigProps) => {

    const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateTotalItems = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value) || 0;
        // Limit max items for performance/UI sanity if needed, e.g. 100
        const safeCount = Math.min(Math.max(0, count), 200);

        setMetadata(prev => ({
            ...prev,
            totalItems: safeCount,
            answerKey: Array(safeCount).fill('').map((_, i) => prev.answerKey?.[i] || ''),
            competencies: Array(safeCount).fill('').map((_, i) => prev.competencies?.[i] || '')
        }));
    };

    const handleAnswerKeyChange = (index: number, value: string) => {
        // Allow A-E, a-e, and numbers 1-5 mapped to A-E if desired, but simple letters are best.
        const cleanVal = value.toUpperCase().replace(/[^A-E]/g, '');
        if (cleanVal.length > 1) return; // Single char only

        const newKey = [...(metadata.answerKey || [])];
        newKey[index] = cleanVal;
        setMetadata(prev => ({ ...prev, answerKey: newKey }));
    };

    // Derived state for filtering
    const selectedSchool = schools.find(s => s.id === metadata.schoolId);
    const selectedSchoolId = selectedSchool?.id || metadata.schoolId || '';

    const filteredClasses = classes.filter(c => {
        if (selectedSchool) return c.schoolId === selectedSchool.id;
        return true;
    });

    const selectedClassId = filteredClasses.find(c =>
        c.gradeLevel === metadata.gradeLevel &&
        c.section === metadata.section
    )?.id || '';

    const activeClassSubjects = useClassSubjects(classes, metadata, subjects);

    // Smart Filtering: Class Subjects -> Grade Level Subjects -> All
    const filteredSubjects = React.useMemo(() => {
        if (activeClassSubjects.length > 0) return activeClassSubjects;
        if (metadata.gradeLevel) {
            const gradeNum = metadata.gradeLevel.replace(/[^0-9]/g, '');
            return subjects.filter(s => {
                const subjGrade = (s.gradeLevel || '').toString().replace(/[^0-9]/g, '');
                return subjGrade === gradeNum;
            });
        }
        return subjects;
    }, [activeClassSubjects, metadata.gradeLevel, subjects]);

    return (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 md:p-8 min-h-full">
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">

                {/* Section 1: Context */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* School & Class Selection */}
                    <section className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <SchoolIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Institution</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Select context</p>
                            </div>
                        </div>

                        <div className="space-y-5 flex-1">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">School</label>
                                <div className="relative group">
                                    <select
                                        onChange={onSchoolSelect}
                                        value={selectedSchoolId}
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                                    >
                                        <option value="">-- Select School --</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Class Section</label>
                                <div className="relative group">
                                    <select
                                        onChange={onClassSelect}
                                        value={selectedClassId}
                                        disabled={!selectedSchoolId && schools.length > 0}
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- Select Class --</option>
                                        {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.gradeLevel} - {c.section}</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Exam Details */}
                    <section className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <FileTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Examination Details</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Configure assessment parameters</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                            <div className="sm:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Examination Title</label>
                                <div className="relative group">
                                    <select
                                        name="titleOfExamination"
                                        value={metadata.titleOfExamination}
                                        onChange={handleMetadataChange}
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-600"
                                    >
                                        <option value="">-- Select Exam Period --</option>
                                        <option value="1st Quarter Examination">1st Quarter Examination</option>
                                        <option value="2nd Quarter Examination">2nd Quarter Examination</option>
                                        <option value="3rd Quarter Examination">3rd Quarter Examination</option>
                                        <option value="4th Quarter Examination">4th Quarter Examination</option>
                                        <option value="Summative Test">Summative Test</option>
                                        <option value="Diagnostic Test">Diagnostic Test</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Subject Area</label>
                                {filteredSubjects.length > 0 ? (
                                    <div className="relative group">
                                        <select
                                            name="subject"
                                            value={metadata.subject}
                                            onChange={onSubjectSelect}
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200"
                                        >
                                            <option value="">-- Select Subject --</option>
                                            {filteredSubjects.map((s: any) => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        name="subject"
                                        value={metadata.subject}
                                        onChange={handleMetadataChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        placeholder="e.g. Mathematics 10"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Subject Teacher</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                    <input
                                        list="teacher-suggestions"
                                        type="text"
                                        name="teacherInCharge"
                                        value={metadata.teacherInCharge}
                                        onChange={handleMetadataChange}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        placeholder="Select or type teacher name"
                                    />
                                    <datalist id="teacher-suggestions">
                                        {teachers.filter(t => !t.deletedAt).map(t => (
                                            <option key={t.id} value={`${t.firstName} ${t.lastName}`} />
                                        ))}
                                    </datalist>
                                    <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Grade</label>
                                <select
                                    name="gradeLevel"
                                    value={metadata.gradeLevel}
                                    onChange={handleMetadataChange}
                                    className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 border border-transparent rounded-lg text-sm font-bold text-center appearance-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-</option>
                                    <option value="Kindergarten">Kindergarten</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                                        <option key={g} value={`Grade ${g}`}>Grade {g}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Section</label>
                                <input type="text" name="section" value={metadata.section} onChange={handleMetadataChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 border border-transparent rounded-lg text-sm font-bold text-center" placeholder="-" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
                                <input type="text" name="schoolYear" value={metadata.schoolYear} onChange={handleMetadataChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 border border-transparent rounded-lg text-sm font-bold text-center" placeholder="-" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Items</label>
                                <div className="relative">
                                    {OMR_ITEM_OPTIONS.includes(metadata.totalItems) || metadata.totalItems === 0 ? (
                                        <div className="relative">
                                            <select
                                                name="totalItems"
                                                value={metadata.totalItems}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'custom') {
                                                        // Switch to custom mode by triggering a re-render with a non-standard value
                                                        // We set it to 1 temporarily to trigger the input view if 1 is not in options (it isn't)
                                                        // Or better, just keep current value if it's 0, but we need to enter input mode.
                                                        // If we set it to '1', it renders input.
                                                        setMetadata(prev => ({ ...prev, totalItems: 1 }));
                                                    } else {
                                                        const count = parseInt(val) || 0;
                                                        setMetadata(prev => ({
                                                            ...prev,
                                                            totalItems: count,
                                                            answerKey: Array(count).fill('').map((_, i) => prev.answerKey?.[i] || ''),
                                                            competencies: Array(count).fill('').map((_, i) => prev.competencies?.[i] || '')
                                                        }));
                                                    }
                                                }}
                                                className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-bold text-center text-indigo-700 dark:text-indigo-300 appearance-none cursor-pointer"
                                            >
                                                <option value={0}>-</option>
                                                {OMR_ITEM_OPTIONS.map((n: number) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                                <option value="custom">Custom...</option>
                                            </select>
                                            <ChevronDownIcon className="absolute right-2 top-2.5 w-4 h-4 text-indigo-400 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="relative flex items-center gap-1">
                                            <input
                                                type="number"
                                                name="totalItems"
                                                value={metadata.totalItems || ''}
                                                onChange={handleUpdateTotalItems}
                                                placeholder="#"
                                                className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-bold text-center text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                min="0"
                                                max="200"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => setMetadata(prev => ({ ...prev, totalItems: 0 }))}
                                                type="button"
                                                title="Switch to Presets"
                                                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                                            >
                                                <SettingsIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <AnalysisSetup
                    metadata={metadata}
                    onMetadataChange={setMetadata}
                    schools={schools}
                    classes={classes}
                    teachers={teachers}
                    subjects={(filteredSubjects as any[])}
                    onSchoolSelect={onSchoolSelect}
                    onClassSelect={onClassSelect}
                    onSubjectSelect={onSubjectSelect}

                    onQuestionFileSelect={() => { }} // File upload handled in Setup
                    onMapCompetencies={() => { }} // Handled in Setup
                    handleAnswerKeyChange={handleAnswerKeyChange}
                    isExtracting={false}
                    isMappingCompetencies={false}
                    testQuestions={""} // Passed from useItemAnalysis via props to Config? No, Config doesn't have it.
                // Wait, AnalysisConfig is creating AnalysisSetup but AnalysisSetup was part of useItemAnalysis return?
                // Actually, the structure is: useItemAnalysis returns data -> AnalysisSetup (view). 
                // But here AnalysisConfig is RENDERED inside AnalysisSetup? No.
                // AnalysisConfig renders AnalysisSetup? No, looking at lines 242 it calls AnalysisSetup.
                // BUT AnalysisConfig.tsx lines 20+ shows it RECEIVES metadata etc.
                // I need to check where AnalysisConfig is used. It seems I am adding AnalysisSetup usage inside AnalysisConfig?
                // Previous content of AnalysisConfig at line 242 was just closing divs.
                // Wait, AnalysisConfig IS the component that was displayed in the tabs?
                // Let's re-read AnalysisConfig usage.

                // Actually, AnalysisSetup is the view. AnalysisConfig seems to be the configuration form (Context, Exam Details).
                // The previous AnalysisSetup file (lines 1-336) was the View for the "Config" tab?
                // Let's check useItemAnalysis again. useItemAnalysis returns state.
                // ItemAnalysis (main component?) uses them.

                // I might have confused the components.
                // AnalysisSetup (file) exports AnalysisSetup (component).
                // AnalysisConfig (file) exports AnalysisConfig (component).

                // Let's check where they are used. likely in `components/item-analysis/index.tsx` or similar.
                // I saw `AnalysisSetup.tsx` content (lines 1-336) it renders the whole config UI.
                // `AnalysisConfig.tsx` (lines 1-307) ALSO renders a config UI?
                // They look duplicated or alternatives?
                // AnalysisSetup has "Upload Test Questions". AnalysisConfig has "Institution", "Exam Details".

                // IF AnalysisSetup replaces AnalysisConfig, or vice versa?
                // Looking at `useItemAnalysis.ts` line 52: activeTab state includes 'config'.
                // I should check the main container file. `c:\Users\User\Downloads\suri-aral-v2\components\item-analysis\index.tsx` (not seen yet) or `AnalysisRoot`?

                // I see `AnalysisSetup.tsx` has `AnalysisSetup` component which takes `metadata`, etc.
                // I see `AnalysisConfig.tsx` has `AnalysisConfig` component which takes `metadata`, etc.

                // I suspect `AnalysisSetup` is the OLD one and `AnalysisConfig` is the NEW one, or vice versa?
                // Or `AnalysisSetup` is the container for the setup phase?

                // I'll check the parent component that renders these.
                // I suspect it's `c:\Users\User\Downloads\suri-aral-v2\components\item-analysis\index.tsx` (if exists) or just `ItemAnalysis.tsx`.
                // I'll search for the parent.

                />

                {/* Section 2: Answer Key */}
                {metadata.totalItems > 0 && (
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 animate-fade-in">
                        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                    <KeyIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Answer Key</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Input correct answers for {metadata.totalItems} items.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <SettingsIcon className="w-4 h-4" />
                                <span>Auto-save enabled</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {Array.from({ length: metadata.totalItems }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center group">
                                    <span className="text-[10px] font-bold text-slate-400 mb-1 group-hover:text-indigo-500 transition-colors">{i + 1}</span>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        className={`w-10 h-10 text-center rounded-xl font-bold text-sm border-2 transition-all focus:outline-none focus:scale-110 shadow-sm ${metadata.answerKey?.[i]
                                            ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-400'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 focus:border-indigo-500 dark:focus:border-indigo-500'
                                            }`}
                                        value={metadata.answerKey?.[i] || ''}
                                        onChange={(e) => handleAnswerKeyChange(i, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer Action */}
                <div className="flex justify-end pt-4 pb-8">
                    <button
                        onClick={onInitialize}
                        disabled={metadata.totalItems === 0 || !metadata.titleOfExamination}
                        className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-200 font-bold shadow-xl shadow-slate-900/10 dark:shadow-white/5 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        Proceed to Scoring
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook helper to get subjects for selected class
function useClassSubjects(classes: ClassInfo[], metadata: TestMetadata, allSubjects: Subject[]) {
    const activeClass = classes.find(c =>
        c.gradeLevel === metadata.gradeLevel &&
        c.section === metadata.section
    );
    return activeClass?.subjects || [];
}
