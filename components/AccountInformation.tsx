
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, UserRole, Teacher } from '../types';
import { createManagedUser, listManagedUsers, loadTeachers } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, UserIcon, EyeIcon, EyeOffIcon, BriefcaseIcon, SchoolIcon } from './icons';

const AccountInformation = ({ user }: { user: User }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form State
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'teacher' as UserRole
    });
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            const initData = async () => {
                setIsLoading(true);
                try {
                    const [userList, teacherList] = await Promise.all([
                        listManagedUsers(user.uid),
                        loadTeachers(user.uid)
                    ]);
                    setUsers(userList);
                    setTeachers(teacherList.filter(t => !t.deletedAt));
                } catch (error) {
                    console.error("Error fetching data:", error);
                    setUsers([]);
                } finally {
                    setIsLoading(false);
                }
            };
            initData();
        }
    }, [user]);

    const refreshUsers = async () => {
        try {
            const userList = await listManagedUsers(user.uid);
            setUsers(userList);
        } catch (error) {
            console.error("Error refreshing users:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
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
                    email: teacher.email || prev.email, // Auto-fill email if available
                    role: 'teacher' // Default to teacher role
                }));
            }
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        
        setIsCreating(true);
        try {
            await createManagedUser(user.uid, newUser.email, newUser.password, {
                email: newUser.email,
                displayName: newUser.displayName,
                role: newUser.role
            });

            alert("Account created successfully!");
            setNewUser({ email: '', password: '', displayName: '', role: 'teacher' });
            setSelectedTeacherId('');
            setIsFormVisible(false);
            refreshUsers();

        } catch (error: any) {
            console.error("Error creating user:", error);
            let msg = "Failed to create account.";
            if (error.code === 'auth/email-already-in-use') msg = "Email is already registered.";
            alert(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const sortedTeachers = useMemo(() => {
        return [...teachers].sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [teachers]);

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <header className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Account Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage access for teachers and staff.</p>
                    </div>
                    <button
                        onClick={() => setIsFormVisible(true)}
                        className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create New Account
                    </button>
                </header>

                {/* User List */}
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No additional accounts found.</td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <tr key={u.uid}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{u.displayName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    u.role === 'admin' 
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                }`}>
                                                    {u.role === 'admin' ? 'Administrator' : 'Teacher'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Account Modal */}
            {isFormVisible && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold">Create New User</h2>
                        </header>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            
                            {/* Teacher Selection Dropdown */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <label className="block text-sm font-medium mb-1 text-indigo-600 dark:text-indigo-400">Load details from Teacher List (Optional)</label>
                                <select 
                                    value={selectedTeacherId} 
                                    onChange={handleTeacherSelect} 
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                >
                                    <option value="">-- Select Teacher to Auto-fill --</option>
                                    {sortedTeachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.lastName}, {t.firstName} ({t.employeeId})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    name="displayName" 
                                    value={newUser.displayName} 
                                    onChange={handleInputChange} 
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={newUser.email} 
                                    onChange={handleInputChange} 
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        name="password" 
                                        value={newUser.password} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                                        required 
                                    />
                                     <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400"
                                    >
                                        {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewUser(prev => ({...prev, role: 'teacher'}))}
                                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                            newUser.role === 'teacher' 
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <BriefcaseIcon className={`w-6 h-6 mb-2 ${newUser.role === 'teacher' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                        <span className="text-sm font-semibold">Teacher</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewUser(prev => ({...prev, role: 'admin'}))}
                                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                            newUser.role === 'admin' 
                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30' 
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <SchoolIcon className={`w-6 h-6 mb-2 ${newUser.role === 'admin' ? 'text-purple-600' : 'text-slate-500'}`} />
                                        <span className="text-sm font-semibold">Admin</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setIsFormVisible(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isCreating}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {isCreating && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                                    {isCreating ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountInformation;
