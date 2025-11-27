
import React, { useEffect, useState } from 'react';
import { ActivityLogEntry, UserRole } from '../types';
import { subscribeToActivityLogs } from '../services/databaseService';
import { User } from 'firebase/auth';
import { HistoryIcon, PlusIcon, EditIcon, TrashIcon, UsersIcon, BriefcaseIcon, SchoolIcon, LibraryIcon, BrainCircuitIcon, UserIcon, MessageSquareIcon } from './icons';
import { UndoIcon } from './UndoIcon';

interface ActivityLogWidgetProps {
    user: User;
    role: UserRole;
}

const ActivityLogWidget = ({ user, role }: ActivityLogWidgetProps) => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        try {
            // Explicitly typing the unsubscribe function to ensure proper cleanup
            unsubscribe = subscribeToActivityLogs((allLogs) => {
                let filteredLogs = allLogs;
                
                // Admin sees everything by default.
                // If user role were teacher, we'd filter, but this widget is currently only mounted for Admins in Dashboard.tsx.
                // Adding safety check just in case:
                if (role !== 'admin') {
                    filteredLogs = allLogs.filter(log => log.userId === user.uid);
                }
                setLogs(filteredLogs);
                setIsLoading(false);
            });
        } catch (error) {
            console.error("Failed to subscribe to activity logs", error);
            setIsLoading(false);
        }

        // Force stop loading if empty after timeout (fallback)
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
            case 'create': return <PlusIcon className="w-4 h-4 text-green-500" />;
            case 'update': return <EditIcon className="w-4 h-4 text-blue-500" />;
            case 'delete': return <TrashIcon className="w-4 h-4 text-red-500" />;
            case 'restore': return <UndoIcon className="w-4 h-4 text-teal-500" />;
            default: return <HistoryIcon className="w-4 h-4 text-slate-500" />;
        }
    };

    const getModuleIcon = (module: ActivityLogEntry['module']) => {
        switch (module) {
            case 'Student': return <UsersIcon className="w-4 h-4" />;
            case 'Teacher': return <BriefcaseIcon className="w-4 h-4" />;
            case 'Class': return <LibraryIcon className="w-4 h-4" />;
            case 'School': return <SchoolIcon className="w-4 h-4" />;
            case 'Item Analysis': return <BrainCircuitIcon className="w-4 h-4" />;
            case 'Account': return <UserIcon className="w-4 h-4" />;
            case 'SURI-ARAL Chat': return <MessageSquareIcon className="w-4 h-4" />;
            default: return <HistoryIcon className="w-4 h-4" />;
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center">
                    <HistoryIcon className="w-5 h-5 mr-2 text-indigo-500" />
                    Recent Activity
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                    {logs.length} Events
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar max-h-[400px] lg:max-h-[600px]">
                {isLoading && logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading activity feed...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No recent activity recorded.</div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {logs.map(log => (
                            <li key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-1 flex-shrink-0">
                                         <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400">
                                             {getModuleIcon(log.module)}
                                         </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                                                {log.userId === user.uid ? 'You' : log.userName}
                                            </span>
                                            {log.action}d a {log.module === 'SURI-ARAL Chat' ? 'Chat Session' : log.module}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 break-words">
                                            {log.details}
                                        </p>
                                        <div className="flex items-center mt-1 text-xs text-slate-400 dark:text-slate-500">
                                            {getActionIcon(log.action)}
                                            <span className="ml-1 capitalize">{log.action}</span>
                                            <span className="mx-1">•</span>
                                            <span>{formatTimeAgo(log.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ActivityLogWidget;
