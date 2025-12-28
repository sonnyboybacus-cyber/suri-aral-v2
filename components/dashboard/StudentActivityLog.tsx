import React, { useState, useEffect } from 'react';
import { UserActivity } from '../../types';
import { subscribeToUserActivities } from '../../services/databaseService';
import { ClockIcon, ZapIcon, LoginIcon, EditIcon, CheckCircleIcon, BookOpenIcon } from '../icons';

interface ActivityLogWidgetProps {
    userId: string;
}

export const StudentActivityLog: React.FC<ActivityLogWidgetProps> = ({ userId }) => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToUserActivities(userId, (data) => {
            // Sort by timestamp desc
            setActivities(data.sort((a, b) => b.timestamp - a.timestamp));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const getActivityIcon = (type?: string, title?: string) => {
        const t = (type || '').toUpperCase();
        const ti = (title || '').toLowerCase();

        if (t === 'LOGIN') return <LoginIcon className="w-4 h-4 text-green-500" />;
        if (t === 'EXAM' || ti.includes('quiz')) return <CheckCircleIcon className="w-4 h-4 text-orange-500" />;
        if (ti.includes('lesson') || ti.includes('read')) return <BookOpenIcon className="w-4 h-4 text-blue-500" />;
        if (ti.includes('create') || ti.includes('update')) return <EditIcon className="w-4 h-4 text-indigo-500" />;
        return <ZapIcon className="w-4 h-4 text-slate-400" />;
    };

    const formatTime = (ts: number) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[300px] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-indigo-500" /> Recent Activity
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Loading activity...</div>
                ) : activities.length > 0 ? (
                    <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-3 space-y-6">
                        {activities.slice(0, 15).map(act => (
                            <div key={act.id} className="relative pl-6">
                                <div className="absolute -left-[9px] top-0 bg-white dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                                    {getActivityIcon(act.type, act.title)}
                                </div>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{act.title}</h4>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(act.timestamp)}</span>
                                    </div>
                                    {act.subtitle && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.subtitle}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <ClockIcon className="w-8 h-8 opacity-20" />
                        <span className="text-sm">No recent activity</span>
                    </div>
                )}
            </div>
        </div>
    );
};
