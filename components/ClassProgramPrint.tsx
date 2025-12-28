
import React from 'react';
import { ClassInfo, ScheduleSlot, SchoolInfo, Teacher } from '../types';
import { ScheduleGrid } from './schedule/ScheduleGrid';
import { generateTimeSlots, getTeacherName } from './schedule/ScheduleUtils';
import { CalendarIcon, SchoolIcon, ClockIcon } from './icons';

interface ClassProgramPrintProps {
    classInfo: ClassInfo;
    schedule: ScheduleSlot[];
    school?: SchoolInfo;
    adviserName: string;
    onClose: () => void;
}

export const ClassProgramPrint = ({ classInfo, schedule, school, adviserName, onClose }: ClassProgramPrintProps) => {

    // Auto-print on mount
    React.useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        const afterPrint = () => {
            onClose();
        };

        window.addEventListener('afterprint', afterPrint);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', afterPrint);
        }
    }, [onClose]);

    const timeSlots = generateTimeSlots('07:00', '18:00', 30);

    return (
        <div className="fixed inset-0 z-[9999] bg-white text-slate-900 overflow-auto animate-fade-in">
            <div className="p-8 max-w-[1100px] mx-auto min-h-screen flex flex-col">

                {/* Print Control Header (Screen Only) */}
                <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold">Print Preview</h2>
                        <p className="text-slate-500 text-sm">Printing Class Program for {classInfo.gradeLevel} - {classInfo.section}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Print</button>
                        <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300">Close</button>
                    </div>
                </div>

                {/* Official Header */}
                <div className="text-center mb-6">
                    <p className="text-sm uppercase tracking-widest font-bold">Department of Education</p>
                    <p className="text-xs">Region IV-A CALABARZON</p>
                    <p className="text-xs">Division of [City/Province]</p>
                    {school && <p className="font-bold text-lg mt-1">{school.schoolName.toUpperCase()}</p>}
                    <h1 className="text-2xl font-black uppercase mt-4 mb-1">Class Program</h1>
                    <p className="font-bold">SY 2024-2025</p>
                </div>

                {/* Class Info */}
                <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
                    <div>
                        <p className="font-bold text-lg">{classInfo.gradeLevel} - {classInfo.section}</p>
                        <p className="text-sm font-medium">Adviser: {adviserName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm"><span className="font-bold">Room:</span> {classInfo.roomId || 'TBA'}</p>
                        <p className="text-sm"><span className="font-bold">Shift:</span> {classInfo.shift || 'Whole Day'}</p>
                    </div>
                </div>

                {/* Schedule Grid */}
                <div className="flex-grow border-2 border-black rounded-xl overflow-hidden mb-8">
                    <div className="bg-slate-50 border-b border-black p-2 text-center font-bold uppercase text-xs print:bg-slate-100 print:text-black">
                        Weekly Schedule Matrix
                    </div>
                    <ScheduleGrid
                        timeSlots={timeSlots}
                        schedule={schedule}
                        currentClassId={classInfo.id}
                        allClasses={[]} // checkConflict not needed for print
                        readOnly={true}
                    />
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-auto pt-10">
                    <div className="text-center">
                        <div className="w-full border-b border-black mb-2"></div>
                        <p className="font-bold uppercase text-xs">Prepared By:</p>
                        <p className="text-sm font-bold mt-4">{adviserName}</p>
                        <p className="text-xs">Class Adviser</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full border-b border-black mb-2"></div>
                        <p className="font-bold uppercase text-xs">Recommending Approval:</p>
                        <p className="text-sm font-bold mt-4">[Head Teacher Name]</p>
                        <p className="text-xs">Head Teacher</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full border-b border-black mb-2"></div>
                        <p className="font-bold uppercase text-xs">Approved:</p>
                        <p className="text-sm font-bold mt-4">[Principal Name]</p>
                        <p className="text-xs">Principal</p>
                    </div>
                </div>

                <style>{`
                    @media print {
                        @page { size: landscape; margin: 0.5in; }
                        body { background: white; }
                        .animate-fade-in { animation: none !important; }
                    }
                `}</style>
            </div>
        </div>
    );
};
