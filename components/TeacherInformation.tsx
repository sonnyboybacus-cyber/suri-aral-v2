
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { Teacher, UserRole, UserProfile } from '../types';
import { saveTeachers, loadTeachers, createManagedUser, listManagedUsers, updateTeacherAccountStatus, logActivity } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, CalendarIcon, SearchIcon, UserPlusIcon, EyeIcon, EyeOffIcon, BriefcaseIcon, SchoolIcon, KeyIcon, MailIcon, UserIcon, CopyIcon, RefreshIcon, ShieldIcon, CheckSquareIcon, CheckCircleIcon } from './icons';
import { UndoIcon } from './UndoIcon';

const initialTeacherState: Omit<Teacher, 'id' | 'deletedAt'> = {
  employeeId: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  sex: 'Male',
  email: '',
  phoneNumber: '',
  position: '',
  specialization: '',
  dateOfAppointment: '',
  status: 'Permanent',
};

const ITEMS_PER_PAGE = 25;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const TeacherInformation = ({ user }: { user: firebase.User }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Omit<Teacher, 'id' | 'deletedAt'>>(initialTeacherState);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  const userName = user.displayName || user.email || 'Unknown User';

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; teacherId: string | null; teacherName: string }>({
    isOpen: false,
    teacherId: null,
    teacherName: ''
  });

  // Account Creation/Management Modal State
  const [accountModal, setAccountModal] = useState({
      isOpen: false,
      teacherId: '',
      teacherName: '',
      email: '',
      password: '',
      role: 'teacher' as UserRole,
      isCreating: false,
      showPassword: false,
      existingAccount: false,
      successMode: false
  });

  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Load Teachers first (should always succeed if authenticated)
        const loadedTeachers = await loadTeachers(user.uid);
        setTeachers(loadedTeachers);

        // Attempt to load managed users (might fail if permissions are strict)
        try {
            const loadedUsers = await listManagedUsers(user.uid);
            setUsers(loadedUsers);
        } catch (userError) {
            console.warn("Could not load managed users list (permission restricted?)", userError);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Could not load teacher data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.uid]);

  // Background Auto-Detection of existing accounts
  useEffect(() => {
      let isMounted = true;

      const detectAccounts = async () => {
          const candidates = teachers.filter(t => t.email && !t.hasAccount && !t.linkedAccountId && !t.deletedAt);
          
          if (candidates.length === 0) return;

          for (const teacher of candidates) {
              if (!isMounted) break;
              try {
                  // Use compat method on auth instance
                  const methods = await auth.fetchSignInMethodsForEmail(teacher.email);
                  if (methods.length > 0 && isMounted) {
                      console.log(`Auto-detected existing account for ${teacher.email}`);
                      await updateTeacherAccountStatus(teacher.id, { hasAccount: true });
                      
                      // Log this automatic system action? Maybe too noisy. Skipping log for auto-detect.
                      
                      setTeachers(prev => prev.map(t => 
                          t.id === teacher.id ? { ...t, hasAccount: true } : t
                      ));
                  }
              } catch (e: any) {
                  if (e.code !== 'auth/invalid-email') {
                    // console.debug('Auto-detect check skipped for', teacher.email);
                  }
              }
          }
      };

      const timer = setTimeout(detectAccounts, 1500);

      return () => {
          isMounted = false;
          clearTimeout(timer);
      };
  }, [teachers]);

  const refreshUsers = async () => {
      try {
          const loadedUsers = await listManagedUsers(user.uid);
          setUsers(loadedUsers);
      } catch (error) {
          console.error("Error refreshing users:", error);
      }
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
    setCurrentTeacher(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher.lastName || !currentTeacher.firstName || !currentTeacher.employeeId) {
      alert("Employee ID, Last Name, and First Name are required.");
      return;
    }

    if (editingTeacherId) {
      setTeachers(prev => prev.map(t => t.id === editingTeacherId ? { id: editingTeacherId, ...currentTeacher } : t));
    } else {
      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        ...currentTeacher,
      };
      setTeachers(prev => [newTeacher, ...prev]);
    }
    handleCloseForm();
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    const { id, deletedAt, ...editableData } = teacher;
    setCurrentTeacher(editableData);
    setIsFormVisible(true);
  };

  const teacherFullName = (t: Teacher) => `${t.lastName}, ${t.firstName} ${t.extensionName || ''} ${t.middleName || ''}`.replace(/\s+/g, ' ').trim();

  const handleDelete = (teacher: Teacher) => {
    setDeleteModalState({
        isOpen: true,
        teacherId: teacher.id,
        teacherName: teacherFullName(teacher)
    });
  };
  
  const executeDelete = () => {
      const { teacherId } = deleteModalState;
      if (teacherId) {
        setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, deletedAt: Date.now() } : t));
      }
      setDeleteModalState({ isOpen: false, teacherId: null, teacherName: '' });
  };
  
  const handleRestore = (teacherId: string) => {
    setTeachers(prev => prev.map(t => {
        if (t.id === teacherId) {
            const { deletedAt, ...rest } = t;
            return rest;
        }
        return t;
    }));
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    const now = Date.now();
    const teachersToSave = teachers.filter(t => !t.deletedAt || (now - t.deletedAt) < SEVEN_DAYS_IN_MS);

    try {
      await saveTeachers(user.uid, teachersToSave);
      await logActivity(user.uid, userName, 'update', 'Teacher', 'Updated teacher master list.');
      
      if (teachersToSave.length !== teachers.length) {
          setTeachers(teachersToSave);
          alert("Teacher data saved successfully! Expired records have been permanently deleted.");
      } else {
          alert("Teacher data saved successfully!");
      }
    } catch (error) {
      console.error("Error saving teachers:", error);
      alert("Failed to save teacher data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddNew = () => {
    setEditingTeacherId(null);
    setCurrentTeacher(initialTeacherState);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingTeacherId(null);
    setCurrentTeacher(initialTeacherState);
  };
  
  const getUserAccount = (email: string | undefined) => {
      if (!email) return undefined;
      return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  };

  const handleOpenAccountModal = (teacher: Teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`;
      const existingUser = getUserAccount(teacher.email);
      const hasAccount = !!existingUser || !!teacher.linkedAccountId || !!teacher.hasAccount;

      setAccountModal({
          isOpen: true,
          teacherId: teacher.id,
          teacherName: fullName,
          email: teacher.email || '',
          password: '',
          role: existingUser ? existingUser.role : 'teacher', 
          isCreating: false,
          showPassword: false,
          existingAccount: hasAccount,
          successMode: false
      });
      
      if (hasAccount) {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
          let pass = "";
          for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
          setAccountModal(prev => ({ ...prev, password: pass, showPassword: true }));
      }
  };
  
  const generateRandomPassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
      let pass = "";
      for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setAccountModal(prev => ({ ...prev, password: pass, showPassword: true }));
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
      e.preventDefault();
      if (accountModal.password.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
      }
      
      setAccountModal(prev => ({ ...prev, isCreating: true }));
      try {
          const newUid = await createManagedUser(user.uid, accountModal.email, accountModal.password, {
              email: accountModal.email,
              displayName: accountModal.teacherName,
              role: accountModal.role
          });
          
          // Link the new account ID to the teacher record and save globally
          const updatedTeachers = teachers.map(t => 
            t.id === accountModal.teacherId ? { ...t, linkedAccountId: newUid, hasAccount: true } : t
          );
          setTeachers(updatedTeachers);
          
          const now = Date.now();
          const teachersToSave = updatedTeachers.filter(t => !t.deletedAt || (now - t.deletedAt) < SEVEN_DAYS_IN_MS);
          await saveTeachers(user.uid, teachersToSave);

          // Log activity
          await logActivity(user.uid, userName, 'create', 'Account', `Created user account for ${accountModal.teacherName}.`);

          // Switch to Success View
          setAccountModal(prev => ({ ...prev, isCreating: false, successMode: true }));
          refreshUsers(); 
      } catch (error: any) {
          
          const isEmailInUse = error.code === 'auth/email-already-in-use' || 
                               (error.message && error.message.includes('email-already-in-use'));

          if (isEmailInUse) {
             console.log("User already exists (auth/email-already-in-use). Switching to management view.");
             
             const updatedTeachers = teachers.map(t => 
                t.id === accountModal.teacherId ? { ...t, hasAccount: true } : t
             );
             setTeachers(updatedTeachers);
             
             const now = Date.now();
             const teachersToSave = updatedTeachers.filter(t => !t.deletedAt || (now - t.deletedAt) < SEVEN_DAYS_IN_MS);
             saveTeachers(user.uid, teachersToSave)
                .then(() => logActivity(user.uid, userName, 'update', 'Teacher', `Linked existing account to ${accountModal.teacherName}.`))
                .catch(err => console.error("Error updating teacher link:", err));

             setAccountModal(prev => ({ ...prev, isCreating: false, existingAccount: true }));
          } else {
             console.error("Error creating user:", error);
             setAccountModal(prev => ({ ...prev, isCreating: false }));
             alert(`Failed to create account: ${error.message}`);
          }
      }
  };

  const handleSimulateResetPassword = () => {
      if (!accountModal.email || !accountModal.password) return;
      alert(`[SIMULATION]\n\nIn a production environment with Backend Admin SDK, the password for ${accountModal.email} would be updated to: ${accountModal.password}\n\nSince this is a client-side demo, we cannot forcefully overwrite another user's password for security reasons.`);
      setAccountModal(prev => ({ ...prev, isOpen: false }));
  };

  const activeTeachers = useMemo(() => teachers.filter(t => !t.deletedAt), [teachers]);
  const deletedTeachers = useMemo(() => teachers.filter(t => t.deletedAt), [teachers]);

  const filteredTeachers = useMemo(() => {
    const sourceList = activeTab === 'active' ? activeTeachers : deletedTeachers;
    if (!searchQuery.trim()) {
      return sourceList;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return sourceList.filter(t =>
      (t.employeeId && t.employeeId.toLowerCase().includes(lowercasedQuery)) ||
      teacherFullName(t).toLowerCase().includes(lowercasedQuery)
    );
  }, [activeTeachers, deletedTeachers, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTeachers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTeachers, currentPage]);

  const PasswordStrengthMeter = ({ password }: { password: string }) => {
      const strength = useMemo(() => {
          if (password.length === 0) return 0;
          let score = 0;
          if (password.length >= 6) score++;
          if (password.length >= 8) score++;
          if (/\d/.test(password)) score++;
          if (/[!@#$%^&*]/.test(password)) score++;
          return score;
      }, [password]);
      
      const getColor = () => {
          if (strength <= 1) return 'bg-red-500';
          if (strength <= 2) return 'bg-amber-500';
          return 'bg-green-500';
      };
      
      const getLabel = () => {
           if (password.length === 0) return '';
           if (strength <= 1) return 'Weak';
           if (strength <= 2) return 'Medium';
           return 'Strong';
      };

      return (
          <div className="mt-2">
              <div className="flex h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${getColor()}`} style={{ width: `${(strength / 4) * 100}%` }}></div>
              </div>
              <div className="text-xs text-right mt-1 text-slate-500">{getLabel()}</div>
          </div>
      );
  };

  const renderForm = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {editingTeacherId ? 'Edit Teacher Profile' : 'New Teacher Registration'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update faculty information and employment details.</p>
                </div>
                <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {/* Personal Information */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-6 flex items-center">
                        <UserIcon className="w-4 h-4 mr-2" /> Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Employee ID <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <BriefcaseIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    name="employeeId" 
                                    value={currentTeacher.employeeId} 
                                    onChange={handleInputChange} 
                                    className="w-full pl-10 p-3 input-field" 
                                    required 
                                    placeholder="ID Number"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Last Name <span className="text-red-500">*</span></label>
                            <input type="text" name="lastName" value={currentTeacher.lastName} onChange={handleInputChange} className="w-full input-field font-medium" required/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">First Name <span className="text-red-500">*</span></label>
                            <input type="text" name="firstName" value={currentTeacher.firstName} onChange={handleInputChange} className="w-full input-field font-medium" required/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Middle Name</label>
                            <input type="text" name="middleName" value={currentTeacher.middleName} onChange={handleInputChange} className="w-full input-field" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Extension</label>
                            <input type="text" name="extensionName" placeholder="Jr, III" value={currentTeacher.extensionName} onChange={handleInputChange} className="w-full input-field" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Sex</label>
                            <select name="sex" value={currentTeacher.sex} onChange={handleInputChange} className="w-full input-field appearance-none">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email Address</label>
                            <div className="relative">
                                <MailIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input type="email" name="email" value={currentTeacher.email} onChange={handleInputChange} className="w-full pl-10 p-3 input-field" placeholder="email@example.com" />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
                            <input type="tel" name="phoneNumber" value={currentTeacher.phoneNumber} onChange={handleInputChange} className="w-full input-field" placeholder="09..." />
                        </div>
                    </div>
                </div>
                
                {/* Employment Details */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-6 flex items-center">
                        <SchoolIcon className="w-4 h-4 mr-2" /> Employment Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Position / Designation</label>
                            <input type="text" name="position" value={currentTeacher.position} onChange={handleInputChange} className="w-full input-field" placeholder="e.g. Teacher I" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Major / Specialization</label>
                            <input type="text" name="specialization" value={currentTeacher.specialization} onChange={handleInputChange} className="w-full input-field" placeholder="e.g. Mathematics" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Status</label>
                            <select name="status" value={currentTeacher.status} onChange={handleInputChange} className="w-full input-field appearance-none">
                                <option value="Permanent">Permanent</option>
                                <option value="Substitute">Substitute</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Contractual">Contractual</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dateOfAppointment" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date of Appointment</label>
                            <div className="relative">
                                <input 
                                    type="date"
                                    id="dateOfAppointment" 
                                    name="dateOfAppointment" 
                                    value={currentTeacher.dateOfAppointment} 
                                    onChange={handleInputChange} 
                                    className="w-full input-field pr-10 custom-date-input"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
             <footer className="flex justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3">
                <button onClick={handleCloseForm} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    Cancel
                </button>
                 <button onClick={handleFormSubmit} type="submit" className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                    {editingTeacherId ? <EditIcon className="w-4 h-4 mr-2"/> : <PlusIcon className="w-4 h-4 mr-2"/>}
                    {editingTeacherId ? 'Update Teacher' : 'Add Teacher'}
                 </button>
            </footer>
        </div>
    </div>
  );
  
  const renderAccountModal = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <header className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {accountModal.successMode ? <CheckSquareIcon className="w-5 h-5 text-green-600" /> : (accountModal.existingAccount ? <UserIcon className="w-5 h-5 text-indigo-600" /> : <UserPlusIcon className="w-5 h-5 text-indigo-600" />)}
                    {accountModal.successMode ? 'Account Created' : (accountModal.existingAccount ? 'Manage Account' : 'Create User Account')}
                </h2>
                <button onClick={() => setAccountModal(prev => ({...prev, isOpen: false}))} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </header>
            
            {accountModal.successMode ? (
                // SUCCESS CREDENTIAL VIEW
                <div className="p-8 space-y-6 text-center">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <ShieldIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Access Granted!</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Credentials for <strong>{accountModal.teacherName}</strong> generated.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 text-left shadow-inner">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email / Username</label>
                            <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 break-all bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">{accountModal.email}</div>
                        </div>
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Temporary Password</label>
                            <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">{accountModal.password}</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => copyToClipboard(`Email: ${accountModal.email}\nPassword: ${accountModal.password}`)}
                            className={`w-full flex items-center justify-center px-4 py-3 text-white rounded-xl font-bold transition-all shadow-lg ${copySuccess ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'} hover:-translate-y-0.5`}
                        >
                            {copySuccess ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <CopyIcon className="w-5 h-5 mr-2" />}
                            {copySuccess ? 'Copied to Clipboard' : 'Copy Credentials'}
                        </button>
                        
                        <button 
                            onClick={() => setAccountModal(prev => ({...prev, isOpen: false}))}
                            className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            Close Window
                        </button>
                    </div>
                </div>
            ) : accountModal.existingAccount ? (
                // MANAGE EXISTING VIEW - MANUAL RESET MODE
                <div className="p-6 space-y-6">
                    <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                         <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                             {accountModal.teacherName.charAt(0)}
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{accountModal.teacherName}</h3>
                             <p className="text-xs text-slate-500 dark:text-slate-400">{accountModal.email}</p>
                             <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 uppercase tracking-wide border border-indigo-200 dark:border-indigo-800">{accountModal.role}</span>
                         </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                         <h4 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-300 flex items-center">
                            <KeyIcon className="w-4 h-4 mr-2 text-slate-400" />
                            Reset Password
                         </h4>
                         <div className="space-y-4">
                             <div className="relative">
                                <input 
                                    type={accountModal.showPassword ? "text" : "password"} 
                                    value={accountModal.password} 
                                    onChange={(e) => setAccountModal(prev => ({...prev, password: e.target.value}))} 
                                    className="w-full input-field pr-24"
                                    placeholder="Enter new password"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setAccountModal(prev => ({...prev, showPassword: !prev.showPassword}))}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {accountModal.showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                        title="Generate Random"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                    </button>
                                </div>
                             </div>
                             <PasswordStrengthMeter password={accountModal.password} />

                             <div className="flex gap-3 mt-2">
                                 <button
                                    onClick={() => copyToClipboard(accountModal.password)}
                                    disabled={!accountModal.password}
                                    className={`flex-1 flex items-center justify-center px-4 py-2.5 border rounded-xl font-bold transition-colors text-sm ${copySuccess 
                                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                >
                                    {copySuccess ? <CheckCircleIcon className="w-4 h-4 mr-2" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                                    {copySuccess ? 'Copied' : 'Copy'}
                                </button>
                                <button 
                                    onClick={handleSimulateResetPassword}
                                    disabled={!accountModal.password}
                                    className="flex-1 flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                                >
                                    Update Password
                                </button>
                             </div>
                         </div>
                    </div>
                </div>
            ) : (
                // CREATE NEW VIEW
                <form onSubmit={handleCreateAccount} className="p-6 space-y-5">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-200 flex items-start">
                        <ShieldIcon className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                        <p>You are creating a new secure account for <strong>{accountModal.teacherName}</strong>. They will use these credentials to log in.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            value={accountModal.email} 
                            onChange={(e) => setAccountModal(prev => ({...prev, email: e.target.value}))} 
                            className="w-full input-field"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                        <div className="relative">
                            <input 
                                type={accountModal.showPassword ? "text" : "password"} 
                                value={accountModal.password} 
                                onChange={(e) => setAccountModal(prev => ({...prev, password: e.target.value}))} 
                                className="w-full input-field pr-24"
                                placeholder="Create password"
                                required 
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setAccountModal(prev => ({...prev, showPassword: !prev.showPassword}))}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {accountModal.showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={generateRandomPassword}
                                    className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                    title="Generate Secure Password"
                                >
                                    <RefreshIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <PasswordStrengthMeter password={accountModal.password} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Access Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setAccountModal(prev => ({...prev, role: 'teacher'}))}
                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                    accountModal.role === 'teacher' 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-600' 
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <BriefcaseIcon className={`w-6 h-6 mb-2 ${accountModal.role === 'teacher' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className={`text-sm font-bold ${accountModal.role === 'teacher' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Teacher</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountModal(prev => ({...prev, role: 'admin'}))}
                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                    accountModal.role === 'admin' 
                                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 ring-1 ring-purple-600' 
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <SchoolIcon className={`w-6 h-6 mb-2 ${accountModal.role === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                                <span className={`text-sm font-bold ${accountModal.role === 'admin' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>Admin</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            type="button" 
                            onClick={() => setAccountModal(prev => ({...prev, isOpen: false}))}
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={accountModal.isCreating}
                            className="flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            {accountModal.isCreating && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                            {accountModal.isCreating ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    </div>
  );

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
      {accountModal.isOpen && renderAccountModal()}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Deletion</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    Move <strong>{deleteModalState.teacherName}</strong> to the Recycle Bin? Records are permanently deleted after 7 days.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setDeleteModalState({ isOpen: false, teacherId: null, teacherName: '' })} 
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
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Teacher Master List</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                 Manage faculty records, roles, and user accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleAddNew}
              className="flex-1 md:flex-none flex items-center justify-center px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm transform hover:-translate-y-0.5"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Teacher
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
                    className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'active' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    <BriefcaseIcon className="w-4 h-4 mr-2" />
                    Active Faculty
                    <span className="ml-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                        {activeTeachers.length}
                    </span>
                </button>
                <button 
                    onClick={() => setActiveTab('deleted')} 
                    className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'deleted' 
                        ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Recycle Bin
                    <span className="ml-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                        {deletedTeachers.length}
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
                    placeholder="Search by ID or name..."
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
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee ID</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                        {activeTab === 'active' ? (
                            <>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Position</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                            </>
                        ) : (
                            <>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Restore</th>
                            </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {paginatedTeachers.map(teacher => {
                        const userAccount = getUserAccount(teacher.email);
                        const hasAccount = !!userAccount || !!teacher.linkedAccountId || !!teacher.hasAccount;
                        
                        return (
                            <tr key={teacher.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    {teacher.employeeId || '---'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-3 shadow-sm">
                                        {teacher.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {teacherFullName(teacher)}
                                    </span>
                                </div>
                            </td>
                            {activeTab === 'active' ? (
                                <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">{teacher.position}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            teacher.status === 'Permanent' 
                                            ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                                            : teacher.status === 'Probationary' 
                                            ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                            : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}>
                                            {teacher.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenAccountModal(teacher)} 
                                                className={`p-2 rounded-lg transition-colors ${
                                                    hasAccount 
                                                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' 
                                                    : 'text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                                                }`}
                                                title={hasAccount ? "Manage Account" : "Create User Account"}
                                            >
                                                {hasAccount ? <UserIcon className="w-4 h-4" /> : <UserPlusIcon className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(teacher)} 
                                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" 
                                                title="Edit Profile"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(teacher)} 
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" 
                                                title="Delete Record"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-800">
                                            {getTimeRemaining(teacher.deletedAt)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => handleRestore(teacher.id)} 
                                            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 hover:text-green-600 transition-all" 
                                            title="Restore Teacher"
                                        >
                                            <UndoIcon className="w-4 h-4 mr-1.5" /> Restore
                                        </button>
                                    </td>
                                </>
                            )}
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
             {filteredTeachers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                        <BriefcaseIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">No teachers found</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                        {searchQuery 
                            ? `We couldn't find any matches for "${searchQuery}".` 
                            : (activeTab === 'active' ? "Get started by adding a new faculty record." : "The recycle bin is empty.")}
                    </p>
                    {activeTab === 'active' && !searchQuery && (
                            <button onClick={handleAddNew} className="mt-6 text-indigo-600 font-bold text-sm hover:underline">
                            Create first record &rarr;
                            </button>
                    )}
                </div>
            )}
          </div>

            {/* Pagination */}
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

export default TeacherInformation;
