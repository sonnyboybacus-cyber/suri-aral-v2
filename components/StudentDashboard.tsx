
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserDailyMissions, GamificationProfile, LearningJourney, ClassInfo } from '../types';
import { loadGamificationProfile, getDailyMissions, loadLearningJourneys, joinClassByCode, loadClasses } from '../services/databaseService';
import {
    BrainCircuitIcon, TrendingUpIcon, StarIcon, PlayIcon,
    BookOpenIcon, TargetIcon, AwardIcon, ZapIcon, ClockIcon,
    CheckCircleIcon, ArrowUpRightIcon, PlusIcon, XIcon, SpinnerIcon, SchoolIcon, UsersIcon
} from './icons';
import { GamificationBar } from './GamificationBar';
import { MissionBoard } from './MissionBoard';
import { StudentScheduleWidget } from './dashboard/StudentScheduleWidget';
import { StudentAnnouncements } from './dashboard/StudentAnnouncements';
import { StudentActivityLog } from './dashboard/StudentActivityLog';

interface StudentDashboardProps {
    user: firebase.User;
    setActiveView: (view: any) => void;
    onLaunchTutor: (topic: string) => void;
}

export const StudentDashboard = ({ user, setActiveView, onLaunchTutor }: StudentDashboardProps) => {
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [missions, setMissions] = useState<UserDailyMissions | null>(null);
    const [recentJourneys, setRecentJourneys] = useState<LearningJourney[]>([]);
    const [myClasses, setMyClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Join Class State
    const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
    const [joinCode, setJoinCode] = useState<string>('');
    const [isJoining, setIsJoining] = useState<boolean>(false);

    useEffect(() => {
        console.log("StudentDashboard: Mounting, user:", user.uid);
        const fetchData = async () => {
            console.log("StudentDashboard: Fetching Data...");
            try {
                const [prof, miss, journeys, allClasses] = await Promise.all([
                    loadGamificationProfile(user.uid),
                    getDailyMissions(user.uid),
                    loadLearningJourneys(user.uid),
                    loadClasses(user.uid)
                ]);
                console.log("StudentDashboard: Data loaded", { prof, miss, journeys, classesCount: allClasses?.length });
                setProfile(prof);
                setMissions(miss);
                setRecentJourneys(journeys.sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 3));

                // Filter classes where student is enrolled
                // Note: studentIds stores Auth UIDs (linkedAccountId)
                // Added safety check for allClasses
                const enrolled = (allClasses || []).filter(c => (c.studentIds || []).includes(user.uid));
                console.log("StudentDashboard: Enrolled classes", enrolled);
                setMyClasses(enrolled);
            } catch (error) {
                console.error("Failed to load student dashboard data", error);
            } finally {
                setLoading(false);
                console.log("StudentDashboard: Loading set to false");
            }
        };
        fetchData();
    }, [user.uid]);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading your HQ...</div>;

    const getTimeOfDayGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="min-h-full font-sans text-slate-800 dark:text-slate-200 animate-fade-in pb-20">
            {/* Gamification Top Bar */}
            {profile && <GamificationBar profile={profile} userName={user.displayName || 'Student'} />}

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

                {/* Hero Section */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-10 text-white shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
                                {getTimeOfDayGreeting()}, {(user.displayName || 'Student').split(' ')[0]}!
                            </h1>
                            <p className="text-indigo-100 text-lg font-medium opacity-90 max-w-xl">
                                You're on a <span className="font-bold text-yellow-300">{profile?.current_streak} day streak</span>. Keep the momentum going!
                            </p>
                            <div className="mt-8 flex gap-4">
                                <button
                                    onClick={() => setActiveView('learnSA')}
                                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <BrainCircuitIcon className="w-5 h-5" /> Launch AI Tutor
                                </button>
                                <button
                                    onClick={() => setActiveView('quizSA')}
                                    className="px-6 py-3 bg-indigo-500/30 text-white border border-indigo-400/50 rounded-xl font-bold hover:bg-indigo-500/50 transition-all flex items-center gap-2"
                                >
                                    <TargetIcon className="w-5 h-5" /> Take a Quiz
                                </button>
                                <button
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                                >
                                    <PlusIcon className="w-5 h-5" /> Join Class
                                </button>
                            </div>
                        </div>
                        <div className="hidden md:block transform rotate-6 hover:rotate-0 transition-transform duration-500">
                            {/* 3D-ish Illustration Placeholder */}
                            <div className="w-40 h-40 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 flex items-center justify-center shadow-2xl">
                                <AwardIcon className="w-20 h-20 text-yellow-300 drop-shadow-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 1: Classes & Schedule */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* ACADEMIC CLASSES SECTION */}
                    <section className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <SchoolIcon className="w-5 h-5 text-indigo-500" /> My Classes
                            </h2>
                            <button onClick={() => setActiveView('classInformation')} className="text-sm font-bold text-indigo-500 hover:underline">View All</button>
                        </div>
                        <div className="flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                                {myClasses.length > 0 ? (
                                    myClasses.slice(0, 4).map(cls => (
                                        <div
                                            key={cls.id}
                                            onClick={() => setActiveView('classInformation')}
                                            className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-[180px]"
                                        >
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <SchoolIcon className="w-16 h-16 text-indigo-500" />
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{cls.gradeLevel} - {cls.section}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 uppercase tracking-wider">{cls.schoolYear}</p>
                                            </div>
                                            <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg w-fit">
                                                <UsersIcon className="w-3 h-3" />
                                                {(cls.studentIds || []).length} Students
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 h-full flex flex-col items-center justify-center">
                                        <p className="text-slate-500 mb-4">You are not enrolled in any classes yet.</p>
                                        <button onClick={() => setIsJoinModalOpen(true)} className="text-indigo-600 font-bold hover:underline">Join a Class</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* WEEKLY SCHEDULE WIDGET */}
                    <section className="h-full">
                        <StudentScheduleWidget classes={myClasses} />
                    </section>
                </div>

                {/* Row 2: Announcements & Activity & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Announcements & Activity */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <StudentAnnouncements />
                            <StudentActivityLog userId={user.uid} />
                        </div>

                        {/* Continue Learning */}
                        <section>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-indigo-500" /> Continue Learning
                                </h2>
                                <button onClick={() => setActiveView('learnSA')} className="text-sm font-bold text-indigo-500 hover:underline">View All</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recentJourneys.length > 0 ? (
                                    recentJourneys.map(journey => (
                                        <div
                                            key={journey.id}
                                            onClick={() => { setActiveView('learnSA'); /* In real app, pass journey ID */ }}
                                            className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 group-hover:w-2 transition-all"></div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                    {journey.style}
                                                </span>
                                                <ArrowUpRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {journey.topic}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(journey.completedModules / journey.totalModules) * 100}%` }}></div>
                                                </div>
                                                <span>{Math.round((journey.completedModules / journey.totalModules) * 100)}%</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-500 mb-4">No active courses yet.</p>
                                        <button onClick={() => setActiveView('learnSA')} className="text-indigo-600 font-bold hover:underline">Start a new journey</button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Quick Tools */}
                        <section>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ZapIcon className="w-5 h-5 text-amber-500" /> Toolbox
                                </h2>
                                <button
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                >
                                    <PlusIcon className="w-4 h-4" /> Join Class
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onClick={() => setActiveView('studyPlanner')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all text-center group">
                                    <div className="w-10 h-10 mx-auto bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <ClockIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Planner</span>
                                </button>
                                <button onClick={() => setActiveView('readingSA')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all text-center group">
                                    <div className="w-10 h-10 mx-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <BookOpenIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Reading</span>
                                </button>
                                <button onClick={() => setActiveView('dataSA')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all text-center group">
                                    <div className="w-10 h-10 mx-auto bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <TrendingUpIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Stats</span>
                                </button>
                                <button onClick={() => setActiveView('historySA')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all text-center group">
                                    <div className="w-10 h-10 mx-auto bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <StarIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">History</span>
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Missions & Stats */}
                    <div className="space-y-8">
                        <MissionBoard userId={user.uid} missionsData={missions} />

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <AwardIcon className="w-5 h-5 text-indigo-500" /> Achievements
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(profile?.badges_earned || []).map((badge, i) => (
                                    <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center p-2 text-center" title={badge}>
                                        <StarIcon className="w-6 h-6 text-yellow-500 mb-1" />
                                        <span className="text-[9px] font-bold leading-tight line-clamp-2">{badge}</span>
                                    </div>
                                ))}
                                {(!profile?.badges_earned || profile.badges_earned.length === 0) && (
                                    <p className="col-span-3 text-xs text-slate-400 text-center py-4">No badges yet. Keep learning!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Join Class Modal */}
            {
                isJoinModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm relative animate-scale-up">
                            <button
                                onClick={() => setIsJoinModalOpen(false)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                                    <PlusIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Join a Class</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter the 6-character code from your teacher.</p>
                            </div>

                            <input
                                type="text"
                                className="w-full text-center text-2xl font-mono font-bold tracking-widest p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white mb-6 uppercase"
                                placeholder="CODE"
                                maxLength={6}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            />

                            <button
                                onClick={async () => {
                                    if (joinCode.length < 6) return;
                                    setIsJoining(true);
                                    const result = await joinClassByCode(user.uid, joinCode);
                                    setIsJoining(false);
                                    if (result.success) {
                                        alert(result.message);
                                        setIsJoinModalOpen(false);
                                        setJoinCode('');
                                    } else {
                                        alert(result.message);
                                    }
                                }}
                                disabled={isJoining || joinCode.length < 6}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                            >
                                {isJoining ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Join Class'}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
