import React, { useState } from 'react';
import { Teacher, SchoolInfo, ClassInfo, SchoolRoom } from '../../../types'; // Added SchoolRoom import
import { getTeacherName, generateTimeSlots, DAYS } from '../ScheduleUtils';
import { ChevronDownIcon, ClockIcon, CheckCircleIcon, XIcon, BriefcaseIcon, GridIcon } from '../../icons';

interface AvailabilityCheckerViewProps {
    schools: SchoolInfo[];
    teachers: Teacher[];
    activeClasses: ClassInfo[];
    activeTeachers: Teacher[];
    selectedSchoolId: string;
}

export const AvailabilityCheckerView: React.FC<AvailabilityCheckerViewProps> = ({
    schools,
    teachers,
    activeClasses,
    activeTeachers,
    selectedSchoolId
}) => {
    const [checkDay, setCheckDay] = useState('Monday');
    const [checkTime, setCheckTime] = useState('08:00');

    const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const checkStart = toMinutes(checkTime);
    const checkEnd = checkStart + 60; // Assuming 1 hour check

    // 1. Teacher Availability
    // NOTE: Using 'any' for conflict type temporarily if strict type needed, or just string.
    // The original code used { teacher: Teacher, conflict: string }.
    const availableTeachers: Teacher[] = [];
    const busyTeachers: { teacher: Teacher, conflict: string }[] = [];

    activeTeachers.forEach(teacher => {
        let isBusy = false;
        let busyDetail = '';

        for (const cls of activeClasses) {
            if (!cls.schedule) continue;
            for (const slot of cls.schedule) {
                if (slot.day === checkDay && slot.teacherId === teacher.id) {
                    const sStart = toMinutes(slot.startTime);
                    const sEnd = toMinutes(slot.endTime);
                    if (checkStart < sEnd && checkEnd > sStart) {
                        isBusy = true;
                        busyDetail = `${slot.subjectName} (${cls.gradeLevel} - ${cls.section})`;
                        break;
                    }
                }
            }
            if (isBusy) break;
        }

        if (isBusy) {
            busyTeachers.push({ teacher, conflict: busyDetail });
        } else {
            availableTeachers.push(teacher);
        }
    });

    // 2. Room Availability
    let allRooms: SchoolRoom[] = [];
    if (!selectedSchoolId) {
        allRooms = schools.flatMap(s => s.rooms || []);
    } else {
        const activeSchool = schools.find(s => s.id === selectedSchoolId);
        allRooms = activeSchool?.rooms || [];
    }

    const availableRooms: SchoolRoom[] = [];
    const busyRooms: { room: SchoolRoom, conflict: string }[] = [];

    allRooms.forEach(room => {
        let isBusy = false;
        let busyDetail = '';

        for (const cls of activeClasses) {
            if (!cls.schedule) continue;
            for (const slot of cls.schedule) {
                if (slot.day === checkDay && slot.roomId === room.id) {
                    const sStart = toMinutes(slot.startTime);
                    const sEnd = toMinutes(slot.endTime);
                    // Check overlap
                    if (checkStart < sEnd && checkEnd > sStart) {
                        isBusy = true;
                        busyDetail = `${cls.gradeLevel} - ${cls.section} (${slot.subjectName})`;
                        break;
                    }
                }
            }
            if (isBusy) break;
        }

        if (isBusy) {
            busyRooms.push({ room, conflict: busyDetail });
        } else {
            availableRooms.push(room);
        }
    });

    // Generate Time Options
    const timeOptions = generateTimeSlots('07:00', '18:00', 30).map(t => t.start);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Controls */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Day of Week</label>
                    <div className="relative">
                        <select
                            value={checkDay}
                            onChange={e => setCheckDay(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm outline-none"
                        >
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Time Slot (1 Hour)</label>
                    <div className="relative">
                        <ClockIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <select
                            value={checkTime}
                            onChange={e => setCheckTime(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm outline-none"
                        >
                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Faculty Section */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pl-2">
                        <BriefcaseIcon className="w-5 h-5 text-indigo-500" /> Faculty Status
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px]">
                        {/* Available Faculty Column */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full shadow-sm">
                            <div className="p-4 bg-green-50/50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
                                <h3 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2 text-sm">
                                    <CheckCircleIcon className="w-4 h-4" /> Available
                                </h3>
                                <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-black text-green-600 dark:text-green-400 shadow-sm">{availableTeachers.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {availableTeachers.map(t => (
                                    <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-xs font-bold">
                                            {t.firstName.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{getTeacherName(teachers, t.id)}</span>
                                    </div>
                                ))}
                                {availableTeachers.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No teachers available.</div>}
                            </div>
                        </div>

                        {/* Busy Faculty Column */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full shadow-sm">
                            <div className="p-4 bg-red-50/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 flex justify-between items-center">
                                <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
                                    <XIcon className="w-4 h-4" /> Busy
                                </h3>
                                <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-black text-red-600 dark:text-red-400 shadow-sm">{busyTeachers.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {busyTeachers.map(item => (
                                    <div key={item.teacher.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between gap-3 border border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center text-xs font-bold shrink-0">
                                                {item.teacher.firstName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{getTeacherName(teachers, item.teacher.id)}</div>
                                                <div className="text-[10px] text-red-500 font-bold uppercase truncate">{item.conflict}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {busyTeachers.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No conflicts.</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Facilities Section */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pl-2">
                        <GridIcon className="w-5 h-5 text-emerald-500" /> Facility Status
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px]">
                        {/* Available Rooms Column */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full shadow-sm">
                            <div className="p-4 bg-green-50/50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
                                <h3 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2 text-sm">
                                    <CheckCircleIcon className="w-4 h-4" /> Available Rooms
                                </h3>
                                <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-black text-green-600 dark:text-green-400 shadow-sm">{availableRooms.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {availableRooms.map(r => (
                                    <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between gap-3 border border-transparent hover:border-green-200 dark:hover:border-green-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-xs font-bold">
                                                {r.roomNumber.replace('Rm', '').trim()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.roomNumber}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{r.type}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400">{r.capacity} pax</div>
                                    </div>
                                ))}
                                {availableRooms.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No rooms available.</div>}
                            </div>
                        </div>

                        {/* Busy Rooms Column */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full shadow-sm">
                            <div className="p-4 bg-red-50/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 flex justify-between items-center">
                                <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
                                    <XIcon className="w-4 h-4" /> Occupied Rooms
                                </h3>
                                <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-black text-red-600 dark:text-red-400 shadow-sm">{busyRooms.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {busyRooms.map(item => (
                                    <div key={item.room.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex flex-col gap-2 border border-red-100 dark:border-red-900/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center text-xs font-bold">
                                                    {item.room.roomNumber.replace('Rm', '').trim()}
                                                </div>
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.room.roomNumber}</div>
                                            </div>
                                        </div>
                                        <div className="pl-11">
                                            <div className="text-[10px] text-red-500 font-bold uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded inline-block">
                                                {item.conflict}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {busyRooms.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No rooms occupied.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
