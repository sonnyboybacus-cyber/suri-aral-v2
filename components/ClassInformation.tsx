
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { ClassInfo, ClassSubject, StudentSF1, Teacher, SchoolInfo, Subject } from '../types';
import { saveClasses, loadClasses, loadStudents_SF1, loadTeachers, loadSchools, loadSubjects, logActivity } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, SearchIcon, LibraryIcon, UserIcon, SchoolIcon, BookOpenIcon, UsersIcon, CalendarIcon } from './icons';
import { UndoIcon } from './UndoIcon';
import { ClassScheduling } from './ClassScheduling';

const initialClassState: Omit<ClassInfo, 'id' | 'deletedAt'> = {
  schoolId: '',
  gradeLevel: '',
  section: '',
  schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  adviserId: '',
  subjects: [],
  studentIds: [],
};

const ITEMS_PER_PAGE = 12; // Adjusted for grid layout
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const ClassInformation = ({ user }: { user: firebase.User }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentSF1[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<Subject[]>([]);
  const [currentClass, setCurrentClass] = useState<Omit<ClassInfo, 'id' | 'deletedAt'>>(initialClassState);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  // Scheduling State
  const [schedulingClassId, setSchedulingClassId] = useState<string | null>(null);
  
  const userName = user.displayName || user.email || 'Unknown User';

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; classId: string | null; className: string }>({
    isOpen: false,
    classId: null,
    className: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [loadedClasses, loadedStudents, loadedTeachers, loadedSchools, loadedSubjects] = await Promise.all([
          loadClasses(user.uid),
          loadStudents_SF1(user.uid),
          loadTeachers(user.uid),
          loadSchools(user.uid),
          loadSubjects()
        ]);
        
        const sanitizedClasses = loadedClasses.map(c => ({
            ...c,
            subjects: c.subjects || [],
            studentIds: c.studentIds || []
        }));

        setClasses(sanitizedClasses);
        setStudents(loadedStudents);
        setTeachers(loadedTeachers);
        setSchools(loadedSchools.filter(s => !s.deletedAt));
        setMasterSubjects(loadedSubjects.filter(s => !s.deletedAt));
      } catch (error) {
        console.error("Error loading initial data:", error);
        alert("Could not load necessary data for class management.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.uid, schedulingClassId]); // Re-fetch when exiting scheduling to update list if changed

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.lastName}, ${t.firstName}`])), [teachers]);
  const schoolMap = useMemo(() => new Map(schools.map(s => [s.id, s.schoolName])), [schools]);

  const getTimeRemaining = (deletedAt?: number): string => {
    if (!deletedAt) return "";
    const now = Date.now();
    const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentClass(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass.schoolId || !currentClass.gradeLevel || !currentClass.section || !currentClass.schoolYear) {
      alert("School, Grade Level, Section, and School Year are required.");
      return;
    }

    if (editingClassId) {
      setClasses(prev => prev.map(c => c.id === editingClassId ? { id: editingClassId, ...currentClass } : c));
    } else {
      const newClass: ClassInfo = { id: crypto.randomUUID(), ...currentClass };
      setClasses(prev => [newClass, ...prev]);
    }
    handleCloseForm();
  };
  
  const handleEdit = (classInfo: ClassInfo) => {
    setEditingClassId(classInfo.id);
    const { id, deletedAt, ...editableData } = classInfo;
    setCurrentClass({
        ...editableData,
        subjects: editableData.subjects || [],
        studentIds: editableData.studentIds || []
    });
    setIsFormVisible(true);
  };

  const handleDelete = (classInfo: ClassInfo) => {
    setDeleteModalState({
        isOpen: true,
        classId: classInfo.id,
        className: `${classInfo.gradeLevel} - ${classInfo.section}`
    });
  };

  const executeDelete = () => {
    const { classId } = deleteModalState;
    if (classId) {
        setClasses(prev => prev.map(c => c.id === classId ? { ...c, deletedAt: Date.now() } : c));
    }
    setDeleteModalState({ isOpen: false, classId: null, className: '' });
  };
  
  const handleRestore = (classId: string) => {
    setClasses(prev => prev.map(c => {
        if (c.id === classId) {
            const { deletedAt, ...rest } = c;
            return rest;
        }
        return c;
    }));
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    const now = Date.now();
    const classesToSave = classes.filter(c => !c.deletedAt || (now - c.deletedAt) < SEVEN_DAYS_IN_MS);
    
    try {
      await saveClasses(user.uid, classesToSave);
      await logActivity(user.uid, userName, 'update', 'Class', 'Updated class master list.');

      if(classesToSave.length !== classes.length) {
          setClasses(classesToSave);
          alert("Class data saved successfully! Expired records have been permanently deleted.");
      } else {
          alert("Class data saved successfully!");
      }
    } catch (error) {
      console.error("Error saving classes:", error);
      alert("Failed to save class data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddNew = () => {
    if (schools.length === 0) {
      alert("Please add a school in the 'School Information' section before creating a class.");
      return;
    }
    setEditingClassId(null);
    setCurrentClass(initialClassState);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingClassId(null);
    setCurrentClass(initialClassState);
  };

  const handleAddSubject = () => {
    const newSubject: ClassSubject = { id: crypto.randomUUID(), name: '', teacherId: '' };
    setCurrentClass(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject] }));
  };

  const handleSubjectChange = (index: number, field: 'name' | 'teacherId', value: string) => {
    const updatedSubjects = [...(currentClass.subjects || [])];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    setCurrentClass(prev => ({ ...prev, subjects: updatedSubjects }));
  };

  const handleRemoveSubject = (index: number) => {
    const updatedSubjects = (currentClass.subjects || []).filter((_, i) => i !== index);
    setCurrentClass(prev => ({ ...prev, subjects: updatedSubjects }));
  };
  
  const handleEnrollStudent = (studentId: string) => {
    setCurrentClass(prev => ({ ...prev, studentIds: [...(prev.studentIds || []), studentId] }));
  };

  const handleUnenrollStudent = (studentId: string) => {
    setCurrentClass(prev => ({ ...prev, studentIds: (prev.studentIds || []).filter(id => id !== studentId) }));
  };
  
  const activeClasses = useMemo(() => classes.filter(c => !c.deletedAt), [classes]);
  const deletedClasses = useMemo(() => classes.filter(c => c.deletedAt), [classes]);

  const filteredClasses = useMemo(() => {
    const sourceList = activeTab === 'active' ? activeClasses : deletedClasses;
    if (!searchQuery.trim()) return sourceList;
    const lowercasedQuery = searchQuery.toLowerCase();
    return sourceList.filter(c =>
      c.gradeLevel.toLowerCase().includes(lowercasedQuery) ||
      c.section.toLowerCase().includes(lowercasedQuery) ||
      (teacherMap.get(c.adviserId) || '').toLowerCase().includes(lowercasedQuery) ||
      (schoolMap.get(c.schoolId) || '').toLowerCase().includes(lowercasedQuery)
    );
  }, [activeClasses, deletedClasses, activeTab, searchQuery, teacherMap, schoolMap]);
  
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);
  
  const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);
  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClasses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClasses, currentPage]);

  // Filter subjects based on current class grade level
  const filteredSubjects = useMemo(() => {
      if (!currentClass.gradeLevel) return [];
      
      return masterSubjects.filter(s => {
          // Direct match
          if (s.gradeLevel === currentClass.gradeLevel) return true;
          
          // Senior High Fallback
          if (s.gradeLevel === 'Senior High' && (currentClass.gradeLevel === 'Grade 11' || currentClass.gradeLevel === 'Grade 12')) {
              return true;
          }
          return false;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [masterSubjects, currentClass.gradeLevel]);

  const EnrollmentManager = () => {
      const [availableSearch, setAvailableSearch] = useState('');
      const [enrolledSearch, setEnrolledSearch] = useState('');
  
      const studentFullName = (s: StudentSF1) => `${s.lastName}, ${s.firstName} ${s.middleName || ''}`.trim();

      const availableStudents = useMemo(() => {
          return students
              .filter(s => !s.deletedAt && !(currentClass.studentIds || []).includes(s.id))
              .filter(s => studentFullName(s).toLowerCase().includes(availableSearch.toLowerCase()))
              .sort((a, b) => a.lastName.localeCompare(b.lastName));
      }, [students, currentClass.studentIds, availableSearch]);
  
      const enrolledStudents = useMemo(() => {
          return students
              .filter(s => !s.deletedAt && (currentClass.studentIds || []).includes(s.id))
              .filter(s => studentFullName(s).toLowerCase().includes(enrolledSearch.toLowerCase()))
              .sort((a, b) => a.lastName.localeCompare(b.lastName));
      }, [students, currentClass.studentIds, enrolledSearch]);
  
      return (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-4 flex items-center">
                <UsersIcon className="w-4 h-4 mr-2 text-indigo-500" />
                Student Enrollment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Students */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Available Pool</span>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{availableStudents.length}</span>
                    </div>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <input 
                            type="search" 
                            placeholder="Filter students..." 
                            value={availableSearch} 
                            onChange={e => setAvailableSearch(e.target.value)} 
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {availableStudents.map(s => (
                            <li key={s.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                                        {s.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{studentFullName(s)}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => handleEnrollStudent(s.id)} 
                                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                         {availableStudents.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No students found.</li>}
                    </ul>
                </div>

                {/* Enrolled Students */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Enrolled</span>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{enrolledStudents.length}</span>
                    </div>
                    <div className="p-2 border-b border-indigo-100 dark:border-indigo-800">
                        <input 
                            type="search" 
                            placeholder="Filter enrolled..." 
                            value={enrolledSearch} 
                            onChange={e => setEnrolledSearch(e.target.value)} 
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {enrolledStudents.map(s => (
                            <li key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-900/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                        {s.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{studentFullName(s)}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => handleUnenrollStudent(s.id)} 
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {enrolledStudents.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No students enrolled yet.</li>}
                    </ul>
                </div>
            </div>
          </div>
      );
  };

  const renderForm = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {editingClassId ? 'Edit Class Details' : 'Create New Class'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set up section, adviser, and curriculum.</p>
                </div>
                <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {/* Core Class Details */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6 flex items-center">
                        <LibraryIcon className="w-4 h-4 mr-2 text-indigo-500" />
                        Class Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-4">
                             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School / Institution <span className="text-red-500">*</span></label>
                             <div className="relative">
                                <SchoolIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <select name="schoolId" value={currentClass.schoolId} onChange={handleInputChange} className="w-full pl-10 p-3 input-field appearance-none" required>
                                    <option value="">-- Select School --</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.schoolName} ({s.schoolId})</option>)}
                                </select>
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Grade Level <span className="text-red-500">*</span></label>
                            <select name="gradeLevel" value={currentClass.gradeLevel} onChange={handleInputChange} className="w-full input-field" required>
                                <option value="">-- Select --</option>
                                <option value="Kindergarten">Kindergarten</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                                    <option key={grade} value={`Grade ${grade}`}>{`Grade ${grade}`}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Section Name <span className="text-red-500">*</span></label>
                            <input type="text" name="section" value={currentClass.section} onChange={handleInputChange} className="w-full input-field font-medium" required placeholder="e.g. Sampaguita" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Year</label>
                            <input type="text" name="schoolYear" value={currentClass.schoolYear} onChange={handleInputChange} className="w-full input-field" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Class Adviser</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <select name="adviserId" value={currentClass.adviserId} onChange={handleInputChange} className="w-full pl-10 p-3 input-field appearance-none">
                                    <option value="">-- Select Adviser --</option>
                                    {teachers.filter(t => !t.deletedAt).map(t => <option key={t.id} value={t.id}>{teacherMap.get(t.id)}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subjects Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center">
                            <BookOpenIcon className="w-4 h-4 mr-2 text-indigo-500" />
                            Curriculum Subjects
                        </h3>
                        <button type="button" onClick={handleAddSubject} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center">
                            <PlusIcon className="w-3 h-3 mr-1"/> Add Subject
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {(currentClass.subjects || []).length === 0 && (
                            <p className="text-sm text-slate-400 italic text-center py-4">No subjects added yet.</p>
                        )}
                        {(currentClass.subjects || []).map((subject, index) => (
                            <div key={subject.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="md:col-span-5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Subject Name</label>
                                    <select
                                        value={subject.name}
                                        onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                                        className="w-full input-field text-sm font-medium"
                                        disabled={!currentClass.gradeLevel}
                                    >
                                        <option value="">{currentClass.gradeLevel ? '-- Select Subject --' : '-- Select Grade Level First --'}</option>
                                        {filteredSubjects.map(s => (
                                            <option key={s.id} value={s.name}>
                                                {s.code} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-6">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Subject Teacher</label>
                                    <select value={subject.teacherId} onChange={(e) => handleSubjectChange(index, 'teacherId', e.target.value)} className="w-full input-field text-sm">
                                        <option value="">-- Select Teacher --</option>
                                        {teachers.filter(t => !t.deletedAt).map(t => <option key={t.id} value={t.id}>{teacherMap.get(t.id)}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex justify-center">
                                    <button type="button" onClick={() => handleRemoveSubject(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <EnrollmentManager />
            </form>

             <footer className="flex justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3">
                <button onClick={handleCloseForm} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    Cancel
                </button>
                 <button onClick={handleFormSubmit} type="submit" className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                    {editingClassId ? <EditIcon className="w-4 h-4 mr-2"/> : <PlusIcon className="w-4 h-4 mr-2"/>}
                    {editingClassId ? 'Update Class' : 'Create Class'}
                 </button>
            </footer>
        </div>
    </div>
  );

  const ClassCard: React.FC<{ classInfo: ClassInfo }> = ({ classInfo }) => (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="flex justify-between items-start mb-4">
              <div>
                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full mb-2">
                      {classInfo.gradeLevel}
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white font-serif leading-tight">
                      Section {classInfo.section}
                  </h3>
              </div>
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                  {activeTab === 'active' ? (
                      <>
                        <button onClick={() => handleEdit(classInfo)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors" title="Edit">
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(classInfo)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Delete">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                  ) : (
                      <button onClick={() => handleRestore(classInfo.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors" title="Restore">
                          <UndoIcon className="w-4 h-4" />
                      </button>
                  )}
              </div>
          </div>
          
          <div className="space-y-3 flex-1">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                  <SchoolIcon className="w-4 h-4 mr-2.5 text-slate-400" />
                  <span className="truncate">{schoolMap.get(classInfo.schoolId) || <span className="text-slate-400 italic">School Unassigned</span>}</span>
              </div>
               <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                  <UserIcon className="w-4 h-4 mr-2.5 text-slate-400" />
                  <span className="truncate">{teacherMap.get(classInfo.adviserId) || <span className="text-slate-400 italic">Adviser Unassigned</span>}</span>
              </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
             <div className="flex gap-4">
                 <div className="text-center">
                     <span className="block text-lg font-bold text-slate-800 dark:text-white leading-none">{classInfo.studentIds?.length || 0}</span>
                     <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Students</span>
                 </div>
                 <div className="text-center">
                     <span className="block text-lg font-bold text-slate-800 dark:text-white leading-none">{classInfo.subjects?.length || 0}</span>
                     <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Subjects</span>
                 </div>
             </div>
             {activeTab === 'deleted' ? (
                <span className="text-xs font-mono text-red-500 font-medium">
                    {getTimeRemaining(classInfo.deletedAt)}
                </span>
             ) : (
                 <button 
                    onClick={() => setSchedulingClassId(classInfo.id)}
                    className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900"
                 >
                     <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                     Schedule
                 </button>
             )}
          </div>
      </div>
  );

  // If a scheduling session is active, render that component instead
  if (schedulingClassId) {
      const selectedClass = classes.find(c => c.id === schedulingClassId);
      if (selectedClass) {
          return (
              <ClassScheduling 
                  classInfo={selectedClass} 
                  onBack={() => setSchedulingClassId(null)}
                  allClasses={classes}
                  teachers={teachers}
              />
          );
      } else {
          setSchedulingClassId(null); // Fallback if class not found
      }
  }

  return (
    <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans">
      <style>{`.input-field { background-color: #f8fafc; border-color: #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: #0f172a; } .dark .input-field { background-color: #334155; border-color: #475569; color: #e2e8f0; }`}</style>
      
      {isFormVisible && renderForm()}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Class?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    Are you sure you want to remove <strong>{deleteModalState.className}</strong>? It will be permanently deleted after 7 days.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setDeleteModalState({ isOpen: false, classId: null, className: '' })} 
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeDelete} 
                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">Class Master List</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Manage sections, enrollment, and subject allocations.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleAddNew} className="flex items-center px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-bold text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> New Class
            </button>
            <button onClick={handleSaveToDatabase} disabled={isSaving} className="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-green-400 transition-all shadow-lg font-bold text-sm">
              {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>
        
        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 dark:border-slate-700 mb-8 pb-1 gap-4">
            <nav className="flex gap-6" aria-label="Tabs">
                <button 
                    onClick={() => setActiveTab('active')} 
                    className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    Active Classes <span className="ml-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{activeClasses.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('deleted')} 
                    className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'deleted' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    Recycle Bin <span className="ml-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{deletedClasses.length}</span>
                </button>
            </nav>

            <div className="relative w-full md:w-72 mb-2 md:mb-0">
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search classes..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium shadow-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-slate-500 font-medium">Loading Classes...</span>
          </div>
        ) : (
          <>
            {filteredClasses.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <LibraryIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {searchQuery ? `No matches for "${searchQuery}"` : (activeTab === 'active' ? 'No active classes.' : 'Recycle bin is empty.')}
                    </p>
                    {activeTab === 'active' && !searchQuery && (
                        <button onClick={handleAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                            Create your first class
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedClasses.map(classInfo => (
                        <ClassCard key={classInfo.id} classInfo={classInfo} />
                    ))}
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
      </div>
    </div>
  );
};

export default ClassInformation;
