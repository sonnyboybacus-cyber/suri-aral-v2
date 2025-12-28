
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import firebase from 'firebase/compat/app';
import { StudentSF1, UserProfile } from '../types';
import { saveStudent, saveStudents_SF1, loadStudents_SF1, logActivity, sendNotification, generateUUID, loadUserProfile } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, CalendarIcon, SearchIcon, UsersIcon, UserIcon } from './icons';
import { UndoIcon } from './UndoIcon';
import { useAcademicConfig } from '../hooks/useAcademicConfig';

const initialStudentState: Omit<StudentSF1, 'id' | 'age' | 'deletedAt'> = {
  lrn: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  sex: 'Male',
  birthDate: '',
  motherTongue: '',
  ethnicGroup: '',
  religion: '',
  addressStreet: '',
  addressBarangay: '',
  addressCity: '',
  addressProvince: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  guardianRelationship: '',
  contactNumber: '',
  remarks: '',
};

const ITEMS_PER_PAGE = 25;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const StudentRegistration = ({ user }: { user: firebase.User }) => {
  const { config } = useAcademicConfig();
  const [students, setStudents] = useState<StudentSF1[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Omit<StudentSF1, 'id' | 'age' | 'deletedAt'>>(initialStudentState);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  const userName = user.displayName || user.email || 'Unknown User';

  // Permissions State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load Profile
  useEffect(() => {
    loadUserProfile(user.uid).then(setUserProfile);
  }, [user.uid]);

  const canDelete = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'principal') return true; // Principal can Archive
    if (userProfile.role === 'ict_coordinator') return false; // ICT cannot delete
    return false; // Teachers cannot delete
  }, [userProfile]);

  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; studentId: string | null; studentName: string }>({
    isOpen: false,
    studentId: null,
    studentName: ''
  });

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedStudents = await loadStudents_SF1(user.uid);
      setStudents(loadedStudents);
    } catch (error) {
      console.error("Error loading students:", error);
      alert("Could not load student data.");
    } finally {
      setIsLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

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
    setCurrentStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.lastName || !currentStudent.firstName) {
      alert("Last Name and First Name are required.");
      return;
    }

    const studentName = `${currentStudent.lastName}, ${currentStudent.firstName}`;
    setIsSaving(true);

    try {
      let studentToSave: StudentSF1;
      let actionType = '';

      if (editingStudentId) {
        const existing = students.find(s => s.id === editingStudentId);
        studentToSave = { ...existing, ...currentStudent, id: editingStudentId, age: calculateAge(currentStudent.birthDate) } as StudentSF1;
        actionType = 'Updated';
      } else {
        studentToSave = {
          id: generateUUID(),
          ...currentStudent,
          age: calculateAge(currentStudent.birthDate),
          linkedAccountId: user.uid // Ensure linkage for RLS
        };
        actionType = 'Registered';
      }

      // Save only the single student record
      await saveStudent(user.uid, studentToSave);

      // Update local state optimistic
      setStudents(prev => {
        if (editingStudentId) {
          return prev.map(s => s.id === editingStudentId ? studentToSave : s);
        }
        return [studentToSave, ...prev];
      });

      await logActivity(user.uid, userName, editingStudentId ? 'update' : 'create', 'Student', `${actionType} student: ${studentName}`);

      sendNotification(user.uid, {
        title: `Student ${actionType}`,
        message: `${studentName} has been successfully saved to the database.`,
        type: 'success'
      });

      handleCloseForm();
    } catch (error: any) {
      console.error("Save failed:", error);
      if (error.code === 'PERMISSION_DENIED') {
        alert("Permission Denied: You can only edit students linked to your account or need admin access.");
      } else {
        alert("Failed to save changes. Please check your connection.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (student: StudentSF1) => {
    setEditingStudentId(student.id);
    const { id, age, deletedAt, ...editableData } = student;
    setCurrentStudent(editableData);
    setIsFormVisible(true);
  };

  const studentFullName = (s: StudentSF1) => `${s.lastName}, ${s.firstName} ${s.extensionName || ''} ${s.middleName || ''}`.replace(/\s+/g, ' ').trim();

  const handleDelete = (student: StudentSF1) => {
    setDeleteModalState({
      isOpen: true,
      studentId: student.id,
      studentName: studentFullName(student)
    });
  };

  const executeDelete = async () => {
    const { studentId, studentName } = deleteModalState;
    if (studentId) {
      const studentToDelete = students.find(s => s.id === studentId);
      if (studentToDelete) {
        const updatedStudent = { ...studentToDelete, deletedAt: Date.now() };
        try {
          await saveStudent(user.uid, updatedStudent);
          setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));

          sendNotification(user.uid, {
            title: 'Student Deleted',
            message: `${studentName} moved to trash.`,
            type: 'warning'
          });
        } catch (error) {
          console.error("Delete failed", error);
          alert("Failed to delete student.");
        }
      }
    }
    setDeleteModalState({ isOpen: false, studentId: null, studentName: '' });
  };

  const handleRestore = async (studentId: string) => {
    const studentToRestore = students.find(s => s.id === studentId);
    if (studentToRestore) {
      const { deletedAt, ...rest } = studentToRestore;
      const restoredStudent = rest as StudentSF1;
      try {
        await saveStudent(user.uid, restoredStudent);
        setStudents(prev => prev.map(s => s.id === studentId ? restoredStudent : s));

        sendNotification(user.uid, {
          title: 'Student Restored',
          message: `Student record has been restored.`,
          type: 'success'
        });
      } catch (e) {
        console.error(e);
        alert("Failed to restore.");
      }
    }
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    const now = Date.now();

    // Filter active and recently deleted
    const studentsToSave = students.filter(student => {
      return !student.deletedAt || (now - student.deletedAt) < SEVEN_DAYS_IN_MS;
    });

    try {
      // Try bulk save first (Admin)
      await saveStudents_SF1(user.uid, studentsToSave);

      await logActivity(user.uid, userName, 'update', 'Student', 'Updated student master list (SF1).');

      sendNotification(user.uid, {
        title: 'Changes Saved',
        message: 'Student Master List has been successfully updated.',
        type: 'success',
        link: 'studentRegistration'
      });

      if (studentsToSave.length !== students.length) {
        setStudents(studentsToSave);
      }
    } catch (error: any) {
      // Fallback or Error
      console.error("Error saving students:", error);
      if (error.code === 'PERMISSION_DENIED') {
        alert("Permission Denied: Bulk save is restricted to Administrators. Please save items individually.");
      } else {
        alert("Failed to save student data. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    setEditingStudentId(null);
    setCurrentStudent(initialStudentState);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingStudentId(null);
    setCurrentStudent(initialStudentState);
  };

  const activeStudents = useMemo(() => students.filter(s => !s.deletedAt), [students]);
  const deletedStudents = useMemo(() => students.filter(s => s.deletedAt), [students]);

  const filteredStudents = useMemo(() => {
    const sourceList = activeTab === 'active' ? activeStudents : deletedStudents;
    if (!searchQuery.trim()) {
      return sourceList;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return sourceList.filter(s =>
      (s.lrn && s.lrn.toLowerCase().includes(lowercasedQuery)) ||
      studentFullName(s).toLowerCase().includes(lowercasedQuery)
    );
  }, [activeStudents, deletedStudents, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);


  const renderForm = () => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">

          <header className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {editingStudentId ? 'Edit Student Profile' : 'Register New Student'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Complete the form below to update the SF1 record.</p>
            </div>
            <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </header>

          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                <UserIcon className="w-4 h-4 mr-2" /> Learner Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">LRN</label>
                  <input type="text" name="lrn" value={currentStudent.lrn} onChange={handleInputChange} className="w-full input-field" placeholder="12-digit LRN" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Mother Tongue</label>
                  <select
                    name="motherTongue"
                    value={currentStudent.motherTongue}
                    onChange={handleInputChange}
                    className="w-full input-field appearance-none"
                  >
                    <option value="">Select Mother Tongue</option>
                    {(config?.motherTongues || []).map(mt => (
                      <option key={mt} value={mt}>{mt}</option>
                    ))}
                    {/* Fallback for existing value not in list */}
                    {currentStudent.motherTongue && config?.motherTongues && !config.motherTongues.includes(currentStudent.motherTongue) && (
                      <option value={currentStudent.motherTongue}>{currentStudent.motherTongue}</option>
                    )}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="lastName" value={currentStudent.lastName} onChange={handleInputChange} className="w-full input-field font-medium" required />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="firstName" value={currentStudent.firstName} onChange={handleInputChange} className="w-full input-field font-medium" required />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Middle Name</label>
                  <input type="text" name="middleName" value={currentStudent.middleName} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Extension</label>
                  <input type="text" name="extensionName" placeholder="Jr, III" value={currentStudent.extensionName} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Birth Date</label>
                  <div className="grid grid-cols-12 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    <div className="col-span-4">
                      <div className="relative">
                        <select
                          name="birthMonth"
                          value={currentStudent.birthDate ? parseInt(currentStudent.birthDate.split('-')[1]) : ''}
                          onChange={(e) => {
                            const newMonth = parseInt(e.target.value);
                            const parts = currentStudent.birthDate ? currentStudent.birthDate.split('-').map(Number) : [];
                            const y = parts[0] || new Date().getFullYear();
                            let d = parts[2] || 1;

                            // Clamp days for the new month
                            const maxDays = new Date(y, newMonth, 0).getDate();
                            if (d > maxDays) d = maxDays;

                            const formatted = `${y}-${newMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                            handleInputChange({ target: { name: 'birthDate', value: formatted } } as any);
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="" className="text-slate-400">Month</option>
                          {[
                            { val: 1, label: 'January' },
                            { val: 2, label: 'February' },
                            { val: 3, label: 'March' },
                            { val: 4, label: 'April' },
                            { val: 5, label: 'May' },
                            { val: 6, label: 'June' },
                            { val: 7, label: 'July' },
                            { val: 8, label: 'August' },
                            { val: 9, label: 'September' },
                            { val: 10, label: 'October' },
                            { val: 11, label: 'November' },
                            { val: 12, label: 'December' },
                          ].map((m) => (
                            <option key={m.val} value={m.val}>{m.label}</option>
                          ))}
                        </select>

                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4">
                      <div className="relative">
                        <select
                          name="birthDay"
                          value={currentStudent.birthDate ? parseInt(currentStudent.birthDate.split('-')[2]) : ''}
                          onChange={(e) => {
                            const newDay = parseInt(e.target.value);
                            const parts = currentStudent.birthDate ? currentStudent.birthDate.split('-').map(Number) : [];
                            const y = parts[0] || new Date().getFullYear();
                            const m = parts[1] || 1;

                            const formatted = `${y}-${m.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
                            handleInputChange({ target: { name: 'birthDate', value: formatted } } as any);
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold font-mono py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="" className="text-slate-400">Day</option>
                          {(() => {
                            const parts = currentStudent.birthDate ? currentStudent.birthDate.split('-').map(Number) : [];
                            const y = parts[0] || new Date().getFullYear();
                            const m = parts[1] || 1;
                            const daysInMonth = new Date(y, m, 0).getDate();
                            return Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>{day.toString().padStart(2, '0')}</option>
                            ));
                          })()}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4">
                      <div className="relative">
                        <select
                          name="birthYear"
                          value={currentStudent.birthDate ? currentStudent.birthDate.split('-')[0] : ''}
                          onChange={(e) => {
                            const newYear = parseInt(e.target.value);
                            const parts = currentStudent.birthDate ? currentStudent.birthDate.split('-').map(Number) : [];
                            let m = parts[1] || 1;
                            let d = parts[2] || 1;

                            const maxDays = new Date(newYear, m, 0).getDate();
                            if (d > maxDays) d = maxDays;

                            const formatted = `${newYear}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                            handleInputChange({ target: { name: 'birthDate', value: formatted } } as any);
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold font-mono py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="" className="text-slate-400">Year</option>
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Sex</label>
                  <select name="sex" value={currentStudent.sex} onChange={handleInputChange} className="w-full input-field appearance-none">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ethnic Group</label>
                  <input type="text" name="ethnicGroup" value={currentStudent.ethnicGroup} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Religion</label>
                  <input type="text" name="religion" value={currentStudent.religion} onChange={handleInputChange} className="w-full input-field" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                <SearchIcon className="w-4 h-4 mr-2" /> Address Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Street / Purok</label>
                  <input type="text" name="addressStreet" value={currentStudent.addressStreet} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Barangay</label>
                  <input type="text" name="addressBarangay" value={currentStudent.addressBarangay} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Municipality / City</label>
                  <input type="text" name="addressCity" value={currentStudent.addressCity} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Province</label>
                  <input type="text" name="addressProvince" value={currentStudent.addressProvince} onChange={handleInputChange} className="w-full input-field" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                <UsersIcon className="w-4 h-4 mr-2" /> Parents & Guardian
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Father's Name</label>
                  <input type="text" name="fatherName" value={currentStudent.fatherName} onChange={handleInputChange} className="w-full input-field" placeholder="Last, First Middle" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Mother's Maiden Name</label>
                  <input type="text" name="motherName" value={currentStudent.motherName} onChange={handleInputChange} className="w-full input-field" placeholder="Last, First Middle" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Guardian's Name</label>
                  <input type="text" name="guardianName" value={currentStudent.guardianName} onChange={handleInputChange} className="w-full input-field" placeholder="Last, First Middle" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Relationship</label>
                  <input type="text" name="guardianRelationship" value={currentStudent.guardianRelationship} onChange={handleInputChange} className="w-full input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Contact Number</label>
                  <input type="tel" name="contactNumber" value={currentStudent.contactNumber} onChange={handleInputChange} className="w-full input-field" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Remarks</label>
              <input
                type="text"
                name="remarks"
                value={currentStudent.remarks}
                onChange={handleInputChange}
                className="w-full input-field"
                placeholder="Transferred In/Out, CCT, etc."
                list="remarks-list"
              />
              <datalist id="remarks-list">
                {(config?.studentRemarks || []).map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

          </form>

          <footer className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3">
            <button onClick={handleCloseForm} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={handleFormSubmit}
              type="submit"
              disabled={isSaving}
              className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : (editingStudentId ? <EditIcon className="w-4 h-4 mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />)}
              {isSaving ? 'Saving...' : (editingStudentId ? 'Update Student' : 'Add Student')}
            </button>
          </footer>
        </div >
      </div >,
      document.body
    );
  };

  return (
    <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans">
      <style>{`
        .input-field { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #1e293b; font-size: 0.875rem; transition: all 0.2s; } 
        .input-field:focus { border-color: #6366f1; outline: none; ring: 2px; ring-color: #e0e7ff; }
        .dark .input-field { background-color: #334155; border-color: #475569; color: #f1f5f9; }
        .dark .input-field:focus { border-color: #818cf8; }
        .custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; right: 0; top: 0; bottom: 0; width: 100%; cursor: pointer; }
      `}</style>

      {isFormVisible && renderForm()}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Move <strong>{deleteModalState.studentName}</strong> to the Recycle Bin? Records are permanently deleted after 7 days.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteModalState({ isOpen: false, studentId: null, studentName: '' })}
                className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Student Master List</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              Manage enrollment records (SF1) and student profiles.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleAddNew}
              className="flex-1 md:flex-none flex items-center justify-center px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm transform hover:-translate-y-0.5"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Student
            </button>
            <button
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="flex-1 md:flex-none flex items-center justify-center px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 font-bold text-sm transform hover:-translate-y-0.5"
            >
              {isSaving ? <SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> : <SaveIcon className="w-5 h-5 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {/* Control Bar: Tabs & Search */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-8 gap-4">
          <div className="bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl inline-flex w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              Active Students
              <span className="ml-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                {activeStudents.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'deleted'
                ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Recycle Bin
              <span className="ml-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                {deletedStudents.length}
              </span>
            </button>
          </div>

          <div className="relative w-full lg:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by LRN or name..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium shadow-sm transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center p-20">
            <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-slate-500 font-medium">Retrieving records...</span>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">LRN</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sex</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Birth Date</th>
                      {activeTab === 'active' ? (
                        <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                      ) : (
                        <>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry</th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Restore</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {paginatedStudents.map(student => (
                      <tr key={student.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {student.lrn || '---'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-3 shadow-sm">
                              {student.firstName.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {studentFullName(student)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {student.sex}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {student.birthDate} <span className="text-slate-400 text-xs ml-1">({student.age} yrs)</span>
                        </td>
                        {activeTab === 'active' ? (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                title="Edit Profile"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  title={userProfile?.role === 'principal' ? "Archive Record" : "Delete Record"}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-800">
                                {getTimeRemaining(student.deletedAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleRestore(student.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 hover:text-green-600 transition-all"
                                title="Restore Student"
                              >
                                <UndoIcon className="w-4 h-4 mr-1.5" /> Restore
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                    <UsersIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">No students found</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                    {searchQuery
                      ? `We couldn't find any matches for "${searchQuery}".`
                      : (activeTab === 'active' ? "Get started by adding a new student record." : "The recycle bin is empty.")}
                  </p>
                  {activeTab === 'active' && !searchQuery && (
                    <button onClick={handleAddNew} className="mt-6 text-indigo-600 font-bold text-sm hover:underline">
                      Create first record &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentRegistration;
