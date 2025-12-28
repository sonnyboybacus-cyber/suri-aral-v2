import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { View } from '../types';
import {
  ArrowUpRightIcon, ArrowDownRightIcon, TrendingUpIcon,
  BriefcaseIcon, UsersIcon, BrainCircuitIcon, PenToolIcon, PieChartIcon,
  FileTextIcon, LayoutDashboard, CheckCircleIcon, FolderIcon
} from './icons';
import { NoticeBoardWidget } from './NoticeBoardWidget';
import ActivityLogWidget from './ActivityLogWidget';
import { ResourceWidget } from './ResourceWidget';
import { loadStudents_SF1, loadClasses, getPerformanceTrend } from '../services/databaseService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface TeacherDashboardProps {
  user: firebase.User;
  setActiveView: (view: View) => void;
  onLaunchTutor: (topic: string) => void;
}

const StatCard = ({ title, value, percentage, isPositive, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-md shadow-indigo-500/10`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="mt-4 flex items-center">
      <span className={`flex items-center text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRightIcon className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRightIcon className="w-3.5 h-3.5 mr-1" />}
        {percentage}%
      </span>
      <span className="text-slate-400 text-xs ml-2 font-medium">vs last month</span>
    </div>
  </div>
);

const ActionCard = ({ icon: Icon, label, desc, colorClass, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group text-left w-full h-full"
  >
    <div className={`p-3 rounded-xl ${colorClass} text-white mr-4 shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
    </div>
  </button>
);

export const TeacherDashboard = ({ user, setActiveView, onLaunchTutor }: TeacherDashboardProps) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    averageAttendance: 95
  });
  const [gradeDistribution, setGradeDistribution] = useState<{ name: string, value: number, color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string, score: number, title: string }[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, classes, trend] = await Promise.all([
          loadStudents_SF1(user.uid),
          loadClasses(user.uid),
          getPerformanceTrend(user.uid)
        ]);

        const activeStudents = students.filter(s => !s.deletedAt);
        const activeClasses = classes.filter(c => !c.deletedAt);

        setStats({
          totalStudents: activeStudents.length,
          totalClasses: activeClasses.length,
          averageAttendance: 94 // Placeholder until Attendance module is built
        });

        setTrendData(trend);
        setLoadingTrend(false);

        const grades: Record<string, number> = {};
        activeClasses.forEach(c => {
          const g = c.gradeLevel || 'Unknown';
          grades[g] = (grades[g] || 0) + (c.studentIds?.length || 0);
        });

        const sortedGrades = Object.entries(grades).sort((a, b) => b[1] - a[1]);
        const topGrades = sortedGrades.slice(0, 4);
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];

        const chartData = topGrades.map((g, i) => ({
          name: g[0],
          value: g[1],
          color: colors[i % colors.length]
        }));

        setGradeDistribution(chartData);

      } catch (error) {
        console.error("Failed to load dashboard stats", error);
        setLoadingTrend(false);
      }
    };

    fetchData();
  }, [user.uid]);

  return (
    <div className="min-h-full font-sans text-slate-800 dark:text-slate-200 pb-24 md:pb-8 animate-fade-in-up">
      <div className="max-w-7xl mx-auto space-y-8">

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                Teacher's Command
              </h1>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                Faculty
              </span>
            </div>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
              Welcome back, {user.displayName}. Here's your class overview.
            </p>
          </div>
          <div className="text-right hidden md:flex flex-col items-end">
            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">System Online</span>
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="My Students"
            value={stats.totalStudents.toLocaleString()}
            percentage="12.5"
            isPositive={true}
            icon={UsersIcon}
            color="bg-indigo-500"
          />
          <StatCard
            title="Advisory Classes"
            value={stats.totalClasses}
            percentage="0.0"
            isPositive={true}
            icon={LayoutDashboard}
            color="bg-purple-500"
          />
          <StatCard
            title="Avg. Attendance"
            value={`${stats.averageAttendance}%`}
            percentage="1.2"
            isPositive={true}
            icon={CheckCircleIcon}
            color="bg-emerald-500"
          />
          <StatCard
            title="Class Performance"
            value={trendData.length > 0 ? `${trendData[trendData.length - 1].score}%` : 'N/A'}
            percentage="5.4"
            isPositive={true}
            icon={TrendingUpIcon}
            color="bg-orange-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Actions & Charts */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                icon={FolderIcon}
                label="Resources"
                desc="View Shared Files"
                colorClass="bg-blue-500"
                onClick={() => setActiveView('resources')}
              />
              <ActionCard
                icon={PenToolIcon}
                label="Create Lesson Plan"
                desc="Generate DLP/DLL with AI"
                colorClass="bg-indigo-500"
                onClick={() => setActiveView('lessonPlanner')}
              />
              <ActionCard
                icon={PieChartIcon}
                label="Item Analysis"
                desc="Calculate MPS & Remediation"
                colorClass="bg-purple-500"
                onClick={() => setActiveView('itemAnalysis')}
              />
              <ActionCard
                icon={FileTextIcon}
                label="Class Record"
                desc="Input Grades & Attendance"
                colorClass="bg-emerald-500"
                onClick={() => setActiveView('classRecord')}
              />
              <ActionCard
                icon={BrainCircuitIcon}
                label="AI Tutor"
                desc="Personalized Learning"
                colorClass="bg-pink-500"
                onClick={() => setActiveView('learnSA')}
              />
            </div>

            {/* Performance Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">Academic Trends</h3>
                  <p className="text-xs text-slate-400 font-medium">Average MPS over time</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {loadingTrend ? (
                  <div className="h-full flex items-center justify-center text-slate-400">Loading...</div>
                ) : trendData.length > 0 ? (
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
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                        formatter={(value: number, name: string, props: any) => [`${value}% `, props.payload.title]}
                      />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <PieChartIcon className="w-10 h-10 mb-2" />
                    <p className="text-sm">No assessment data recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Widgets */}
          <div className="space-y-8">
            <ResourceWidget setActiveView={setActiveView} />
            <NoticeBoardWidget />

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4">Class Composition</h3>
              <div className="h-[200px]">
                {gradeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {gradeDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <ActivityLogWidget user={user} role="teacher" />
          </div>
        </div>
      </div>
    </div>
  );
};
