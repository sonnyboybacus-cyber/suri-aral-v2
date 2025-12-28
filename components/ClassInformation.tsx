
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import { ClassInfo, StudentSF1, Teacher, SchoolInfo, Subject, UserProfile } from '../types';
import { saveClasses, saveClass, loadClasses, loadStudents_SF1, loadTeachers, loadSchools, loadSubjects, logActivity, sendNotification, generateUUID, loadUserProfile, generateJoinCode } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, SearchIcon, LibraryIcon, FilterIcon, ChevronDownIcon, SchoolIcon, UserIcon, KeyIcon } from './icons';
import { usePermissions } from '../hooks/usePermissions';
import { useAcademicConfig } from '../hooks/useAcademicConfig';
import { ClassScheduling } from './ClassScheduling';
import { ClassRecordView } from './ClassRecord';
import { ClassCard } from './class-management/ClassCard';
import { ClassForm } from './class-management/ClassForm';
import { JoinClassModal } from './class-management/JoinClassModal';
import { StudentClassDetail } from './class-management/StudentClassDetail';
import { AccessRestricted } from './AccessRestricted';

const initialClassState: Omit<ClassInfo, 'id' | 'deletedAt'> = {
    schoolId: '',
    gradeLevel: '',
    section: '',
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    adviserId: '',
    subjects: [],
    studentIds: [],
};

const ITEMS_PER_PAGE = 12;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const ClassInformation = ({ user, userProfile: userProfileProp }: { user: firebase.User, userProfile?: UserProfile | null }) => {
    // --- DATA STATE ---
    const { config } = useAcademicConfig();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<StudentSF1[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [masterSubjects, setMasterSubjects] = useState<Subject[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(userProfileProp || null);

    // Sync prop changes
    useEffect(() => {
        if (userProfileProp) setUserProfile(userProfileProp);
    }, [userProfileProp]);

    const { can } = usePermissions(userProfile);

    // --- UI STATE ---
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isJoinModalVisible, setIsJoinModalVisible] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

    // --- FILTER STATE ---
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterSchoolId, setFilterSchoolId] = useState<string>('');
    const [filterGradeLevel, setFilterGradeLevel] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);

    // --- FORM STATE ---
    const [currentClassData, setCurrentClassData] = useState<Omit<ClassInfo, 'id' | 'deletedAt'>>(initialClassState);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    // --- SUB-VIEW STATE ---
    const [schedulingClassId, setSchedulingClassId] = useState<string | null>(null);
    const [recordClassId, setRecordClassId] = useState<string | null>(null);
    const [activeStudentClassId, setActiveStudentClassId] = useState<string | null>(null);


    // --- DELETE MODAL STATE ---
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; classId: string | null; className: string }>({
        isOpen: false, classId: null, className: ''
    });

    const userName = user.displayName || user.email || 'Unknown User';

    // --- DATA LOADING ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [loadedClasses, loadedStudents, loadedTeachers, loadedSchools, loadedSubjects, loadedProfile] = await Promise.all([
                    loadClasses(user.uid),
                    loadStudents_SF1(user.uid),
                    loadTeachers(user.uid),
                    loadSchools(user.uid),
                    loadSubjects(),
                    loadUserProfile(user.uid)
                ]);

                // Sanitize array fields to ensure no crashes on map()
                const sanitizedClasses = loadedClasses.map(c => ({
                    ...c,
                    subjects: c.subjects || [],
                    studentIds: c.studentIds || []
                }));

                setClasses(sanitizedClasses);
                setStudents(loadedStudents);
                setTeachers(loadedTeachers);
                setUserProfile(loadedProfile);

                let validSchools = loadedSchools.filter(s => !s.deletedAt);
                if (loadedProfile && loadedProfile.schoolId && loadedProfile.role !== 'admin') {
                    validSchools = validSchools.filter(s => s.id === loadedProfile.schoolId);
                    setFilterSchoolId(loadedProfile.schoolId);
                }
                setSchools(validSchools);
                setMasterSubjects(loadedSubjects.filter(s => !s.deletedAt));

            } catch (error) {
                console.error("Error loading initial data:", error);
                alert("Could not load data. Please refresh.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.uid, schedulingClassId, recordClassId]);

    // --- HELPERS ---
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.lastName}, ${t.firstName}`])), [teachers]);
    const schoolMap = useMemo(() => new Map(schools.map(s => [s.id, s.schoolName])), [schools]);

    // --- CRUD HANDLERS ---

    const handleAddNew = () => {
        if (schools.length === 0) {
            alert("Please add a school in the 'School Information' section before creating a class.");
            return;
        }
        setEditingClassId(null);
        // Pre-fill school if selected
        setCurrentClassData({
            ...initialClassState,
            schoolId: filterSchoolId || initialClassState.schoolId
        });
        setIsFormVisible(true);
    };

    const handleEdit = (classInfo: ClassInfo) => {
        setEditingClassId(classInfo.id);
        const { id, deletedAt, ...editableData } = classInfo;
        setCurrentClassData({
            ...editableData,
            subjects: editableData.subjects || [],
            studentIds: editableData.studentIds || []
        });
        setIsFormVisible(true);
    };

    const handleSaveClass = async (formData: Omit<ClassInfo, 'id' | 'deletedAt'>) => {
        setIsSaving(true);
        const className = `${formData.gradeLevel} - ${formData.section}`;

        try {
            let updatedClasses: ClassInfo[];
            let actionType = '';

            if (editingClassId) {
                updatedClasses = classes.map(c => c.id === editingClassId ? { id: editingClassId, ...formData } : c);
                actionType = 'Updated';
            } else {
                // FIX: Use safe UUID generator instead of crypto.randomUUID to prevent crashes
                const newClass: ClassInfo = { id: generateUUID(), joinCode: generateJoinCode(), ...formData };
                updatedClasses = [newClass, ...classes];
                actionType = 'Created';
            }

            setClasses(updatedClasses);

            // FIXED: Use saveClass instead of saveClasses to avoid overwriting entire collection (which requires admin)
            // This ensures we only touch the specific record we are working on.
            if (editingClassId) {
                // Find the updated class object from the updated array (or just reconstruction it)
                const updatedClass = updatedClasses.find(c => c.id === editingClassId);
                if (updatedClass) await saveClass(user.uid, updatedClass);
            } else {
                // New class is at index 0
                await saveClass(user.uid, updatedClasses[0]);
            }
            await logActivity(user.uid, userName, editingClassId ? 'update' : 'create', 'Class', `${actionType} class: ${className}`);

            sendNotification(user.uid, {
                title: `Class ${actionType}`,
                message: `${className} saved successfully.`,
                type: 'success'
            });

            setIsFormVisible(false);
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save. Check connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (classInfo: ClassInfo) => {
        setDeleteModalState({ isOpen: true, classId: classInfo.id, className: `${classInfo.gradeLevel} - ${classInfo.section}` });
    };

    const executeDelete = async () => {
        const { classId } = deleteModalState;
        if (classId) {
            const updatedClasses = classes.map(c => c.id === classId ? { ...c, deletedAt: Date.now() } : c);
            setClasses(updatedClasses);

            // Fixed: Update only the deleted class
            const classToDelete = updatedClasses.find(c => c.id === classId);
            if (classToDelete) await saveClass(user.uid, classToDelete);
        }
        setDeleteModalState({ isOpen: false, classId: null, className: '' });
    };

    const handleRestore = async (classId: string) => {
        const updatedClasses = classes.map(c => c.id === classId ? { ...c, deletedAt: undefined } : c) as ClassInfo[];
        setClasses(updatedClasses);

        // Fixed: Update only the restored class
        const restoredClass = updatedClasses.find(c => c.id === classId);
        if (restoredClass) await saveClass(user.uid, restoredClass);
    };

    const handleGlobalSave = async () => {
        setIsSaving(true);
        try {
            const now = Date.now();
            const classesToSave = classes.filter(c => !c.deletedAt || (now - c.deletedAt) < SEVEN_DAYS_IN_MS);
            await saveClasses(user.uid, classesToSave);
            alert("Changes saved successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- FILTERING LOGIC ---

    // 1. Filter Schools for Directory View
    const filteredSchools = useMemo(() => {
        if (!searchQuery) return schools;
        const lower = searchQuery.toLowerCase();
        return schools.filter(s =>
            s.schoolName.toLowerCase().includes(lower) ||
            s.schoolId.toLowerCase().includes(lower)
        );
    }, [schools, searchQuery]);

    // 2. Filter Classes for Detail View
    const filteredClasses = useMemo(() => {
        let result = activeTab === 'active' ? classes.filter(c => !c.deletedAt) : classes.filter(c => c.deletedAt);

        // 1. School Filter
        if (filterSchoolId) {
            result = result.filter(c => c.schoolId === filterSchoolId);
        }

        // 2. Grade Filter
        if (filterGradeLevel) {
            result = result.filter(c => c.gradeLevel === filterGradeLevel);
        }

        // 3. Search (Applied to classes if school is selected)
        if (searchQuery.trim() && filterSchoolId) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.section.toLowerCase().includes(lowerQ) ||
                c.gradeLevel.toLowerCase().includes(lowerQ) ||
                (teacherMap.get(c.adviserId) || '').toLowerCase().includes(lowerQ)
            );
        }

        // 4. Role-Based Personalization (Google Classroom Style)
        if (userProfile?.role === 'teacher') {
            const currentTeacher = teachers.find(t => t.linkedAccountId === user.uid || t.email === user.email);
            if (currentTeacher) {
                result = result.filter(c =>
                    c.adviserId === currentTeacher.id ||
                    (c.subjects || []).some(s => s.teacherId === currentTeacher.id)
                );
            }
        } else if (userProfile?.role === 'student') {
            // Fix: studentIds stores Auth UIDs, so strictly check if user.uid is in the list
            result = result.filter(c => (c.studentIds || []).includes(user.uid));
        }

        return result;
    }, [classes, activeTab, filterSchoolId, filterGradeLevel, searchQuery, teacherMap, userProfile, teachers, students, user.uid, user.email]);

    // Pagination
    useEffect(() => { setCurrentPage(1); }, [filteredClasses.length, filterSchoolId]);

    const paginatedClasses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClasses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredClasses, currentPage]);

    const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);

    // --- RENDER SUB-VIEWS ---

    // --- RENDER LOGIC for Sub-Views ---
    if (activeStudentClassId) {
        const selectedClass = classes.find(c => c.id === activeStudentClassId);
        if (selectedClass) {
            return (
                <StudentClassDetail
                    classInfo={selectedClass}
                    user={user}
                    onBack={() => setActiveStudentClassId(null)}
                />
            );
        }
    }

    if (schedulingClassId) {
        const selectedClass = classes.find(c => c.id === schedulingClassId);
        if (selectedClass) {
            const activeSchool = schools.find(s => s.id === selectedClass.schoolId);
            return (
                <ClassScheduling
                    classInfo={selectedClass}
                    onBack={() => setSchedulingClassId(null)}
                    allClasses={classes}
                    teachers={teachers}
                    rooms={activeSchool?.rooms || []}
                    userId={user.uid}
                    userRole={userProfile?.role}
                />
            );
        }
    }

    if (recordClassId) {
        // STRICT CHECK: Ensure user still has permission
        if (!can('view_class_record')) {
            return <AccessRestricted onBack={() => setRecordClassId(null)} message="Access to Class Records has been restricted." />;
        }
        return <ClassRecordView user={user} fixedClassId={recordClassId} onBack={() => setRecordClassId(null)} />;
    }

    const renderSchoolList = () => {
        if (filteredSchools.length === 0) {
            return (
                <div className="text-center py-20 text-slate-400 italic">
                    {searchQuery ? 'No schools match your search.' : 'No schools found. Add a school to get started.'}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSchools.map(school => {
                    const schoolClasses = classes.filter(c => c.schoolId === school.id && !c.deletedAt);
                    const principal = teachers.find(t => t.id === school.principalId);
                    const principalName = principal ? `${principal.firstName} ${principal.lastName}` : 'N/A';

                    return (
                        <div
                            key={school.id}
                            onClick={() => {
                                setFilterSchoolId(school.id);
                                setSearchQuery(''); // Clear search when drilling down
                            }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <SchoolIcon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded uppercase tracking-wider">
                                    {school.schoolId}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif mb-2 line-clamp-2 h-14">
                                {school.schoolName}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                                <UserIcon className="w-4 h-4" />
                                <span className="truncate">Prin. {principalName}</span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{schoolClasses.length}</span>
                                    <span className="text-xs text-slate-400 ml-2 font-medium uppercase">Sections</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ChevronDownIcon className="w-4 h-4 -rotate-90" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- RENDER MAIN VIEW ---

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans">

            {/* Form Modal */}
            {isFormVisible && (
                <ClassForm
                    initialData={currentClassData}
                    editingId={editingClassId}
                    schools={schools}
                    teachers={teachers}
                    students={students}
                    masterSubjects={masterSubjects}
                    onSave={handleSaveClass}
                    onClose={() => setIsFormVisible(false)}
                    isSaving={isSaving}
                    userRole={userProfile?.role}
                    assignedSchoolId={userProfile?.schoolId}
                    currentUserId={teachers.find(t => t.linkedAccountId === user.uid || t.email === user.email)?.id || user.uid}
                />
            )}

            {/* Join Class Modal */}
            {isJoinModalVisible && (
                <JoinClassModal
                    userId={user.uid}
                    onClose={() => setIsJoinModalVisible(false)}
                    onSuccess={(msg) => {
                        alert(msg);
                        // Reload classes to show the new one
                        loadClasses(user.uid).then(setClasses);
                    }}
                />
            )}

            {/* Delete Confirm Modal */}
            {deleteModalState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center border border-slate-200 dark:border-slate-700 animate-scale-up">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Class?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                            Move <strong>{deleteModalState.className}</strong> to the Recycle Bin?
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setDeleteModalState({ isOpen: false, classId: null, className: '' })} className="flex-1 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={executeDelete} className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg transition-colors">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {userProfile?.role === 'teacher' ? 'My Classes' : 'Class Directory'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {userProfile?.role === 'teacher'
                                ? 'Manage your sections and students'
                                : 'Overview of all academic sections'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsJoinModalVisible(true)}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-sm transition-all"
                        >
                            <KeyIcon className="w-4 h-4 inline mr-2" />
                            Join Class
                        </button>

                        {can('manage_classes') && (
                            <button
                                onClick={handleAddNew}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Create Class
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* MINIMALIST FILTER BAR - HIDDEN FOR STUDENTS */}
            {userProfile?.role !== 'student' && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* 1. School Filter (Hidden for teachers to reduce clutter) */}
                    {(!userProfile?.schoolId || userProfile?.role === 'admin') && (
                        <div className="relative group w-full md:w-64">
                            <select
                                value={filterSchoolId}
                                onChange={e => { setFilterSchoolId(e.target.value); setFilterGradeLevel(''); setSearchQuery(''); }}
                                className="w-full pl-3 pr-8 py-2 bg-transparent dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-colors"
                            >
                                <option value="" className="dark:bg-slate-800">All Schools</option>
                                {schools.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-800">{s.schoolName}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    )}

                    {/* 2. Grade Filter */}
                    <div className="relative group w-full md:w-48">
                        <select
                            value={filterGradeLevel}
                            onChange={e => setFilterGradeLevel(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-transparent dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-colors"
                        >
                            <option value="" className="dark:bg-slate-800">All Grades</option>
                            {(config?.gradeLevels || []).map(g => (
                                <option key={g} value={g} className="dark:bg-slate-800">{g}</option>
                            ))}
                        </select>
                        <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 3. Search */}
                    <div className="relative flex-1">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border-none text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20">
                    <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                    <span className="text-slate-500 font-medium">Loading Data...</span>
                </div>
            ) : (
                <>
                    {!filterSchoolId ? (
                        // SCHOOL DIRECTORY MODE
                        renderSchoolList()
                    ) : (
                        // CLASS DETAIL MODE
                        <>
                            {/* TAB NAVIGATION FOR CLASSES - HIDDEN FOR STUDENTS */}
                            {userProfile?.role !== 'student' && (
                                <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1 animate-fade-in">
                                    <button
                                        onClick={() => setActiveTab('active')}
                                        className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                    >
                                        Active Classes <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">{filteredClasses.filter(c => !c.deletedAt).length}</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('deleted')}
                                        className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'deleted' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                    >
                                        Recycle Bin <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">{filteredClasses.filter(c => c.deletedAt).length}</span>
                                    </button>
                                </div>
                            )}

                            {filteredClasses.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <LibraryIcon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        {searchQuery
                                            ? `No matches for "${searchQuery}"`
                                            : (activeTab === 'active'
                                                ? (userProfile?.role === 'teacher' ? 'You are not assigned to any classes yet.' : 'No active classes found for this school.')
                                                : 'Recycle bin is empty.')}
                                    </p>
                                    {activeTab === 'active' && !searchQuery && userProfile?.role !== 'student' && (
                                        <button onClick={handleAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                                            Create your first class
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {paginatedClasses.map(classInfo => {
                                        const isTeacher = userProfile?.role === 'teacher';
                                        return (
                                            <ClassCard
                                                key={classInfo.id}
                                                classInfo={classInfo}
                                                schoolName={schoolMap.get(classInfo.schoolId) || ''}
                                                adviserName={teacherMap.get(classInfo.adviserId) || ''}
                                                activeTab={activeTab}
                                                onEdit={can('manage_classes') ? handleEdit : undefined}
                                                onDelete={can('delete_records') ? handleDelete : undefined}
                                                onRestore={handleRestore}
                                                onSchedule={(id) => setSchedulingClassId(id)}
                                                onRecord={(id) => setRecordClassId(id)}
                                                isTeacher={isTeacher}
                                                canViewRecord={can('view_class_record')}
                                                canViewSchedule={userProfile?.role !== 'student'}
                                                onEnter={setActiveStudentClassId}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                                    <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ClassInformation;
