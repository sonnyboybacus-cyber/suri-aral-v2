import React, { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import { SchoolInfo, ClassInfo, Teacher } from '../types';
import { loadSchools, loadClasses, loadTeachers, saveClasses, generateUUID, loadUserProfile } from '../services/databaseService';
import { loadEvents } from '../services/db/calendar';
import { CalendarEvent } from '../types';
import {
    CalendarIcon, UserIcon, CheckCircleIcon, SearchIcon, ChevronDownIcon,
    FilterIcon, BriefcaseIcon, GridIcon, TrashIcon, MegaphoneIcon, XIcon, AlertTriangleIcon, UsersIcon
} from './icons';
import { ClassScheduling } from './ClassScheduling';
import { getTeacherName, DAYS } from './schedule/ScheduleUtils';
import { UserProfile } from '../types';
import { ScheduleSidebar } from './schedule/layout/ScheduleSidebar';
import { ScheduleHeader } from './schedule/layout/ScheduleHeader';

// Components
import { ScheduleCalendarView } from './schedule/views/ScheduleCalendarView';
import { ScheduleMatrixView } from './schedule/views/ScheduleMatrixView';
import { SchoolListView } from './schedule/views/SchoolListView';
import { FacultyLoadView } from './schedule/views/FacultyLoadView';
import { AvailabilityCheckerView } from './schedule/views/AvailabilityCheckerView';
import { FacilitiesView } from './schedule/views/FacilitiesView';
import { SchedulePrintModal } from './schedule/modals/SchedulePrintModal';
import { CalendarManagerModal } from './schedule/modals/CalendarManagerModal';

interface SchoolScheduleProps {
    user: firebase.User;
}

export const SchoolSchedule = ({ user }: SchoolScheduleProps) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Data
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

    // Filter State
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [viewMode, setViewMode] = useState<'matrix' | 'calendar' | 'faculty' | 'facilities' | 'availability'>('matrix');
    const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('All');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    // Editing State
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    // Modals
    const [showEventModal, setShowEventModal] = useState<boolean>(false);
    const [showCalendarManager, setShowCalendarManager] = useState<boolean>(false);
    const [printingClass, setPrintingClass] = useState<ClassInfo | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'single' | 'all';
        targetId?: string;
        title: string;
        message: string;
    }>({ isOpen: false, type: 'single', title: '', message: '' });

    // Event Configuration
    const [eventConfig, setEventConfig] = useState({
        day: 'Monday',
        duration: 'Whole Day', // Whole Day, AM, PM
        type: 'Suspension', // Holiday, Suspension, Event, Meeting
        title: ''
    });

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [s, c, t, p] = await Promise.all([
                loadSchools(user.uid),
                loadClasses(user.uid),
                loadTeachers(user.uid),
                loadUserProfile(user.uid)
            ]);

            setUserProfile(p);

            let filteredSchools = s.filter(x => !x.deletedAt);
            let filteredClasses = c.filter(x => !x.deletedAt);
            let filteredTeachers = t.filter(x => !x.deletedAt);

            if ((p?.role === 'principal' || p?.role === 'ict_coordinator') && p.schoolId) {
                filteredSchools = filteredSchools.filter(x => x.id === p.schoolId);
                filteredClasses = filteredClasses.filter(x => x.schoolId === p.schoolId);
                filteredTeachers = filteredTeachers.filter(x => x.schoolId === p.schoolId);
                if (!selectedSchoolId) setSelectedSchoolId(p.schoolId);
            }

            setSchools(filteredSchools.map(sc => ({ ...sc, assignedTeacherIds: sc.assignedTeacherIds || [], rooms: sc.rooms || [] })));
            setClasses(filteredClasses.map(cl => ({ ...cl, subjects: cl.subjects || [], studentIds: cl.studentIds || [], schedule: cl.schedule || [] })));
            setTeachers(filteredTeachers);

            // Load Events
            if (p?.schoolId) {
                const evts = await loadEvents(p.schoolId);
                setCalendarEvents(evts);
            } else {
                // If global/admin, load all or specific? For now load global 
                // Using 'Global' as ID if not school specific
                const evts = await loadEvents('Global');
                setCalendarEvents(evts);
            }
        } catch (error) {
            console.error("Failed to load schedule data", error);
        } finally {
            setIsLoading(false);
        }
    }, [user.uid]);

    useEffect(() => { refreshData(); }, [refreshData]);

    const activeClasses = useMemo(() => !selectedSchoolId ? classes : classes.filter(c => c.schoolId === selectedSchoolId), [classes, selectedSchoolId]);
    const activeTeachers = useMemo(() => {
        if (!selectedSchoolId) return teachers;
        const school = schools.find(s => s.id === selectedSchoolId);
        return school && school.assignedTeacherIds ? teachers.filter(t => school.assignedTeacherIds.includes(t.id)) : teachers;
    }, [schools, teachers, selectedSchoolId]);

    // Reload Events when filter changes
    useEffect(() => {
        const fetchEvents = async () => {
            // If user has a fixed schoolId (Principal), use that. Otherwise use selected filter.
            // Note: userProfile might confuse things if we just check userProfile.schoolId, 
            // but usually Admin has no schoolId.
            const targetId = (userProfile?.role === 'principal' || userProfile?.role === 'ict_coordinator')
                ? userProfile.schoolId
                : (selectedSchoolId || 'All');

            console.log("SchoolSchedule: Fetching events for target:", targetId);

            if (targetId) {
                try {
                    const evts = await loadEvents(targetId);
                    console.log("SchoolSchedule: Loaded events:", evts);
                    setCalendarEvents(evts);
                } catch (err) {
                    console.error("SchoolSchedule: Failed to load events", err);
                }
            }
        };
        fetchEvents();
    }, [selectedSchoolId, userProfile]);

    const gradeLevels = useMemo(() => {
        const grades = new Set(activeClasses.map(c => c.gradeLevel));
        return Array.from(grades).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    }, [activeClasses]);

    // Handle Deletion Logic
    const handleClearSingle = (e: React.MouseEvent, cls: ClassInfo) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            type: 'single',
            targetId: cls.id,
            title: 'Clear Schedule?',
            message: `Are you sure you want to clear the entire schedule for ${cls.gradeLevel} - ${cls.section}?`
        });
    };

    const handleClearAll = () => {
        setConfirmModal({
            isOpen: true,
            type: 'all',
            title: 'Clear All Schedules?',
            message: `WARNING: This will remove the schedule for ${!selectedSchoolId ? 'ALL SCHOOLS' : 'all classes in this school'}.`
        });
    };

    const executeClear = async () => {
        setIsLoading(true);
        try {
            let updatedClasses = [...classes];
            if (confirmModal.type === 'single' && confirmModal.targetId) {
                updatedClasses = updatedClasses.map(c => c.id === confirmModal.targetId ? { ...c, schedule: [] } : c);
            } else if (confirmModal.type === 'all') {
                updatedClasses = updatedClasses.map(c => (!selectedSchoolId || c.schoolId === selectedSchoolId) ? { ...c, schedule: [] } : c);
            }
            await saveClasses(user.uid, updatedClasses);
            await refreshData();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error(error);
            alert("Failed to update schedules.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyMassEvent = async () => {
        if (!eventConfig.title) return alert("Please enter a title.");
        setIsLoading(true);
        try {
            let startHour = 7, endHour = 17;
            if (eventConfig.duration === 'AM') endHour = 12;
            else if (eventConfig.duration === 'PM') startHour = 12;

            const slotsToAdd: any[] = [];
            for (let h = startHour; h < endHour; h++) {
                slotsToAdd.push({ startTime: `${h.toString().padStart(2, '0')}:00`, endTime: `${(h + 1).toString().padStart(2, '0')}:00` });
            }

            const updatedClasses = classes.map(cls => {
                const inScope = !selectedSchoolId || cls.schoolId === selectedSchoolId;
                if (!inScope || (selectedGradeLevel !== 'All' && cls.gradeLevel !== selectedGradeLevel)) return cls;

                const newSchedule = (cls.schedule || []).filter(slot => {
                    if (slot.day !== eventConfig.day) return true;
                    const [sH, sM] = slot.startTime.split(':').map(Number);
                    const slotStartVal = sH * 60 + sM;
                    return slotStartVal < startHour * 60 || slotStartVal >= endHour * 60;
                });

                slotsToAdd.forEach(time => {
                    newSchedule.push({
                        id: generateUUID(),
                        day: eventConfig.day,
                        startTime: time.startTime,
                        endTime: time.endTime,
                        subjectId: 'event',
                        subjectName: eventConfig.title,
                        teacherId: '',
                        teacherName: '',
                        type: 'activity',
                        activityType: eventConfig.type as any,
                        title: eventConfig.title
                    });
                });
                return { ...cls, schedule: newSchedule };
            });

            await saveClasses(user.uid, updatedClasses);
            await refreshData();
            setShowEventModal(false);
            alert(`${eventConfig.duration} event applied successfully.`);
        } catch (error) {
            console.error("Mass Event Error:", error);
            alert("Failed to apply event schedule.");
        } finally {
            setIsLoading(false);
        }
    };

    if (editingClassId) {
        const cls = classes.find(c => c.id === editingClassId);
        const activeSchool = schools.find(s => s.id === cls?.schoolId);
        if (cls) {
            return (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-auto">
                    <ClassScheduling
                        classInfo={cls}
                        onBack={() => setEditingClassId(null)}
                        onSaved={() => { refreshData(); setEditingClassId(null); }}
                        allClasses={activeClasses}
                        teachers={activeTeachers}
                        rooms={activeSchool?.rooms || []}
                        userId={user.uid}
                        userRole={userProfile?.role}
                    />
                </div>
            );
        }
    }



    // ... existing imports ...

    // (Inside SchoolSchedule component)

    // Helper to get titles
    const getViewTitle = () => {
        switch (viewMode) {
            case 'calendar': return 'School Calendar';
            case 'faculty': return 'Faculty Load';
            case 'facilities': return 'Facilities Management';
            case 'availability': return 'Conflict Checker';
            default: return 'Class Matrix';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

            <div className="flex flex-col md:flex-row h-screen overflow-hidden">
                <ScheduleSidebar
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedSchoolId={selectedSchoolId}
                    setSelectedSchoolId={setSelectedSchoolId}
                    selectedGradeLevel={selectedGradeLevel}
                    setSelectedGradeLevel={setSelectedGradeLevel}
                    selectedTeacherId={selectedTeacherId}
                    setSelectedTeacherId={setSelectedTeacherId}
                    schools={schools}
                    gradeLevels={gradeLevels}
                    teachers={activeTeachers}
                    onShowCalendarManager={() => setShowCalendarManager(true)}
                    onShowEventModal={() => setShowEventModal(true)}
                    onClearAll={handleClearAll}
                    showSchoolFilter={true}
                />

                <main className="flex-1 h-full overflow-y-auto p-4 md:p-8">
                    <div className="max-w-[1600px] mx-auto space-y-6">
                        <ScheduleHeader
                            title={getViewTitle()}
                            subtitle={!selectedSchoolId ? 'All Schools' : schools.find(s => s.id === selectedSchoolId)?.schoolName || 'School Schedule'}
                        />

                        <div className="animate-fade-in-up min-h-[500px]">
                            {viewMode === 'matrix' && <ScheduleMatrixView
                                classes={activeClasses}
                                schools={schools}
                                teachers={activeTeachers}
                                selectedSchoolId={selectedSchoolId}
                                selectedGradeLevel={selectedGradeLevel}
                                onEditClass={setEditingClassId}
                                onClearSingle={handleClearSingle}
                                onPrintClass={(e, cls) => { e.stopPropagation(); setPrintingClass(cls); }}
                                renderSchoolList={() => <SchoolListView schools={schools} classes={classes} teachers={teachers} onSelectSchool={setSelectedSchoolId} />}
                            />}
                            {viewMode === 'calendar' && <ScheduleCalendarView classes={activeClasses} selectedGradeLevel={selectedGradeLevel} onEditClass={setEditingClassId} onShowCalendarManager={() => setShowCalendarManager(true)} events={calendarEvents} />}
                            {viewMode === 'faculty' && <FacultyLoadView selectedTeacherId={selectedTeacherId} teachers={teachers} activeClasses={activeClasses} schools={schools} selectedSchoolId={selectedSchoolId} />}
                            {viewMode === 'facilities' && <FacilitiesView schools={schools} selectedSchoolId={selectedSchoolId} />}
                            {viewMode === 'availability' && <AvailabilityCheckerView schools={schools} teachers={teachers} activeClasses={activeClasses} activeTeachers={activeTeachers} selectedSchoolId={selectedSchoolId} />}
                        </div>
                    </div>
                </main>
            </div>

            {/* Modals */}
            <SchedulePrintModal
                printingClass={printingClass}
                schools={schools}
                teachers={teachers}
                onClose={() => setPrintingClass(null)}
            />

            <CalendarManagerModal
                isOpen={showCalendarManager}
                onClose={() => { setShowCalendarManager(false); refreshData(); }}
                user={user}
                userProfile={userProfile}
                selectedSchoolId={selectedSchoolId}
            />

            {/* Mass Event Modal */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add Mass Event</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-500">Event Title</label>
                                <input type="text" value={eventConfig.title} onChange={e => setEventConfig({ ...eventConfig, title: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Sports Fest" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-500">Day</label>
                                    <select value={eventConfig.day} onChange={e => setEventConfig({ ...eventConfig, day: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-500">Duration</label>
                                    <select value={eventConfig.duration} onChange={e => setEventConfig({ ...eventConfig, duration: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                                        <option value="Whole Day">Whole Day</option>
                                        <option value="AM">AM (7-12)</option>
                                        <option value="PM">PM (1-5)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setShowEventModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                                <button onClick={handleApplyMassEvent} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Apply Event</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            < SchedulePrintModal printingClass={printingClass} schools={schools} teachers={teachers} onClose={() => setPrintingClass(null)} />

            {/* Mass Event Modal (Kept local as it's state-heavy and tied to applyLogic, could be extracted later) */}
            {
                showEventModal && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up p-6">
                            <h3 className="font-bold text-lg mb-4">Mass Schedule Event</h3>
                            <input type="text" placeholder="Event Title" value={eventConfig.title} onChange={e => setEventConfig({ ...eventConfig, title: e.target.value })} className="w-full p-2 border rounded mb-2 dark:bg-slate-900 dark:border-slate-600" />
                            <div className="flex gap-2 mb-4">
                                <select value={eventConfig.day} onChange={e => setEventConfig({ ...eventConfig, day: e.target.value })} className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600">
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={eventConfig.duration} onChange={e => setEventConfig({ ...eventConfig, duration: e.target.value })} className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600">
                                    <option value="Whole Day">Whole Day</option>
                                    <option value="AM">Morning</option>
                                    <option value="PM">Afternoon</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowEventModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button onClick={handleApplyMassEvent} className="px-4 py-2 bg-indigo-600 text-white rounded">Apply</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirm Modal */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
                            <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-slate-500 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 bg-slate-100 rounded-xl">Cancel</button>
                                <button onClick={executeClear} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl">Confirm</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
