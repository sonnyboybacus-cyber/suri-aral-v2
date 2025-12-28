
import React, { useMemo, useState, useEffect } from 'react';
import { ClassSubject, SchoolRoom, ClassInfo, ScheduleSlot } from '../../types';
import { XIcon, GridIcon, ChevronDownIcon, TrashIcon, BookOpenIcon, LockIcon, CalendarIcon, CoffeeIcon, AlertTriangleIcon } from '../icons';
import { checkScheduleConflict } from './ScheduleUtils';

interface SlotModalProps {
    day: string;
    time: string;
    subjects: ClassSubject[];
    rooms: SchoolRoom[];
    selectedRoomId: string;
    onRoomChange: (id: string) => void;
    onAssign: (data: Partial<ScheduleSlot>) => void;
    onClear: () => void;
    onClose: () => void;
    allClasses?: ClassInfo[];
    currentClassId?: string;
    initialActivityType?: string | null;
    forcedSubjectId?: string | null;
}

export const SlotModal = ({
    day, time, subjects, rooms, selectedRoomId, onRoomChange, onAssign, onClear, onClose, allClasses, currentClassId, initialActivityType, forcedSubjectId
}: SlotModalProps) => {

    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [activityType, setActivityType] = useState('Lecture');

    useEffect(() => {
        if (initialActivityType === 'Break') {
            setActivityType('Break');
        } else {
            setActivityType('Lecture');
        }
    }, [initialActivityType]);

    useEffect(() => {
        if (forcedSubjectId) {
            setSelectedSubjectId(forcedSubjectId);
        } else if (subjects.length === 1 && !selectedSubjectId) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [subjects, selectedSubjectId, forcedSubjectId]);

    const { busyMap } = useMemo(() => {
        const map: Record<string, string> = {};

        if (allClasses && currentClassId) {
            subjects.forEach(sub => {
                const [h, m] = time.split(':').map(Number);
                const endH = h + 1;
                const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                // Pass currentClassId to avoid self-conflict
                const conflict = checkScheduleConflict(day, time, endTime, currentClassId, allClasses, sub.teacherId);
                if (conflict) map[sub.id] = conflict;
            });
        }
        return { busyMap: map };
    }, [subjects, day, time, allClasses, currentClassId]);

    const handleSave = () => {
        if (activityType === 'Break') {
            onAssign({
                type: 'break',
                activityType: 'Break' as any,
                subjectId: 'non-acad',
                subjectName: 'BREAK',
                title: 'Break / Recess'
            });
            return;
        }

        if (!selectedSubjectId) {
            if (subjects.length === 1) {
                const autoSubject = subjects[0];
                onAssign({
                    type: 'class',
                    activityType: 'Lecture',
                    title: autoSubject.name,
                    subjectId: autoSubject.id,
                    subjectName: autoSubject.name,
                    teacherId: autoSubject.teacherId,
                });
                return;
            } else {
                alert("Please select a subject for this class.");
                return;
            }
        }

        const subject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

        if (!subject) {
            alert("No valid subject available. You may not be assigned to this class.");
            return;
        }

        onAssign({
            type: 'class',
            activityType: 'Lecture',
            title: subject.name,
            subjectId: subject.id,
            subjectName: subject.name,
            teacherId: subject.teacherId,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Configure Slot</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{day} @ {time}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                </div>

                {subjects.length === 0 && activityType !== 'Break' ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm text-center mb-4 border border-red-100 dark:border-red-900">
                        <LockIcon className="w-6 h-6 mx-auto mb-2" />
                        You are not assigned to teach any subjects in this class. You can only schedule breaks.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Slot Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setActivityType('Lecture')}
                                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${activityType === 'Lecture' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-700 border-transparent text-slate-500'}`}
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">Official Class</span>
                                </button>
                                <button
                                    onClick={() => setActivityType('Break')}
                                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${activityType === 'Break' ? 'bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-600 dark:text-white' : 'bg-slate-50 dark:bg-slate-700 border-transparent text-slate-500'}`}
                                >
                                    <CoffeeIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">Break / Recess</span>
                                </button>
                            </div>
                        </div>

                        {activityType === 'Lecture' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Subject</label>
                                <div className="relative">
                                    <BookOpenIcon className={`absolute left-3 top-2.5 w-4 h-4 ${forcedSubjectId ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    <select
                                        value={selectedSubjectId}
                                        onChange={e => setSelectedSubjectId(e.target.value)}
                                        className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${forcedSubjectId ? 'opacity-80 font-bold bg-indigo-50/50 cursor-not-allowed' : ''}`}
                                        disabled={subjects.length === 1 || !!forcedSubjectId}
                                    >
                                        {subjects.length > 1 && !forcedSubjectId && <option value="" className="dark:bg-slate-800 text-slate-900 dark:text-slate-200">-- Select Subject --</option>}
                                        {subjects.map(sub => (
                                            <option key={sub.id} value={sub.id} className="dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                                                {sub.name} {busyMap[sub.id] ? '(Teacher Busy)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {subjects.length === 0 && (
                                        <p className="mt-1 text-[10px] text-red-500 font-bold">
                                            No subjects found. Please go to Class Information &gt; Edit Class to add subjects to the curriculum.
                                        </p>
                                    )}
                                    {subjects.length > 1 && !forcedSubjectId && <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />}
                                    {forcedSubjectId && <LockIcon className="absolute right-3 top-3 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />}
                                </div>
                                {selectedSubjectId && busyMap[selectedSubjectId] && (
                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800 flex items-center text-xs text-red-600 dark:text-red-300">
                                        <AlertTriangleIcon className="w-3 h-3 mr-2 flex-shrink-0" />
                                        {busyMap[selectedSubjectId]}
                                    </div>
                                )}
                            </div>
                        )}

                        {activityType === 'Lecture' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Venue / Room</label>
                                <div className="relative">
                                    <GridIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <select
                                        value={selectedRoomId}
                                        onChange={e => onRoomChange(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    >
                                        <option value="" className="dark:bg-slate-800 text-slate-900 dark:text-slate-200">-- Default Classroom --</option>
                                        {rooms.map(r => (
                                            <option key={r.id} value={r.id} className="dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                                                {r.roomNumber} ({r.type})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6 flex gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <button
                        onClick={onClear}
                        className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center font-bold text-xs"
                        title="Clear Slot"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" /> Clear
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={subjects.length === 0 && activityType !== 'Break'}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Slot
                    </button>
                </div>
            </div>
        </div>
    );
};
