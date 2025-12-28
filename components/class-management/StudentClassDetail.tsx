import React, { useState, useEffect } from 'react';
import { ClassInfo, StudentSF1, Teacher, Subject } from '../../types';
import { UserIcon, ArrowLeftIcon, MessageSquareIcon, BookOpenIcon, UsersIcon, CalendarIcon, SchoolIcon } from '../icons';
import { loadStudents_SF1, loadTeachers, loadSubjects } from '../../services/databaseService';

interface StudentClassDetailProps {
    classInfo: ClassInfo;
    user: firebase.default.User;
    onBack: () => void;
}

type Tab = 'stream' | 'classwork' | 'people';

export const StudentClassDetail: React.FC<StudentClassDetailProps> = ({ classInfo, user, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('stream');
    const [students, setStudents] = useState<StudentSF1[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Load Students (Classmates)
                // Note: We don't have a direct "load by class ID" strictly for students if they are just linked by ID array, 
                // but loadStudents_SF1 returns all. We can filter.
                // Assuming loadStudents_SF1 returns all students, we filter by classInfo.studentIds
                const allStudents = await loadStudents_SF1(user.uid);
                // Class stores Auth UIDs in studentIds. StudentSF1 stores Auth UID in linkedAccountId.
                const classStudents = allStudents.filter(s => classInfo.studentIds?.includes(s.linkedAccountId || ''));
                setStudents(classStudents);

                const allTeachers = await loadTeachers(user.uid);
                setTeachers(allTeachers);

                // Load Subjects (For Classwork)
                const allSubjects = await loadSubjects();
                setSubjects(allSubjects);

            } catch (error) {
                console.error("Error loading class details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classInfo]);

    const adviser = teachers.find(t => t.id === classInfo.adviserId);

    // Filter subjects for this grade level or assume all for now?
    // Ideally we filter subjects assigned to this section/class.
    // For now we show subjects matching grade level.
    const classSubjects = subjects.filter(s => s.gradeLevel === classInfo.gradeLevel);


    const renderStream = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Announcement Input Placeholder (Read Only for student usually, or comment) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <UserIcon className="w-5 h-5" />
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                    Announce something to your class...
                </div>
            </div>

            {/* Mock Announcement Posts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {adviser?.firstName?.[0] || 'T'}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                {adviser ? `${adviser.firstName} ${adviser.lastName}` : 'Class Adviser'}
                            </h4>
                            <span className="text-xs text-slate-500">Posted a new assignment: Week 4 - Botany</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400">Oct 24</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Good morning class! Please check the Classwork tab for the new botany module. Don't forget to submit before Friday!
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                            S
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                Science Department
                            </h4>
                            <span className="text-xs text-slate-500">Posted a material: Lab Safety Guidelines</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400">Oct 20</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center gap-3 mt-2">
                    <div className="w-10 h-10 bg-red-100 text-red-500 flex items-center justify-center rounded-lg">
                        <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Lab_Safety_2025.pdf</div>
                        <div className="text-xs text-slate-500">PDF Document</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderClasswork = () => (
        <div className="animate-fade-in space-y-6">
            {classSubjects.map(subject => (
                <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BookOpenIcon className="w-5 h-5 text-indigo-500" />
                            {subject.name}
                        </h3>
                        <span className="text-xs font-mono text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            {subject.code}
                        </span>
                    </div>
                    <div className="p-4 space-y-3">
                        {/* Placeholder Content for Modules */}
                        <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <MessageSquareIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Module 1: Introduction</div>
                                <div className="text-xs text-slate-400">Posted Oct 12</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <MessageSquareIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Module 2: Core Concepts</div>
                                <div className="text-xs text-slate-400">Posted Oct 19</div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {classSubjects.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic">No subjects scheduled yet.</div>
            )}
        </div>
    );

    const renderPeople = () => (
        <div className="animate-fade-in space-y-8">
            {/* Teachers Section */}
            <div>
                <h3 className="text-2xl text-indigo-600 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-4 font-normal">Teachers</h3>
                <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                            {adviser?.firstName?.[0] || 'T'}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {adviser ? `${adviser.firstName} ${adviser.lastName}` : 'Unassigned Class Adviser'}
                        </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded">Adviser</span>
                </div>
                {/* Provide placeholder for other subject teachers if we had mapping */}
            </div>

            {/* Classmates Section */}
            <div>
                <div className="flex justify-between items-end border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-4">
                    <h3 className="text-2xl text-indigo-600 dark:text-indigo-400 font-normal">Classmates</h3>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mb-1">{students.length} students</span>
                </div>

                <div className="space-y-1">
                    {students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                                    {(student.firstName?.[0] || '') + (student.lastName?.[0] || '')}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                                    {`${student.firstName} ${student.lastName}`}
                                </span>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="p-4 text-slate-400 italic text-sm">No other students in this class yet.</div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Nav Bar */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                        {classInfo.gradeLevel} - {classInfo.section}
                    </h1>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {adviser ? `${adviser.firstName} ${adviser.lastName}` : 'No Adviser'}
                    </span>
                </div>
            </div>

            {/* Banner (Stream Only mostly, but let's keep it minimal if we change tabs? Or Google Classroom style keeps it in Stream) */}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
                <div className="px-4 pt-6 pb-2">
                    <div className="h-48 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden flex flex-col justify-end p-6 shadow-lg text-white">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <SchoolIcon className="w-32 h-32" />
                        </div>
                        <h2 className="text-4xl font-bold mb-2 relative z-10">{classInfo.section}</h2>
                        <p className="text-indigo-100 text-lg relative z-10">{classInfo.gradeLevel}</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-8 px-6 border-b border-slate-200 dark:border-slate-800 mb-6 bg-white dark:bg-slate-900 sticky top-[73px] z-10">
                    <button
                        onClick={() => setActiveTab('stream')}
                        className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'stream' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Stream
                    </button>
                    <button
                        onClick={() => setActiveTab('classwork')}
                        className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'classwork' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Classwork
                    </button>
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'people' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        People
                    </button>
                </div>

                <div className="flex-1 px-4 pb-20 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'stream' && renderStream()}
                            {activeTab === 'classwork' && renderClasswork()}
                            {activeTab === 'people' && renderPeople()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
