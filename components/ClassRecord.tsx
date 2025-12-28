
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { ClassInfo, Subject, StudentSF1, SchoolInfo, UserProfile, Teacher } from '../types';
import { ClassRecord, StudentGradeRow } from '../types/grading';
import { loadClasses, loadSubjects, loadStudents_SF1, saveClassRecord, loadClassRecords, loadSchools, loadUserProfile, loadTeachers } from '../services/databaseService';
import { getDefaultWeights, calculateStudentGrades } from '../services/depEdService';
import { SaveIcon, SpinnerIcon, FileSpreadsheetIcon, ArrowDownIcon, FilterIcon, SearchIcon, DownloadIcon, ChevronDownIcon, SettingsIcon, AlertTriangleIcon, SchoolIcon, LibraryIcon, BookOpenIcon } from './icons';
import * as XLSX from 'xlsx';

interface ClassRecordProps {
    user: firebase.User;
    fixedClassId?: string;
    onBack?: () => void;
}

const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
const MAX_WW = 10;
const MAX_PT = 10;

export const ClassRecordView = ({ user, fixedClassId, onBack }: ClassRecordProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data Sources
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allStudents, setAllStudents] = useState<StudentSF1[]>([]);
    const [existingRecords, setExistingRecords] = useState<ClassRecord[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    // Selection State (Hierarchical)
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClassId, setSelectedClassId] = useState(''); // Represents Section
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1st Quarter');

    // Active Record State
    const [currentRecord, setCurrentRecord] = useState<ClassRecord | null>(null);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [sc, c, s, st, r, prof, tList] = await Promise.all([
                    loadSchools(user.uid),
                    loadClasses(user.uid),
                    loadSubjects(),
                    loadStudents_SF1(user.uid),
                    loadClassRecords(user.uid),
                    loadUserProfile(user.uid),
                    loadTeachers(user.uid)
                ]);
                setSchools(sc.filter(x => !x.deletedAt));
                setClasses(c.filter(x => !x.deletedAt));
                setSubjects(s.filter(x => !x.deletedAt));
                setAllStudents(st.filter(x => !x.deletedAt));
                setExistingRecords(r);
                setUserProfile(prof);
                setTeachers(tList);

                // Security: Pre-select School for restricted roles
                if (prof && prof.schoolId && (prof.role === 'teacher' || prof.role === 'principal' || prof.role === 'ict_coordinator')) {
                    // Only show their assigned school
                    setSchools(sc.filter(x => !x.deletedAt && x.id === prof.schoolId));
                    setSelectedSchoolId(prof.schoolId);
                } else {
                    setSchools(sc.filter(x => !x.deletedAt));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [user.uid]);

    // Handle Fixed Class ID (Auto-fill filters)
    useEffect(() => {
        if (fixedClassId && classes.length > 0) {
            const targetClass = classes.find(c => c.id === fixedClassId);
            if (targetClass) {
                setSelectedSchoolId(targetClass.schoolId);
                setSelectedGrade(targetClass.gradeLevel);
                setSelectedClassId(fixedClassId);
            }
        }
    }, [fixedClassId, classes]);

    // Initialize or Load Record
    useEffect(() => {
        if (!selectedClassId || !selectedSubjectId || !selectedSchoolId) {
            setCurrentRecord(null);
            return;
        }

        const existing = existingRecords.find(r =>
            r.classId === selectedClassId &&
            r.subjectId === selectedSubjectId &&
            r.quarter === selectedQuarter
        );

        if (existing) {
            // SAFEGUARD: Ensure structure integrity for older records
            const safeRecord = { ...existing };
            if (!safeRecord.weights) safeRecord.weights = getDefaultWeights(safeRecord.subjectName || '');
            if (!safeRecord.hpsWW) safeRecord.hpsWW = Array(MAX_WW).fill(0);
            if (!safeRecord.hpsPT) safeRecord.hpsPT = Array(MAX_PT).fill(0);
            if (safeRecord.hpsQA === undefined) safeRecord.hpsQA = 0;

            if (safeRecord.students) {
                safeRecord.students = safeRecord.students.map(s => ({
                    ...s,
                    ww: s.ww || Array(MAX_WW).fill(0),
                    pt: s.pt || Array(MAX_PT).fill(0)
                }));
            } else {
                safeRecord.students = [];
            }
            setCurrentRecord(safeRecord);
        } else {
            const cls = classes.find(c => c.id === selectedClassId);
            const sub = subjects.find(s => s.id === selectedSubjectId);

            if (!cls || !sub) return;

            const classStudents = allStudents.filter(s => cls.studentIds && cls.studentIds.includes(s.id));
            const defaultWeights = getDefaultWeights(sub.name);

            const studentRows: StudentGradeRow[] = classStudents.map(s => ({
                studentId: s.id,
                studentName: `${s.lastName}, ${s.firstName}`,
                gender: s.sex,
                ww: Array(MAX_WW).fill(0), pt: Array(MAX_PT).fill(0), qa: 0,
                wwTotal: 0, wwPS: 0, wwWS: 0, ptTotal: 0, ptPS: 0, ptWS: 0, qaPS: 0, qaWS: 0,
                initialGrade: 0, quarterlyGrade: 0
            }));

            studentRows.sort((a, b) => {
                if (a.gender !== b.gender) return a.gender === 'Male' ? -1 : 1;
                return a.studentName.localeCompare(b.studentName);
            });

            setCurrentRecord({
                id: '',
                classId: cls.id,
                subjectId: sub.id,
                subjectName: sub.name,
                quarter: selectedQuarter,
                schoolYear: cls.schoolYear,
                weights: defaultWeights,
                hpsWW: Array(MAX_WW).fill(0),
                hpsPT: Array(MAX_PT).fill(0),
                hpsQA: 0,
                totalHpsWW: 0, totalHpsPT: 0,
                students: studentRows,
                lastModified: Date.now()
            });
        }
    }, [selectedClassId, selectedSubjectId, selectedQuarter, existingRecords, classes, subjects, allStudents, selectedSchoolId]);

    // --- COMPUTED OPTIONS ---
    const availableGrades = useMemo(() => {
        if (!selectedSchoolId) return [];
        const schoolClasses = classes.filter(c => c.schoolId === selectedSchoolId);
        const grades = new Set(schoolClasses.map(c => c.gradeLevel));
        // Sort grades naturally
        return Array.from(grades).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    }, [selectedSchoolId, classes]);

    const availableSections = useMemo(() => {
        if (!selectedSchoolId || !selectedGrade) return [];
        let sectionList = classes.filter(c => c.schoolId === selectedSchoolId && c.gradeLevel === selectedGrade);

        // Security: Filter Classes for Teachers (Ownership Check)
        if (userProfile?.role === 'teacher') {
            const myTeacherProfile = teachers.find(t => t.linkedAccountId === user.uid);

            if (myTeacherProfile) {
                // Filter: Only show classes where I am Adviser OR Subject Teacher
                sectionList = sectionList.filter(c => {
                    const isAdviser = c.adviserId === myTeacherProfile.id;
                    const isSubjectTeacher = c.subjects?.some(s => s.teacherId === myTeacherProfile.id);
                    return isAdviser || isSubjectTeacher;
                });
            } else {
                // Should not happen if data integrity is good, but strictly hide if teacher profile missing
                sectionList = [];
            }
        }
        return sectionList;
    }, [selectedSchoolId, selectedGrade, classes, userProfile, teachers, user.uid]);

    const availableSubjects = useMemo(() => {
        if (!selectedClassId) return [];

        // Find the selected class
        const currentClass = classes.find(c => c.id === selectedClassId);
        if (!currentClass || !currentClass.subjects) return [];

        // Get the names of subjects assigned to this specific class section
        const assignedNames = currentClass.subjects.map(s => s.name);

        // Filter the master subject list to only include subjects that match the names assigned to this class
        return subjects.filter(s => assignedNames.includes(s.name));
    }, [subjects, selectedClassId, classes]);


    // --- HANDLERS ---

    const handleWeightChange = (type: 'ww' | 'pt' | 'qa', value: string) => {
        if (!currentRecord || !currentRecord.weights) return;
        const val = Math.max(0, Math.min(100, parseInt(value) || 0));
        const newWeights = { ...currentRecord.weights, [type]: val };

        const updatedRecord = { ...currentRecord, weights: newWeights };
        recalculateAll(updatedRecord);
    };

    const handleHPSChange = (type: 'ww' | 'pt' | 'qa', index: number, value: string) => {
        if (!currentRecord) return;
        const numVal = parseInt(value) || 0;
        const newRecord = { ...currentRecord };

        if (type === 'ww') {
            newRecord.hpsWW[index] = numVal;
            newRecord.totalHpsWW = newRecord.hpsWW.reduce((a, b) => a + b, 0);
        } else if (type === 'pt') {
            newRecord.hpsPT[index] = numVal;
            newRecord.totalHpsPT = newRecord.hpsPT.reduce((a, b) => a + b, 0);
        } else {
            newRecord.hpsQA = numVal;
        }
        recalculateAll(newRecord);
    };

    const handleScoreChange = (studentIdx: number, type: 'ww' | 'pt' | 'qa', index: number, value: string) => {
        if (!currentRecord) return;
        const numVal = parseFloat(value) || 0;
        const newRecord = { ...currentRecord };
        const student = newRecord.students[studentIdx];

        if (type === 'ww') student.ww[index] = numVal;
        else if (type === 'pt') student.pt[index] = numVal;
        else student.qa = numVal;

        const updatedStudent = calculateStudentGrades(
            student,
            { ww: newRecord.hpsWW, pt: newRecord.hpsPT, qa: newRecord.hpsQA },
            newRecord.weights
        );
        newRecord.students[studentIdx] = updatedStudent;
        setCurrentRecord(newRecord);
    };

    const recalculateAll = (record: ClassRecord) => {
        if (!record.weights) return;
        record.students = record.students.map(student => calculateStudentGrades(
            student,
            { ww: record.hpsWW, pt: record.hpsPT, qa: record.hpsQA },
            record.weights
        ));
        setCurrentRecord(record);
    };

    const handleSave = async () => {
        if (!currentRecord) return;
        setIsSaving(true);
        try {
            const savedId = await saveClassRecord(user.uid, currentRecord);
            const safeId = savedId || '';
            setCurrentRecord(prev => prev ? { ...prev, id: safeId } : null);
            alert("Class Record Saved!");

            // Update existing records list
            setExistingRecords(prev => {
                const idx = prev.findIndex(r => r.id === safeId);
                if (idx > -1) {
                    const newArr = [...prev];
                    newArr[idx] = { ...currentRecord, id: safeId };
                    return newArr;
                }
                return [...prev, { ...currentRecord, id: safeId }];
            });

        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const exportToExcel = () => {
        if (!currentRecord) return;
        const rows = [];
        rows.push(["Subject", currentRecord.subjectName, "Quarter", currentRecord.quarter]);
        rows.push(["Weights", `WW: ${currentRecord.weights?.ww}%`, `PT: ${currentRecord.weights?.pt}%`, `QA: ${currentRecord.weights?.qa}%`]);
        rows.push([]);

        const h1 = ["Name", ...Array(10).fill("WW"), "Total", "PS", "WS", ...Array(10).fill("PT"), "Total", "PS", "WS", "QA", "PS", "WS", "Initial", "Final"];
        rows.push(h1);

        currentRecord.students.forEach(s => {
            rows.push([
                s.studentName, ...s.ww, s.wwTotal, s.wwPS.toFixed(2), s.wwWS.toFixed(2),
                ...s.pt, s.ptTotal, s.ptPS.toFixed(2), s.ptWS.toFixed(2),
                s.qa, s.qaPS.toFixed(2), s.qaWS.toFixed(2),
                s.initialGrade.toFixed(2), s.quarterlyGrade
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grades");
        XLSX.writeFile(wb, `${currentRecord.subjectName}_${currentRecord.quarter}.xlsx`);
    };

    const totalWeight = (currentRecord && currentRecord.weights) ? (currentRecord.weights.ww + currentRecord.weights.pt + currentRecord.weights.qa) : 0;
    const isWeightValid = totalWeight === 100;

    return (
        <div className={`p-4 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 animate-fade-in ${onBack ? 'h-full' : 'h-[calc(100vh-64px)]'}`}>

            {/* Header Control Bar */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col gap-6 shrink-0 sticky top-0 z-40">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex gap-4 items-center">
                        {onBack && (
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mr-2">
                                <ChevronDownIcon className="w-6 h-6 rotate-90 text-slate-500" />
                            </button>
                        )}
                        <div className="p-3.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-green-500/20">
                            <FileSpreadsheetIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">E-Class Record</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">DepEd Order No. 8, s. 2015</p>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleSave} disabled={!currentRecord || isSaving || !isWeightValid} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                            {isSaving ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />} Save
                        </button>
                        <button onClick={exportToExcel} disabled={!currentRecord} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                            <DownloadIcon className="w-4 h-4 mr-2" /> Export
                        </button>
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* 1. School */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SchoolIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedSchoolId}
                            onChange={e => {
                                setSelectedSchoolId(e.target.value);
                                setSelectedGrade('');
                                setSelectedClassId('');
                            }}
                            className="w-full pl-10 pr-8 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="">1. Select School</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 2. Grade Level */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FilterIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedGrade}
                            onChange={e => {
                                setSelectedGrade(e.target.value);
                                setSelectedClassId('');
                            }}
                            disabled={!selectedSchoolId}
                            className="w-full pl-10 pr-8 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="">2. Select Grade</option>
                            {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 3. Section */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LibraryIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                            disabled={!selectedGrade}
                            className="w-full pl-10 pr-8 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="">3. Select Section</option>
                            {availableSections.map(c => <option key={c.id} value={c.id}>{c.section}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 4. Subject */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <BookOpenIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            disabled={!selectedClassId}
                            className="w-full pl-10 pr-8 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="">4. Select Subject</option>
                            {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 5. Quarter */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SettingsIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedQuarter}
                            onChange={e => setSelectedQuarter(e.target.value)}
                            disabled={!selectedSubjectId}
                            className="w-full pl-10 pr-8 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {currentRecord && currentRecord.weights ? (
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 relative flex flex-col w-full">

                    {/* Weight Configuration Bar */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <SettingsIcon className="w-4 h-4" /> Grading System:
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Written (WW)</span>
                            <input type="number" value={currentRecord.weights.ww} onChange={(e) => handleWeightChange('ww', e.target.value)} className="w-12 p-1 text-center text-xs font-bold border rounded bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <span className="text-xs">%</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Performance (PT)</span>
                            <input type="number" value={currentRecord.weights.pt} onChange={(e) => handleWeightChange('pt', e.target.value)} className="w-12 p-1 text-center text-xs font-bold border rounded bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            <span className="text-xs">%</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Assessment (QA)</span>
                            <input type="number" value={currentRecord.weights.qa} onChange={(e) => handleWeightChange('qa', e.target.value)} className="w-12 p-1 text-center text-xs font-bold border rounded bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 focus:ring-rose-500 outline-none" />
                            <span className="text-xs">%</span>
                        </div>

                        {!isWeightValid && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse ml-auto">
                                <AlertTriangleIcon className="w-4 h-4" />
                                Total must be 100% (Current: {totalWeight}%)
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-xs border-collapse">
                            <thead className="sticky top-0 z-20 bg-white dark:bg-slate-800 shadow-md">
                                <tr>
                                    <th rowSpan={2} className="p-3 border-r border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left sticky left-0 z-30 min-w-[200px] shadow-[4px_0_16px_-4px_rgba(0,0,0,0.1)]">
                                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Learner Name</span>
                                    </th>
                                    <th colSpan={MAX_WW + 3} className="py-2 px-1 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wide">Written Works ({currentRecord.weights.ww}%)</th>
                                    <th colSpan={MAX_PT + 3} className="py-2 px-1 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wide">Performance Tasks ({currentRecord.weights.pt}%)</th>
                                    <th colSpan={3} className="py-2 px-1 border-b-2 border-rose-500 bg-rose-50/50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wide">Assessment ({currentRecord.weights.qa}%)</th>
                                    <th rowSpan={2} className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 w-16 font-bold">Initial</th>
                                    <th rowSpan={2} className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-white w-20 font-black text-sm">Final</th>
                                </tr>
                                <tr className="text-slate-500 dark:text-slate-400">
                                    {/* Sub-headers for WW */}
                                    {Array.from({ length: MAX_WW }).map((_, i) => <th key={`ww-h-${i}`} className="p-1 border-b border-r border-slate-100 dark:border-slate-700 w-10 text-[10px] font-mono">{i + 1}</th>)}
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 bg-indigo-50/30 dark:bg-indigo-900/10 font-bold">Total</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">PS</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">WS</th>

                                    {/* Sub-headers for PT */}
                                    {Array.from({ length: MAX_PT }).map((_, i) => <th key={`pt-h-${i}`} className="p-1 border-b border-r border-slate-100 dark:border-slate-700 w-10 text-[10px] font-mono">{i + 1}</th>)}
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 bg-emerald-50/30 dark:bg-emerald-900/10 font-bold">Total</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">PS</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">WS</th>

                                    {/* Sub-headers for QA */}
                                    <th className="p-1 border-b border-r border-slate-100 dark:border-slate-700 w-14 font-mono">1</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">PS</th>
                                    <th className="p-1 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-[10px]">WS</th>
                                </tr>
                                {/* HPS ROW */}
                                <tr className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                    <td className="p-3 font-bold text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400 sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-r border-slate-200 dark:border-slate-700">Highest Possible Score</td>

                                    {/* WW HPS */}
                                    {currentRecord.hpsWW.map((h, i) => (
                                        <td key={`hps-ww-${i}`} className="p-1 border-r border-slate-100 dark:border-slate-700 text-center">
                                            <input type="text" className="w-8 h-6 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={h || ''} onChange={e => handleHPSChange('ww', i, e.target.value)} />
                                        </td>
                                    ))}
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20">{currentRecord.totalHpsWW}</td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">100</td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">{currentRecord.weights.ww}</td>

                                    {/* PT HPS */}
                                    {currentRecord.hpsPT.map((h, i) => (
                                        <td key={`hps-pt-${i}`} className="p-1 border-r border-slate-100 dark:border-slate-700 text-center">
                                            <input type="text" className="w-8 h-6 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 rounded focus:ring-2 focus:ring-emerald-500 outline-none" value={h || ''} onChange={e => handleHPSChange('pt', i, e.target.value)} />
                                        </td>
                                    ))}
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20">{currentRecord.totalHpsPT}</td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">100</td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">{currentRecord.weights.pt}</td>

                                    {/* QA HPS */}
                                    <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-center">
                                        <input type="text" className="w-10 h-6 text-center text-xs font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 rounded focus:ring-2 focus:ring-rose-500 outline-none" value={currentRecord.hpsQA || ''} onChange={e => handleHPSChange('qa', 0, e.target.value)} />
                                    </td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">100</td>
                                    <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400">{currentRecord.weights.qa}</td>
                                    <td colSpan={2} className="bg-slate-50 dark:bg-slate-900"></td>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                                {/* Grouped Rows: Male then Female */}
                                {['Male', 'Female'].map(gender => (
                                    <React.Fragment key={gender}>
                                        <tr className="bg-slate-50/80 dark:bg-slate-700/30">
                                            <td colSpan={100} className="p-2 pl-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{gender} Learners</td>
                                        </tr>
                                        {currentRecord.students.map((student, sIdx) => {
                                            if (student.gender !== gender) return null;
                                            return <StudentRow key={student.studentId} student={student} sIdx={sIdx} onScoreChange={handleScoreChange} />;
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <FileSpreadsheetIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Ready to Record?</h2>
                    <p className="text-sm">Please select <strong>School, Grade, Section, Subject, and Quarter</strong> to begin.</p>
                </div>
            )}
        </div>
    );
};

const StudentRow: React.FC<{ student: StudentGradeRow; sIdx: number; onScoreChange: (studentIdx: number, type: 'ww' | 'pt' | 'qa', index: number, value: string) => void }> = React.memo(({ student, sIdx, onScoreChange }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/20 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
            <div className="truncate max-w-[200px] pl-1">{student.studentName}</div>
        </td>

        {/* Written Works */}
        {student.ww && student.ww.map((score, i) => (
            <td key={`ww-${i}`} className="p-0 border-r border-slate-100 dark:border-slate-800 text-center relative h-8 w-10">
                <input
                    type="text"
                    className="absolute inset-0 w-full h-full text-center bg-transparent focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:text-indigo-700 dark:focus:text-indigo-300 font-mono text-xs outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                    value={score || ''}
                    onChange={e => onScoreChange(sIdx, 'ww', i, e.target.value)}
                />
            </td>
        ))}
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20">{student.wwTotal}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-[10px] text-slate-400 dark:text-slate-500">{student.wwPS.toFixed(0)}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">{student.wwWS.toFixed(2)}</td>

        {/* Performance Tasks */}
        {student.pt && student.pt.map((score, i) => (
            <td key={`pt-${i}`} className="p-0 border-r border-slate-100 dark:border-slate-800 text-center relative h-8 w-10">
                <input
                    type="text"
                    className="absolute inset-0 w-full h-full text-center bg-transparent focus:bg-emerald-50 dark:focus:bg-emerald-900/30 focus:text-emerald-700 dark:focus:text-emerald-300 font-mono text-xs outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                    value={score || ''}
                    onChange={e => onScoreChange(sIdx, 'pt', i, e.target.value)}
                />
            </td>
        ))}
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20">{student.ptTotal}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-[10px] text-slate-400 dark:text-slate-500">{student.ptPS.toFixed(0)}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10">{student.ptWS.toFixed(2)}</td>

        {/* Assessment */}
        <td className="p-0 border-r border-slate-200 dark:border-slate-700 text-center relative h-8">
            <input
                type="text"
                className="absolute inset-0 w-full h-full text-center bg-transparent focus:bg-rose-50 dark:focus:bg-rose-900/30 focus:text-rose-700 dark:focus:text-rose-300 font-mono text-xs outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                value={student.qa || ''}
                onChange={e => onScoreChange(sIdx, 'qa', 0, e.target.value)}
            />
        </td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center text-[10px] text-slate-400 dark:text-slate-500">{student.qaPS.toFixed(0)}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10">{student.qaWS.toFixed(2)}</td>

        {/* Final Grades */}
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30">{student.initialGrade.toFixed(2)}</td>
        <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-100 dark:bg-slate-800">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${student.quarterlyGrade >= 75
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                }`}>
                {student.quarterlyGrade}
            </span>
        </td>
    </tr>
));
