import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { ClassInfo, Teacher, ScheduleSlot, SchoolInfo } from '../types';
import { loadClasses, loadTeachers, loadSchools } from '../services/databaseService';
import {
    BriefcaseIcon, PrinterIcon, ClockIcon, CalendarIcon,
    SchoolIcon, UserIcon
} from './icons';
import { ScheduleGrid } from './schedule/ScheduleGrid';
import { generateTimeSlots, getTeacherName, DAYS } from './schedule/ScheduleUtils';

interface TeacherScheduleViewProps {
    user: firebase.User;
}

export const TeacherScheduleView = ({ user }: TeacherScheduleViewProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [myTeacherProfile, setMyTeacherProfile] = useState<Teacher | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Determine if user is a teacher by checking the teachers collection
                const [c, t, s] = await Promise.all([
                    loadClasses(user.uid),
                    loadTeachers(user.uid),
                    loadSchools(user.uid)
                ]);

                setClasses(c.filter(x => !x.deletedAt));
                setTeachers(t.filter(x => !x.deletedAt));
                setSchools(s.filter(x => !x.deletedAt));

                // Find my profile
                const myProfile = t.find(teacher => teacher.linkedAccountId === user.uid);
                setMyTeacherProfile(myProfile || null);

            } catch (error) {
                console.error("Failed to load schedule data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.uid]);

    // Derived Schedule
    const mySchedule = useMemo(() => {
        if (!myTeacherProfile) return [];
        const slots: ScheduleSlot[] = [];

        classes.forEach(cls => {
            if (cls.schedule) {
                cls.schedule.forEach(slot => {
                    if (slot.teacherId === myTeacherProfile.id) {
                        const school = schools.find(s => s.id === cls.schoolId);
                        const schoolLabel = school ? `[${school.schoolName.substring(0, 10)}...]` : '';

                        slots.push({
                            ...slot,
                            subjectName: `${schoolLabel}${slot.subjectName} (${cls.gradeLevel} -${cls.section})`
                        });
                    }
                });
            }
        });
        return slots;
    }, [classes, myTeacherProfile, schools]);

    const timeSlots = generateTimeSlots('07:00', '18:00', 30);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!myTeacherProfile) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <BriefcaseIcon className="w-16 h-16 mb-4 text-slate-300" />
                <h2 className="text-xl font-bold mb-2">Teacher Profile Not Found</h2>
                <p>Please ensure your account is linked to a teacher profile.</p>
            </div>
        );
    }

    return (
        <div className="font-sans text-slate-800 dark:text-slate-200 p-4 md:p-8 space-y-8 print:p-0 print:space-y-4 animate-fade-in-up">

            {/* Header - Hidden in Print if needed, but usually kept for official header */}
            <div className="flex justify-between items-start">
                <div className="print:w-full print:text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 print:text-black">Official Schedule</h1>
                    <div className="flex flex-col print:items-center">
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 print:text-black">
                            {getTeacherName(teachers, myTeacherProfile.id)}
                        </p>
                        <p className="text-sm text-slate-500 font-medium print:text-slate-700">
                            {myTeacherProfile.position} • {myTeacherProfile.status}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors print:hidden"
                >
                    <PrinterIcon className="w-5 h-5" /> Print Official Copy
                </button>
            </div>

            {/* Print Only Header Info (School Logo etc placeholder) */}
            <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
                <p className="text-sm uppercase tracking-widest font-bold">Department of Education</p>
                <p className="text-xs">Region IV-A CALABARZON</p>
                <p className="text-xs">Division of [City/Province]</p>
                <h2 className="text-xl font-black uppercase mt-4">Teacher's Program</h2>
                <p className="text-sm">SY 2024-2025</p>
            </div>

            {/* Stats Cards - Hidden on Print */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Teaching Hours</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                            {mySchedule.length} <span className="text-sm font-medium text-slate-500">hrs/week</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center">
                        <SchoolIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Sections</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                            {new Set(mySchedule.map(s => s.subjectName.split('(')[1])).size}
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule View */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg print:shadow-none print:border-2 print:border-black print:rounded-none">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 print:bg-white print:border-black">
                    <h3 className="font-bold flex items-center gap-2 print:hidden">
                        <CalendarIcon className="w-5 h-5 text-slate-500" /> Weekly Schedule
                    </h3>
                    <div className="hidden print:block text-center font-bold uppercase text-sm">Class Schedule Matrix</div>
                </div>

                <div className="h-[800px] print:h-auto flex flex-col">
                    <ScheduleGrid
                        timeSlots={timeSlots}
                        schedule={mySchedule}
                        currentClassId="my-schedule"
                        allClasses={classes} // For conflict checking if needed, though simpler here
                        readOnly={true}
                    />
                </div>
            </div>

            {/* Official Signatures - Visible Only on Print */}
            <div className="hidden print:flex justify-between items-end mt-20 px-8">
                <div className="text-center">
                    <div className="w-64 border-b border-black mb-2"></div>
                    <p className="font-bold uppercase text-sm">{getTeacherName(teachers, myTeacherProfile.id)}</p>
                    <p className="text-xs">Teacher I</p>
                </div>
                <div className="text-center">
                    <div className="w-64 border-b border-black mb-2"></div>
                    <p className="font-bold uppercase text-sm">Approved By</p>
                    <p className="text-xs">Principal / School Head</p>
                </div>
            </div>

            <style>{`
@media print {
    body * {
        visibility: hidden;
    }
        .animate - fade -in -up, .animate - fade -in -up * {
            visibility: visible;
        }
            .animate - fade -in -up {
        position: absolute;
        left: 0;
        top: 0;
        width: 100 %;
    }
                    /* Hide scrollbars, backgrounds */
                    :: -webkit - scrollbar { display: none; }
}
`}</style>
        </div>
    );
};
