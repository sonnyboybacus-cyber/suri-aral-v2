import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { Subject, LearnSAContext } from '../types';
import { saveSubjects, loadSubjects, logActivity, sendNotification } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, SearchIcon, ChevronDownIcon } from './icons';
import { SubjectList } from './subject/views/SubjectList';
import { SubjectFormModal } from './subject/modals/SubjectFormModal';
import { DeleteSubjectModal } from './subject/modals/DeleteSubjectModal';

const initialSubjectState: Omit<Subject, 'id' | 'deletedAt'> = {
    code: '',
    name: '',
    description: '',
    department: '',
    gradeLevel: '',
    classification: undefined,
    track: '',
    strand: '',
    semester: undefined,
    prerequisiteId: '',
    curriculum: []
};

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const TRACKS = ['Academic', 'TVL', 'Sports', 'Arts and Design'];

interface SubjectManagerProps {
    user: firebase.User;
    onLaunchTutor?: (context: LearnSAContext) => void;
}

const SubjectManager = ({ user, onLaunchTutor }: SubjectManagerProps) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [currentSubject, setCurrentSubject] = useState<Omit<Subject, 'id' | 'deletedAt'>>(initialSubjectState);
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

    // Filters
    const [curriculumView, setCurriculumView] = useState<'basic' | 'shs'>('basic');
    const [filterTrack, setFilterTrack] = useState('');
    const [filterSemester, setFilterSemester] = useState('');

    // Delete Modal
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; subjectId: string | null; subjectName: string }>({
        isOpen: false,
        subjectId: null,
        subjectName: ''
    });

    const userName = user.displayName || user.email || 'Unknown User';
    const activeSubjects = useMemo(() => subjects.filter(s => !s.deletedAt), [subjects]);
    const deletedSubjects = useMemo(() => subjects.filter(s => s.deletedAt), [subjects]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const loadedSubjects = await loadSubjects();
                setSubjects(loadedSubjects);
            } catch (error) {
                console.error("Error loading subjects:", error);
                alert("Could not load subjects.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.uid]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSubject.code || !currentSubject.name) {
            alert("Subject Code and Descriptive Title are required.");
            return;
        }

        setIsSaving(true);
        try {
            let updatedSubjects: Subject[];
            let actionType = '';

            const cleanSubjectData = {
                ...currentSubject,
                classification: currentSubject.classification || undefined,
                semester: currentSubject.semester || undefined,
                track: currentSubject.track || '',
                strand: currentSubject.strand || '',
                prerequisiteId: currentSubject.prerequisiteId || ''
            };

            if (editingSubjectId) {
                updatedSubjects = subjects.map(s => s.id === editingSubjectId ? { id: editingSubjectId, ...cleanSubjectData } : s);
                actionType = 'Updated';
            } else {
                const newSubject: Subject = { id: crypto.randomUUID(), ...cleanSubjectData };
                updatedSubjects = [newSubject, ...subjects];
                actionType = 'Created';
            }

            setSubjects(updatedSubjects);

            const now = Date.now();
            const subjectsToSave = updatedSubjects.filter(s => !s.deletedAt || (now - s.deletedAt) < SEVEN_DAYS_IN_MS);

            await saveSubjects(subjectsToSave);
            await logActivity(user.uid, userName, editingSubjectId ? 'update' : 'create', 'Subject', `${actionType} subject: ${currentSubject.code}`);

            sendNotification(user.uid, {
                title: `Subject ${actionType}`,
                message: `${currentSubject.code} has been successfully saved to the database.`,
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

    const handleEdit = (subject: Subject) => {
        setEditingSubjectId(subject.id);
        const { id, deletedAt, ...editableData } = subject;
        setCurrentSubject({
            ...initialSubjectState,
            ...editableData,
            curriculum: editableData.curriculum || []
        });
        setIsFormVisible(true);
    };

    const handleDelete = (subject: Subject) => {
        setDeleteModalState({ isOpen: true, subjectId: subject.id, subjectName: subject.name });
    };

    const executeDelete = () => {
        const { subjectId } = deleteModalState;
        if (subjectId) {
            setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, deletedAt: Date.now() } : s));
        }
        setDeleteModalState({ isOpen: false, subjectId: null, subjectName: '' });
    };

    const handleRestore = (subject: Subject) => {
        setSubjects(prev => prev.map(s => {
            if (s.id === subject.id) {
                const { deletedAt, ...rest } = s;
                return rest;
            }
            return s;
        }));
    };

    const handleSaveToDatabase = async () => {
        setIsSaving(true);
        const now = Date.now();
        const subjectsToSave = subjects.filter(s => !s.deletedAt || (now - s.deletedAt) < SEVEN_DAYS_IN_MS);

        try {
            await saveSubjects(subjectsToSave);
            await logActivity(user.uid, userName, 'update', 'Subject', 'Updated subject master list.');

            if (subjectsToSave.length !== subjects.length) {
                setSubjects(subjectsToSave);
            }

            sendNotification(user.uid, {
                title: 'Subjects Saved',
                message: 'Master list updated successfully.',
                type: 'success'
            });
        } catch (error) {
            console.error("Error saving subjects:", error);
            alert("Failed to save subject data.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNew = () => {
        setEditingSubjectId(null);
        setCurrentSubject(initialSubjectState);
        setIsFormVisible(true);
    };

    const handleCloseForm = () => {
        setIsFormVisible(false);
        setEditingSubjectId(null);
        setCurrentSubject(initialSubjectState);
    };

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans bg-slate-50 dark:bg-slate-900 min-h-screen">
            <SubjectFormModal
                isOpen={isFormVisible}
                editingSubjectId={editingSubjectId}
                currentSubject={currentSubject}
                setCurrentSubject={setCurrentSubject}
                isSaving={isSaving}
                onClose={handleCloseForm}
                onSubmit={handleFormSubmit}
                onLaunchTutor={onLaunchTutor}
            />

            <DeleteSubjectModal
                isOpen={deleteModalState.isOpen}
                subjectName={deleteModalState.subjectName}
                onClose={() => setDeleteModalState({ isOpen: false, subjectId: null, subjectName: '' })}
                onExample={executeDelete}
            />

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">Subject Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Configure curriculum subjects, SHS tracks, and learning competencies.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSaveToDatabase} disabled={isSaving} className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 font-bold text-sm hover:-translate-y-0.5">
                            {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={handleAddNew} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 font-bold text-sm">
                            <PlusIcon className="w-4 h-4 mr-2" /> New Subject
                        </button>
                    </div>
                </header>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                    <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">

                        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl inline-flex">
                            <button
                                onClick={() => setCurriculumView('basic')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${curriculumView === 'basic' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            >
                                Basic Ed (K-10)
                            </button>
                            <button
                                onClick={() => setCurriculumView('shs')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${curriculumView === 'shs' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            >
                                Senior High (11-12)
                            </button>
                        </div>

                        {curriculumView === 'shs' && (
                            <div className="flex gap-3">
                                <div className="relative">
                                    <select
                                        value={filterTrack}
                                        onChange={(e) => setFilterTrack(e.target.value)}
                                        className="appearance-none pl-4 pr-10 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">All Tracks</option>
                                        {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <select
                                        value={filterSemester}
                                        onChange={(e) => setFilterSemester(e.target.value)}
                                        className="appearance-none pl-4 pr-10 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">All Semesters</option>
                                        <option value="1st Semester">1st Sem</option>
                                        <option value="2nd Semester">2nd Sem</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="relative w-full md:w-64">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search subjects..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all outline-none"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        Active Subjects <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">{activeSubjects.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('deleted')}
                        className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'deleted' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        Recycle Bin <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">{deletedSubjects.length}</span>
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                        <span className="text-slate-500 font-medium">Loading Subjects...</span>
                    </div>
                ) : (
                    <SubjectList
                        subjects={subjects}
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRestore={handleRestore}
                        onAddNew={activeTab === 'active' ? handleAddNew : undefined}
                        activeFilters={{
                            view: curriculumView,
                            track: filterTrack,
                            semester: filterSemester
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default SubjectManager;
