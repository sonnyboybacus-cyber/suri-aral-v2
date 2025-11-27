
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Subject, QuarterUnit, WeeklyUnit, LearningCompetency } from '../types';
import { saveSubjects, loadSubjects, logActivity, sendNotification } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, SearchIcon, BookOpenIcon, FilterIcon, ChevronDownIcon, CalendarIcon, FileTextIcon, CheckCircleIcon } from './icons';
import { UndoIcon } from './UndoIcon';

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

const ITEMS_PER_PAGE = 12;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const TRACKS = ['Academic', 'TVL', 'Sports', 'Arts and Design'];
const STRANDS_ACADEMIC = ['STEM', 'ABM', 'HUMSS', 'GAS'];
const STRANDS_TVL = ['ICT', 'Home Economics', 'Agri-Fishery', 'Industrial Arts'];
const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

const SubjectManager = ({ user }: { user: User }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<Omit<Subject, 'id' | 'deletedAt'>>(initialSubjectState);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  // Modal Tabs
  const [modalTab, setModalTab] = useState<'general' | 'curriculum'>('general');
  
  // Curriculum Editor State
  const [activeQuarter, setActiveQuarter] = useState<string>('1st Quarter');
  const [editingWeek, setEditingWeek] = useState<WeeklyUnit | null>(null); // If set, we show the week editor

  // New SHS Filters
  const [curriculumView, setCurriculumView] = useState<'basic' | 'shs'>('basic'); // Basic Ed vs SHS
  const [filterTrack, setFilterTrack] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const userName = user.displayName || user.email || 'Unknown User';

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; subjectId: string | null; subjectName: string }>({
    isOpen: false,
    subjectId: null,
    subjectName: ''
  });

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

  const getTimeRemaining = (deletedAt?: number): string => {
    if (!deletedAt) return "";
    const now = Date.now();
    const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentSubject(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject.code || !currentSubject.name) {
      alert("Subject Code and Descriptive Title are required.");
      return;
    }

    if (editingSubjectId) {
      setSubjects(prev => prev.map(s => s.id === editingSubjectId ? { id: editingSubjectId, ...currentSubject } : s));
      sendNotification(user.uid, {
          title: 'Subject Updated',
          message: `Changes staged for ${currentSubject.code}. Don't forget to save.`,
          type: 'info'
      });
    } else {
      const newSubject: Subject = { id: crypto.randomUUID(), ...currentSubject };
      setSubjects(prev => [newSubject, ...prev]);
      sendNotification(user.uid, {
          title: 'Subject Added',
          message: `${currentSubject.code} added to list.`,
          type: 'success'
      });
    }
    handleCloseForm();
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    const { id, deletedAt, ...editableData } = subject;
    setCurrentSubject({
        ...initialSubjectState,
        ...editableData,
        curriculum: editableData.curriculum || [] // Ensure array exists
    });
    setModalTab('general');
    setIsFormVisible(true);
  };

  const handleDelete = (subject: Subject) => {
    setDeleteModalState({
        isOpen: true,
        subjectId: subject.id,
        subjectName: subject.name
    });
  };

  const executeDelete = () => {
    const { subjectId } = deleteModalState;
    if (subjectId) {
        setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, deletedAt: Date.now() } : s));
    }
    setDeleteModalState({ isOpen: false, subjectId: null, subjectName: '' });
  };
  
  const handleRestore = (subjectId: string) => {
    setSubjects(prev => prev.map(s => {
        if (s.id === subjectId) {
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
      
      if(subjectsToSave.length !== subjects.length) {
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
    setModalTab('general');
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingSubjectId(null);
    setCurrentSubject(initialSubjectState);
    setEditingWeek(null);
  };

  // --- CURRICULUM MANAGEMENT LOGIC ---

  const getCurrentQuarterData = () => {
      return currentSubject.curriculum?.find(q => q.quarter === activeQuarter) || { quarter: activeQuarter, weeks: [] };
  };

  const handleAddWeek = () => {
      const newWeek: WeeklyUnit = {
          id: crypto.randomUUID(),
          orderIndex: (getCurrentQuarterData().weeks.length || 0) + 1,
          weekLabel: `Week ${(getCurrentQuarterData().weeks.length || 0) + 1}`,
          contentTopic: '',
          contentStandard: '',
          performanceStandard: '',
          competencies: []
      };
      setEditingWeek(newWeek);
  };

  const handleEditWeek = (week: WeeklyUnit) => {
      setEditingWeek({ ...week });
  };

  const handleDeleteWeek = (weekId: string) => {
      if (!confirm("Delete this week and its competencies?")) return;
      
      setCurrentSubject(prev => {
          const updatedCurriculum = [...(prev.curriculum || [])];
          const qIndex = updatedCurriculum.findIndex(q => q.quarter === activeQuarter);
          if (qIndex > -1) {
              updatedCurriculum[qIndex].weeks = updatedCurriculum[qIndex].weeks.filter(w => w.id !== weekId);
          }
          return { ...prev, curriculum: updatedCurriculum };
      });
  };

  const handleSaveWeek = () => {
      if (!editingWeek) return;
      if (!editingWeek.weekLabel || !editingWeek.contentTopic) {
          alert("Week Label and Content Topic are required.");
          return;
      }
      if (editingWeek.competencies.length === 0) {
          alert("Please add at least one competency.");
          return;
      }

      setCurrentSubject(prev => {
          let updatedCurriculum = [...(prev.curriculum || [])];
          let qIndex = updatedCurriculum.findIndex(q => q.quarter === activeQuarter);
          
          if (qIndex === -1) {
              updatedCurriculum.push({ quarter: activeQuarter, weeks: [] });
              qIndex = updatedCurriculum.length - 1;
          }

          const wIndex = updatedCurriculum[qIndex].weeks.findIndex(w => w.id === editingWeek.id);
          if (wIndex > -1) {
              updatedCurriculum[qIndex].weeks[wIndex] = editingWeek;
          } else {
              updatedCurriculum[qIndex].weeks.push(editingWeek);
          }
          
          // Sort by order index
          updatedCurriculum[qIndex].weeks.sort((a, b) => a.orderIndex - b.orderIndex);

          return { ...prev, curriculum: updatedCurriculum };
      });
      
      setEditingWeek(null);
  };

  const handleAddCompetency = () => {
      if (!editingWeek) return;
      setEditingWeek(prev => ({
          ...prev!,
          competencies: [...prev!.competencies, { description: '', code: '' }]
      }));
  };

  const handleCompetencyChange = (index: number, field: keyof LearningCompetency, value: string) => {
      if (!editingWeek) return;
      const updated = [...editingWeek.competencies];
      updated[index] = { ...updated[index], [field]: value };
      setEditingWeek(prev => ({ ...prev!, competencies: updated }));
  };

  const handleRemoveCompetency = (index: number) => {
      if (!editingWeek) return;
      const updated = editingWeek.competencies.filter((_, i) => i !== index);
      setEditingWeek(prev => ({ ...prev!, competencies: updated }));
  };

  // --- END CURRICULUM LOGIC ---

  const isSHS = (grade: string) => {
      return grade === 'Grade 11' || grade === 'Grade 12' || grade === 'Senior High';
  };

  const activeSubjects = useMemo(() => subjects.filter(s => !s.deletedAt), [subjects]);
  const deletedSubjects = useMemo(() => subjects.filter(s => s.deletedAt), [subjects]);

  const filteredSubjects = useMemo(() => {
    const sourceList = activeTab === 'active' ? activeSubjects : deletedSubjects;
    
    // 1. Filter by Curriculum Level (JHS/Elem vs SHS)
    let filtered = sourceList.filter(s => {
        const isSubjectSHS = isSHS(s.gradeLevel);
        return curriculumView === 'shs' ? isSubjectSHS : !isSubjectSHS;
    });

    // 2. Apply SHS specific filters
    if (curriculumView === 'shs') {
        if (filterTrack) {
            filtered = filtered.filter(s => s.track === filterTrack || s.classification === 'Core' || s.classification === 'Applied');
        }
        if (filterSemester) {
            filtered = filtered.filter(s => s.semester === filterSemester);
        }
    }

    // 3. Apply Search Query
    if (searchQuery.trim()) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(s =>
            s.code.toLowerCase().includes(lowercasedQuery) ||
            s.name.toLowerCase().includes(lowercasedQuery) ||
            s.department.toLowerCase().includes(lowercasedQuery) ||
            (s.gradeLevel && s.gradeLevel.toLowerCase().includes(lowercasedQuery))
        );
    }

    return filtered;
  }, [activeSubjects, deletedSubjects, activeTab, searchQuery, curriculumView, filterTrack, filterSemester]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab, curriculumView, filterTrack, filterSemester]);

  const totalPages = Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE);
  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubjects, currentPage]);

  const renderForm = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up max-h-[90vh]">
            
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                        {editingSubjectId ? `Edit Subject: ${currentSubject.code}` : 'Add New Subject'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage curriculum details and guide.</p>
                </div>
                <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                <button 
                    onClick={() => setModalTab('general')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'general' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    General Information
                </button>
                <button 
                    onClick={() => setModalTab('curriculum')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'curriculum' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Curriculum Guide
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {modalTab === 'general' ? (
                    <div className="p-8 space-y-6">
                        {/* BASIC INFO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Subject Code <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="code" 
                                    value={currentSubject.code} 
                                    onChange={handleInputChange} 
                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" 
                                    placeholder="e.g. MATH10"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Grade Level</label>
                                <select
                                    name="gradeLevel"
                                    value={currentSubject.gradeLevel}
                                    onChange={handleInputChange}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                                >
                                    <option value="">-- Select Grade Level --</option>
                                    <option value="Kindergarten">Kindergarten</option>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(grade => (
                                        <option key={grade} value={`Grade ${grade}`}>{`Grade ${grade}`}</option>
                                    ))}
                                    <optgroup label="Senior High School">
                                        <option value="Grade 11">Grade 11</option>
                                        <option value="Grade 12">Grade 12</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Descriptive Title <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                name="name" 
                                value={currentSubject.name} 
                                onChange={handleInputChange} 
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                placeholder="e.g. Statistics and Probability"
                                required 
                            />
                        </div>

                        {/* SHS CONFIGURATION PANEL */}
                        {isSHS(currentSubject.gradeLevel) && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                                <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center uppercase tracking-wide">
                                    <BookOpenIcon className="w-4 h-4 mr-2" /> Senior High Configuration
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classification</label>
                                        <select 
                                            name="classification" 
                                            value={currentSubject.classification} 
                                            onChange={handleInputChange} 
                                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                        >
                                            <option value="">-- Select Type --</option>
                                            <option value="Core">Core Subject</option>
                                            <option value="Applied">Applied Subject</option>
                                            <option value="Specialized">Specialized Subject</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Semester</label>
                                        <select 
                                            name="semester" 
                                            value={currentSubject.semester} 
                                            onChange={handleInputChange} 
                                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                        >
                                            <option value="">-- Select Semester --</option>
                                            <option value="1st Semester">1st Semester</option>
                                            <option value="2nd Semester">2nd Semester</option>
                                        </select>
                                    </div>

                                    {currentSubject.classification === 'Specialized' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Track</label>
                                                <select 
                                                    name="track" 
                                                    value={currentSubject.track} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                                >
                                                    <option value="">-- Select Track --</option>
                                                    {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Strand</label>
                                                <select 
                                                    name="strand" 
                                                    value={currentSubject.strand} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                                >
                                                    <option value="">-- Select Strand --</option>
                                                    <optgroup label="Academic">
                                                        {STRANDS_ACADEMIC.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </optgroup>
                                                    <optgroup label="TVL">
                                                        {STRANDS_TVL.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </optgroup>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Department</label>
                                <select 
                                    name="department" 
                                    value={currentSubject.department} 
                                    onChange={handleInputChange} 
                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                >
                                    <option value="">-- Select Department --</option>
                                    <option value="Science">Science</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="English">English</option>
                                    <option value="Filipino">Filipino</option>
                                    <option value="Araling Panlipunan">Araling Panlipunan</option>
                                    <option value="TLE">TLE</option>
                                    <option value="MAPEH">MAPEH</option>
                                    <option value="ESP">ESP</option>
                                    <option value="Senior High">Senior High School</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Prerequisite (Code)</label>
                                <input 
                                    type="text" 
                                    name="prerequisiteId" 
                                    value={currentSubject.prerequisiteId || ''} 
                                    onChange={handleInputChange} 
                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" 
                                    placeholder="e.g. GENMATH"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Description</label>
                            <textarea 
                                name="description" 
                                value={currentSubject.description} 
                                onChange={handleInputChange} 
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none leading-relaxed" 
                                placeholder="Brief description of the subject content..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="p-0 h-full flex flex-col">
                        {/* Quarter Navigation */}
                        <div className="flex justify-center p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                            <div className="bg-white dark:bg-slate-700 p-1 rounded-lg inline-flex shadow-sm border border-slate-200 dark:border-slate-600">
                                {QUARTERS.map(q => (
                                    <button 
                                        key={q} 
                                        onClick={() => { setActiveQuarter(q); setEditingWeek(null); }}
                                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeQuarter === q ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Week List */}
                            <div className={`${editingWeek ? 'hidden md:block w-1/3' : 'w-full'} border-r border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800`}>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Weeks</h3>
                                        <button onClick={handleAddWeek} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    {getCurrentQuarterData().weeks.length === 0 ? (
                                        <div className="text-center py-10 px-4">
                                            <p className="text-slate-400 text-sm italic">No weeks added for this quarter.</p>
                                            <button onClick={handleAddWeek} className="mt-2 text-indigo-600 text-xs font-bold hover:underline">Add First Week</button>
                                        </div>
                                    ) : (
                                        getCurrentQuarterData().weeks.map(week => (
                                            <div 
                                                key={week.id}
                                                onClick={() => setEditingWeek(week)}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative ${
                                                    editingWeek?.id === week.id 
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200' 
                                                    : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">{week.weekLabel}</span>
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{week.contentTopic || 'Untitled Topic'}</h4>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteWeek(week.id); }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                        {week.competencies.length} Competencies
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Week Editor Form */}
                            {editingWeek && (
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                                            <EditIcon className="w-5 h-5 mr-2 text-indigo-500" /> Edit Week Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Week Label</label>
                                                <input 
                                                    type="text" 
                                                    value={editingWeek.weekLabel} 
                                                    onChange={(e) => setEditingWeek({...editingWeek, weekLabel: e.target.value})}
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold"
                                                    placeholder="e.g. Week 1-2"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Content Topic</label>
                                                <input 
                                                    type="text" 
                                                    value={editingWeek.contentTopic} 
                                                    onChange={(e) => setEditingWeek({...editingWeek, contentTopic: e.target.value})}
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium"
                                                    placeholder="e.g. Principles of Design"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Content Standard</label>
                                                <textarea 
                                                    value={editingWeek.contentStandard}
                                                    onChange={(e) => setEditingWeek({...editingWeek, contentStandard: e.target.value})}
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm h-24 resize-none"
                                                    placeholder="The learner demonstrates understanding..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Performance Standard</label>
                                                <textarea 
                                                    value={editingWeek.performanceStandard}
                                                    onChange={(e) => setEditingWeek({...editingWeek, performanceStandard: e.target.value})}
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm h-24 resize-none"
                                                    placeholder="The learner is able to..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Learning Competencies</h3>
                                            <button onClick={handleAddCompetency} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center">
                                                <PlusIcon className="w-3 h-3 mr-1"/> Add Row
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {editingWeek.competencies.length === 0 && (
                                                <p className="text-slate-400 text-sm italic text-center py-4">No competencies added yet.</p>
                                            )}
                                            {editingWeek.competencies.map((comp, idx) => (
                                                <div key={idx} className="flex gap-3 items-start">
                                                    <div className="flex-1">
                                                        <input 
                                                            type="text" 
                                                            value={comp.description} 
                                                            onChange={(e) => handleCompetencyChange(idx, 'description', e.target.value)}
                                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                            placeholder="Competency Description"
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <input 
                                                            type="text" 
                                                            value={comp.code} 
                                                            onChange={(e) => handleCompetencyChange(idx, 'code', e.target.value)}
                                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono"
                                                            placeholder="Code"
                                                        />
                                                    </div>
                                                    <button onClick={() => handleRemoveCompetency(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button 
                                            onClick={() => setEditingWeek(null)}
                                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveWeek}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md transition-colors flex items-center"
                                        >
                                            <CheckCircleIcon className="w-4 h-4 mr-2"/> Save Week
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <footer className="flex justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3 flex-shrink-0">
                <button onClick={handleCloseForm} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    Cancel
                </button>
                <button onClick={handleFormSubmit} type="submit" className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                    {editingSubjectId ? <EditIcon className="w-4 h-4 mr-2"/> : <PlusIcon className="w-4 h-4 mr-2"/>}
                    {editingSubjectId ? 'Update Subject' : 'Create Subject'}
                </button>
            </footer>
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans bg-slate-50 dark:bg-slate-900 min-h-screen">
      {isFormVisible && renderForm()}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100 dark:border-red-900/30">
                    <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Subject?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    Are you sure you want to remove <strong>{deleteModalState.subjectName}</strong>? It will be moved to the recycle bin.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setDeleteModalState({ isOpen: false, subjectId: null, subjectName: '' })} 
                        className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeDelete} 
                        className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}

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
        
        {/* Main Filter Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
                
                {/* Curriculum Toggle */}
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

                {/* SHS Filters */}
                {curriculumView === 'shs' && (
                    <div className="flex gap-3 flex-1 justify-center">
                        <div className="relative">
                            <select 
                                value={filterTrack}
                                onChange={(e) => setFilterTrack(e.target.value)}
                                className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 pl-4 pr-10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">All Tracks</option>
                                {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <FilterIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select 
                                value={filterSemester}
                                onChange={(e) => setFilterSemester(e.target.value)}
                                className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 pl-4 pr-10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">All Semesters</option>
                                <option value="1st Semester">1st Semester</option>
                                <option value="2nd Semester">2nd Semester</option>
                            </select>
                            <FilterIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Search & Status Toggle */}
                <div className="flex gap-4 items-center w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search code or title..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        />
                        <SearchIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button 
                            onClick={() => setActiveTab('active')} 
                            className={`p-2 rounded-md transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-600 text-green-600 shadow-sm' : 'text-slate-400'}`}
                            title="Active Subjects"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setActiveTab('deleted')} 
                            className={`p-2 rounded-md transition-colors ${activeTab === 'deleted' ? 'bg-white dark:bg-slate-600 text-red-500 shadow-sm' : 'text-slate-400'}`}
                            title="Recycle Bin"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-slate-500 font-medium">Loading Curriculum...</span>
          </div>
        ) : (
          <>
            {filteredSubjects.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <BookOpenIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        No subjects found for this criteria.
                    </p>
                    {activeTab === 'active' && !searchQuery && (
                        <button onClick={handleAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                            Add your first subject
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedSubjects.map(subject => (
                        <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
                            <div className={`absolute top-0 left-0 w-full h-1.5 opacity-80 ${
                                subject.classification === 'Core' ? 'bg-blue-500' :
                                subject.classification === 'Applied' ? 'bg-teal-500' :
                                subject.classification === 'Specialized' ? 'bg-purple-500' :
                                'bg-gradient-to-r from-indigo-500 to-cyan-500'
                            }`}></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-1">
                                    <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md font-mono w-fit">
                                        {subject.code}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {activeTab === 'active' ? (
                                        <>
                                            <button onClick={() => handleEdit(subject)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(subject)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleRestore(subject.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
                                            <UndoIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white font-serif leading-tight mb-2 mt-1 line-clamp-2 h-12">
                                {subject.name}
                            </h3>
                            
                            {subject.department && (
                                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide mb-3">
                                    {subject.department}
                                </div>
                            )}
                            
                            {/* SHS Tags */}
                            {isSHS(subject.gradeLevel) && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {subject.classification && (
                                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                            subject.classification === 'Core' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                                            subject.classification === 'Applied' ? 'border-teal-200 text-teal-600 bg-teal-50' :
                                            'border-purple-200 text-purple-600 bg-purple-50'
                                        }`}>
                                            {subject.classification}
                                        </span>
                                    )}
                                    {subject.semester && (
                                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50">
                                            {subject.semester === '1st Semester' ? '1st Sem' : '2nd Sem'}
                                        </span>
                                    )}
                                    {subject.strand && (
                                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-amber-200 text-amber-600 bg-amber-50">
                                            {subject.strand}
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {subject.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 flex-1 mt-auto">
                                    {subject.description}
                                </p>
                            )}

                            {activeTab === 'deleted' && (
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-mono text-red-500 font-medium">
                                    {getTimeRemaining(subject.deletedAt)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectManager;
