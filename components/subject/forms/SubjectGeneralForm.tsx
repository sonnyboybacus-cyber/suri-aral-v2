import React from 'react';
import { Subject } from '../../../types';
import { BookOpenIcon } from '../../icons';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';

interface SubjectGeneralFormProps {
    currentSubject: Omit<Subject, 'id' | 'deletedAt'>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const TRACKS = ['Academic', 'TVL', 'Sports', 'Arts and Design'];
const STRANDS_ACADEMIC = ['STEM', 'ABM', 'HUMSS', 'GAS'];
const STRANDS_TVL = ['ICT', 'Home Economics', 'Agri-Fishery', 'Industrial Arts'];


export const SubjectGeneralForm: React.FC<SubjectGeneralFormProps> = ({ currentSubject, onChange }) => {
    const { config } = useAcademicConfig();

    // Helper to check for Senior High
    const isSHS = (grade: string) => {
        return grade === 'Grade 11' || grade === 'Grade 12' || grade === 'Senior High';
    };

    return (
        <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Subject Code <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="code"
                        value={currentSubject.code}
                        onChange={onChange}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        placeholder="e.g. MATH10"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Grade Level</label>
                    <select
                        name="gradeLevel"
                        value={currentSubject.gradeLevel}
                        onChange={onChange}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                    >
                        <option value="">-- Select Grade Level --</option>
                        <option value="Kindergarten">Kindergarten</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(grade => (
                            <option key={grade} value={`Grade ${grade}`}>{`Grade ${grade}`}</option>
                        ))}
                        <optgroup label="Senior High School">
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Descriptive Title <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="name"
                    value={currentSubject.name}
                    onChange={onChange}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder="e.g. Statistics and Probability"
                    required
                />
            </div>

            {isSHS(currentSubject.gradeLevel) && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                    <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center uppercase tracking-wide">
                        <BookOpenIcon className="w-4 h-4 mr-2" /> Senior High Configuration
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classification</label>
                            <select
                                name="classification"
                                value={currentSubject.classification || ""}
                                onChange={onChange}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">-- Select Type --</option>
                                {(config?.shsClassifications || []).map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                                {/* Fallback for existing value not in list */}
                                {currentSubject.classification && config?.shsClassifications && !config.shsClassifications.includes(currentSubject.classification) && (
                                    <option value={currentSubject.classification}>{currentSubject.classification}</option>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Semester</label>
                            <select
                                name="semester"
                                value={currentSubject.semester || ""}
                                onChange={onChange}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">-- Select Semester --</option>
                                {(config?.semesters || []).map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                                {/* Fallback for existing value not in list */}
                                {currentSubject.semester && config?.semesters && !config.semesters.includes(currentSubject.semester) && (
                                    <option value={currentSubject.semester}>{currentSubject.semester}</option>
                                )}
                            </select>
                        </div>

                        {currentSubject.classification === 'Specialized' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Track</label>
                                    <select
                                        name="track"
                                        value={currentSubject.track}
                                        onChange={onChange}
                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="">-- Select Track --</option>
                                        {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Strand</label>
                                    <select
                                        name="strand"
                                        value={currentSubject.strand}
                                        onChange={onChange}
                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="">-- Select Strand --</option>
                                        <optgroup label="Academic">
                                            {STRANDS_ACADEMIC.map(s => <option key={s} value={s}>{s}</option>)}
                                        </optgroup>
                                        <optgroup label="TVL">
                                            {STRANDS_TVL.map(s => <option key={s} value={s}>{s}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Department</label>
                    <select
                        name="department"
                        value={currentSubject.department}
                        onChange={onChange}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        <option value="">-- Select Department --</option>
                        {(config?.departments || []).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                        {/* Fallback for existing value not in list */}
                        {currentSubject.department && config?.departments && !config.departments.includes(currentSubject.department) && (
                            <option value={currentSubject.department}>{currentSubject.department}</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Prerequisite (Code)</label>
                    <input
                        type="text"
                        name="prerequisiteId"
                        value={currentSubject.prerequisiteId || ''}
                        onChange={onChange}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        placeholder="e.g. GENMATH"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Description</label>
                <textarea
                    name="description"
                    value={currentSubject.description}
                    onChange={onChange}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none leading-relaxed"
                    placeholder="Brief description of the subject content..."
                />
            </div>
        </div>
    );
};
