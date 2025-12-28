
import { ClassInfo, ScheduleSlot, SchoolRoom, Teacher } from '../../types';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const generateTimeSlots = (startHour: string, endHour: string, durationMinutes: number) => {
    const slots = [];
    let current = new Date(`2000-01-01T${startHour}`);
    const end = new Date(`2000-01-01T${endHour}`);

    while (current < end) {
        const startStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        current.setMinutes(current.getMinutes() + durationMinutes);
        const endStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        slots.push({ start: startStr, end: endStr });
    }
    return slots;
};

export const checkScheduleConflict = (
    day: string, 
    startTime: string, 
    endTime: string,
    currentClassId: string,
    allClasses: ClassInfo[],
    teacherId?: string,
    roomId?: string
): string | null => {
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    for (const cls of allClasses) {
        // Prevent checking against self (Fix for Self-Conflict Bug)
        if (cls.id === currentClassId) continue;

        if (!cls.schedule) continue;

        for (const slot of cls.schedule) {
            if (slot.day !== day) continue;

            const slotStart = toMinutes(slot.startTime);
            const slotEnd = toMinutes(slot.endTime);

            const isOverlapping = newStart < slotEnd && newEnd > slotStart;

            if (isOverlapping) {
                // Check Teacher Conflict
                if (teacherId && slot.teacherId === teacherId) {
                    return `Teacher Double Booked: ${slot.teacherName} in ${cls.gradeLevel}-${cls.section}`;
                }
                // Check Room Conflict
                if (roomId && slot.roomId === roomId) {
                    return `Room Occupied: ${slot.roomName} by ${cls.gradeLevel}-${cls.section}`;
                }
            }
        }
    }
    return null;
};

export const getTeacherName = (teachers: Teacher[], id: string) => {
    const t = teachers.find(tea => tea.id === id);
    return t ? `${t.lastName}, ${t.firstName}` : 'Unknown';
};
