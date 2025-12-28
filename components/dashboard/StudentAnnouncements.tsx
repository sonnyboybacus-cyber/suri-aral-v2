import React, { useState, useEffect } from 'react';
import { Announcement } from '../../types';
import { subscribeToAnnouncements } from '../../services/databaseService';
import { MessageSquareIcon, Volume2Icon, PinIcon } from '../icons';

export const StudentAnnouncements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToAnnouncements((data) => {
            setAnnouncements(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Show top 3 (pinned first, then date)
    const displayedAnnouncements = announcements
        .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.date - a.date;
        })
        .slice(0, 3);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[300px] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Volume2Icon className="w-5 h-5 text-indigo-500" /> Announcements
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-full">{announcements.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Loading updates...</div>
                ) : displayedAnnouncements.length > 0 ? (
                    displayedAnnouncements.map(ann => (
                        <div key={ann.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    {ann.isPinned && <PinIcon className="w-3 h-3 text-orange-500 fill-orange-500" />}
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-1">{ann.title}</h4>
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(ann.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {ann.content}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{ann.authorName}</span>
                                {ann.type && <span className="text-[10px] text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700 px-1.5 rounded">{ann.type}</span>}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <MessageSquareIcon className="w-8 h-8 opacity-20" />
                        <span className="text-sm">No new announcements</span>
                    </div>
                )}
            </div>
        </div>
    );
};
