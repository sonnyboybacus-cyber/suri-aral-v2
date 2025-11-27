import React, { useState, useEffect, useMemo, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { SchoolInfo, Teacher, SchoolRoom } from '../types';
import { saveSchools, loadSchools, loadTeachers, logActivity } from '../services/databaseService';
import { PlusIcon, SaveIcon, SpinnerIcon, TrashIcon, EditIcon, XIcon, SearchIcon, SchoolIcon, BriefcaseIcon, UserIcon, PinIcon, CheckCircleIcon, AlertTriangleIcon, GridIcon } from './icons';
import { UndoIcon } from './UndoIcon';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icons
const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const initialSchoolState: Omit<SchoolInfo, 'id' | 'deletedAt'> = {
  schoolId: '',
  schoolName: '',
  schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  curriculum: 'K to 12',
  gradeLevels: '',
  district: '',
  division: '',
  region: '',
  principalId: '',
  assignedTeacherIds: [],
  rooms: [],
  location: { lat: 14.5995, lng: 120.9842, address: 'Manila, Philippines' } // Default
};

const ITEMS_PER_PAGE = 12;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const ROOM_TYPES = ['Instructional', 'Laboratory', 'Library', 'Clinic', 'Office', 'ICT Lab', 'Other'];
const ROOM_CONDITIONS = ['Good', 'Needs Repair', 'Condemned'];

// Helper function for teacher name
const getTeacherFullName = (t: Teacher) => `${t.lastName}, ${t.firstName} ${t.middleName || ''}`.trim();

// Map Components
const LocationMarker = ({ position, setPosition }: { position: { lat: number, lng: number }, setPosition: (pos: { lat: number, lng: number }) => void }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position} icon={iconPerson} />
    );
};

const ChangeView = ({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) => {
    const map = useMap();
    map.flyTo(center, zoom);
    return null;
};

// Extracted Component to prevent re-rendering issues
const TeacherDesignationManager = ({ 
    teachers, 
    assignedTeacherIds, 
    onAssign, 
    onUnassign 
}: { 
    teachers: Teacher[], 
    assignedTeacherIds: string[], 
    onAssign: (id: string) => void, 
    onUnassign: (id: string) => void 
}) => {
    const [availableSearch, setAvailableSearch] = useState('');
    const [assignedSearch, setAssignedSearch] = useState('');

    const availableTeachers = useMemo(() => {
        return teachers
            .filter(t => !assignedTeacherIds.includes(t.id))
            .filter(t => getTeacherFullName(t).toLowerCase().includes(availableSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [teachers, assignedTeacherIds, availableSearch]);

    const assignedTeachers = useMemo(() => {
        return teachers
            .filter(t => assignedTeacherIds.includes(t.id))
            .filter(t => getTeacherFullName(t).toLowerCase().includes(assignedSearch.toLowerCase()))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [teachers, assignedTeacherIds, assignedSearch]);

    return (
        <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-4 flex items-center">
                <BriefcaseIcon className="w-4 h-4 mr-2 text-indigo-500" />
                Faculty Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Teachers */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Available Pool</span>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{availableTeachers.length}</span>
                    </div>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <input 
                            type="text" 
                            placeholder="Filter teachers..." 
                            value={availableSearch} 
                            onChange={e => setAvailableSearch(e.target.value)} 
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {availableTeachers.map(t => (
                            <li key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        {t.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getTeacherFullName(t)}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => onAssign(t.id)} 
                                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                         {availableTeachers.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No teachers found.</li>}
                    </ul>
                </div>

                {/* Assigned Teachers */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 overflow-hidden flex flex-col h-80">
                    <div className="p-3 bg-white dark:bg-slate-800 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Assigned Faculty</span>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{assignedTeachers.length}</span>
                    </div>
                    <div className="p-2 border-b border-indigo-100 dark:border-indigo-800">
                        <input 
                            type="text" 
                            placeholder="Filter assigned..." 
                            value={assignedSearch} 
                            onChange={e => setAssignedSearch(e.target.value)} 
                            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {assignedTeachers.map(t => (
                            <li key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-900/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                        {t.firstName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{getTeacherFullName(t)}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => onUnassign(t.id)} 
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {assignedTeachers.length === 0 && <li className="text-center text-xs text-slate-400 py-4">No teachers assigned yet.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const SchoolInformation = ({ user }: { user: firebase.User }) => {
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentSchool, setCurrentSchool] = useState<Omit<SchoolInfo, 'id' | 'deletedAt'>>(initialSchoolState);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  // Modal Tab State
  const [modalTab, setModalTab] = useState<'profile' | 'facilities'>('profile');
  
  // Map Search State
  const [mapSearch, setMapSearch] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const userName = user.displayName || user.email || 'Unknown User';

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; schoolId: string | null; schoolName: string }>({
    isOpen: false,
    schoolId: null,
    schoolName: ''
  });

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
  
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.lastName}, ${t.firstName}`])), [teachers]);

  const getTimeRemaining = (deletedAt?: number): string => {
    if (!deletedAt) return "";
    const now = Date.now();
    const timeLeft = SEVEN_DAYS_IN_MS - (now - deletedAt);

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentSchool(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool.schoolName || !currentSchool.schoolId) {
      alert("School ID and School Name are required.");
      return;
    }

    if (editingSchoolId) {
      setSchools(prev => prev.map(s => s.id === editingSchoolId ? { id: editingSchoolId, ...currentSchool } : s));
    } else {
      const newSchool: SchoolInfo = { id: crypto.randomUUID(), ...currentSchool };
      setSchools(prev => [newSchool, ...prev]);
    }
    handleCloseForm();
  };

  const handleEdit = (school: SchoolInfo) => {
    setEditingSchoolId(school.id);
    const { id, deletedAt, ...editableData } = school;
    setCurrentSchool({
        ...initialSchoolState, // Ensure defaults
        ...editableData,
        rooms: editableData.rooms || [],
        location: editableData.location || initialSchoolState.location
    });
    setModalTab('profile');
    setIsFormVisible(true);
  };

  const handleDelete = (schoolId: string) => {
      const school = schools.find(s => s.id === schoolId);
      if (school) {
        setDeleteModalState({
            isOpen: true,
            schoolId: schoolId,
            schoolName: school.schoolName
        });
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

      if(schoolsToSave.length !== schools.length) {
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
    setModalTab('profile');
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingSchoolId(null);
    setCurrentSchool(initialSchoolState);
  };
  
  // --- FACILITIES & MAP LOGIC ---
  
  const handleSearchLocation = async () => {
      if (!mapSearch) return;
      setIsSearchingMap(true);
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`);
          const data = await response.json();
          if (data && data.length > 0) {
              const { lat, lon, display_name } = data[0];
              setCurrentSchool(prev => ({
                  ...prev,
                  location: { lat: parseFloat(lat), lng: parseFloat(lon), address: display_name }
              }));
          } else {
              alert("Location not found.");
          }
      } catch (e) {
          console.error(e);
          alert("Failed to search location.");
      } finally {
          setIsSearchingMap(false);
      }
  };

  const handleAddRoom = () => {
      const newRoom: SchoolRoom = {
          id: crypto.randomUUID(),
          roomNumber: `Rm ${ (currentSchool.rooms?.length || 0) + 1}`,
          type: 'Instructional',
          capacity: 40,
          condition: 'Good'
      };
      setCurrentSchool(prev => ({ ...prev, rooms: [...(prev.rooms || []), newRoom] }));
  };

  const handleUpdateRoom = (index: number, field: keyof SchoolRoom, value: any) => {
      const updatedRooms = [...(currentSchool.rooms || [])];
      updatedRooms[index] = { ...updatedRooms[index], [field]: value };
      setCurrentSchool(prev => ({ ...prev, rooms: updatedRooms }));
  };

  const handleRemoveRoom = (index: number) => {
      const updatedRooms = (currentSchool.rooms || []).filter((_, i) => i !== index);
      setCurrentSchool(prev => ({ ...prev, rooms: updatedRooms }));
  };
  
  const handleAssignTeacher = (teacherId: string) => {
      setCurrentSchool(prev => ({...prev, assignedTeacherIds: [...prev.assignedTeacherIds, teacherId]}));
  };

  const handleUnassignTeacher = (teacherId: string) => {
      setCurrentSchool(prev => ({...prev, assignedTeacherIds: prev.assignedTeacherIds.filter(id => id !== teacherId)}));
  };

  const activeSchools = useMemo(() => schools.filter(s => !s.deletedAt), [schools]);
  const deletedSchools = useMemo(() => schools.filter(s => s.deletedAt), [schools]);

  const filteredSchools = useMemo(() => {
    const sourceList = activeTab === 'active' ? activeSchools : deletedSchools;
    if (!searchQuery.trim()) {
      return sourceList;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return sourceList.filter(s =>
      s.schoolName.toLowerCase().includes(lowercasedQuery) ||
      s.schoolId.toLowerCase().includes(lowercasedQuery) ||
      (s.location?.address || '').toLowerCase().includes(lowercasedQuery)
    );
  }, [activeSchools, deletedSchools, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSchools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSchools, currentPage]);

  const renderForm = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                        {editingSchoolId ? 'Edit School Profile' : 'Add New School'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure institutional details and facilities.</p>
                </div>
                <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                <button 
                    onClick={() => setModalTab('profile')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'profile' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    General Profile
                </button>
                <button 
                    onClick={() => setModalTab('facilities')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${modalTab === 'facilities' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Facilities & Map
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {modalTab === 'profile' ? (
                    <form onSubmit={handleFormSubmit} className="p-8 space-y-8">
                        {/* Basic Information */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6 flex items-center">
                                <SchoolIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                Institution Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School ID <span className="text-red-500">*</span></label>
                                    <input type="text" name="schoolId" value={currentSchool.schoolId} onChange={handleInputChange} className="w-full input-field font-mono" placeholder="e.g. 101234" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Name <span className="text-red-500">*</span></label>
                                    <input type="text" name="schoolName" value={currentSchool.schoolName} onChange={handleInputChange} className="w-full input-field font-medium" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Curriculum Type</label>
                                    <select name="curriculum" value={currentSchool.curriculum} onChange={handleInputChange} className="w-full input-field appearance-none">
                                        <option value="K to 12">K to 12 Basic Education</option>
                                        <option value="Special Science">Special Science (STE)</option>
                                        <option value="Special Program in Arts">Special Program in Arts (SPA)</option>
                                        <option value="Special Program in Sports">Special Program in Sports (SPS)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Grade Levels Offered</label>
                                    <input type="text" name="gradeLevels" value={currentSchool.gradeLevels} onChange={handleInputChange} className="w-full input-field" placeholder="e.g. K-6, 7-10, 11-12" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">School Year</label>
                                    <input type="text" name="schoolYear" value={currentSchool.schoolYear} onChange={handleInputChange} className="w-full input-field" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Principal / School Head</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <select name="principalId" value={currentSchool.principalId} onChange={handleInputChange} className="w-full pl-10 p-3 input-field appearance-none">
                                            <option value="">-- Select Principal --</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{getTeacherFullName(t)}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-6 flex items-center">
                                <PinIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                Geographic Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">District</label>
                                    <input type="text" name="district" value={currentSchool.district} onChange={handleInputChange} className="w-full input-field" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Division</label>
                                    <input type="text" name="division" value={currentSchool.division} onChange={handleInputChange} className="w-full input-field" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Region</label>
                                    <input type="text" name="region" value={currentSchool.region} onChange={handleInputChange} className="w-full input-field" />
                                </div>
                            </div>
                        </div>

                        {/* Teacher Assignment */}
                        <TeacherDesignationManager 
                            teachers={teachers} 
                            assignedTeacherIds={currentSchool.assignedTeacherIds}
                            onAssign={handleAssignTeacher}
                            onUnassign={handleUnassignTeacher}
                        />

                    </form>
                ) : (
                    <div className="p-8 space-y-8">
                        {/* Map Section */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[500px] flex flex-col">
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={mapSearch} 
                                        onChange={e => setMapSearch(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSearchLocation()}
                                        className="w-full pl-10 p-2.5 input-field"
                                        placeholder="Search location address..."
                                    />
                                </div>
                                <button onClick={handleSearchLocation} disabled={isSearchingMap} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                                    {isSearchingMap ? <SpinnerIcon className="w-4 h-4 animate-spin"/> : 'Search'}
                                </button>
                            </div>
                            
                            <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                                {typeof window !== 'undefined' && (
                                    <MapContainer center={currentSchool.location || { lat: 14.5995, lng: 120.9842 }} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        {currentSchool.location && (
                                            <>
                                                <ChangeView center={currentSchool.location} zoom={15} />
                                                <LocationMarker 
                                                    position={currentSchool.location} 
                                                    setPosition={(pos) => setCurrentSchool(prev => ({ ...prev, location: { ...prev.location!, ...pos } }))} 
                                                />
                                            </>
                                        )}
                                    </MapContainer>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">{currentSchool.location?.address || 'Click on map to set location'}</p>
                        </div>

                        {/* Rooms / Facilities */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center">
                                    <GridIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                    School Facilities
                                </h3>
                                <button type="button" onClick={handleAddRoom} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center">
                                    <PlusIcon className="w-3 h-3 mr-1"/> Add Room
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(currentSchool.rooms || []).length === 0 && (
                                    <p className="text-sm text-slate-400 italic text-center py-4">No facilities added yet.</p>
                                )}
                                {(currentSchool.rooms || []).map((room, index) => (
                                    <div key={room.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="md:col-span-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Room Number</label>
                                            <input 
                                                type="text" 
                                                value={room.roomNumber} 
                                                onChange={(e) => handleUpdateRoom(index, 'roomNumber', e.target.value)}
                                                className="w-full p-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
                                            <select 
                                                value={room.type} 
                                                onChange={(e) => handleUpdateRoom(index, 'type', e.target.value)}
                                                className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded appearance-none"
                                            >
                                                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Capacity</label>
                                            <input 
                                                type="number" 
                                                value={room.capacity} 
                                                onChange={(e) => handleUpdateRoom(index, 'capacity', parseInt(e.target.value))}
                                                className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                                            <select 
                                                value={room.condition} 
                                                onChange={(e) => handleUpdateRoom(index, 'condition', e.target.value)}
                                                className={`w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded appearance-none font-bold ${
                                                    room.condition === 'Good' ? 'text-green-600' : room.condition === 'Needs Repair' ? 'text-amber-600' : 'text-red-600'
                                                }`}
                                            >
                                                {ROOM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1 flex justify-center">
                                            <button type="button" onClick={() => handleRemoveRoom(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors mt-4">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="flex justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 gap-3 flex-shrink-0">
                <button onClick={handleCloseForm} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    Cancel
                </button>
                {modalTab === 'profile' ? (
                    <button onClick={handleFormSubmit} type="submit" className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                        {editingSchoolId ? <EditIcon className="w-4 h-4 mr-2"/> : <PlusIcon className="w-4 h-4 mr-2"/>}
                        {editingSchoolId ? 'Update School' : 'Create School'}
                    </button>
                ) : (
                    <button onClick={() => setModalTab('profile')} type="button" className="flex items-center px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5">
                        Back to Profile
                    </button>
                )}
            </footer>
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 font-sans bg-slate-50 dark:bg-slate-900 min-h-screen">
      <style>{`.input-field { background-color: #f8fafc; border-color: #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: #0f172a; } .dark .input-field { background-color: #334155; border-color: #475569; color: #e2e8f0; }`}</style>
      
      {isFormVisible && renderForm()}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100 dark:border-red-900/30">
                    <TrashIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete School?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    Are you sure you want to remove <strong>{deleteModalState.schoolName}</strong>? It will be moved to the recycle bin.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setDeleteModalState({ isOpen: false, schoolId: null, schoolName: '' })} 
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
        
        {/* Tabs & Search */}
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
                    <SearchIcon className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-slate-500 font-medium">Loading Schools...</span>
          </div>
        ) : (
          <>
            {filteredSchools.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <SchoolIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {searchQuery ? `No matches for "${searchQuery}"` : (activeTab === 'active' ? 'No active schools.' : 'Recycle bin is empty.')}
                    </p>
                    {activeTab === 'active' && !searchQuery && (
                        <button onClick={handleAddNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">
                            Add your first school
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedSchools.map(school => (
                        <div key={school.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-80"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-1">
                                    <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md font-mono w-fit">
                                        ID: {school.schoolId}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {activeTab === 'active' ? (
                                        <>
                                            <button onClick={() => handleEdit(school)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(school.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleRestore(school.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
                                            <UndoIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white font-serif leading-tight mb-2 mt-1 line-clamp-2 h-12">
                                {school.schoolName}
                            </h3>
                            
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide mb-3">
                                {school.district} • {school.division}
                            </div>
                            
                            <div className="space-y-2 mb-4 flex-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1.5" /> {teacherMap.get(school.principalId) || 'Principal Not Set'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                    <PinIcon className="w-3 h-3 mr-1.5" /> {school.location?.address || 'Location Not Set'}
                                </p>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex gap-3 text-center">
                                    <div>
                                        <span className="block text-sm font-bold text-slate-800 dark:text-white">{school.assignedTeacherIds.length}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-bold">Teachers</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-slate-800 dark:text-white">{school.rooms?.length || 0}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-bold">Rooms</span>
                                    </div>
                                </div>
                                {activeTab === 'deleted' && (
                                    <span className="text-xs font-mono text-red-500 font-medium">
                                        {getTimeRemaining(school.deletedAt)}
                                    </span>
                                )}
                            </div>
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

export default SchoolInformation;