import React from 'react';
import { SchoolInfo, Teacher } from '../../../types';
import { SchoolIcon, UserIcon, PinIcon } from '../../icons';
import { TeacherDesignationManager } from './TeacherDesignationManager';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';

interface SchoolGeneralFormProps {
    currentSchool: Omit<SchoolInfo, 'id' | 'deletedAt'>;
    teachers: Teacher[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onAssignTeacher: (id: string) => void;
    onUnassignTeacher: (id: string) => void;
}

const getTeacherFullName = (t: Teacher) => `${t.lastName}, ${t.firstName} ${t.middleName || ''}`.trim();

export const SchoolGeneralForm: React.FC<SchoolGeneralFormProps> = ({
    currentSchool,
    teachers,
    onChange,
    onAssignTeacher,
    onUnassignTeacher
}) => {
    const { config } = useAcademicConfig();

    return (
        <div className="p-8 space-y-8">
            {/* Basic Information */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6 flex items-center">
                    <SchoolIcon className="w-4 h-4 mr-2 text-indigo-500" />
                    Institution Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School ID <span className="text-red-500">*</span></label>
                        <input type="text" name="schoolId" value={currentSchool.schoolId} onChange={onChange} className="w-full input-field font-mono" placeholder="e.g. 101234" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Name <span className="text-red-500">*</span></label>
                        <input type="text" name="schoolName" value={currentSchool.schoolName} onChange={onChange} className="w-full input-field font-medium" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Curriculum Type</label>
                        <select name="curriculum" value={currentSchool.curriculum} onChange={onChange} className="w-full input-field appearance-none">
                            <option value="">-- Select Curriculum --</option>
                            {(config?.curriculumTypes || []).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                            {/* Fallback */}
                            {currentSchool.curriculum && config?.curriculumTypes && !config.curriculumTypes.includes(currentSchool.curriculum) && (
                                <option value={currentSchool.curriculum}>{currentSchool.curriculum}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Grade Levels Offered</label>
                        <input type="text" name="gradeLevels" value={currentSchool.gradeLevels} onChange={onChange} className="w-full input-field" placeholder="e.g. K-6, 7-10, 11-12" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Year</label>
                        <select name="schoolYear" value={currentSchool.schoolYear} onChange={onChange} className="w-full input-field appearance-none">
                            <option value="">-- Select School Year --</option>
                            {(config?.schoolYears || []).map(sy => (
                                <option key={sy} value={sy}>{sy}</option>
                            ))}
                            {/* Fallback */}
                            {currentSchool.schoolYear && config?.schoolYears && !config.schoolYears.includes(currentSchool.schoolYear) && (
                                <option value={currentSchool.schoolYear}>{currentSchool.schoolYear}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Principal / School Head</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <select name="principalId" value={currentSchool.principalId} onChange={onChange} className="w-full pl-10 p-3 input-field appearance-none">
                                <option value="">-- Select Principal --</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{getTeacherFullName(t)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6">Administrative Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">PSDS Name</label>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">PSDS (Supervisor)</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <select name="psds" value={currentSchool.psds || ''} onChange={onChange} className="w-full pl-10 p-3 input-field appearance-none">
                                <option value="">-- Select PSDS --</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{getTeacherFullName(t)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6 flex items-center">
                    <PinIcon className="w-4 h-4 mr-2 text-indigo-500" />
                    Geographic Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">District</label>
                        <select name="district" value={currentSchool.district} onChange={onChange} className="w-full input-field appearance-none">
                            <option value="">-- Select District --</option>
                            {(config?.districts || []).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            {/* Fallback */}
                            {currentSchool.district && config?.districts && !config.districts.includes(currentSchool.district) && (
                                <option value={currentSchool.district}>{currentSchool.district}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Division</label>
                        <select name="division" value={currentSchool.division} onChange={onChange} className="w-full input-field appearance-none">
                            <option value="">-- Select Division --</option>
                            {(config?.divisions || []).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            {/* Fallback */}
                            {currentSchool.division && config?.divisions && !config.divisions.includes(currentSchool.division) && (
                                <option value={currentSchool.division}>{currentSchool.division}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Region</label>
                        <select name="region" value={currentSchool.region} onChange={onChange} className="w-full input-field appearance-none">
                            <option value="">-- Select Region --</option>
                            {(config?.regions || []).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                            {/* Fallback */}
                            {currentSchool.region && config?.regions && !config.regions.includes(currentSchool.region) && (
                                <option value={currentSchool.region}>{currentSchool.region}</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Teacher Assignment */}
            <TeacherDesignationManager
                teachers={teachers}
                assignedTeacherIds={currentSchool.assignedTeacherIds}
                currentSchoolId={currentSchool.schoolId}
                onAssign={onAssignTeacher}
                onUnassign={onUnassignTeacher}
            />
        </div >
    );
};
