
import React, { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { ActivityLogEntry, UserRole } from '../types';
import { subscribeToActivityLogs } from '../services/databaseService';
import { HistoryIcon, PlusIcon, EditIcon, TrashIcon, UsersIcon, BriefcaseIcon, SchoolIcon, LibraryIcon, BrainCircuitIcon, UserIcon, MessageSquareIcon, FileTextIcon, CalendarIcon, PuzzleIcon } from './icons';
import { UndoIcon } from './UndoIcon';

interface ActivityLogWidgetProps {
    user: firebase.User;
    role: UserRole;
}

const ActivityLogWidget = ({ user, role }: ActivityLogWidgetProps) => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        try {
            unsubscribe = subscribeToActivityLogs((allLogs) => {
                let filteredLogs = allLogs;

                // If user is not admin, only show their own logs (though this widget is primarily for admins)
                if (role !== 'admin') {
                    filteredLogs = allLogs.filter(log => log.userId === user.uid);
                }
                // Take top 20 for the widget
                setLogs(filteredLogs.slice(0, 20));
                setIsLoading(false);
            });
        } catch (error) {
            console.error("Failed to subscribe to activity logs", error);
            setIsLoading(false);
        }

        const timeout = setTimeout(() => setIsLoading(false), 3000);

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
            clearTimeout(timeout);
        };
    }, [user.uid, role]);

    const getActionIcon = (action: ActivityLogEntry['action']) => {
        switch (action) {
            case 'create': return <PlusIcon className="w-3 h-3" />;
            case 'update': return <EditIcon className="w-3 h-3" />;
            case 'delete': return <TrashIcon className="w-3 h-3" />;
            case 'restore': return <UndoIcon className="w-3 h-3" />;
            default: return <HistoryIcon className="w-3 h-3" />;
        }
    };

    const getModuleConfig = (module: ActivityLogEntry['module']) => {
        switch (module) {
            case 'Student': return { icon: <UsersIcon className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
            case 'Teacher': return { icon: <BriefcaseIcon className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' };
            case 'Class': return { icon: <LibraryIcon className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
            case 'School': return { icon: <SchoolIcon className="w-4 h-4" />, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' };
            case 'Item Analysis': return { icon: <BrainCircuitIcon className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' };
            case 'Account': return { icon: <UserIcon className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
            case 'Lesson Plan': return { icon: <FileTextIcon className="w-4 h-4" />, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' };
            case 'Schedule': return { icon: <CalendarIcon className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' };
            case 'Quiz SA': return { icon: <PuzzleIcon className="w-4 h-4" />, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' };
            default: return { icon: <HistoryIcon className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
        }
    };

    const formatTimeAgo = (timestamp: number) => {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex flex-col w-full h-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-200 flex items-center">
                    <HistoryIcon className="w-5 h-5 mr-2 text-slate-400" />
                    System Pulse
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live</span>
                </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar relative bg-slate-50/30 dark:bg-slate-900/20" style={{ maxHeight: '400px' }}>
                {isLoading && logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm italic">Syncing logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                            <HistoryIcon className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                        </div>
                        <p className="text-slate-400 text-xs">No recent activity recorded.</p>
                    </div>
                ) : (
                    <div className="relative py-4">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-700 z-0"></div>

                        <ul className="space-y-6 relative z-10">
                            {logs.map((log, index) => {
                                const modConfig = getModuleConfig(log.module);
                                return (
                                    <li key={log.id} className="px-5 group">
                                        <div className="flex items-start gap-4">
                                            {/* Icon Node */}
                                            <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 ${modConfig.color}`}>
                                                {modConfig.icon}
                                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5">
                                                    <div className={`w-2 h-2 rounded-full ${log.action === 'create' ? 'bg-green-500' :
                                                            log.action === 'delete' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`}></div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        {log.userId === user.uid ? 'You' : log.userName}
                                                        <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                                                            {log.action}d a {log.module === 'SURI-ARAL Chat' ? 'Session' : log.module}
                                                        </span>
                                                    </p>
                                                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap ml-2 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                        {formatTimeAgo(log.timestamp)}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words line-clamp-2">
                                                    {log.details}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {role === 'admin' && (
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center sticky bottom-0 z-10">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Displaying last 20 events. Check "System Logs" for full history.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ActivityLogWidget;
