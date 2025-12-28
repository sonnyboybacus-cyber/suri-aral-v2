
import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { AppNotification, View } from '../types';
import { subscribeToNotifications, deleteNotification, markNotificationAsRead, clearAllNotifications } from '../services/databaseService';
import { BellIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon, ArrowUpIcon, ChevronDownIcon } from './icons';

interface NotificationCenterProps {
    user: firebase.User;
    onNavigate: (view: View) => void;
}

const NotificationCenter = ({ user, onNavigate }: NotificationCenterProps) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        });
        return () => unsubscribe();
    }, [user.uid]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        
        // When opening, if we are in 'all' view, we could mark them as read, 
        // but usually it's better to let user see them first.
        // We will mark them as read when displayed or manually if preferred.
        // For this implementation, let's just mark visible ones as read after a delay
        if (nextState && unreadCount > 0) {
            setTimeout(() => {
                notifications.filter(n => !n.read).forEach(n => {
                    markNotificationAsRead(user.uid, n.id);
                });
            }, 1000);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(user.uid, id);
    };

    const handleClearAll = async () => {
        if (confirm("Are you sure you want to clear all notifications?")) {
            await clearAllNotifications(user.uid);
        }
    };

    const handleItemClick = (notification: AppNotification) => {
        if (notification.link) {
            onNavigate(notification.link);
            setIsOpen(false);
        }
        // Ensure it's marked as read
        if (!notification.read) {
            markNotificationAsRead(user.uid, notification.id);
        }
    };

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangleIcon className="w-5 h-5 text-amber-500" />;
            case 'error': return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
            default: return <InfoIcon className="w-5 h-5 text-indigo-500" />;
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 60000); // minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const filteredNotifications = filter === 'all' 
        ? notifications 
        : notifications.filter(n => !n.read);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={toggleOpen} 
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 relative"
                aria-label="Notifications"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-800"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in-up transform origin-top-right">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Notifications</h3>
                        <div className="flex gap-3">
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleClearAll}
                                    className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Filter Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-2 text-xs font-semibold transition-colors ${filter === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('unread')}
                            className={`flex-1 py-2 text-xs font-semibold transition-colors ${filter === 'unread' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                        {filteredNotifications.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                                <BellIcon className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No notifications.</p>
                                {filter === 'unread' && notifications.length > 0 && (
                                    <p className="text-xs mt-1">You're all caught up!</p>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredNotifications.map(notification => (
                                    <div 
                                        key={notification.id} 
                                        onClick={() => handleItemClick(notification)}
                                        className={`relative p-4 flex gap-3 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 group ${
                                            !notification.read ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : ''
                                        } ${notification.link ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className={`text-sm font-bold ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                    {formatTime(notification.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                                {notification.message}
                                            </p>
                                            {notification.link && (
                                                <div className="mt-2 flex items-center text-[10px] font-bold text-indigo-500 uppercase tracking-wide group-hover:underline">
                                                    View Details <ArrowUpIcon className="w-3 h-3 ml-1 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, notification.id)}
                                            className="z-10 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all absolute top-2 right-2"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => {
                            onNavigate('notifications');
                            setIsOpen(false);
                        }}
                        className="w-full py-3 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-t border-slate-200 dark:border-slate-700 transition-colors"
                    >
                        View All Notifications
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
