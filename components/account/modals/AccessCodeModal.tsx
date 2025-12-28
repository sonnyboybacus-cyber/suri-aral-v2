import React, { useState } from 'react';
import { UserRole, UserProfile, SchoolInfo } from '../../../types';
import { createAccessCode } from '../../../services/db/core';
import { PlusIcon, RefreshIcon, KeyIcon } from '../../icons';
import firebase from 'firebase/compat/app';

interface AccessCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCodeCreated: () => void;
    currentUserProfile: UserProfile | null;
    schools: SchoolInfo[];
}

export const AccessCodeModal: React.FC<AccessCodeModalProps> = ({
    isOpen,
    onClose,
    onCodeCreated,
    currentUserProfile,
    schools
}) => {
    const [newCode, setNewCode] = useState({
        code: '',
        role: 'student' as UserRole,
        label: '',
        duration: '7', // Default 7 days
        schoolId: ''
    });

    if (!isOpen) return null;

    const generateRandomCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCode(prev => ({ ...prev, code: result }));
    };

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode.code || !newCode.label) {
            alert("Code and Label are required.");
            return;
        }

        if (newCode.role !== 'admin' && !newCode.schoolId && currentUserProfile?.role === 'admin') {
            // If admin is creating non-admin code, force school selection
            // If ICT coord, schoolId is auto-assigned below
            alert("Please select a school for this access code.");
            return;
        }

        let expiresAt: number | undefined;
        if (newCode.duration !== 'never') {
            const days = parseInt(newCode.duration);
            expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
        }

        try {
            await createAccessCode({
                code: newCode.code,
                role: newCode.role,
                label: newCode.label,
                active: true,
                expiresAt: expiresAt,
                schoolId: (currentUserProfile?.role === 'ict_coordinator') ? currentUserProfile.schoolId : (newCode.role !== 'admin' ? newCode.schoolId : undefined)
            });
            alert("Access code created successfully!");
            setNewCode({ code: '', role: 'student', label: '', duration: '7', schoolId: '' });
            onCodeCreated();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create access code.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <KeyIcon className="w-5 h-5 text-indigo-500" />
                        Generate Access Code
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleCreateCode} className="p-6 space-y-4">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Role</label>
                        <select
                            value={newCode.role}
                            onChange={(e) => setNewCode({ ...newCode, role: e.target.value as UserRole })}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="parent">Parent</option>
                            <option value="principal">Principal</option>
                            <option value="ict_coordinator">ICT Coordinator</option>
                        </select>
                    </div>

                    {/* School Selection (If Admin) */}
                    {currentUserProfile?.role === 'admin' && newCode.role !== 'admin' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign School</label>
                            <select
                                value={newCode.schoolId}
                                onChange={(e) => setNewCode({ ...newCode, schoolId: e.target.value })}
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

                    {/* Label */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label / Description</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Grade 10 - Section A"
                            value={newCode.label}
                            onChange={(e) => setNewCode({ ...newCode, label: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Code Generation */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Code</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                required
                                value={newCode.code}
                                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base font-bold tracking-widest text-center focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                placeholder="XXXXXX"
                            />
                            <button
                                type="button"
                                onClick={generateRandomCode}
                                className="px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                                title="Randomize"
                            >
                                <RefreshIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiration</label>
                        <select
                            value={newCode.duration}
                            onChange={(e) => setNewCode({ ...newCode, duration: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="1">24 Hours</option>
                            <option value="3">3 Days</option>
                            <option value="7">7 Days</option>
                            <option value="30">30 Days</option>
                            <option value="never">Never Expires</option>
                        </select>
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
                            className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md shadow-indigo-500/20 transition-transform active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create Code
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
