
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { AppNotification, View } from '../types';
import { subscribeToNotifications, deleteNotification, markNotificationAsRead, clearAllNotifications } from '../services/databaseService';
import { BellIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon, ArrowUpIcon, CheckSquareIcon } from './icons';

interface NotificationViewProps {
    user: firebase.User;
    onNavigate: (view: View) => void;
}

const NotificationView = ({ user, onNavigate }: NotificationViewProps) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleMarkAllRead = () => {
        notifications.filter(n => !n.read).forEach(n => {
            markNotificationAsRead(user.uid, n.id);
        });
    };

    const handleClearAll = async () => {
        if (confirm("Are you sure you want to delete all notifications? This cannot be undone.")) {
            await clearAllNotifications(user.uid);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(user.uid, id);
    };

    const handleItemClick = (notification: AppNotification) => {
        if (!notification.read) {
            markNotificationAsRead(user.uid, notification.id);
        }
        if (notification.link) {
            onNavigate(notification.link);
        }
    };

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'success': return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
            case 'warning': return <AlertTriangleIcon className="w-6 h-6 text-amber-500" />;
            case 'error': return <AlertTriangleIcon className="w-6 h-6 text-red-500" />;
            default: return <InfoIcon className="w-6 h-6 text-indigo-500" />;
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 60000); // minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredNotifications = filter === 'all' 
        ? notifications 
        : notifications.filter(n => !n.read);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <header className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                            <BellIcon className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Notifications
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Stay updated with your activities and alerts.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center transition-colors"
                            disabled={notifications.every(n => n.read)}
                        >
                            <CheckSquareIcon className="w-4 h-4 mr-2" />
                            Mark All Read
                        </button>
                        <button 
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium flex items-center transition-colors"
                            disabled={notifications.length === 0}
                        >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Clear All
                        </button>
                    </div>
                </header>

                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setFilter('all')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                filter === 'all'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            All Notifications
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                filter === 'unread'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Unread ({notifications.filter(n => !n.read).length})
                        </button>
                    </nav>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500">Loading notifications...</div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <BellIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                {filter === 'all' ? "You don't have any notifications." : "You don't have any unread notifications."}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div 
                                key={notification.id}
                                onClick={() => handleItemClick(notification)}
                                className={`relative p-5 rounded-xl border transition-all duration-200 group flex items-start gap-4 ${
                                    !notification.read 
                                        ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30 shadow-sm' 
                                        : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                } ${notification.link ? 'cursor-pointer hover:shadow-md' : ''}`}
                            >
                                <div className={`mt-1 p-2 rounded-full ${
                                    !notification.read ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-700'
                                }`}>
                                    {getIcon(notification.type)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-base font-bold mb-1 ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4 font-mono">
                                            {formatTime(notification.timestamp)}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${!notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {notification.message}
                                    </p>
                                    
                                    {notification.link && (
                                        <div className="mt-3 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide group-hover:underline">
                                            View Details <ArrowUpIcon className="w-3 h-3 ml-1 rotate-45" />
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete Notification"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationView;
