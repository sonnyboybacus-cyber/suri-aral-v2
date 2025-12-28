import React from 'react';
import { TimelineEvent } from '../../types';
import { ScrollIcon, GlobeIcon } from '../icons';

interface TimelineViewProps {
    events: TimelineEvent[];
    globalEvents?: TimelineEvent[];
}

export const TimelineView = ({ events, globalEvents }: TimelineViewProps) => {
    // Merge and sort events
    const allEvents = [
        ...events.map(e => ({ ...e, isGlobal: false })),
        ...(globalEvents || []).map(e => ({ ...e, isGlobal: true }))
    ].sort((a, b) => {
        const getYear = (y: string) => parseInt(y.replace(/[^0-9]/g, '')) * (y.includes('BC') || y.includes('B.C.') ? -1 : 1);
        return getYear(a.year) - getYear(b.year);
    });

    return (
        <div className="relative py-12 px-4 md:px-8">
            {/* Header / Legend */}
            <div className="absolute top-0 right-4 flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span> Local
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600"></span> Global
                </div>
            </div>

            {/* Central Data Spine */}
            <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>

            <div className="space-y-8 relative">
                {allEvents.map((event, idx) => {
                    const isLeft = idx % 2 === 0;
                    
                    return (
                        <div key={idx} className={`relative flex flex-col md:flex-row items-center w-full group ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                            
                            {/* Data Node on Spine */}
                            <div className="absolute left-6 md:left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full z-10 transition-all duration-500 group-hover:scale-150 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.8)] border-2 border-white dark:border-slate-900 box-content
                                ${event.isGlobal ? 'bg-slate-400 dark:bg-slate-600' : 'bg-indigo-500'}
                            "></div>

                            {/* Spacer */}
                            <div className="hidden md:block md:w-1/2"></div>

                            {/* Card Connector Line (Horizontal) - Only Desktop */}
                            <div className={`hidden md:block absolute top-1/2 h-px bg-slate-300 dark:bg-slate-700 w-8 transition-all duration-300 group-hover:bg-indigo-400 group-hover:w-12
                                ${isLeft ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'}
                            `}></div>

                            {/* Content Card */}
                            <div className={`w-full md:w-[45%] pl-12 md:pl-0 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                                <div className={`
                                    relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl overflow-hidden
                                    ${event.isGlobal 
                                        ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' 
                                        : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 shadow-md'}
                                `}>
                                    {/* Abstract Decorator */}
                                    <div className={`absolute top-0 w-full h-1 opacity-50 ${event.isGlobal ? 'bg-slate-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} ${isLeft ? 'right-0' : 'left-0'}`}></div>

                                    {/* Meta Header */}
                                    <div className={`flex items-center gap-2 mb-3 ${isLeft ? 'md:flex-row-reverse' : 'flex-row'}`}>
                                        <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                                            event.isGlobal 
                                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' 
                                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                        }`}>
                                            {event.year}
                                        </span>
                                        {event.isGlobal && (
                                            <GlobeIcon className="w-3 h-3 text-slate-400" />
                                        )}
                                    </div>

                                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2 leading-tight">
                                        {event.title}
                                    </h4>
                                    
                                    {/* Concise Description - Clamped */}
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                        {event.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};