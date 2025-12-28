import React, { useState } from 'react';
import { UserRole, UserProfile, Teacher, SchoolInfo } from '../../../types';
import { createManagedUser } from '../../../services/db/academic';
import {
    PlusIcon, SpinnerIcon, EyeIcon, EyeOffIcon, RefreshIcon,
    AlertTriangleIcon, CopyIcon, CheckIcon
} from '../../icons';
import firebase from 'firebase/compat/app';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
    currentUser: firebase.User;
    currentUserProfile: UserProfile | null;
    teachers: Teacher[];
    schools: SchoolInfo[];
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
    isOpen,
    onClose,
    onUserCreated,
    currentUser,
    currentUserProfile,
    teachers,
    schools
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'teacher' as UserRole,
        schoolId: ''
    });
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const generatePassword = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
        let pass = "";
        for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
        setNewUser(prev => ({ ...prev, password: pass }));
        setShowPassword(true);
    };

    const copyCredentials = () => {
        if (!newUser.email || !newUser.password) {
            alert("Please fill in email and password first.");
            return;
        }
        const text = `SURI-ARAL LOGIN CREDENTIALS\nEmail: ${newUser.email}\nPassword: ${newUser.password}\nLogin URL: ${window.location.origin}`;
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Credentials copied to clipboard!");
        }).catch(() => {
            alert("Failed to copy to clipboard.");
        });
    };

    const handleTeacherSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const teacherId = e.target.value;
        setSelectedTeacherId(teacherId);
        if (teacherId) {
            const teacher = teachers.find(t => t.id === teacherId);
            if (teacher) {
                const fullName = `${teacher.firstName} ${teacher.lastName}`;
                setNewUser(prev => ({
                    ...prev,
                    displayName: fullName,
                    email: teacher.email || prev.email,
                    role: 'teacher'
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        setIsCreating(true);
        try {
            await createManagedUser(currentUser.uid, newUser.email, newUser.password, {
                email: newUser.email,
                displayName: newUser.displayName,
                role: newUser.role,
                schoolId: (currentUserProfile?.role === 'ict_coordinator') ? currentUserProfile.schoolId : newUser.schoolId
            });
            alert("Account created successfully!");
            setNewUser({ email: '', password: '', displayName: '', role: 'teacher', schoolId: '' });
            setSelectedTeacherId('');
            onUserCreated();
            onClose();
        } catch (error: any) {
            console.error("Error creating user:", error);
            let msg = "Failed to create account.";
            if (error.code === 'auth/email-already-in-use') msg = "Email is already registered.";
            if (error.code === 'PERMISSION_DENIED') msg = "Permission Denied: Admin access required.";
            alert(msg);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create New Account</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Role</label>
                        <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="principal">Principal</option>
                            <option value="ict_coordinator">ICT Coordinator</option>
                            {currentUserProfile?.role === 'admin' && <option value="admin">System Admin</option>}
                        </select>
                    </div>

                    {/* Teacher Link (Optional) */}
                    {newUser.role === 'teacher' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link to Existing Teacher Profile (Optional)</label>
                            <select
                                value={selectedTeacherId}
                                onChange={handleTeacherSelect}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">-- Create Fresh Profile --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.lastName}, {t.firstName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* School Selection (If Admin) */}
                    {currentUserProfile?.role === 'admin' && (newUser.role === 'principal' || newUser.role === 'ict_coordinator') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign School</label>
                            <select
                                value={newUser.schoolId}
                                onChange={(e) => setNewUser({ ...newUser, schoolId: e.target.value })}
                                required
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">-- Select School --</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.schoolName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={newUser.displayName}
                                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Juan Dela Cruz"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="juan@deped.gov.ph"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full pl-3 pr-24 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="Minimum 6 characters"
                            />
                            <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                                    title={showPassword ? "Hide" : "Show"}
                                >
                                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"
                                    title="Generate Random Password"
                                >
                                    <RefreshIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {(newUser.email && newUser.password) && (
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={copyCredentials}
                                    className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                    Copy Credentials <CopyIcon className="w-3 h-3 ml-1" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md shadow-indigo-500/20 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isCreating ? <SpinnerIcon className="w-4 h-4 animate-spin mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />}
                            {isCreating ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
