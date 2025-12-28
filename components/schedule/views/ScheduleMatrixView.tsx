import React, { ReactNode } from 'react'; // ReactNode added
import { ClassInfo, SchoolInfo, Teacher } from '../../../types';
import { checkScheduleConflict, getTeacherName } from '../ScheduleUtils';
import { AlertTriangleIcon, CheckCircleIcon, TrashIcon, UserIcon, PrinterIcon } from '../../icons';

interface ScheduleMatrixViewProps {
    classes: ClassInfo[];
    schools: SchoolInfo[];
    teachers: Teacher[];
    selectedSchoolId: string;
    selectedGradeLevel: string;
    onEditClass: (classId: string) => void;
    onClearSingle: (e: React.MouseEvent, cls: ClassInfo) => void;
    onPrintClass: (e: React.MouseEvent, cls: ClassInfo) => void;
    renderSchoolList: () => ReactNode; // Accept renderSchoolList as prop or component
}

export const ScheduleMatrixView: React.FC<ScheduleMatrixViewProps> = ({
    classes,
    schools,
    teachers,
    selectedSchoolId,
    selectedGradeLevel,
    onEditClass,
    onClearSingle,
    onPrintClass,
    renderSchoolList
}) => {
    // NEW LOGIC: If no school selected, show school list instead of all sections
    if (!selectedSchoolId) {
        return <>{renderSchoolList()}</>;
    }

    const displayClasses = selectedGradeLevel === 'All'
        ? classes
        : classes.filter(c => c.gradeLevel === selectedGradeLevel);

    if (displayClasses.length === 0) {
        return <div className="text-center py-20 text-slate-400 italic">No classes found for this criteria.</div>;
    }

    // Helper: Class Status Check
    const getClassStatus = (cls: ClassInfo) => {
        if (!cls.schedule || cls.schedule.length === 0) return 'empty';
        // Note: Ideally checkScheduleConflict should be optimized or passed down, 
        // but for now it's imported from utils which iterates on `classes`.
        for (const slot of cls.schedule) {
            const conflict = checkScheduleConflict(
                slot.day,
                slot.startTime,
                slot.endTime,
                cls.id,
                classes,
                slot.teacherId,
                slot.roomId
            );
            if (conflict) return 'conflict';
        }
        return 'ok';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Class Sections</h3>
                    <p className="text-slate-500 text-sm">Manage class schedules and conflicts</p>
                </div>
                <div className="text-sm text-slate-500">
                    Showing {displayClasses.length} class{displayClasses.length !== 1 ? 'es' : ''}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayClasses.map(cls => {
                    const status = getClassStatus(cls);
                    const subjectCount = cls.subjects?.length || 0;
                    const scheduledCount = cls.schedule?.filter(s => s.type !== 'break').length || 0;
                    const hasSchedule = scheduledCount > 0;

                    return (
                        <div
                            key={cls.id}
                            onClick={() => onEditClass(cls.id)}
                            className={`bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/10 group relative overflow-hidden ${status === 'conflict' ? 'border-red-200 dark:border-red-900/50 hover:shadow-red-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10'
                                }`}
                        >
                            {/* Status Indicators */}
                            {status === 'conflict' && <div className="absolute top-3 right-3 text-red-500"><AlertTriangleIcon className="w-4 h-4 animate-pulse" /></div>}
                            {status === 'ok' && <div className="absolute top-3 right-3 text-green-500"><CheckCircleIcon className="w-4 h-4" /></div>}

                            {/* Delete Button */}
                            {hasSchedule && (
                                <button
                                    onClick={(e) => onClearSingle(e, cls)}
                                    className="absolute top-3 right-10 p-1 text-slate-300 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="Clear Schedule"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <div className="mb-3">
                                {!selectedSchoolId && (
                                    <div className="text-[10px] font-bold text-indigo-500 uppercase mb-0.5 tracking-wider truncate">
                                        {schools.find(s => s.id === cls.schoolId)?.schoolName}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-1.5 py-0.5 roundedElement bg-white dark:bg-slate-600 text-[9px] font-bold border border-slate-100 dark:border-slate-500 text-slate-600 dark:text-slate-300">
                                        {cls.gradeLevel}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cls.section}</h3>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {getTeacherName(teachers, cls.adviserId).split(',')[0]}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] px-0.5">
                                    <span className="text-slate-400 font-medium uppercase tracking-wider">Schedule</span>
                                    <span className={`font-bold ${scheduledCount < subjectCount * 3 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {Math.round((scheduledCount / (subjectCount * 5 || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-white dark:bg-slate-600 rounded-full overflow-hidden border border-slate-100 dark:border-slate-600/50">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${status === 'conflict' ? 'bg-red-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(((scheduledCount / (subjectCount * 5 || 1)) * 100), 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
