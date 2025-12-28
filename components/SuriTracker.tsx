
import React, { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { UserActivity } from '../types';
import { subscribeToUserActivities } from '../services/databaseService';
import { HistoryIcon, BrainCircuitIcon, ScrollIcon, ChartBarIcon, BookOpenIcon, NotebookIcon, ArrowUpIcon } from './icons';

interface SuriTrackerProps {
    user: firebase.User;
}

const SuriTracker = ({ user }: SuriTrackerProps) => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = subscribeToUserActivities(user.uid, (logs) => {
                setActivities(logs);
                setIsLoading(false);
            });
        } catch (error) {
            console.error("Failed to subscribe to user activities", error);
            setIsLoading(false);
        }
        
        const timeout = setTimeout(() => setIsLoading(false), 3000);

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
            clearTimeout(timeout);
        };
    }, [user.uid]);

    const getActivityIcon = (type: UserActivity['type']) => {
        switch (type) {
            case 'TUTOR': return <BrainCircuitIcon className="w-5 h-5 text-indigo-500" />;
            case 'HISTORY': return <ScrollIcon className="w-5 h-5 text-amber-500" />;
            case 'STATS': return <ChartBarIcon className="w-5 h-5 text-blue-500" />;
            case 'READING': return <BookOpenIcon className="w-5 h-5 text-green-500" />;
            case 'NOTEBOOK': return <NotebookIcon className="w-5 h-5 text-purple-500" />;
            case 'LOGIN': return <ArrowUpIcon className="w-5 h-5 text-emerald-500" />;
            default: return <HistoryIcon className="w-5 h-5 text-slate-500" />;
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
                    Recent History
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                    {activities.length} Events
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar max-h-[400px] lg:max-h-[600px]">
                {isLoading && activities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading tracker...</div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Start your first learning session to see it here!</div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {activities.map(activity => (
                            <li key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-1 flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {activity.title}
                                        </p>
                                        {activity.subtitle && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {activity.subtitle}
                                            </p>
                                        )}
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                                            {formatTimeAgo(activity.timestamp)} • {activity.type}
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

export default SuriTracker;
