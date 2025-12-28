import React from 'react';
import { SchoolInfo } from '../../../types';

interface FacilitiesViewProps {
    schools: SchoolInfo[];
    selectedSchoolId: string;
}

export const FacilitiesView: React.FC<FacilitiesViewProps> = ({
    schools,
    selectedSchoolId
}) => {
    const targetSchools = !selectedSchoolId ? schools : schools.filter(s => s.id === selectedSchoolId);

    if (targetSchools.length === 0) {
        return <div className="text-center py-20 text-slate-400 italic">No facilities data available.</div>;
    }

    return (
        <div className="space-y-8">
            {targetSchools.map(school => (
                <div key={school.id} className="space-y-4">
                    {!selectedSchoolId && (
                        <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs border-b border-slate-200 dark:border-slate-700 pb-2">
                            {school.schoolName}
                        </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
                        {(school.rooms || []).map((room, idx) => (
                            <div key={room.id || idx} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider mb-2 ${room.type === 'Laboratory' ? 'bg-purple-100 text-purple-700' :
                                            room.type === 'ICT Lab' ? 'bg-blue-100 text-blue-700' :
                                                room.type === 'Library' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                            {room.type}
                                        </span>
                                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                                            {room.roomNumber}
                                        </h3>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${room.condition === 'Good' ? 'bg-green-500' :
                                        room.condition === 'Needs Repair' ? 'bg-amber-500' : 'bg-red-500'
                                        }`} title={`Condition: ${room.condition}`}></div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                                    <span className="font-medium">Capacity</span>
                                    <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{room.capacity}</span>
                                </div>
                            </div>
                        ))}
                        {(school.rooms || []).length === 0 && <div className="text-sm text-slate-400 italic">No facilities added.</div>}
                    </div>
                </div>
            ))}
        </div>
    );
};
