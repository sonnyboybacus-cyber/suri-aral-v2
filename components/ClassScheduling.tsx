
import React, { useState, useMemo, useEffect } from 'react';
import { ClassInfo, ClassSubject, ScheduleSlot, Teacher, SchoolRoom } from '../types';
import { generateSmartSchedule } from '../services/geminiService';
import { saveClasses, generateUUID } from '../services/databaseService';
import { CalendarIcon, SparklesIcon, SaveIcon, SpinnerIcon, ChevronDownIcon, LockIcon, TrashIcon } from './icons';
import { generateTimeSlots, getTeacherName } from './schedule/ScheduleUtils';
import { SubjectPalette } from './schedule/SubjectPalette';
import { SlotModal } from './schedule/SlotModal';
import { ScheduleGrid } from './schedule/ScheduleGrid';

interface ClassSchedulingProps {
    classInfo: ClassInfo;
    onBack: () => void;
    allClasses: ClassInfo[];
    teachers: Teacher[];
    rooms: SchoolRoom[];
    userId: string;
    userRole?: string; // Added userRole
    onSaved?: () => void;
}

export const ClassScheduling = ({ classInfo, onBack, allClasses, teachers, rooms, userId, userRole, onSaved }: ClassSchedulingProps) => {
    const [schedule, setSchedule] = useState<ScheduleSlot[]>(classInfo.schedule || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Settings
    const [startHour, setStartHour] = useState('07:00');
    const [endHour, setEndHour] = useState('17:00');
    const [slotDuration] = useState(60); // minutes

    // Drag & Drop (Stores Activity Type)
    const [draggedActivityType, setDraggedActivityType] = useState<string | null>(null);

    // Manual Edit Modal
    const [selectedSlot, setSelectedSlot] = useState<{ day: string, time: string } | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');

    // Lock subject context
    const [lockedSubjectId, setLockedSubjectId] = useState<string | null>(null);

    // Permission Logic
    const currentTeacher = useMemo(() => teachers.find(t => t.linkedAccountId === userId), [teachers, userId]);

    // Strictly restrict ONLY if user is a teacher AND NOT an admin/principal
    // Strictly restrict ONLY if user is a teacher AND NOT an admin/principal/adviser
    const normalizeRole = (r: string) => (r || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'principal', 'ict_coordinator', 'administrator'].some(r => normalizeRole(userRole || '').includes(r));
    const isAdviser = currentTeacher?.id === classInfo.adviserId;
    const isRestricted = !!currentTeacher && !isAdmin && !isAdviser;

    // Debugging Role
    useEffect(() => console.log("ClassScheduling Permissions:", { userRole, isAdmin, isAdviser, isRestricted, currentTeacherId: currentTeacher?.id }), [userRole, isAdmin, isAdviser, isRestricted, currentTeacher]);

    // Filter Subjects based on Role and Validity
    const availableSubjects = useMemo(() => {
        let subs = classInfo.subjects || [];
        // Remove phantom subjects (empty names)
        subs = subs.filter(s => s.name && s.name.trim() !== '');

        if (isRestricted && currentTeacher) {
            return subs.filter(s => s.teacherId === currentTeacher.id);
        }
        return subs;
    }, [classInfo.subjects, isRestricted, currentTeacher]);

    // Generate Time Slots
    const timeSlots = useMemo(() => generateTimeSlots(startHour, endHour, slotDuration), [startHour, endHour, slotDuration]);

    const handleGenerate = async () => {
        if (isRestricted) {
            alert("Only Administrators can auto-generate the base schedule. Teachers can add specific activities to their official class slots.");
            return;
        }

        if (!classInfo.subjects || classInfo.subjects.length === 0) {
            alert("Please add subjects to this class first.");
            return;
        }
        setIsGenerating(true);
        try {
            const subjectInput = classInfo.subjects.map(s => ({
                id: s.id,
                name: s.name,
                teacherId: s.teacherId
            }));

            const aiSchedule = await generateSmartSchedule(subjectInput, classInfo.gradeLevel, startHour, endHour);

            const enrichedSchedule = aiSchedule.map(slot => {
                const subject = classInfo.subjects.find(s => s.id === slot.subjectId || s.name === slot.subjectName);
                const defaultRoom = rooms.find(r => r.type === 'Instructional');

                return {
                    ...slot,
                    id: generateUUID(),
                    subjectId: subject ? subject.id : 'unknown',
                    teacherId: subject ? subject.teacherId : '',
                    teacherName: subject ? getTeacherName(teachers, subject.teacherId) : '',
                    roomId: defaultRoom?.id,
                    roomName: defaultRoom?.roomNumber,
                    type: slot.type || 'class',
                    activityType: 'Lecture',
                    title: subject?.name || slot.subjectName
                } as ScheduleSlot;
            });

            setSchedule(enrichedSchedule);
        } catch (error) {
            console.error(error);
            alert("Failed to generate schedule.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearSchedule = () => {
        if (confirm("Are you sure you want to clear the entire schedule for this class? This cannot be undone.")) {
            setSchedule([]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedClass = { ...classInfo, schedule: schedule };
            const updatedAllClasses = allClasses.map(c => c.id === classInfo.id ? updatedClass : c);

            await saveClasses(userId, updatedAllClasses);

            alert("Schedule saved successfully!");
            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save schedule.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDrop = (day: string, time: string) => {
        if (!draggedActivityType) return;
        setSelectedSlot({ day, time });
    };

    const handleAssignSlot = (data: Partial<ScheduleSlot>) => {
        if (!selectedSlot) return;

        const endTime = timeSlots.find(t => t.start === selectedSlot.time)?.end || selectedSlot.time;

        let roomInfo = undefined;
        if (selectedRoomId) {
            const r = rooms.find(room => room.id === selectedRoomId);
            if (r) roomInfo = { id: r.id, name: r.roomNumber };
        }

        const subjectId = data.subjectId || 'general';
        const subject = classInfo.subjects.find(s => s.id === subjectId);
        const teacherId = subject?.teacherId || data.teacherId || '';

        const newSlot: ScheduleSlot = {
            id: generateUUID(),
            day: selectedSlot.day,
            startTime: selectedSlot.time,
            endTime,
            subjectId,
            subjectName: data.subjectName || 'General',
            teacherId,
            teacherName: getTeacherName(teachers, teacherId),
            roomId: roomInfo?.id,
            roomName: roomInfo?.name,
            type: data.type || 'class',
            activityType: data.activityType as any || 'Lecture',
            title: data.title || 'Class'
        };

        const cleanSchedule = schedule.filter(s => !(s.day === selectedSlot.day && s.startTime === selectedSlot.time));

        setSchedule([...cleanSchedule, newSlot]);
        setSelectedSlot(null);
        setSelectedRoomId('');
        setDraggedActivityType(null);
        setLockedSubjectId(null);
    };

    const handleClearSlot = (day: string, time: string) => {
        setSchedule(prev => prev.filter(s => !(s.day === day && s.startTime === time)));
    };

    const handleSlotClick = (day: string, time: string) => {
        const slot = schedule.find(s => s.day === day && s.startTime === time);
        if (slot) {
            const isBreak = slot.type === 'break';
            setLockedSubjectId(isBreak ? null : slot.subjectId);
        } else {
            setLockedSubjectId(null);
        }
        setSelectedSlot({ day, time });
    };

    return (
        <div className="animate-fade-in-up h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <ChevronDownIcon className="w-6 h-6 rotate-90" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-2 text-indigo-500" />
                            Master Schedule Editor
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                            {classInfo.gradeLevel} - {classInfo.section}
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            {isRestricted ? `Teacher View (${currentTeacher?.firstName})` : `Admin Control (${availableSubjects.length} Subjects)`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 mr-4">
                        <span className="text-xs font-bold text-slate-400 uppercase px-2">Hrs</span>
                        <input type="time" value={startHour} onChange={e => setStartHour(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-16" disabled={isRestricted} />
                        <span className="text-slate-400">-</span>
                        <input type="time" value={endHour} onChange={e => setEndHour(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-16" disabled={isRestricted} />
                    </div>

                    {!isRestricted && (
                        <button
                            onClick={handleClearSchedule}
                            disabled={schedule.length === 0}
                            className="flex items-center px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-sm transition-all shadow-sm"
                        >
                            <TrashIcon className="w-4 h-4 mr-2" /> Clear
                        </button>
                    )}

                    {!isRestricted && (
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all shadow-md"
                        >
                            {isGenerating ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SparklesIcon className="w-4 h-4 mr-2" />}
                            Auto-Fill
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || (isRestricted && availableSubjects.length === 0)}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <SubjectPalette
                    subjects={availableSubjects}
                    teachers={teachers}
                    onDragStart={setDraggedActivityType}
                    onDragEnd={() => setDraggedActivityType(null)}
                />

                <ScheduleGrid
                    timeSlots={timeSlots}
                    schedule={schedule}
                    onDrop={handleDrop}
                    onSlotClick={handleSlotClick}
                    onClearSlot={handleClearSlot}
                    currentClassId={classInfo.id}
                    allClasses={allClasses}
                />
            </div>

            {selectedSlot && (
                <SlotModal
                    day={selectedSlot.day}
                    time={selectedSlot.time}
                    subjects={availableSubjects}
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    onRoomChange={setSelectedRoomId}
                    onAssign={handleAssignSlot}
                    onClear={() => {
                        handleClearSlot(selectedSlot.day, selectedSlot.time);
                        setSelectedSlot(null);
                    }}
                    onClose={() => { setSelectedSlot(null); setDraggedActivityType(null); setLockedSubjectId(null); }}
                    allClasses={allClasses}
                    currentClassId={classInfo.id}
                    initialActivityType={draggedActivityType}
                    forcedSubjectId={lockedSubjectId}
                />
            )}
        </div>
    );
};
