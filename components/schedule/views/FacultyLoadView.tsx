import React from 'react';
import { ClassInfo, Teacher, SchoolInfo, ScheduleSlot } from '../../../types';
import { getTeacherName, generateTimeSlots } from '../ScheduleUtils';
import { ScheduleGrid } from '../ScheduleGrid';
import { BriefcaseIcon } from '../../icons';

interface FacultyLoadViewProps {
    selectedTeacherId: string;
    teachers: Teacher[];
    activeClasses: ClassInfo[];
    schools: SchoolInfo[];
    selectedSchoolId: string;
}

export const FacultyLoadView: React.FC<FacultyLoadViewProps> = ({
    selectedTeacherId,
    teachers,
    activeClasses,
    schools,
    selectedSchoolId
}) => {
    if (!selectedTeacherId) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 opacity-60">
                <BriefcaseIcon className="w-16 h-16 mb-4 stroke-1" />
                <p className="text-lg font-medium">Select a teacher to analyze their workload.</p>
            </div>
        );
    }

    const teacherSchedule: ScheduleSlot[] = [];
    activeClasses.forEach(cls => {
        cls.schedule?.forEach(slot => {
            if (slot.teacherId === selectedTeacherId) {
                const schoolLabel = !selectedSchoolId ? `[${schools.find(s => s.id === cls.schoolId)?.schoolName.substring(0, 10)}...] ` : '';
                teacherSchedule.push({
                    ...slot,
                    subjectName: `${schoolLabel}${slot.subjectName} (${cls.gradeLevel}-${cls.section})`
                });
            }
        });
    });

    const timeSlots = generateTimeSlots('07:30', '16:30', 60);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                        <BriefcaseIcon className="w-5 h-5 text-indigo-500" />
                        {getTeacherName(teachers, selectedTeacherId)}
                    </h3>
                    <p className="text-xs text-slate-500 ml-7">Faculty Load View</p>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl">
                    {teacherSchedule.length} Classes / Week
                </div>
            </div>

            <ScheduleGrid
                timeSlots={timeSlots}
                schedule={teacherSchedule}
                currentClassId="teacher-view"
                allClasses={activeClasses}
                readOnly={true}
            />
        </div>
    );
};
