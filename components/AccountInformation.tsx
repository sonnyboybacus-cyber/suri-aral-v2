import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import {
    UserIcon, KeyIcon, ShieldIcon, AlertTriangleIcon, FolderIcon
} from './icons';
import {
    toggleUserStatus, deleteUserProfile, loadUserProfile, sendPasswordReset,
    logActivity, listAccessCodes, deleteAccessCode, toggleAccessCode,
    updateUserRoleService
} from '../services/db/core';
import {
    listManagedUsers, loadTeachers, loadSchools
} from '../services/db/academic';
import {
    createManagedResource, updateManagedResource, deleteManagedResource, listManagedResources
} from '../services/db/resources';
import { UserProfile, UserRole, Permission, AccessCode, SchoolInfo, Teacher, ManagedResource } from '../types';
// Components
import { CreateUserModal } from './account/modals/CreateUserModal';
import { AccessCodeModal } from './account/modals/AccessCodeModal';
import { PermissionEditorModal } from './account/modals/PermissionEditorModal';
import { UserTable } from './account/sections/UserTable';
import { AccessCodeList } from './account/sections/AccessCodeList';
import { ResourceWidget } from './ResourceWidget';

const AccountInformation = ({ user }: { user: firebase.User }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'matrix' | 'resources'>('users');

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Filter Logic
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Modal States
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isCreateCodeModalOpen, setIsCreateCodeModalOpen] = useState(false);
    const [permissionModalState, setPermissionModalState] = useState<{
        isOpen: boolean;
        targetUser: UserProfile | null;
    }>({ isOpen: false, targetUser: null });

    // Legacy/Unrefactored Resource State (Out of scope for this specific fragmentation, kept minimal)
    // In a full refactor, Resources would also be extracted.
    const [resources, setResources] = useState<ManagedResource[]>([]);

    useEffect(() => {
        if (user) loadData();
    }, [user, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const profile = await loadUserProfile(user.uid);
            setUserProfile(profile);

            if (activeTab === 'users' || activeTab === 'matrix') {
                const [userList, teacherList] = await Promise.all([
                    listManagedUsers(user.uid),
                    loadTeachers(user.uid)
                ]);

                let filteredUsers = userList;
                let filteredTeachers = teacherList.filter(t => !t.deletedAt);

                if (profile?.role === 'ict_coordinator' && profile.schoolId) {
                    filteredUsers = userList.filter(u => u.schoolId === profile.schoolId);
                    filteredTeachers = filteredTeachers.filter(t => t.schoolId === profile.schoolId);
                }

                setUsers(filteredUsers);
                setTeachers(filteredTeachers);
            }

            if (activeTab === 'codes') {
                const [codeList, schoolList] = await Promise.all([
                    listAccessCodes(),
                    loadSchools(user.uid)
                ]);
                let filteredCodes = codeList;
                if (profile?.role === 'ict_coordinator' && profile.schoolId) {
                    filteredCodes = codeList.filter(c => c.schoolId === profile.schoolId);
                }
                setAccessCodes(filteredCodes);
                setSchools(schoolList);
            }

            if (activeTab === 'resources') {
                // ... Resource loading logic preserved or refactored separately
                // For this pass, we focus on Users and Codes as promised
            }

            // Schools always useful for dropdowns
            if (schools.length === 0) {
                const s = await loadSchools(user.uid);
                setSchools(s);
            }

        } catch (error: any) {
            console.error("Error fetching data:", error);
            setErrorMsg("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---

    const handleResetPassword = async (targetUser: UserProfile) => {
        if (!confirm(`Send password reset email to ${targetUser.email}?`)) return;
        try {
            await sendPasswordReset(targetUser.email);
            alert(`✅ Password reset email sent to ${targetUser.email}.`);
            await logActivity(user.uid, user.displayName || 'Admin', 'update', 'Account', `Triggered password reset for ${targetUser.email}`);
        } catch (error: any) {
            alert(`Failed: ${error.message}`);
        }
    };

    const handleToggleStatus = async (targetUser: UserProfile) => {
        try {
            const currentStatus = targetUser.disabled || false;
            await toggleUserStatus(targetUser.uid, currentStatus);
            setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, disabled: !currentStatus } : u));
            await logActivity(user.uid, user.displayName || 'Admin', 'update', 'Account', `${!currentStatus ? 'Disabled' : 'Enabled'} account for ${targetUser.email}`);
        } catch (error: any) {
            alert("Failed: " + error.message);
        }
    };

    const handleDeleteUser = async (targetUser: UserProfile) => {
        if (!confirm(`Are you sure you want to delete ${targetUser.email}? This cannot be undone.`)) return;
        try {
            await deleteUserProfile(targetUser.uid);
            setUsers(prev => prev.filter(u => u.uid !== targetUser.uid));
            await logActivity(user.uid, user.displayName || 'Admin', 'delete', 'Account', `Deleted user account: ${targetUser.email}`);
        } catch (error: any) {
            alert("Failed: " + error.message);
        }
    };

    const handleDeleteCode = async (id: string) => {
        if (window.confirm("Delete this access code?")) {
            try {
                await deleteAccessCode(id);
                setAccessCodes(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error(error);
                alert("Failed to delete code.");
            }
        }
    };


    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">

                {/* Header & Tabs */}
                <header className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Access Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage user accounts and registration codes.</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <UserIcon className="w-4 h-4 inline mr-2" /> Users
                        </button>
                        <button onClick={() => setActiveTab('codes')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'codes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <KeyIcon className="w-4 h-4 inline mr-2" /> Access Codes
                        </button>

                    </div>
                </header>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center text-red-600 dark:text-red-400 text-sm font-bold">
                        <AlertTriangleIcon className="w-5 h-5 mr-2" /> {errorMsg}
                    </div>
                )}

                {/* Content Areas */}
                {activeTab === 'users' && (
                    <UserTable
                        users={users}
                        isLoading={isLoading}
                        searchQuery={userSearchQuery}
                        onSearchChange={setUserSearchQuery}
                        onCreateUser={() => setIsCreateUserModalOpen(true)}
                        onEditPermissions={(u) => setPermissionModalState({ isOpen: true, targetUser: u })}
                        onResetPassword={handleResetPassword}
                        onToggleStatus={handleToggleStatus}
                        onDeleteUser={handleDeleteUser}
                    />
                )}

                {activeTab === 'codes' && (
                    <AccessCodeList
                        codes={accessCodes}
                        schools={schools}
                        isLoading={isLoading}
                        onCreateCode={() => setIsCreateCodeModalOpen(true)}
                        onDeleteCode={handleDeleteCode}
                        onToggleCode={() => { }}
                    />
                )}

                {/* Resources Tab Removed */}

            </div>

            {/* Modals */}
            <CreateUserModal
                isOpen={isCreateUserModalOpen}
                onClose={() => setIsCreateUserModalOpen(false)}
                onUserCreated={loadData}
                currentUser={user}
                currentUserProfile={userProfile}
                teachers={teachers}
                schools={schools}
            />

            <AccessCodeModal
                isOpen={isCreateCodeModalOpen}
                onClose={() => setIsCreateCodeModalOpen(false)}
                onCodeCreated={loadData}
                currentUserProfile={userProfile}
                schools={schools}
            />

            <PermissionEditorModal
                isOpen={permissionModalState.isOpen}
                onClose={() => setPermissionModalState({ isOpen: false, targetUser: null })}
                targetUser={permissionModalState.targetUser}
                onUpdateUser={(updated) => {
                    setUsers(prev => prev.map(u => u.uid === updated.uid ? updated : u));
                    setPermissionModalState(prev => ({ ...prev, targetUser: updated }));
                }}
            />

        </div>
    );
};

export default AccountInformation;
