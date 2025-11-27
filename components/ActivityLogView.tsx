
import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { ActivityLogEntry, UserRole } from '../types';
import { subscribeToActivityLogs, deleteActivityLog, clearAllActivityLogs } from '../services/databaseService';
import { HistoryIcon, TrashIcon, SearchIcon, FilterIcon, SpinnerIcon, AlertTriangleIcon } from './icons';

interface ActivityLogViewProps {
    user: User;
    role: UserRole;
}

const ActivityLogView = ({ user, role }: ActivityLogViewProps) => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState<string>('All');
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; logId: string | null; isClearAll: boolean }>({
        isOpen: false,
        logId: null,
        isClearAll: false
    });

    useEffect(() => {
        const unsubscribe = subscribeToActivityLogs((allLogs) => {
            setLogs(allLogs);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = (logId: string) => {
        setDeleteConfirm({ isOpen: true, logId, isClearAll: false });
    };

    const handleClearAll = () => {
        setDeleteConfirm({ isOpen: true, logId: null, isClearAll: true });
    };

    const executeDelete = async () => {
        if (deleteConfirm.isClearAll) {
            await clearAllActivityLogs();
        } else if (deleteConfirm.logId) {
            await deleteActivityLog(deleteConfirm.logId);
        }
        setDeleteConfirm({ isOpen: false, logId: null, isClearAll: false });
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.module.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesModule = selectedModule === 'All' || log.module === selectedModule;

        return matchesSearch && matchesModule;
    });

    const modules = ['All', ...Array.from(new Set(logs.map(l => l.module)))];

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'restore': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    if (role !== 'admin') {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg inline-block">
                    <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Access Denied</h2>
                    <p className="text-red-600 dark:text-red-300 mt-2">Only administrators can view and manage full system logs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <header className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                            <HistoryIcon className="w-6 h-6 mr-2 text-indigo-500" />
                            System Activity Logs
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Audit trail of all system actions.</p>
                    </div>
                    <button 
                        onClick={handleClearAll}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40 text-sm font-medium flex items-center"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Clear All History
                    </button>
                </header>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="relative w-full md:w-64">
                        <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select 
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                        >
                            {modules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No logs found.</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                {formatTime(log.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                                {log.userName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                {log.module}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.details}>
                                                {log.details}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                                    title="Delete Log Entry"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {deleteConfirm.isClearAll ? 'Clear All Logs?' : 'Delete Log Entry?'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {deleteConfirm.isClearAll 
                                ? "Are you sure you want to permanently delete ALL activity logs? This action cannot be undone." 
                                : "Are you sure you want to delete this specific log entry?"}
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button 
                                onClick={() => setDeleteConfirm({ isOpen: false, logId: null, isClearAll: false })} 
                                className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-300"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={executeDelete} 
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                {deleteConfirm.isClearAll ? 'Clear All' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogView;
