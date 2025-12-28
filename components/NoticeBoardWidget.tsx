
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Announcement } from '../types';
import { subscribeToAnnouncements } from '../services/databaseService';
import { BellIcon, MegaphoneIcon, CalendarIcon, XIcon } from './icons';

// Helper to render text with clickable links (Same as in Announcements.tsx)
const RichTextRenderer = ({ text }: { text: string }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
            {parts.map((part, i) =>
                part.match(urlRegex) ? (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline break-all"
                    >
                        {part}
                    </a>
                ) : (
                    part
                )
            )}
        </p>
    );
};

export const NoticeBoardWidget = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAnnouncements((data) => {
            // Take only top 3 recent
            setAnnouncements(data.slice(0, 3));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60); // hours

        if (diff < 24) {
            return `${Math.max(1, Math.floor(diff))}h ago`;
        }
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const formatFullDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden h-full">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-200 flex items-center">
                        <BellIcon className="w-5 h-5 mr-2 text-slate-400" />
                        Notice Board
                    </h2>
                    {announcements.length > 0 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                    )}
                </div>

                <div className="flex-1 p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">Checking for updates...</div>
                    ) : announcements.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                                <MegaphoneIcon className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-serif font-medium">All caught up</p>
                            <p className="text-slate-400 text-xs mt-1">No new announcements at this time.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {announcements.map(ann => (
                                <div
                                    key={ann.id}
                                    onClick={() => setSelectedAnnouncement(ann)}
                                    className="p-5 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-all cursor-pointer group active:scale-[0.99]"
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                            <span className="text-indigo-500 mr-2">{ann.authorName}</span>
                                            <span>{formatDate(ann.date)}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-serif font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {ann.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                        {ann.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal - Rendered via Portal to escape parent stacking context */}
            {selectedAnnouncement && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-fade-in-up relative border border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setSelectedAnnouncement(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition-colors z-10"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <header className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                        {selectedAnnouncement.authorName}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium flex items-center">
                                        <CalendarIcon className="w-3 h-3 mr-1" />
                                        {formatFullDate(selectedAnnouncement.date)}
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
                                    {selectedAnnouncement.title}
                                </h2>
                            </header>

                            <div className="prose prose-slate dark:prose-invert max-w-none pb-4">
                                <RichTextRenderer text={selectedAnnouncement.content} />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
