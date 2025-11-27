import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, View } from '../types';
import { BrainCircuitIcon, UsersIcon, BriefcaseIcon, LibraryIcon, SchoolIcon, CalendarCheckIcon, SparklesIcon, PenToolIcon, PieChartIcon, MicIcon, BarChart3Icon, HourglassIcon, PuzzleIcon } from './icons';
import ActivityLogWidget from './ActivityLogWidget';
import SuriTracker from './SuriTracker';
import { StudyPlanner } from './StudyPlanner';
import { NoticeBoardWidget } from './NoticeBoardWidget';

interface DashboardProps {
  user: firebase.User;
  role: UserRole;
  setActiveView: (view: View) => void;
  onLaunchTutor: (topic: string) => void;
}

const Dashboard = ({ user, role, setActiveView, onLaunchTutor }: DashboardProps) => {
  const [showPlanner, setShowPlanner] = useState(false);

  return (
    <div className="p-4 md:p-8 min-h-full font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                    Dashboard
                </h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm border ${
                    role === 'admin' 
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                }`}>
                    {role} Account
                </span>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                Welcome back, {user.displayName || user.email}
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Session</p>
            <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{new Date().toLocaleDateString()}</p>
          </div>
        </header>

        {showPlanner && <StudyPlanner userId={user.uid} onClose={() => setShowPlanner(false)} onLaunchTutor={onLaunchTutor} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Hero & Quick Actions */}
          <div className="lg:col-span-2 space-y-10">
            
             {/* Hero Card */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-slate-900 p-8 text-white shadow-2xl transform transition-all hover:scale-[1.01] duration-500 group">
                {/* Abstract Background Pattern */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-200 font-bold text-xs uppercase tracking-wider">
                            <SparklesIcon className="w-4 h-4" />
                            <span>SURI-ARAL Platform</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                            Analyze results faster.<br/>Teach smarter.
                        </h2>
                        <p className="text-indigo-100 max-w-md text-sm md:text-base leading-relaxed opacity-90">
                            {role === 'admin' 
                                ? "Oversee institutional performance, manage faculty, and streamline operations with AI-driven insights."
                                : "Let SURI-ARAL handle the data crunching while you focus on what matters most: your students' growth."
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Tools Grid */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full mr-3"></div>
                    AI Augmented Tools
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    
                    {/* Learn SA Card (Featured) */}
                    <button
                        onClick={() => setActiveView('learnSA')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 group text-left relative overflow-hidden col-span-1 sm:col-span-2"
                    >
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainCircuitIcon className="w-32 h-32 text-indigo-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <BrainCircuitIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">Featured</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Learn SA</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Personalized curriculum generation with the SA Tutor.</p>
                        </div>
                    </button>

                    {/* Exam SA (New) */}
                    <button
                        onClick={() => setActiveView('quizSA')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <PuzzleIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Exam SA</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">AI Quiz Generator & Solver.</p>
                        </div>
                    </button>

                    {/* Reading SA (New) */}
                    <button
                        onClick={() => setActiveView('readingSA')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <MicIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Reading SA</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Fluency & pronunciation.</p>
                        </div>
                    </button>

                     {/* Lesson Planner Card */}
                    <button
                        onClick={() => setActiveView('lessonPlanner')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <PenToolIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Lesson Planner</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Auto-generate plans.</p>
                        </div>
                    </button>

                    {/* Item Analysis Card */}
                    <button
                        onClick={() => setActiveView('itemAnalysis')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <PieChartIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Item Analysis</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Assessment insights.</p>
                        </div>
                    </button>

                    {/* Data SA (New) */}
                    <button
                        onClick={() => setActiveView('dataSA')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <BarChart3Icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Data SA</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Statistical engine.</p>
                        </div>
                    </button>

                    {/* History SA (New) */}
                    <button
                        onClick={() => setActiveView('historySA')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <HourglassIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">History SA</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Timelines & comparisons.</p>
                        </div>
                    </button>

                    {/* Planner Card */}
                    <button
                        onClick={() => setShowPlanner(true)}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <CalendarCheckIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Study Calendar</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Smart schedules.</p>
                        </div>
                    </button>

                </div>
            </div>

            {/* Management Grid */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <div className="w-1.5 h-6 bg-slate-400 rounded-full mr-3"></div>
                    Management & Records
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                     {/* Role Specific Cards */}
                    {role === 'admin' ? (
                         <button
                            onClick={() => setActiveView('schoolInformation')}
                            className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 group text-left relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <SchoolIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">School Profile</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage institutional data.</p>
                            </div>
                        </button>
                    ) : (
                         <button
                            onClick={() => setActiveView('studentRegistration')}
                            className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 group text-left relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <UsersIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Student Records</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Enrollment & profiles (SF1).</p>
                            </div>
                        </button>
                    )}

                    {role === 'admin' && (
                         <button
                            onClick={() => setActiveView('teacherInformation')}
                            className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-300 group text-left relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <BriefcaseIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Faculty</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Teacher accounts & HR.</p>
                            </div>
                        </button>
                    )}
                    
                    <button
                        onClick={() => setActiveView('classInformation')}
                        className="flex p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-300 group text-left relative overflow-hidden"
                    >
                         <div className="relative z-10">
                            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <LibraryIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Class Management</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sections & scheduling.</p>
                        </div>
                    </button>
                </div>
            </div>
          </div>

          {/* Right Column: Sticky Widgets */}
          <div className="lg:col-span-1 h-full relative">
             <div className="sticky top-8 space-y-8">
                <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <NoticeBoardWidget />
                </div>

                <div className="h-[500px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                     {role === 'admin' ? (
                         <ActivityLogWidget user={user} role={role} />
                     ) : (
                         <SuriTracker user={user} />
                     )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;