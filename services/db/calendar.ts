
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { CalendarEvent } from '../../types';
import { db } from '../firebase';
import { parseSnapshot, generateUUID } from './core';

const getEventsRef = () => db.ref('calendar_events');

// --- CALENDAR EVENTS ---

export const saveEvent = async (userId: string, event: CalendarEvent): Promise<void> => {
    if (!event.id) event.id = generateUUID();
    await getEventsRef().child(event.id).set(event);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    await getEventsRef().child(eventId).remove();
};

export const loadEvents = async (schoolId?: string): Promise<CalendarEvent[]> => {
    const eventsRef = getEventsRef();
    const snapshot = await eventsRef.once('value');
    const allEvents = parseSnapshot<CalendarEvent>(snapshot);

    // If no schoolId provided (or 'All'), return ALL events (for Admin view)
    if (!schoolId || schoolId === 'All') {
        return allEvents;
    }

    // Otherwise filter for specific school + Global events
    return allEvents.filter(e =>
        !e.schoolId || e.schoolId === 'Global' || e.schoolId === schoolId
    );
};

export const loadEventsByRange = async (schoolId: string, start: string, end: string): Promise<CalendarEvent[]> => {
    // Basic implementation loads all then filters. Optimization: Use orderByChild('startDate')
    const events = await loadEvents(schoolId);
    return events.filter(e =>
        (e.startDate >= start && e.startDate <= end) ||
        (e.endDate && e.endDate >= start && e.startDate <= end)
    );
};
