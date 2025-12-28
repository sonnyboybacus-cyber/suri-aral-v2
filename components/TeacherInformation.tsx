
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { Teacher, UserRole, UserProfile } from '../types';
import { saveTeacher, saveTeachers, loadTeachers, listManagedUsers, updateTeacherAccountStatus, logActivity, sendNotification, generateUUID } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, CalendarIcon, SearchIcon, BriefcaseIcon, SchoolIcon, UserIcon, CheckCircleIcon, MailIcon } from './icons';
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

    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; teacherId: string | null; teacherName: string }>({
        isOpen: false,
        teacherId: null,
        teacherName: ''
    });

    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const loadedTeachers = await loadTeachers(user.uid);
            setTeachers(loadedTeachers);

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
    }, [user.uid]);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    useEffect(() => {
        let isMounted = true;

        const detectAccounts = async () => {
            const candidates = teachers.filter(t => t.email && !t.hasAccount && !t.linkedAccountId && !t.deletedAt);

            if (candidates.length === 0) return;

            for (const teacher of candidates) {
                if (!isMounted) break;
                try {
                    const methods = await auth.fetchSignInMethodsForEmail(teacher.email);
                    if (methods.length > 0 && isMounted) {
                        console.log(`Auto-detected existing account for ${teacher.email}`);
                        await updateTeacherAccountStatus(teacher.id, { hasAccount: true });

                        setTeachers(prev => prev.map(t =>
                            t.id === teacher.id ? { ...t, hasAccount: true } : t
                        ));
                    }
                } catch (e: any) {
                    if (e.code !== 'auth/invalid-email') {
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

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTeacher.lastName || !currentTeacher.firstName || !currentTeacher.employeeId) {
            alert("Employee ID, Last Name, and First Name are required.");
            return;
        }

        setIsSaving(true);
        const teacherName = `${currentTeacher.lastName}, ${currentTeacher.firstName}`;

        try {
            let teacherToSave: Teacher;
            let actionType = '';

            if (editingTeacherId) {
                const existing = teachers.find(t => t.id === editingTeacherId);
                // MERGE existing data to preserve linkedAccountId and hasAccount
                teacherToSave = { ...existing, ...currentTeacher, id: editingTeacherId } as Teacher;
                actionType = 'Updated';
            } else {
                teacherToSave = {
                    id: generateUUID(),
                    ...currentTeacher,
                };
                actionType = 'Registered';
            }

            // Single save
            await saveTeacher(user.uid, teacherToSave);

            setTeachers(prev => {
                if (editingTeacherId) {
                    return prev.map(t => t.id === editingTeacherId ? teacherToSave : t);
                }
                return [teacherToSave, ...prev];
            });

            await logActivity(user.uid, userName, editingTeacherId ? 'update' : 'create', 'Teacher', `${actionType} teacher: ${teacherName}`);

            sendNotification(user.uid, {
                title: `Teacher ${actionType}`,
                message: `${teacherName} has been successfully saved to the database.`,
                type: 'success'
            });

            handleCloseForm();
        } catch (error: any) {
            console.error("Save failed:", error);
            alert(`Failed to save changes: ${error.message || 'Permission denied or network error.'}`);
        } finally {
            setIsSaving(false);
        }
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

    const executeDelete = async () => {
        const { teacherId } = deleteModalState;
        if (teacherId) {
            const teacherToDelete = teachers.find(t => t.id === teacherId);
            if (teacherToDelete) {
                const updatedTeacher = { ...teacherToDelete, deletedAt: Date.now() };
                try {
                    await saveTeacher(user.uid, updatedTeacher);
                    setTeachers(prev => prev.map(t => t.id === teacherId ? updatedTeacher : t));
                } catch (e) {
                    console.error("Delete failed", e);
                    alert("Failed to delete teacher. Permission denied.");
                }
            }
        }
        setDeleteModalState({ isOpen: false, teacherId: null, teacherName: '' });
    };

    const handleRestore = async (teacherId: string) => {
        const teacherToRestore = teachers.find(t => t.id === teacherId);
        if (teacherToRestore) {
            const { deletedAt, ...rest } = teacherToRestore;
            const restored = rest as Teacher;
            try {
                await saveTeacher(user.uid, restored);
                setTeachers(prev => prev.map(t => t.id === teacherId ? restored : t));
            } catch (e) {
                console.error("Restore failed", e);
                alert("Failed to restore teacher.");
            }
        }
    };

    const handleSaveToDatabase = async () => {
        setIsSaving(true);
        const now = Date.now();
        const teachersToSave = teachers.filter(t => !t.deletedAt || (now - t.deletedAt) < SEVEN_DAYS_IN_MS);

        try {
            // 1. Try Bulk Save (Fastest, for Admins)
            await saveTeachers(user.uid, teachersToSave);
            await logActivity(user.uid, userName, 'update', 'Teacher', 'Updated teacher master list (Bulk).');

            if (teachersToSave.length !== teachers.length) {
                setTeachers(teachersToSave);
                alert("Teacher data saved successfully! Expired records have been permanently deleted.");
            } else {
                alert("Teacher data saved successfully!");
            }

        } catch (error: any) {
            console.warn("Bulk save failed, attempting individual save...", error);

            // 2. Fallback: Individual Save (For users who can only update their own record)
            try {
                // Process sequentially or in parallel
                const promises = teachersToSave.map(t => saveTeacher(user.uid, t));
                await Promise.all(promises);

                await logActivity(user.uid, userName, 'update', 'Teacher', 'Updated teacher records (Individual Sync).');
                alert("Saved successfully! (Synced individual records)");

            } catch (innerError: any) {
                console.error("Individual save failed:", innerError);
                alert(`Failed to save data. You may not have permission to modify some of these records.`);
            }
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

    const renderForm = () => {
        if (typeof document === 'undefined') return null;

        return createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                    <header className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
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

                    <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                        {/* Personal Information */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                                <UserIcon className="w-4 h-4 mr-2" /> Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                                    <input type="text" name="lastName" value={currentTeacher.lastName} onChange={handleInputChange} className="w-full input-field font-medium" required />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">First Name <span className="text-red-500">*</span></label>
                                    <input type="text" name="firstName" value={currentTeacher.firstName} onChange={handleInputChange} className="w-full input-field font-medium" required />
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
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4 flex items-center">
                                <SchoolIcon className="w-4 h-4 mr-2" /> Employment Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date of Appointment</label>
                                    <div className="grid grid-cols-12 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                        <div className="col-span-12 md:col-span-5 relative">
                                            <select
                                                name="appointMonth"
                                                value={currentTeacher.dateOfAppointment ? parseInt(currentTeacher.dateOfAppointment.split('-')[1]) : ''}
                                                onChange={(e) => {
                                                    const newMonth = parseInt(e.target.value);
                                                    const parts = currentTeacher.dateOfAppointment ? currentTeacher.dateOfAppointment.split('-').map(Number) : [];
                                                    const y = parts[0] || new Date().getFullYear();
                                                    let d = parts[2] || 1;
                                                    const maxDays = new Date(y, newMonth, 0).getDate();
                                                    if (d > maxDays) d = maxDays;
                                                    const formatted = `${y}-${newMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                                                    handleInputChange({ target: { name: 'dateOfAppointment', value: formatted } } as any);
                                                }}
                                                className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="" className="text-slate-400">Month</option>
                                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                                    <option key={i} value={i + 1}>{m}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                            </div>
                                        </div>
                                        <div className="col-span-6 md:col-span-3 relative">
                                            <select
                                                name="appointDay"
                                                value={currentTeacher.dateOfAppointment ? parseInt(currentTeacher.dateOfAppointment.split('-')[2]) : ''}
                                                onChange={(e) => {
                                                    const newDay = parseInt(e.target.value);
                                                    const parts = currentTeacher.dateOfAppointment ? currentTeacher.dateOfAppointment.split('-').map(Number) : [];
                                                    const y = parts[0] || new Date().getFullYear();
                                                    const m = parts[1] || 1;
                                                    const formatted = `${y}-${m.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
                                                    handleInputChange({ target: { name: 'dateOfAppointment', value: formatted } } as any);
                                                }}
                                                className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold font-mono py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="" className="text-slate-400">Day</option>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>{d.toString().padStart(2, '0')}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                            </div>
                                        </div>
                                        <div className="col-span-6 md:col-span-4 relative">
                                            <select
                                                name="appointYear"
                                                value={currentTeacher.dateOfAppointment ? parseInt(currentTeacher.dateOfAppointment.split('-')[0]) : ''}
                                                onChange={(e) => {
                                                    const newYear = parseInt(e.target.value);
                                                    const parts = currentTeacher.dateOfAppointment ? currentTeacher.dateOfAppointment.split('-').map(Number) : [];
                                                    const m = parts[1] || 1;
                                                    let d = parts[2] || 1;
                                                    const maxDays = new Date(newYear, m, 0).getDate();
                                                    if (d > maxDays) d = maxDays;
                                                    const formatted = `${newYear}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                                                    handleInputChange({ target: { name: 'dateOfAppointment', value: formatted } } as any);
                                                }}
                                                className="w-full bg-white dark:bg-slate-800 border-none appearance-none cursor-pointer font-bold font-mono py-2 pl-3 pr-8 focus:ring-0 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="" className="text-slate-400">Year</option>
                                                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                            {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : (editingTeacherId ? <EditIcon className="w-4 h-4 mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />)}
                            {isSaving ? 'Saving...' : (editingTeacherId ? 'Update Teacher' : 'Add Teacher')}
                        </button>
                    </footer>
                </div>
            </div>,
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
                            className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'active'
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
                            className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'deleted'
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
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                                        {teacherFullName(teacher)}
                                                                    </span>
                                                                    {hasAccount && (
                                                                        <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center" title="Has Account Access">
                                                                            <CheckCircleIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {activeTab === 'active' ? (
                                                        <>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">{teacher.position}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${teacher.status === 'Permanent'
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
