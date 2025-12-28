import React from 'react';
import { SessionInfo } from '../../types';
import { FileTextIcon, TrashIcon, ClockIcon, CalendarIcon, ChevronRightIcon } from '../icons';

interface SessionCardProps {
    session: SessionInfo;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onClick, onDelete }) => {
    // Calculate a pseudo-progress based on metadata (mock simulation for visual if not available)
    // In a real scenario, you might want to save 'progress' percentage in SessionInfo.
    // For now, we'll use a random value seeded by ID or just 100% if done.
    const progress = 75; // Placeholder visual

    return (
        <div
            onClick={onClick}
            className="group relative bg-white/5 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/10 dark:border-slate-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:-translate-y-1"
        >
            {/* Background Glow Effect */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all" />

            <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/20 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        <FileTextIcon className="w-6 h-6" />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                        className="p-2 -mr-2 -mt-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Session"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                    {session.titleOfExamination}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-6">
                    <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(session.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {session.subject && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {session.subject}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200/10 dark:border-slate-700/50">
                    <div className="text-xs font-medium text-slate-400 group-hover:text-indigo-300 transition-colors">
                        Click to Resume
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <ChevronRightIcon className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};
