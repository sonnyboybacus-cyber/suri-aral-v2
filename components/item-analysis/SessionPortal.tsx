import React, { useState } from 'react';
import { SessionInfo } from '../../types';
import { SessionCard } from './SessionCard';
import { XIcon, SearchIcon, FolderIcon, LayoutGridIcon } from '../icons';

interface SessionPortalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: SessionInfo[];
    onLoad: (id: string) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

export const SessionPortal: React.FC<SessionPortalProps> = ({
    isOpen, onClose, sessions, onLoad, onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredSessions = sessions.filter(s =>
        s.titleOfExamination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject && s.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl transition-all"
                onClick={onClose}
            />

            <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900/50 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="shrink-0 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 border-b border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                            <FolderIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Session Portal</h2>
                            <p className="text-sm text-slate-400 font-medium">Access your saved item analysis workspaces</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800 transition-all"
                            />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {filteredSessions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                <LayoutGridIcon className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Sessions Found</h3>
                            <p className="text-slate-400 max-w-sm">
                                {searchTerm ? `No results for "${searchTerm}"` : "Your saved workspaces will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSessions.map(session => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    onClick={() => onLoad(session.id)}
                                    onDelete={(e) => onDelete(e, session.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="shrink-0 p-4 border-t border-white/5 bg-slate-900/40 text-center text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {filteredSessions.length} Session{filteredSessions.length !== 1 ? 's' : ''} Available
                </div>
            </div>
        </div>
    );
};
