
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClassInfo, ClassSubject, StudentSF1, Teacher, SchoolInfo, Subject } from '../../types';
import {
    XIcon, LibraryIcon, SchoolIcon, UserIcon, BookOpenIcon, PlusIcon, TrashIcon,
    UsersIcon, SaveIcon, SpinnerIcon, CheckCircleIcon, SearchIcon, AlertTriangleIcon
} from '../icons';
import { useAcademicConfig } from '../../hooks/useAcademicConfig';

interface ClassFormProps {
    initialData: Omit<ClassInfo, 'id' | 'deletedAt'>;
    editingId: string | null;
    schools: SchoolInfo[];
    teachers: Teacher[];
    students: StudentSF1[];
    masterSubjects: Subject[];
    onSave: (data: Omit<ClassInfo, 'id' | 'deletedAt'>) => Promise<void>;
    onClose: () => void;
    isSaving: boolean;
    userRole?: string;
    assignedSchoolId?: string;
    currentUserId?: string;
}

// --- SUB-COMPONENT: ENROLLMENT MANAGER ---
const EnrollmentManager = ({
    currentClass,
    students,
    onEnroll,
    onUnenroll
}: {
    currentClass: Omit<ClassInfo, 'id' | 'deletedAt'>,
    students: StudentSF1[],
    onEnroll: (id: string) => void,
    onUnenroll: (id: string) => void
}) => {
    const [availableSearch, setAvailableSearch] = useState('');
    const [enrolledSearch, setEnrolledSearch] = useState('');

    const studentFullName = (s: StudentSF1) => `${s.lastName}, ${s.firstName} ${s.middleName || ''}`.trim();

    const availableStudents = useMemo(() => {
        return students
            .filter(s => !s.deletedAt && !(currentClass.studentIds || []).includes(s.linkedAccountId || ''))
            .filter(s => studentFullName(s).toLowerCase().includes(availableSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [students, currentClass.studentIds, availableSearch]);

    const enrolledStudents = useMemo(() => {
        return students
            .filter(s => !s.deletedAt && (currentClass.studentIds || []).includes(s.linkedAccountId || ''))
            .filter(s => studentFullName(s).toLowerCase().includes(enrolledSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [students, currentClass.studentIds, enrolledSearch]);

    return (
        <div className="mt-8 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-4 flex items-center">
                <UsersIcon className="w-4 h-4 mr-2 text-indigo-500" />
                Student Enrollment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Pool */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-96">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Available Pool</span>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">{availableStudents.length}</span>
                    </div>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 relative">
                        <SearchIcon className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Filter students..."
                            value={availableSearch}
                            onChange={e => setAvailableSearch(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {availableStudents.map(s => (
                            <li key={s.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {s.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{studentFullName(s)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onEnroll(s.linkedAccountId || '')}
                                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1.5 rounded-md transition-colors"
                                    title="Enroll"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {availableStudents.length === 0 && <li className="text-center text-xs text-slate-400 py-8">No students found.</li>}
                    </ul>
                </div>

                {/* Enrolled List */}
                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800 overflow-hidden flex flex-col h-96">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Enrolled</span>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{enrolledStudents.length}</span>
                    </div>
                    <div className="p-2 border-b border-indigo-100 dark:border-indigo-800 relative">
                        <SearchIcon className="w-4 h-4 absolute left-4 top-3.5 text-indigo-300" />
                        <input
                            type="search"
                            placeholder="Filter enrolled..."
                            value={enrolledSearch}
                            onChange={e => setEnrolledSearch(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {enrolledStudents.map(s => (
                            <li key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-900/50 shadow-sm group">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {s.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{studentFullName(s)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onUnenroll(s.linkedAccountId || '')}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {enrolledStudents.length === 0 && <li className="text-center text-xs text-slate-400 py-8 italic">No students enrolled yet.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export const ClassForm = ({
    initialData,
    editingId,
    schools,
    teachers,
    students,
    masterSubjects,
    onSave,
    onClose,
    isSaving,
    userRole,
    assignedSchoolId,
    currentUserId
}: ClassFormProps) => {
    const { config } = useAcademicConfig();
    const [formData, setFormData] = useState(initialData);

    // Auto-lock school and adviser for teachers
    useEffect(() => {
        if (userRole === 'teacher' && !editingId) {
            setFormData(prev => ({
                ...prev,
                schoolId: assignedSchoolId || prev.schoolId,
                adviserId: currentUserId || prev.adviserId
            }));
        }
    }, [userRole, assignedSchoolId, currentUserId, editingId]);

    // Memoized Teacher Map for display
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.lastName}, ${t.firstName}`])), [teachers]);

    // Filter subjects based on selected grade
    const filteredSubjects = useMemo(() => {
        if (!formData.gradeLevel) return [];
        return masterSubjects.filter(s => {
            if (s.gradeLevel === formData.gradeLevel) return true;
            if (s.gradeLevel === 'Senior High' && (formData.gradeLevel === 'Grade 11' || formData.gradeLevel === 'Grade 12')) return true;
            return false;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [masterSubjects, formData.gradeLevel]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSubject = () => {
        // Use a temporary random ID for new items before saving
        const newSubject: ClassSubject = {
            id: `temp-${Date.now()}-${Math.random()}`,
            name: '',
            // If teacher, auto-assign self. If admin, leave blank for manual assignment.
            teacherId: userRole === 'teacher' ? (currentUserId || '') : ''
        };
        setFormData(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject] }));
    };

    const handleSubjectChange = (index: number, field: 'name' | 'teacherId', value: string) => {
        const updatedSubjects = [...(formData.subjects || [])];
        updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
        setFormData(prev => ({ ...prev, subjects: updatedSubjects }));
    };

    const handleRemoveSubject = (index: number) => {
        const updatedSubjects = (formData.subjects || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, subjects: updatedSubjects }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.schoolId || !formData.gradeLevel || !formData.section || !formData.schoolYear) {
            alert("Please fill in all required fields.");
            return;
        }

        // Clean up subjects: Remove any without names
        const cleanSubjects = (formData.subjects || []).filter(s => s.name && s.name.trim() !== '');
        await onSave({ ...formData, subjects: cleanSubjects });
    };

    const isTeacher = userRole === 'teacher';
    const activeSchoolName = schools.find(s => s.id === formData.schoolId)?.schoolName || '...';
    const activeTeacherName = teachers.find(t => t.id === formData.adviserId)?.firstName + ' ' + teachers.find(t => t.id === formData.adviserId)?.lastName || '...';

    const isSHS = formData.gradeLevel === 'Grade 11' || formData.gradeLevel === 'Grade 12';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">

                {/* Minimalist Header */}
                <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-900 flex-shrink-0 z-10 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {editingId ? 'Edit Class Section' : 'Created New Class'}
                        </h2>
                        {isTeacher && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5"><SchoolIcon className="w-3.5 h-3.5" /> {activeSchoolName}</span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {activeTeacherName}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    <form id="class-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

                        {/* CORE DETAILS */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                                <SchoolIcon className="w-4 h-4 mr-2" /> Class Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                {/* Admin Only Fields */}
                                {!isTeacher && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School</label>
                                            <select
                                                name="schoolId"
                                                value={formData.schoolId}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                required
                                            >
                                                <option value="" className="dark:bg-slate-800">Select School</option>
                                                {schools.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-800">{s.schoolName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Adviser</label>
                                            <select
                                                name="adviserId"
                                                value={formData.adviserId}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                required
                                            >
                                                <option value="" className="dark:bg-slate-800">Select Teacher</option>
                                                {teachers.filter(t => !t.deletedAt).map(t => <option key={t.id} value={t.id} className="dark:bg-slate-800">{teacherMap.get(t.id)}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Year</label>
                                    <select
                                        name="schoolYear"
                                        value={formData.schoolYear}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="" className="dark:bg-slate-800">Select Year</option>
                                        {(config?.schoolYears || []).map(sy => (
                                            <option key={sy} value={sy} className="dark:bg-slate-800">{sy}</option>
                                        ))}
                                        {formData.schoolYear && config?.schoolYears && !config.schoolYears.includes(formData.schoolYear) && (
                                            <option value={formData.schoolYear} className="dark:bg-slate-800">{formData.schoolYear}</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Grade Level</label>
                                    <select
                                        name="gradeLevel"
                                        value={formData.gradeLevel}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="" className="text-slate-400 dark:bg-slate-800">Select Grade</option>
                                        {(config?.gradeLevels || []).map(grade => (
                                            <option key={grade} value={grade} className="dark:bg-slate-800">{grade}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={isSHS ? "" : "md:col-span-3"}>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Section Name</label>
                                    {(config?.sectionNames && config.sectionNames.length > 0) ? (
                                        <select
                                            name="section"
                                            value={formData.section}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            required
                                        >
                                            <option value="" className="text-slate-400 dark:bg-slate-800">Select Section</option>
                                            {config.sectionNames.map(name => (
                                                <option key={name} value={name} className="dark:bg-slate-800">{name}</option>
                                            ))}
                                            {/* Allow keeping existing value if not in list (for legacy records) */}
                                            {formData.section && !config.sectionNames.includes(formData.section) && (
                                                <option value={formData.section} className="dark:bg-slate-800">{formData.section}</option>
                                            )}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="section"
                                            value={formData.section}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Einstein"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                            required
                                        />
                                    )}
                                </div>

                                {isSHS && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">SHS Track</label>
                                            <select
                                                name="track"
                                                value={formData.track || ''}
                                                onChange={handleInputChange}
                                                className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg py-2.5 px-3 font-bold text-amber-800 dark:text-amber-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="" className="text-slate-400 dark:bg-slate-800">Select Track</option>
                                                {(config?.tracks || []).map(track => (
                                                    <option key={track} value={track} className="dark:bg-slate-800">{track}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">SHS Strand</label>
                                            <select
                                                name="strand"
                                                value={formData.strand || ''}
                                                onChange={handleInputChange}
                                                className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg py-2.5 px-3 font-bold text-amber-800 dark:text-amber-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="" className="text-slate-400 dark:bg-slate-800">Select Strand</option>
                                                {(config?.strands || []).map(strand => (
                                                    <option key={strand} value={strand} className="dark:bg-slate-800">{strand}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* CURRICULUM SECTION */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center">
                                    <BookOpenIcon className="w-4 h-4 mr-2" /> Curriculum Subjects
                                </h3>
                                <button type="button" onClick={handleAddSubject} className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                    <PlusIcon className="w-3 h-3 mr-1" /> Add Subject
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(formData.subjects || []).length === 0 && (
                                    <div className="py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                                        <BookOpenIcon className="w-6 h-6 mb-2 opacity-50" />
                                        <span className="text-xs font-medium">No subjects added</span>
                                    </div>
                                )}
                                {(formData.subjects || []).map((subject, index) => (
                                    <div key={subject.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors group">
                                        <div className="flex-1 w-full">
                                            <select
                                                value={subject.name}
                                                onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                                                className="w-full bg-transparent dark:bg-slate-800 font-bold text-slate-800 dark:text-white focus:outline-none text-sm"
                                                disabled={!formData.gradeLevel}
                                            >
                                                <option value="" className="dark:bg-slate-800">Select Subject</option>
                                                {filteredSubjects.map(s => <option key={s.id} value={s.name} className="dark:bg-slate-800">{s.name}</option>)}
                                                {subject.name && !filteredSubjects.find(s => s.name === subject.name) && <option value={subject.name} className="dark:bg-slate-800">{subject.name}</option>}
                                            </select>
                                        </div>

                                        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
                                        <div className="flex-1 w-full">
                                            <select
                                                value={subject.teacherId}
                                                onChange={(e) => handleSubjectChange(index, 'teacherId', e.target.value)}
                                                className="w-full bg-transparent dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 focus:outline-none font-medium"
                                            >
                                                <option value="" className="dark:bg-slate-800">{isTeacher ? 'Me (Default)' : 'Assign Teacher (Optional)'}</option>
                                                {teachers.filter(t => !t.deletedAt).map(t => <option key={t.id} value={t.id} className="dark:bg-slate-800">{teacherMap.get(t.id)}</option>)}
                                            </select>
                                        </div>

                                        <button type="button" onClick={() => handleRemoveSubject(index)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ENROLLMENT SECTION (Keep existing logic but wrap nicely) */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <EnrollmentManager
                                currentClass={formData}
                                students={students}
                                onEnroll={(id) => setFormData(prev => ({ ...prev, studentIds: [...(prev.studentIds || []), id] }))}
                                onUnenroll={(id) => setFormData(prev => ({ ...prev, studentIds: (prev.studentIds || []).filter(sid => sid !== id) }))}
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 z-10">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => document.getElementById('class-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                        disabled={isSaving}
                        className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-70"
                    >
                        {isSaving && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                        {isSaving ? 'Saving...' : (editingId ? 'Update Class' : 'Create Class')}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
};
