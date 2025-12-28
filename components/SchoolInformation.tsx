import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { SchoolInfo, Teacher } from '../types';
import { saveSchools, loadSchools, loadTeachers, logActivity, sendNotification } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon } from './icons';
import { SchoolList } from './school/views/SchoolList';
import { SchoolFormModal } from './school/modals/SchoolFormModal';
import { DeleteSchoolModal } from './school/modals/DeleteSchoolModal';

const initialSchoolState: Omit<SchoolInfo, 'id' | 'deletedAt'> = {
    schoolId: '',
    schoolName: '',
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    curriculum: 'K to 12',
    gradeLevels: '',
    district: '',
    division: '',
    region: '',
    psds: '',
    principalId: '',
    assignedTeacherIds: [],
    rooms: [],
    location: { lat: 14.5995, lng: 120.9842, address: 'Manila, Philippines' }
};

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

interface SchoolInformationProps {
    user: firebase.User;
}

const SchoolInformation: React.FC<SchoolInformationProps> = ({ user }) => {
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [currentSchool, setCurrentSchool] = useState<Omit<SchoolInfo, 'id' | 'deletedAt'>>(initialSchoolState);
    const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; schoolId: string | null; schoolName: string }>({
        isOpen: false,
        schoolId: null,
        schoolName: ''
    });

    const userName = user.displayName || user.email || 'Unknown User';
    const activeSchools = useMemo(() => schools.filter(s => !s.deletedAt), [schools]);
    const deletedSchools = useMemo(() => schools.filter(s => s.deletedAt), [schools]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [loadedSchools, loadedTeachers] = await Promise.all([
                    loadSchools(user.uid),
                    loadTeachers(user.uid),
                ]);
                setSchools(loadedSchools.map(s => ({ ...s, assignedTeacherIds: s.assignedTeacherIds || [], rooms: s.rooms || [] })));
                setTeachers(loadedTeachers.filter(t => !t.deletedAt));
            } catch (error) {
                console.error("Error loading school data:", error);
                alert("Could not load necessary data for school management.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.uid]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSchool.schoolName || !currentSchool.schoolId) {
            alert("School ID and School Name are required.");
            return;
        }

        setIsSaving(true);
        try {
            let updatedSchools: SchoolInfo[];
            let actionType = '';

            if (editingSchoolId) {
                updatedSchools = schools.map(s => s.id === editingSchoolId ? { id: editingSchoolId, ...currentSchool } : s);
                actionType = 'Updated';
            } else {
                const newSchool: SchoolInfo = { id: crypto.randomUUID(), ...currentSchool };
                updatedSchools = [newSchool, ...schools];
                actionType = 'Created';
            }

            setSchools(updatedSchools);

            const now = Date.now();
            const schoolsToSave = updatedSchools.filter(s => !s.deletedAt || (now - s.deletedAt) < SEVEN_DAYS_IN_MS);

            await saveSchools(user.uid, schoolsToSave);
            await logActivity(user.uid, userName, editingSchoolId ? 'update' : 'create', 'School', `${actionType} school: ${currentSchool.schoolName}`);

            sendNotification(user.uid, {
                title: `School ${actionType}`,
                message: `${currentSchool.schoolName} has been successfully saved to the database.`,
                type: 'success'
            });

            handleCloseForm();
        } catch (error) {
            console.error("Auto-save failed:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (school: SchoolInfo) => {
        setEditingSchoolId(school.id);
        const { id, deletedAt, ...editableData } = school;
        setCurrentSchool({
            ...initialSchoolState,
            ...editableData,
            rooms: editableData.rooms || [],
            location: editableData.location || initialSchoolState.location
        });
        setIsFormVisible(true);
    };

    const handleDelete = (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        if (school) {
            setDeleteModalState({ isOpen: true, schoolId: schoolId, schoolName: school.schoolName });
        }
    };

    const executeDelete = () => {
        const { schoolId } = deleteModalState;
        if (schoolId) {
            setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, deletedAt: Date.now() } : s));
        }
        setDeleteModalState({ isOpen: false, schoolId: null, schoolName: '' });
    };

    const handleRestore = (schoolId: string) => {
        setSchools(prev => prev.map(s => {
            if (s.id === schoolId) {
                const { deletedAt, ...rest } = s;
                return rest;
            }
            return s;
        }));
    };

    const handleSaveToDatabase = async () => {
        setIsSaving(true);
        const now = Date.now();
        const schoolsToSave = schools.filter(s => !s.deletedAt || (now - s.deletedAt) < SEVEN_DAYS_IN_MS);

        try {
            await saveSchools(user.uid, schoolsToSave);
            await logActivity(user.uid, userName, 'update', 'School', 'Updated school master list.');

            if (schoolsToSave.length !== schools.length) {
                setSchools(schoolsToSave);
                alert("School data saved successfully! Expired records have been permanently deleted.");
            } else {
                alert("School data saved successfully!");
            }
        } catch (error) {
            console.error("Error saving schools:", error);
            alert("Failed to save school data. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNew = () => {
        setEditingSchoolId(null);
        setCurrentSchool(initialSchoolState);
        setIsFormVisible(true);
    };

    const handleCloseForm = () => {
        setIsFormVisible(false);
        setEditingSchoolId(null);
        setCurrentSchool(initialSchoolState);
    };

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans bg-slate-50 dark:bg-slate-900 min-h-screen">
            <style>{`.input-field { background-color: #f8fafc; border-color: #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: #0f172a; } .dark .input-field { background-color: #334155; border-color: #475569; color: #e2e8f0; }`}</style>

            <SchoolFormModal
                isOpen={isFormVisible}
                editingSchoolId={editingSchoolId}
                currentSchool={currentSchool}
                setCurrentSchool={setCurrentSchool}
                teachers={teachers}
                isSaving={isSaving}
                onClose={handleCloseForm}
                onSubmit={handleFormSubmit}
            />

            <DeleteSchoolModal
                isOpen={deleteModalState.isOpen}
                schoolName={deleteModalState.schoolName}
                onClose={() => setDeleteModalState({ isOpen: false, schoolId: null, schoolName: '' })}
                onExample={executeDelete}
            />

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">School Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Manage institutional profiles, facilities, and faculty assignment.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSaveToDatabase} disabled={isSaving} className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 font-bold text-sm hover:-translate-y-0.5">
                            {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={handleAddNew} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 font-bold text-sm">
                            <PlusIcon className="w-4 h-4 mr-2" /> New School
                        </button>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 dark:border-slate-700 mb-8 pb-1 gap-4">
                    <nav className="flex gap-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Active Schools <span className="ml-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{activeSchools.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('deleted')}
                            className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'deleted' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Recycle Bin <span className="ml-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{deletedSchools.length}</span>
                        </button>
                    </nav>

                    <div className="relative w-full md:w-72 mb-2 md:mb-0">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name or ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium shadow-sm"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {/* Assuming SearchIcon is imported properly or can be used from the sub-components, but better to import it here if used directly in main file */}
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                        <span className="text-slate-500 font-medium">Loading Schools...</span>
                    </div>
                ) : (
                    <SchoolList
                        schools={schools}
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                        onEdit={handleEdit}
                        onDelete={(id) => handleDelete(id)}
                        onRestore={(id) => handleRestore(id)}
                        onAddNew={activeTab === 'active' ? handleAddNew : undefined}
                    />
                )}
            </div>
        </div>
    );
};

export default SchoolInformation;