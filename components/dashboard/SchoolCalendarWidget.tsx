
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../types';
import { loadEvents } from '../../services/databaseService';
import { CalendarIcon, ChevronRightIcon, CalendarCheckIcon, SpinnerIcon } from '../icons';
import { UserProfile } from '../../types';

interface SchoolCalendarWidgetProps {
    userProfile?: UserProfile;
    onNavigate?: () => void;
}

export const SchoolCalendarWidget = ({ userProfile, onNavigate }: SchoolCalendarWidgetProps) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            // Allow fetching without profile (Global only) or with profile
            try {
                const schoolId = userProfile?.schoolId || '';
                const data = await loadEvents(schoolId);

                // Sort by date
                const sorted = data.sort((a, b) => a.startDate.localeCompare(b.startDate));

                // Filter to show next 5 events
                const now = new Date().toISOString().split('T')[0];
                const upcoming = sorted.filter(e => e.startDate >= now).slice(0, 5);

                setEvents(upcoming.length > 0 ? upcoming : sorted.slice(0, 5)); // specific fallback
            } catch (error) {
                console.error("Failed to load calendar events", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [userProfile?.schoolId]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.toLocaleDateString('en-US', { day: '2-digit' }),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            weekday: date.toLocaleDateString('en-US', { weekday: 'short' })
        };
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <CalendarCheckIcon className="w-5 h-5 text-indigo-500" /> School Calendar
                </h3>
            </div>

            <div className="space-y-4 min-h-[200px]">
                {isLoading ? (
                    <div className="flex justify-center py-10"><SpinnerIcon className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : events.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic text-sm">No upcoming events.</div>
                ) : (
                    events.map((event, index) => {
                        const { day, month, weekday } = formatDate(event.startDate);
                        return (
                            <div key={index} className="flex items-center gap-4 group cursor-default">
                                <div className={`
                                    flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition-colors shrink-0
                                    ${event.type === 'Holiday' ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : ''}
                                    ${event.type === 'Exam' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : ''}
                                    ${['Activity', 'Meeting', 'Deadline', 'Suspension'].includes(event.type) ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' : ''}
                                `}>
                                    <span className="text-[10px] font-bold uppercase">{month}</span>
                                    <span className="text-xl font-black">{day}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-500 transition-colors" title={event.title}>{event.title}</h4>
                                    <p className="text-xs text-slate-400 font-medium flex justify-between">
                                        <span>{weekday}</span>
                                        <span className="uppercase text-[9px] font-bold tracking-wider opacity-70 border border-slate-200 dark:border-slate-700 px-1.5 rounded">{event.type}</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}

                <button
                    onClick={onNavigate}
                    className="w-full mt-2 py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-1 group"
                >
                    <span>View Full Calendar</span>
                    <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};
