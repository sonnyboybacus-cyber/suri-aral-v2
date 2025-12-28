import React, { useState } from 'react';
import { UserProfile, Permission } from '../../../types';
import { PERMISSION_MATRIX } from '../../../config/PermissionMatrix';
import { CAPABILITIES, getCapabilitiesByCategory } from '../../../config/Capabilities';
import { grantPermission, revokePermission, resetPermission, getPermissionStatus } from '../../../services/db/permissions';
import { loadUserProfile } from '../../../services/db/core';
import { ShieldIcon, LockIcon, RefreshIcon, SpinnerIcon } from '../../icons';

interface PermissionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: UserProfile | null;
    onUpdateUser: (updatedProfile: UserProfile) => void;
}

export const PermissionEditorModal: React.FC<PermissionEditorModalProps> = ({
    isOpen,
    onClose,
    targetUser,
    onUpdateUser
}) => {
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen || !targetUser) return null;

    const handleTogglePermission = async (permissionId: Permission, currentValue: boolean | undefined) => {
        setIsSaving(true);
        try {
            const nextState = !currentValue; // Toggle

            if (nextState) {
                await grantPermission(targetUser.uid, permissionId);
            } else {
                // Check Role Default
                const roleDefaults = PERMISSION_MATRIX[targetUser.role] || [];
                const hasByRole = roleDefaults.includes(permissionId);

                if (hasByRole) {
                    await revokePermission(targetUser.uid, permissionId); // Explicitly deny
                } else {
                    await resetPermission(targetUser.uid, permissionId); // Remove override
                }
            }

            // Refresh local state
            const updatedProfile = await loadUserProfile(targetUser.uid);
            if (updatedProfile) {
                onUpdateUser(updatedProfile);
            }

        } catch (e) {
            console.error("Failed to update permission", e);
            alert("Failed to update permission.");
        } finally {
            setIsSaving(false);
        }
    };

    const categories = Array.from(new Set(CAPABILITIES.map(c => c.category)));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <ShieldIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Permission Manager</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Editing capabilities for <span className="font-bold text-slate-700 dark:text-slate-300">{targetUser.displayName}</span> ({targetUser.role})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-6 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-slate-600 dark:text-slate-300">Granted (Explicitly)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-200 dark:bg-indigo-800"></div>
                            <span className="text-slate-600 dark:text-slate-300">Inherited (Role Default)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-slate-600 dark:text-slate-300">Denied (Explicitly)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                            <span className="text-slate-600 dark:text-slate-300">Not Granted</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {categories.map(category => {
                            const allCapabilities = getCapabilitiesByCategory();
                            const caps = allCapabilities[category] || [];
                            if (caps.length === 0) return null;

                            return (
                                <div key={category}>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">{category}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {caps.map(cap => {
                                            const roleDefaults = PERMISSION_MATRIX[targetUser.role] || [];
                                            const isDefault = roleDefaults.includes(cap.id);

                                            // Determine effective status
                                            let status: 'default' | 'granted' | 'denied' | 'none' = 'none';
                                            let isEffective = false;

                                            // Safe access with type assertion or optional chaining
                                            const userPerms = targetUser.permissions as Record<Permission, boolean> | undefined;

                                            if (userPerms?.[cap.id] === true) {
                                                status = 'granted';
                                                isEffective = true;
                                            } else if (userPerms?.[cap.id] === false) {
                                                status = 'denied';
                                                isEffective = false;
                                            } else if (isDefault) {
                                                status = 'default';
                                                isEffective = true;
                                            }

                                            return (
                                                <div
                                                    key={cap.id}
                                                    className={`
                                                        relative p-4 rounded-xl border transition-all duration-200
                                                        ${isEffective
                                                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-sm text-slate-800 dark:text-white">{cap.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            {status === 'granted' && <span className="w-2 h-2 rounded-full bg-green-500" title="Explicitly Granted"></span>}
                                                            {status === 'denied' && <span className="w-2 h-2 rounded-full bg-red-500" title="Explicitly Denied"></span>}
                                                            {status === 'default' && <span className="w-2 h-2 rounded-full bg-indigo-300" title="Inherited from Role"></span>}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 h-8 line-clamp-2">{cap.description}</p>

                                                    <div className="flex items-center justify-between mt-auto">
                                                        <span className="text-[10px] font-mono text-slate-400">{cap.id}</span>
                                                        <button
                                                            disabled={isSaving}
                                                            onClick={() => handleTogglePermission(cap.id, isEffective)}
                                                            className={`
                                                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                                                ${isEffective ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}
                                                                ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                                            `}
                                                        >
                                                            <span
                                                                className={`
                                                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                                    ${isEffective ? 'translate-x-6' : 'translate-x-1'}
                                                                `}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl flex justify-between items-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center">
                        {isSaving && <><SpinnerIcon className="w-3 h-3 animate-spin mr-2" /> Saving changes...</>}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
