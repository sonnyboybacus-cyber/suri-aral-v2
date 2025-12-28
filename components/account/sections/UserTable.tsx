import React from 'react';
import { UserProfile } from '../../../types';
import {
    UserIcon, PlusIcon, SpinnerIcon, ShieldIcon, LockIcon,
    CheckCircleIcon, TrashIcon, FolderIcon
} from '../../icons';

interface UserTableProps {
    users: UserProfile[];
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreateUser: () => void;
    onEditPermissions: (user: UserProfile) => void;
    onResetPassword: (user: UserProfile) => void;
    onToggleStatus: (user: UserProfile) => void;
    onDeleteUser: (user: UserProfile) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading,
    searchQuery,
    onSearchChange,
    onCreateUser,
    onEditPermissions,
    onResetPassword,
    onToggleStatus,
    onDeleteUser
}) => {
    return (
        <>
            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search users by name or email..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                        <UserIcon className="w-4 h-4" />
                    </div>
                </div>
                <button
                    onClick={onCreateUser}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm whitespace-nowrap"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create User Account
                </button>
            </div>
            {isLoading ? (
                <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {users
                                .filter(u =>
                                    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map(u => (
                                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{u.displayName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${u.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {u.disabled ? 'Disabled' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {(true) && ( // Allow all admins to manage permissions for now
                                                    <button
                                                        onClick={() => onEditPermissions(u)}
                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                                                        title="Manage Permissions"
                                                    >
                                                        <ShieldIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onResetPassword(u)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <LockIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onToggleStatus(u)}
                                                    className={`p-1.5 ${u.disabled ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'} rounded-md transition-colors`}
                                                    title={u.disabled ? "Enable Account" : "Disable Account"}
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteUser(u)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Delete Account"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FolderIcon className="w-8 h-8 mb-2 opacity-50" />
                                            <p>No users found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};
