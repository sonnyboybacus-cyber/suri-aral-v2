
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, View, GamificationProfile, UserDailyMissions, LearningJourney, UserProfile } from '../types';
import {
    UsersIcon, LayoutDashboard, TrendingUpIcon,
    BrainCircuitIcon, PenToolIcon, PieChartIcon, BarChart3Icon,
    MicIcon, CalendarCheckIcon, FileTextIcon, SchoolIcon, ActivityIcon,
    CheckCircleIcon, ZapIcon, ClockIcon, StarIcon, AwardIcon, UserIcon, BriefcaseIcon, CalendarIcon, FolderIcon
} from './icons';
import { DashboardHeader, StatCard, ActionCard } from './dashboard/Shared';
import { NoticeBoardWidget } from './NoticeBoardWidget';
import ActivityLogWidget from './ActivityLogWidget';
import { ResourceWidget } from './ResourceWidget';
import { GamificationBar } from './GamificationBar';
import { MissionBoard } from './MissionBoard';
import { SchoolCalendarWidget } from './dashboard/SchoolCalendarWidget';
import { TeacherScheduleWidget } from './dashboard/TeacherScheduleWidget';
import { StudentDashboard } from './StudentDashboard';

// Services
import {
    loadStudents_SF1, loadTeachers, loadClasses, loadSchools, getPerformanceTrend,
    loadGamificationProfile, getDailyMissions, loadLearningJourneys, loadLessonPlans, ensureTeacherRecord, loadUserProfile
} from '../services/databaseService';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { ClassInfo } from '../types';

interface DashboardProps {
    user: firebase.User;
    role: UserRole | null;
    setActiveView: (view: View) => void;
    onLaunchTutor: (topic: string) => void;
}

export const Dashboard = ({ user, role, setActiveView, onLaunchTutor }: DashboardProps) => {
    console.log("Dashboard Rendered. Role:", role, "User:", user.uid);
    const effectiveRole = role || 'admin';
    console.log("Effective Role:", effectiveRole);

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [isRecovering, setIsRecovering] = useState(false);

    const [adminProfile, setAdminProfile] = useState<UserProfile | null>(null);

    // Academic Stats (Teacher/Admin)
    const [stats, setStats] = useState<{
        totalStudents: number,
        totalTeachers: number,
        totalClasses: number,
        activeSchools: number,
        totalLessonPlans: number,
        activeClassesList: ClassInfo[] // Added to pass to widget
    }>({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        activeSchools: 0,
        totalLessonPlans: 0,
        activeClassesList: []
    });
    const [trendData, setTrendData] = useState<{ date: string, score: number, title: string }[]>([]);
    const [gradeDistribution, setGradeDistribution] = useState<{ name: string, value: number, color: string }[]>([]);

    // Student Stats
    const [studentProfile, setStudentProfile] = useState<GamificationProfile | null>(null);
    const [missions, setMissions] = useState<UserDailyMissions | null>(null);
    const [recentJourneys, setRecentJourneys] = useState<LearningJourney[]>([]);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (effectiveRole === 'student') {
                    // StudentDashboard fetches its own data, we just stop loading for the container if needed
                    // However since we return <StudentDashboard /> early now, this effect runs but the UI is replaced.
                    // To be safe we can just skip fetching if student
                    setLoading(false);
                    return;
                }

                // Fetch Teacher/Admin Data
                const [students, classes, trend, teachers, schools, lessonPlans, profile] = await Promise.all([
                    loadStudents_SF1(user.uid),
                    loadClasses(user.uid),
                    getPerformanceTrend(user.uid),
                    loadTeachers(user.uid),
                    loadSchools(user.uid),
                    loadLessonPlans(user.uid),
                    loadUserProfile(user.uid),
                    ensureTeacherRecord(user, effectiveRole) // Self-healing check
                ]);

                // Pass profile to parent if needed, or store local. 
                // We need it for SchoolCalendarWidget.
                // Ideally Dashboard props should include userProfile if App already fetches it, 
                // but we'll store it in a ref or state if needed.
                // For now, let's just use the profile for the widget.
                // We need a state for it.
                let activeStudents = (students || []).filter(s => !s.deletedAt);
                let activeClasses = (classes || []).filter(c => !c.deletedAt);
                let activeTeachers = (teachers || []).filter(t => !t.deletedAt);
                const activeSchools = (schools || []).filter(s => !s.deletedAt);
                const activePlans = lessonPlans || [];

                // Role-Based Filtering
                if ((effectiveRole === 'principal' || effectiveRole === 'ict_coordinator') && profile?.schoolId) {
                    activeStudents = activeStudents.filter(s => s.schoolId === profile.schoolId);
                    activeClasses = activeClasses.filter(c => c.schoolId === profile.schoolId);
                    activeTeachers = activeTeachers.filter(t => t.schoolId === profile.schoolId);
                    // Can't filter activeSchools (it's a count), but maybe we just show 1?
                    // activeSchools remains the list of ALL schools? No, they should only see their own.
                    // But loadSchools might return all.
                    // Let's filter schools too just in case
                    // const mySchool = activeSchools.find(s => s.id === profile.schoolId);
                    // activeSchools = mySchool ? [mySchool] : [];
                }

                setStats({
                    totalStudents: activeStudents.length,
                    totalTeachers: activeTeachers.length,
                    totalClasses: activeClasses.length,
                    activeSchools: activeSchools.length,
                    totalLessonPlans: activePlans.length,
                    activeClassesList: activeClasses // Pass full list
                });
                setTrendData(trend || []);

                // Hack: Store profile in a temporary state or reuse studentProfile type (unsafe but works if fields overlap)
                // Better: Add adminProfile state.
                if (profile) setAdminProfile(profile);

                // Grade Distribution
                const grades: Record<string, number> = {};
                activeClasses.forEach(c => {
                    const g = c.gradeLevel || 'Unknown';
                    grades[g] = (grades[g] || 0) + (c.studentIds?.length || 0);
                });
                const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];
                setGradeDistribution(Object.entries(grades)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map((g, i) => ({ name: g[0], value: g[1], color: colors[i % colors.length] }))
                );

            } catch (error) {
                console.error("Dashboard Data Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.uid, effectiveRole]);

    const handleRecovery = async () => {
        if (recoveryCode !== 'suri2025') {
            alert("Invalid Recovery Code");
            return;
        }
        setIsRecovering(true);
        try {
            await firebase.database().ref(`users/${user.uid}/profile`).update({
                role: 'admin',
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            window.location.reload();
        } catch (error) {
            console.error("Recovery failed:", error);
            alert("Recovery failed. Please check console.");
            setIsRecovering(false);
        }
    };

    const getTimeOfDay = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good Morning";
        if (h < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // --- SUB-RENDERERS ---

    const renderTeacherAdminView = () => (
        <div className="space-y-8">
            <DashboardHeader
                title={effectiveRole === 'admin' ? "System Overview" : "Teacher's Command"}
                subtitle={`Overview for ${user.displayName || 'User'}`}
                role={effectiveRole}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up">
                <StatCard
                    title={effectiveRole === 'admin' ? "Total Users" : effectiveRole === 'teacher' ? "My Students" : "School Students"}
                    value={effectiveRole === 'admin' ? (stats.totalStudents + stats.totalTeachers).toLocaleString() : stats.totalStudents.toLocaleString()}
                    percentage="12.5"
                    isPositive={true}
                    icon={UsersIcon}
                    color="bg-indigo-500"
                />
                <StatCard
                    title={effectiveRole === 'teacher' ? "Advisory Classes" : "Active Teachers"}
                    value={effectiveRole === 'teacher' ? stats.totalClasses : stats.totalTeachers.toLocaleString()}
                    percentage={effectiveRole === 'admin' ? "Active" : "0.0"}
                    isPositive={true}
                    icon={effectiveRole === 'teacher' ? LayoutDashboard : BriefcaseIcon}
                    color={effectiveRole === 'teacher' ? "bg-purple-500" : "bg-emerald-600"}
                />
                <StatCard
                    title={effectiveRole === 'admin' ? "Active Schools" : "Lesson Plans"}
                    value={effectiveRole === 'admin' ? stats.activeSchools : stats.totalLessonPlans}
                    percentage="Created"
                    isPositive={true}
                    icon={effectiveRole === 'teacher' ? FileTextIcon : SchoolIcon}
                    color={effectiveRole === 'teacher' ? "bg-teal-500" : "bg-blue-600"}
                />
                <StatCard
                    title={effectiveRole === 'admin' ? "Avg. Performance" : "Class Performance"}
                    value={trendData.length > 0 ? `${trendData[trendData.length - 1].score}%` : 'N/A'}
                    percentage="5.4"
                    isPositive={true}
                    icon={TrendingUpIcon}
                    color="bg-orange-500"
                />
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">

                {/* ROW 1: ACTIONS (Full Width) */}
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {effectiveRole === 'admin' && (
                            <>
                                <ActionCard icon={SchoolIcon} label="School Management" desc="Configure profiles & facilities" colorClass="bg-purple-600" onClick={() => setActiveView('schoolInformation')} />
                                <ActionCard icon={UsersIcon} label="Access Control" desc="Manage users & keys" colorClass="bg-blue-600" onClick={() => setActiveView('accountInformation')} />
                                <ActionCard icon={ActivityIcon} label="Audit Logs" desc="View system history" colorClass="bg-orange-600" onClick={() => setActiveView('activityLog')} />
                                <ActionCard icon={UserIcon} label="My Profile" desc="Manage Admin Profile" colorClass="bg-indigo-600" onClick={() => setActiveView('settings_profile')} />
                            </>
                        )}

                        {effectiveRole === 'principal' && (
                            <>
                                <ActionCard icon={UsersIcon} label="Add Student" desc="New Registration" colorClass="bg-indigo-500" onClick={() => setActiveView('studentRegistration')} />
                                <ActionCard icon={BriefcaseIcon} label="Add Teacher" desc="New Faculty Member" colorClass="bg-violet-500" onClick={() => setActiveView('teacherInformation')} />
                                <ActionCard icon={CalendarIcon} label="School Calendar" desc="Manage Events" colorClass="bg-pink-500" onClick={() => setActiveView('masterSchedule')} />
                                <ActionCard icon={FileTextIcon} label="Class Record" desc="View Grades" colorClass="bg-emerald-500" onClick={() => setActiveView('classRecord')} />
                            </>
                        )}

                        {effectiveRole === 'ict_coordinator' && (
                            <>
                                <ActionCard icon={UsersIcon} label="Manage Accounts" desc="User Access" colorClass="bg-indigo-500" onClick={() => setActiveView('accountInformation')} />
                                <ActionCard icon={SchoolIcon} label="Subject Management" desc="Curriculum Setup" colorClass="bg-violet-500" onClick={() => setActiveView('subjectManagement')} />
                                <ActionCard icon={CalendarIcon} label="Master Schedule" desc="View Schedule" colorClass="bg-pink-500" onClick={() => setActiveView('masterSchedule')} />
                                <ActionCard icon={BriefcaseIcon} label="Class Info" desc="View Classes" colorClass="bg-emerald-500" onClick={() => setActiveView('classInformation')} />
                            </>
                        )}

                        {effectiveRole === 'teacher' && (
                            <>
                                {/* Removed Resources from Actions since it's now a widget */}
                                <ActionCard icon={BriefcaseIcon} label="My Classes" desc="View Students" colorClass="bg-indigo-500" onClick={() => setActiveView('classInformation')} />
                                <ActionCard icon={CalendarIcon} label="My Schedule" desc="Official Load" colorClass="bg-emerald-500" onClick={() => setActiveView('teacherSchedule')} />
                                <ActionCard icon={PenToolIcon} label="Lesson Planner" desc="Generate DLP/DLL" colorClass="bg-pink-500" onClick={() => setActiveView('lessonPlanner')} />
                                <ActionCard icon={PieChartIcon} label="Item Analysis" desc="Calculate MPS" colorClass="bg-purple-500" onClick={() => setActiveView('itemAnalysis')} />
                                <ActionCard icon={BrainCircuitIcon} label="AI Tutor" desc="Personalized Learning" colorClass="bg-teal-500" onClick={() => setActiveView('learnSA')} />
                            </>
                        )}
                    </div>
                </div>

                {/* ROW 2: ANALYTICS (Trends 8/12, Distribution 4/12) */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Academic Trends</h3>
                        </div>
                        <div className="h-[320px] w-full">
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 opacity-60">
                                    <PieChartIcon className="w-10 h-10 mb-2" />
                                    <p className="text-sm">No data available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    {gradeDistribution.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4">Distribution</h3>
                            <div className="h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={gradeDistribution} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                                            {gradeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalStudents}</span>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Students</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {gradeDistribution.map((item, index) => (
                                    <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <PieChartIcon className="w-12 h-12 mb-3" />
                            <p className="font-bold">No Distribution Data</p>
                        </div>
                    )}
                </div>

                {/* ROW 3: OPERATIONS (Calendar, Activity Log, Resources in 4-column blocks) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Calendar/Schedule Block */}
                    {effectiveRole !== 'student' && (
                        <div className="flex-1">
                            <SchoolCalendarWidget
                                userProfile={adminProfile || undefined}
                                onNavigate={() => setActiveView('masterSchedule')}
                            />
                        </div>
                    )}
                    {effectiveRole === 'teacher' && (
                        <div className="flex-1">
                            <TeacherScheduleWidget classes={stats.activeClassesList || []} />
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4">
                    {/* Swapped: Activity Log now here (small) */}
                    <ActivityLogWidget user={user} role={effectiveRole || 'teacher'} />
                </div>

                <div className="lg:col-span-4">
                    <ResourceWidget setActiveView={setActiveView} />
                </div>

                {/* ROW 4: SYSTEM (Notice Board Full Width - 12/12) */}
                <div className="lg:col-span-12">
                    {/* Swapped: Notice Board now here (big) */}
                    <NoticeBoardWidget />
                </div>

            </div>
        </div>
    );

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }


    if (effectiveRole === 'student') {
        return (
            <StudentDashboard
                user={user}
                setActiveView={setActiveView}
                onLaunchTutor={onLaunchTutor}
            />
        );
    }

    return (
        <div className="min-h-full font-sans text-slate-800 dark:text-slate-200 pb-24 md:pb-8 animate-fade-in-up">
            <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
                {renderTeacherAdminView()}
            </div>
        </div>
    );
};

export default Dashboard;

