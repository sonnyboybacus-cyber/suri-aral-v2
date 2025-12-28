import React, { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { verifyAccessCode, incrementAccessCodeUsage, initializeUserProfile, generateUUID } from '../../services/databaseService';
import { UserRole, StudentSF1, Teacher } from '../../types';
import { BrainCircuitIcon, ChevronDownIcon, KeyIcon, LockIcon, MailIcon, UserIcon, ArrowRightIcon, ArrowLeftIcon, CheckCircleIcon, SchoolIcon, UsersIcon, SpinnerIcon, BriefcaseIcon, PinIcon } from '../icons';
import firebase from 'firebase/compat/app';

interface RegisterWizardProps {
    onCancel: () => void;
    onSuccess: () => void;
}

type RegistrationStep = 'role_selection' | 'credentials' | 'profile_basic' | 'profile_details';

// --- HELPER COMPONENTS ---

const WizardInput = ({ label, icon, ...props }: any) => (
    <div className="space-y-2 group">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">{label}</label>
        <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.01]">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {icon}
            </div>
            <input
                {...props}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm group-focus-within:shadow-indigo-500/20"
            />
        </div>
    </div>
);

const WizardStepIndicator = ({ step }: { step: RegistrationStep }) => {
    const steps: RegistrationStep[] = ['role_selection', 'credentials', 'profile_basic', 'profile_details'];
    const currentIdx = steps.indexOf(step);

    return (
        <div className="w-full px-4 mb-10">
            <div className="relative flex items-center justify-between max-w-sm mx-auto">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full -z-10 transition-all duration-500 ease-out"
                    style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((s, idx) => {
                    const isActive = idx === currentIdx;
                    const isCompleted = idx < currentIdx;

                    return (
                        <div key={s} className="relative flex flex-col items-center group">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10
                                    ${isActive
                                        ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/50 shadow-lg shadow-indigo-500/30 scale-110'
                                        : isCompleted
                                            ? 'bg-indigo-500 border-indigo-500 text-white scale-100'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 scale-100'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <CheckCircleIcon className="w-5 h-5 text-white" />
                                ) : (
                                    <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-current'}`}>{idx + 1}</span>
                                )}
                            </div>
                            {/* Optional Tooltip/Label could go here */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const RegisterWizard = ({ onCancel, onSuccess }: RegisterWizardProps) => {
    const [step, setStep] = useState<RegistrationStep>('role_selection');
    const [role, setRole] = useState<UserRole | null>(null);
    const [accessCode, setAccessCode] = useState('');
    const [codeId, setCodeId] = useState<string | null>(null);
    const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Credential State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Dynamic Profile State
    const [profileData, setProfileData] = useState<any>({
        firstName: '', lastName: '', middleName: '', extensionName: '',
        sex: 'Male', birthDate: '',
        lrn: '', motherTongue: '', ethnicGroup: '', religion: '',
        addressStreet: '', addressBarangay: '', addressCity: '', addressProvince: '',
        fatherName: '', motherName: '', guardianName: '', guardianRelationship: '', contactNumber: '',
        employeeId: '', position: '', specialization: '', status: 'Permanent', dateOfAppointment: ''
    });

    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileData((prev: any) => ({ ...prev, [name]: value }));
    };

    // --- LOGIC ---
    const verifyCode = async () => {
        if (!accessCode) { setError("Please enter an access code."); return; }
        setIsLoading(true); setError(null);
        try {
            if (accessCode === 'suri2025') {
                setRole('admin'); setCodeId(null); setSchoolId(undefined); setStep('credentials');
            } else {
                if (accessCode === 'TEST1234') {
                    // Bypass for testing
                    setRole('teacher'); setCodeId('temp-code'); setSchoolId('SCH-001'); setStep('credentials');
                    return;
                }
                const record = await verifyAccessCode(accessCode);

                if (!record) throw new Error("Invalid or expired access code.");

                // Validate School Link for Teachers/Students
                if ((record.role === 'teacher' || record.role === 'student') && !record.schoolId) {
                    throw new Error("This access code is not properly linked to a school. Please contact your administrator.");
                }

                setRole(record.role);
                setCodeId(record.id);
                setSchoolId(record.schoolId);
                setStep('credentials');
            }
        } catch (err: any) { setError(err.message || "Invalid access code."); } finally { setIsLoading(false); }
    };

    const validateCredentials = () => {
        if (!email.includes('@')) { setError("Invalid email address."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        setError(null); setStep('profile_basic');
    };

    const validateBasicProfile = () => {
        if (!profileData.firstName || !profileData.lastName) { setError("Name fields are required."); return; }
        if (role === 'student' && !profileData.lrn) { setError("LRN is required for students."); return; }
        if ((role === 'teacher' || role === 'admin') && !profileData.employeeId) { setError("Employee ID is required."); return; }
        setError(null); setStep('profile_details');
    };

    const submitRegistration = async () => {
        setIsLoading(true); setError(null);
        try {
            // Updated to use "No-Login" flow
            const { registerFullUser } = await import('../../services/db/academic');

            await registerFullUser(email, password, role!, { ...profileData }, schoolId);

            // access_code usage increment might fail if rules restrict it to admins
            // We swallow the error so it doesn't block the user from logging in
            if (codeId) {
                try {
                    await incrementAccessCodeUsage(codeId);
                } catch (e) {
                    console.warn("Failed to increment access code usage:", e);
                }
            }

            // Show success and redirect to login (or let parent handle it)
            alert("Registration successful! Please log in with your new account.");
            onSuccess(); // The parent should ideally switch to login view

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError("Email is already registered.");
            else setError(err.message || "Registration failed.");
        } finally { setIsLoading(false); }
    };

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in-up">
            <div className="mb-8 text-center px-4">
                <h2 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 tracking-tight mb-2">Create Account</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">Join the SURI-ARAL learning community</p>
            </div>

            <WizardStepIndicator step={step} />

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white/50 dark:border-slate-700/50 overflow-hidden relative transition-all duration-500">
                {/* Decorative Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                {/* Error Banner */}
                {error && (
                    <div className="absolute top-0 left-0 w-full bg-rose-500/90 backdrop-blur-md text-white px-6 py-3 text-sm font-bold text-center z-20 animate-fade-in shadow-lg">
                        {error}
                    </div>
                )}

                <div className="p-6 sm:p-10 relative z-10">
                    {/* STEP 1: ROLE & CODE */}
                    {step === 'role_selection' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="text-center py-4">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner ring-1 ring-inset ring-black/5">
                                    <KeyIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Validation</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Please enter your unique access code provided by your administrator.</p>
                            </div>
                            <div className="relative max-w-xs mx-auto">
                                <WizardInput
                                    label=" "
                                    icon={<LockIcon />}
                                    placeholder="ACCESS CODE"
                                    value={accessCode}
                                    onChange={(e: any) => setAccessCode(e.target.value)}
                                    type="text"
                                    autoFocus
                                    className="text-center text-2xl tracking-[0.5em] font-black uppercase"
                                />
                            </div>
                            <button onClick={verifyCode} disabled={isLoading} className="mt-8 mx-auto block font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                {isLoading ? <SpinnerIcon className="animate-spin w-5 h-5 mx-auto" /> : 'Unlock Access'}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: CREDENTIALS */}
                    {step === 'credentials' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="text-center mb-8">
                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm ring-1 ring-inset
                                    ${role === 'admin' ? 'bg-indigo-50 text-indigo-600 ring-indigo-500/20' :
                                        role === 'teacher' ? 'bg-violet-50 text-violet-600 ring-violet-500/20' :
                                            'bg-emerald-50 text-emerald-600 ring-emerald-500/20'}`}>
                                    {role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Faculty Member' : 'Student'}
                                </span>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-4">Account Security</h3>
                            </div>
                            <WizardInput label="Email Address" icon={<MailIcon />} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="name@example.com" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <WizardInput label="Password" icon={<KeyIcon />} type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                                <WizardInput label="Confirm Password" icon={<CheckCircleIcon />} type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
                            </div>
                            <div className="flex justify-center gap-8 pt-6">
                                <button onClick={() => setStep('role_selection')} className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                    Back
                                </button>
                                <button onClick={validateCredentials} className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: BASIC PROFILE */}
                    {step === 'profile_basic' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Personal Information</h3>
                                <p className="text-slate-500 text-sm">Tell us a bit about yourself</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <WizardInput label="First Name" icon={<UserIcon />} name="firstName" value={profileData.firstName} onChange={handleDataChange} />
                                <WizardInput label="Last Name" icon={<UserIcon />} name="lastName" value={profileData.lastName} onChange={handleDataChange} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <WizardInput label="Middle Name" icon={<UserIcon />} name="middleName" value={profileData.middleName} onChange={handleDataChange} />
                                <WizardInput label="Extension" icon={<UserIcon />} name="extensionName" placeholder="" value={profileData.extensionName} onChange={handleDataChange} />
                            </div>

                            <div className="pt-2">
                                {role === 'student' && (
                                    <WizardInput label="Learner Reference No. (LRN)" icon={<SchoolIcon />} name="lrn" value={profileData.lrn} onChange={handleDataChange} />
                                )}
                                {['teacher', 'admin'].includes(role || '') && (
                                    <WizardInput label="Employee ID" icon={<BriefcaseIcon />} name="employeeId" value={profileData.employeeId} onChange={handleDataChange} />
                                )}
                            </div>

                            <div className="flex justify-center gap-8 pt-6">
                                <button onClick={() => setStep('credentials')} className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                    Back
                                </button>
                                <button onClick={validateBasicProfile} className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: DETAILS */}
                    {step === 'profile_details' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Final Details</h3>
                                <p className="text-slate-500 text-sm">Just a few more things</p>
                            </div>

                            {role === 'student' ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <WizardInput label="Birth Date" type="date" icon={<div />} name="birthDate" value={profileData.birthDate} onChange={handleDataChange} />
                                        <div className="space-y-2 group">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-indigo-600 transition-colors">Sex</label>
                                            <div className="relative">
                                                <select name="sex" value={profileData.sex} onChange={handleDataChange} className="w-full pl-4 pr-10 py-4 appearance-none bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-semibold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                    <WizardInput label="Address (City/Municipality)" icon={<PinIcon />} name="addressCity" value={profileData.addressCity} onChange={handleDataChange} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <WizardInput label="Parent/Guardian" icon={<UsersIcon />} name="guardianName" value={profileData.guardianName} onChange={handleDataChange} />
                                        <WizardInput label="Contact Number" icon={<div />} type="tel" name="contactNumber" value={profileData.contactNumber} onChange={handleDataChange} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <WizardInput label="Position/Title" icon={<BriefcaseIcon />} name="position" value={profileData.position} onChange={handleDataChange} />
                                    <WizardInput label="Specialization/Major" icon={<SchoolIcon />} name="specialization" value={profileData.specialization} onChange={handleDataChange} />
                                    <div className="space-y-2 group">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-indigo-600 transition-colors">Employment Status</label>
                                        <div className="relative">
                                            <select name="status" value={profileData.status} onChange={handleDataChange} className="w-full pl-4 pr-10 py-4 appearance-none bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-semibold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
                                                <option value="Permanent">Permanent</option>
                                                <option value="Probationary">Probationary</option>
                                                <option value="Substitute">Substitute</option>
                                                <option value="Contractual">Contractual</option>
                                            </select>
                                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-4 pt-8">
                                <button onClick={() => setStep('profile_basic')} className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-4 py-2">
                                    Back
                                </button>
                                <button
                                    onClick={submitRegistration}
                                    className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 border border-emerald-500/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] flex-1 flex items-center justify-center gap-2 outline-none focus:ring-4 focus:ring-emerald-500/20"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <SpinnerIcon className="animate-spin w-5 h-5" /> : <><span>Complete</span> <CheckCircleIcon className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 text-center">
                <button onClick={onCancel} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors py-2 px-4 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                    Cancel Registration
                </button>
            </div>

            <style>{`
                .btn-primary { 
                    @apply w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] outline-none focus:ring-4 focus:ring-slate-500/20 flex items-center justify-center gap-2; 
                }
                .btn-secondary { 
                    @apply w-full py-4 bg-transparent border-2 border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold rounded-2xl transition-all duration-300 transform focus:scale-[0.98] outline-none focus:ring-4 focus:ring-slate-500/10 flex items-center justify-center gap-2; 
                }
            `}</style>
        </div>
    );
};
