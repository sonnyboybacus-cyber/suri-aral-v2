
import React from 'react';
import { ArrowUpRightIcon, ArrowDownRightIcon } from '../icons';

export const DashboardHeader = ({
  title,
  subtitle,
  role,
  showSystemStatus = true
}: {
  title: string,
  subtitle: string,
  role?: string,
  showSystemStatus?: boolean
}) => (
  <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-8">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden border-2 border-slate-100 dark:border-slate-700">
          <img src="/DivisionLogo.png" alt="Division Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          {title}
          {role && (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${role === 'admin'
              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
              : role === 'teacher'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
              {role}
            </span>
          )}
        </h1>
      </div>
      <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
        {subtitle}
      </p>
    </div>
    {showSystemStatus && (
      <div className="text-right hidden md:flex flex-col items-end">
        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">System Online</span>
        </div>
      </div>
    )}
  </header>
);

export const StatCard = ({ title, value, percentage, isPositive, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300 group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {percentage && (
      <div className="mt-4 flex items-center">
        <span className={`flex items-center text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRightIcon className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRightIcon className="w-3.5 h-3.5 mr-1" />}
          {percentage}%
        </span>
        <span className="text-slate-400 text-xs ml-2 font-medium">vs last month</span>
      </div>
    )}
  </div>
);

export const ActionCard = ({ icon: Icon, label, desc, colorClass, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group text-left w-full h-full"
  >
    <div className={`p-3 rounded-xl ${colorClass} text-white mr-4 shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</h4>
      {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
    </div>
  </button>
);
