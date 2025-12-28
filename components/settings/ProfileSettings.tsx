import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, Teacher } from '../../types';
import { sendNotification } from '../../services/databaseService';
import { SpinnerIcon, MailIcon, XIcon, LogOutIcon } from '../icons';
import { SettingsCard as Card } from './SharedComponents';

interface ProfileSettingsProps {
    user: firebase.User;
    role: UserRole;
    teacherProfile: Teacher | null;
    onUpdateProfile: (data: Teacher) => void; // Update parent state if needed
    onLogout: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, role, teacherProfile: initialTeacherProfile, onUpdateProfile, onLogout }) => {
    // State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Local form state
    const [localProfile, setLocalProfile] = useState<Teacher | null>(initialTeacherProfile);
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');

    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Sync local profile when prop changes (if not editing)
    React.useEffect(() => {
        if (!isEditingProfile && initialTeacherProfile) {
            setLocalProfile(initialTeacherProfile);
        }
    }, [initialTeacherProfile, isEditingProfile]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            if (isEditingProfile) {
                // Update Auth Profile
                const displayName = `${localProfile?.firstName} ${localProfile?.lastName}`;
                await user.updateProfile({ displayName: displayName, photoURL: photoURL });

                // Here we would ideally save the Teacher record too using saveTeacher() from databaseService
                // But for now we rely on the parent or we duplicate the import.
                // Since this is a refactor, I will assume the parent might need to know, OR I import saveTeacher here.
                // Let's import saveTeacher here to be self-contained.
                const { saveTeacher } = await import('../../services/databaseService');
                if (localProfile) {
                    await saveTeacher(user.uid, localProfile);
                }

                setIsEditingProfile(false);
                sendNotification(user.uid, {
                    title: 'Profile Updated',
                    message: 'Your profile details have been saved.',
                    type: 'success'
                });

                // Notify parent to refresh if needed
                if (localProfile) onUpdateProfile(localProfile);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            if (!user.email) throw new Error("User email not found.");

            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);

            alert("Password updated successfully!");
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password update failed:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setPasswordError("Incorrect current password.");
            } else if (error.code === 'auth/weak-password') {
                setPasswordError("Password is too weak.");
            } else if (error.code === 'auth/too-many-requests') {
                setPasswordError("Too many attempts. Please try again later.");
            } else {
                setPasswordError(error.message || "Failed to update password.");
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Profile & Security</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Manage your digital identity.</p>
            </div>

            <Card>
                <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-[6px] border-slate-50 dark:border-slate-800 shadow-2xl transition-transform group-hover:scale-105">
                                {photoURL ? <img src={photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-300">{user.displayName?.charAt(0)}</div>}
                            </div>
                            <div
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-[6px] border-transparent"
                            >
                                <span className="text-white text-xs font-bold uppercase tracking-wide drop-shadow-md">Change</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{localProfile?.firstName || user.displayName} {localProfile?.lastName}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                <MailIcon className="w-4 h-4 opacity-75" />
                                {user.email}
                            </p>
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-2 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg inline-block text-center border border-indigo-100 dark:border-indigo-800">
                                {localProfile?.position || role}
                            </p>
                        </div>
                    </div>

                    <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        {isEditingProfile ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Form Fields */}
                                    {[
                                        { label: 'First Name', field: 'firstName' },
                                        { label: 'Last Name', field: 'lastName' },
                                        { label: 'Middle Name', field: 'middleName' },
                                        { label: 'Extension Name', field: 'extensionName', placeholder: 'e.g. Jr.' },
                                        { label: 'Phone Number', field: 'phoneNumber', type: 'tel' },
                                        { label: 'Position', field: 'position' },
                                        { label: 'Employee ID', field: 'employeeId' },
                                    ].map((item: any) => (
                                        <div key={item.field} className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{item.label}</label>
                                            <input
                                                type={item.type || 'text'}
                                                placeholder={item.placeholder || ''}
                                                value={(localProfile as any)?.[item.field] || ''}
                                                onChange={e => setLocalProfile(prev => prev ? ({ ...prev, [item.field]: e.target.value }) : null)}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    ))}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Photo URL</label>
                                        <input
                                            type="text"
                                            value={photoURL}
                                            onChange={e => setPhotoURL(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                    <button onClick={() => setIsEditingProfile(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600">Cancel</button>
                                    <button onClick={handleSaveProfile} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex justify-center items-center">
                                        {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2" /> : null}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                    {[
                                        { label: 'Full Name', value: `${localProfile?.firstName} ${localProfile?.middleName} ${localProfile?.lastName} ${localProfile?.extensionName}` },
                                        { label: 'Employee ID', value: localProfile?.employeeId, mono: true },
                                        { label: 'Contact Phone', value: localProfile?.phoneNumber, mono: true },
                                        { label: 'Position', value: localProfile?.position || role }
                                    ].map((item) => (
                                        <div key={item.label} className="pb-4 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                            <p className={`font-bold text-slate-800 dark:text-slate-200 text-lg ${item.mono ? 'font-mono' : ''}`}>
                                                {item.value || <span className="opacity-50 italic">Not set</span>}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button onClick={() => setIsEditingProfile(true)} className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">Edit Profile Details</button>
                                    <button onClick={() => setShowPasswordModal(true)} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-transparent hover:border-indigo-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm hover:-translate-y-0.5">Change Password</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card title="Sign Out">
                <p className="text-sm text-slate-500 mb-6 font-medium">Securely log out of your account on this device.</p>
                <button onClick={onLogout} className="w-full py-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all shadow-sm hover:shadow-md">
                    <LogOutIcon className="w-5 h-5" /> Sign Out of Account
                </button>
            </Card>

            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/10 ring-1 ring-black/5">
                        <div className="p-8 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ensure your account stays secure.</p>
                                </div>
                                <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm text-slate-400 hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleChangePassword} className="space-y-6">
                                {passwordError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl text-sm font-medium flex items-start border border-red-100 dark:border-red-800/50">
                                        <span className="mr-2 text-lg">⚠️</span> {passwordError}
                                    </div>
                                )}
                                {[
                                    { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
                                    { label: 'New Password', value: newPassword, setter: setNewPassword },
                                    { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword },
                                ].map(f => (
                                    <div key={f.label}>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{f.label}</label>
                                        <input type="password" value={f.value} onChange={e => f.setter(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" required />
                                    </div>
                                ))}
                                <div className="pt-4">
                                    <button type="submit" disabled={isUpdatingPassword} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none flex justify-center items-center text-lg">
                                        {isUpdatingPassword ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : null}
                                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
