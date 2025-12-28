import React from 'react';
import { TestMetadata, SchoolInfo, ClassInfo, Teacher, Subject } from '../../types';
import { QuestionBank, TOS } from '../../types/questionBank';
import { FileTextIcon, BrainCircuitIcon, XIcon, CheckCircleIcon, LayoutGridIcon, BookOpenIcon, UploadIcon } from '../icons';
import { useAcademicConfig } from '../../hooks/useAcademicConfig';

interface AnalysisSetupProps {
    metadata: TestMetadata;
    onMetadataChange: (data: TestMetadata) => void;
    schools: SchoolInfo[];
    classes: ClassInfo[];
    teachers: Teacher[];
    subjects: Subject[];
    onSchoolSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onClassSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onSubjectSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onQuestionFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onMapCompetencies: () => void;
    handleAnswerKeyChange: (index: number, val: string) => void;
    isExtracting: boolean;
    isMappingCompetencies: boolean;
    testQuestions: string;
    // Integration Props
    questionBanks?: QuestionBank[];
    tosList?: TOS[];
    selectedBankId?: string;
    selectedTOSId?: string;
    onBankSelect?: (bankId: string) => void;
    onTOSSelect?: (tosId: string) => void;
    handleLinkTOSToBank?: (bankId: string) => void;
    isLoadingBanks?: boolean;
    isLoadingTOS?: boolean;
    selectedClassId?: string; // Sync UI State
}

export const AnalysisSetup: React.FC<AnalysisSetupProps> = ({
    metadata,
    onMetadataChange,
    schools,
    classes,
    teachers,
    subjects,
    onSchoolSelect,
    onClassSelect,
    onSubjectSelect,
    onQuestionFileSelect,
    onMapCompetencies,
    handleAnswerKeyChange,
    isExtracting,
    isMappingCompetencies,
    testQuestions,
    questionBanks = [],
    tosList = [],
    selectedBankId,
    selectedTOSId,
    onBankSelect,
    onTOSSelect,
    handleLinkTOSToBank,
    isLoadingBanks,
    isLoadingTOS,
    selectedClassId
}) => {
    const { config } = useAcademicConfig();
    const EXAM_TITLES = config?.examTitles || [
        "First Periodical Examination",
        "Second Periodical Examination",
        "Third Periodical Examination",
        "Fourth Periodical Examination"
    ];

    const QUARTERS = config?.quarters || [
        "1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"
    ];

    const [isCustomTitle, setIsCustomTitle] = React.useState(false);




    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Streamlined Configuration Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <FileTextIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Assessment Configuration</h3>
                        <p className="text-xs text-slate-500 font-medium">Set up the details for this item analysis.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Column 1: Context */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">1. Context</h4>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School</label>
                            <select
                                value={metadata.schoolId || ''}
                                onChange={onSchoolSelect}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            >
                                <option value="">Select School...</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grade & Section</label>
                            <select
                                disabled={!metadata.schoolId}
                                value={selectedClassId || ''} // Sync with state
                                onChange={onClassSelect}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">Select Class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.gradeLevel} - {c.section}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Column 2: Assessment Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">2. Assessment Details</h4>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Examination Title</label>
                            {isCustomTitle ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={metadata.titleOfExamination}
                                        onChange={(e) => onMetadataChange({ ...metadata, titleOfExamination: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium"
                                        placeholder="Enter custom title..."
                                        autoFocus
                                    />
                                    <button onClick={() => setIsCustomTitle(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <select
                                    value={EXAM_TITLES.includes(metadata.titleOfExamination) ? metadata.titleOfExamination : 'custom'}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomTitle(true);
                                            onMetadataChange({ ...metadata, titleOfExamination: '' });
                                        } else {
                                            const title = e.target.value;
                                            // Auto-infer quarter if possible, but respect config
                                            let quarter = metadata.quarter;
                                            if (title.includes('First') || title.includes('1st')) quarter = QUARTERS.find(q => q.includes('1st')) || '1st Quarter';
                                            else if (title.includes('Second') || title.includes('2nd')) quarter = QUARTERS.find(q => q.includes('2nd')) || '2nd Quarter';
                                            else if (title.includes('Third') || title.includes('3rd')) quarter = QUARTERS.find(q => q.includes('3rd')) || '3rd Quarter';
                                            else if (title.includes('Fourth') || title.includes('4th')) quarter = QUARTERS.find(q => q.includes('4th')) || '4th Quarter';

                                            onMetadataChange({ ...metadata, titleOfExamination: title, quarter });
                                        }
                                    }}
                                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                >
                                    <option value="">Select Title...</option>
                                    {EXAM_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="custom" className="font-bold text-indigo-600">+ Custom Title</option>
                                </select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quarter</label>
                                <select
                                    value={metadata.quarter || ''}
                                    onChange={(e) => onMetadataChange({ ...metadata, quarter: e.target.value })}
                                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium"
                                >
                                    <option value="">Select Quarter</option>
                                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                <input
                                    type="date"
                                    value={metadata.dateOfExamination || ''}
                                    onChange={(e) => onMetadataChange({ ...metadata, dateOfExamination: e.target.value })}
                                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                            <select
                                disabled={!metadata.schoolId}
                                onChange={onSubjectSelect}
                                value={metadata.subject}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">Select Subject...</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Column 3: Stats & Teacher */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">3. Stats & Teacher</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Items</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={metadata.totalItems || ''}
                                    onChange={(e) => onMetadataChange({ ...metadata, totalItems: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Test Takers</label>
                                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                                    {metadata.testTakers || 0}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teacher in Charge</label>
                            <div className={`w-full p-2.5 rounded-xl border text-sm font-medium ${metadata.teacherInCharge
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'}`}>
                                {metadata.teacherInCharge || 'Auto-assigned upon subject selection'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Collapsible Metadata (Hidden by default to minimize clutter) */}
                <details className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <summary className="text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors list-none flex items-center gap-2">
                        <span>Show Administrative Details</span>
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">District</label>
                            <div className={`w-full p-2.5 rounded-xl border text-sm font-medium ${metadata.district
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'}`}>
                                {metadata.district || 'Auto-filled from School'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PSDS</label>
                            <div className={`w-full p-2.5 rounded-xl border text-sm font-medium ${metadata.psds
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'}`}>
                                {metadata.psds || 'Auto-filled from School'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Head</label>
                            <div className={`w-full p-2.5 rounded-xl border text-sm font-medium ${metadata.schoolHead
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'}`}>
                                {metadata.schoolHead || 'Auto-filled from School'}
                            </div>
                        </div>
                    </div>
                </details>
            </div>

            {/* Unified Assessment Source */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <BookOpenIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Assessment Source</h3>
                            <p className="text-xs text-slate-500 font-medium">Select the Table of Specifications (TOS) to auto-configure the analysis.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Selection: TOS */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">1. Select Assessment (TOS)</h4>

                        {onTOSSelect && (
                            <div className="relative group">
                                <select
                                    value={selectedTOSId || ''}
                                    onChange={(e) => onTOSSelect(e.target.value)}
                                    className="peer w-full p-3.5 pl-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoadingTOS || !metadata.subject || !metadata.quarter}
                                >
                                    <option value="">
                                        {!metadata.subject || !metadata.quarter
                                            ? "Select Subject & Quarter first..."
                                            : "Select Table of Specifications..."}
                                    </option>
                                    {tosList
                                        .filter(t =>
                                            (!metadata.subject || t.subject === metadata.subject) &&
                                            (!metadata.quarter || t.quarter === metadata.quarter)
                                        )
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.title} ({t.totalItems} items)</option>
                                        ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 peer-focus:text-indigo-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                                {isLoadingTOS && <p className="text-[10px] text-indigo-500 mt-1.5 font-bold animate-pulse">Loading TOS details...</p>}
                            </div>
                        )}

                        {(!metadata.subject || !metadata.quarter) && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 animate-fade-in">
                                <LayoutGridIcon className="w-4 h-4 text-amber-500" />
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                    Please select <strong>Subject</strong> and <strong>Quarter</strong> above to view available assessments.
                                </p>
                            </div>
                        )}

                        {!selectedTOSId && metadata.subject && metadata.quarter && (
                            <p className="text-xs text-slate-400 italic">Please select a TOS to begin. This will automatically load the questions and answer key if linked.</p>
                        )}

                        {selectedTOSId && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3 animate-fade-in">
                                <div className="mt-0.5"><CheckCircleIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">TOS Mode Active</p>
                                    <p className="text-[10px] font-medium text-indigo-700/70 dark:text-indigo-400/70 mt-0.5">
                                        Competencies are strictly locked to the selected Table of Specifications.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secondary Display: Source Status */}
                    <div className="space-y-4 border-l border-slate-100 dark:border-slate-700 pl-0 md:pl-8">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">2. Data Source Status</h4>

                        {selectedTOSId ? (
                            <div className="space-y-4 animate-fade-in">
                                {/* Question Bank Status */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Questions Source</label>
                                    {selectedBankId ? (
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {questionBanks.find(b => b.id === selectedBankId)?.name || 'Linked Question Bank'}
                                            <span className="ml-auto text-xs font-normal text-slate-400">
                                                {testQuestions.split('\n').filter(l => l.trim().length > 0).length} Lines Loaded
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                No Linked Question Bank
                                            </div>
                                            {/* Linker UI */}
                                            {handleLinkTOSToBank && (
                                                <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-2">ACTION REQUIRED: Link a Question Bank</p>
                                                    <select
                                                        className="w-full text-xs p-2 rounded border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 mb-2"
                                                        onChange={(e) => {
                                                            if (e.target.value) handleLinkTOSToBank(e.target.value);
                                                        }}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Select Bank to Link...</option>
                                                        {questionBanks.map(b => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                                                        This will be saved to the TOS for future auto-loading.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Answer Key Status */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Answer Key</label>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        <span className={`w-2 h-2 rounded-full ${metadata.answerKey && metadata.answerKey.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                        {metadata.answerKey && metadata.answerKey.length > 0
                                            ? `${metadata.answerKey.filter(k => k).length} Keys Loaded`
                                            : 'No Answer Key'
                                        }
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/20">
                                <LayoutGridIcon className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs">Waiting for selection...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Answer Key Configuration */}
            {metadata.totalItems > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <CheckCircleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Answer Key</h3>
                            <p className="text-xs text-slate-500 font-medium">Input the correct answers for auto-grading.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-10 gap-3">
                        {Array.from({ length: metadata.totalItems }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <label className="text-xs font-bold text-slate-400 mb-1">{i + 1}</label>
                                <input
                                    type="text"
                                    maxLength={1}
                                    className="w-10 h-10 text-center rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                    value={metadata.answerKey?.[i] || ''}
                                    onChange={(e) => handleAnswerKeyChange(i, e.target.value)}
                                    placeholder="-"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
