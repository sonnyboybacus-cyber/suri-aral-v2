
import { UserRole } from './core';

export interface StudentSF1 {
    id: string;
    lrn: string;
    lastName: string;
    firstName: string;
    middleName: string;
    extensionName: string;
    sex: 'Male' | 'Female';
    birthDate: string; // YYYY-MM-DD
    age: number;
    motherTongue: string;
    ethnicGroup: string;
    religion: string;
    addressStreet: string;
    addressBarangay: string;
    addressCity: string;
    addressProvince: string;
    fatherName: string;
    motherName: string;
    guardianName: string;
    guardianRelationship: string;
    contactNumber: string;
    remarks: string;
    deletedAt?: number;
    linkedAccountId?: string; // Links to the Firebase Auth UID
    schoolId?: string; // Bound School ID
}

export interface Teacher {
    id: string;
    employeeId: string;
    lastName: string;
    firstName: string;
    middleName: string;
    extensionName: string;
    sex: 'Male' | 'Female';
    email: string;
    phoneNumber: string;
    position: string;
    specialization: string;
    dateOfAppointment: string; // YYYY-MM-DD
    status: 'Permanent' | 'Substitute' | 'Probationary' | 'Contractual';
    deletedAt?: number;
    linkedAccountId?: string; // Links to UserProfile uid
    hasAccount?: boolean; // Fallback flag indicating registration
    schoolId?: string; // Bound School ID
    role?: UserRole; // 'admin' or 'teacher' - for future refactoring and distinction
}

export type EventType = 'Holiday' | 'Exam' | 'Activity' | 'Suspension' | 'Meeting' | 'Deadline';

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string; // ISO String or YYYY-MM-DD
    endDate?: string;
    type: EventType;
    schoolId: string; // "Global" if applies to all (superadmin), specific schoolId otherwise
    createdBy: string; // User UID
    createdAt: number;
    isOfficial: boolean; // True if created by Admin
    targetAudience?: 'All' | 'Teachers' | 'Students';
}

export interface LearningCompetency {
    description: string;
    code: string;
}

export interface WeeklyUnit {
    id: string;
    orderIndex: number;
    weekLabel: string; // e.g., "Week 1"
    contentTopic: string; // The main subject matter
    contentStandard: string;
    performanceStandard: string;
    competencies: LearningCompetency[];
}

export interface QuarterUnit {
    quarter: string; // e.g., "1st Quarter"
    weeks: WeeklyUnit[];
}

export interface Subject {
    id: string;
    code: string; // e.g. MATH10
    name: string; // e.g. Mathematics 10
    description: string;
    department: string;
    gradeLevel: string;
    deletedAt?: number;
    // SHS Fields
    classification?: 'Core' | 'Applied' | 'Specialized';
    track?: string; // Academic, TVL, etc.
    strand?: string; // STEM, ABM, ICT, etc.
    semester?: '1st Semester' | '2nd Semester';
    prerequisiteId?: string;
    // Curriculum Guide
    curriculum?: QuarterUnit[];
}

export interface ClassSubject {
    id: string;
    name: string;
    teacherId: string; // Corresponds to Teacher['id']
}

export interface ScheduleSlot {
    id: string;
    day: string; // 'Monday', 'Tuesday', etc.
    startTime: string; // '08:00'
    endTime: string; // '09:00'

    // Context
    subjectId: string; // Links to ClassSubject.id (Optional for breaks/generic activities)
    subjectName: string;
    teacherId: string;
    teacherName: string;
    roomId?: string; // Links to SchoolRoom.id
    roomName?: string;

    // Activity Specifics
    type: 'class' | 'break' | 'activity'; // Broad category
    activityType?: 'Quiz' | 'Exam' | 'Performance Task' | 'Recitation' | 'Defense' | 'Project' | 'Lecture' | 'Holiday' | 'Suspension' | 'Meeting' | 'Event';
    title?: string; // Specific topic: "Chapter 1 Quiz" or "Thesis Defense"
}

export interface ClassInfo {
    id: string;
    schoolId: string; // Corresponds to SchoolInfo['id']
    gradeLevel: string;
    section: string;
    schoolYear: string;
    adviserId: string; // Corresponds to Teacher['id']
    subjects: ClassSubject[];
    studentIds: string[]; // List of StudentSF1['id']
    track?: string; // SHS Track
    strand?: string; // SHS Strand
    schedule?: ScheduleSlot[];
    roomId?: string; // Home Room
    shift?: string; // e.g. "Morning Shift", "Afternoon Shift", "Whole Day"

    deletedAt?: number;
    joinCode?: string; // 6-char alphanumeric code for student self-enrollment
}

export interface SchoolLocation {
    lat: number;
    lng: number;
    address: string;
}

export interface SchoolRoom {
    id: string;
    roomNumber: string;
    type: string;
    capacity: number;
    condition: string;
}

export interface SchoolInfo {
    id: string;
    schoolId: string;
    schoolName: string;
    schoolYear: string;
    curriculum: string;
    gradeLevels: string; // e.g., "K-6", "7-10"
    district: string;
    division: string;
    region: string;
    psds: string; // Public Schools District Supervisor
    principalId: string;
    assignedTeacherIds: string[];
    deletedAt?: number;
    location?: SchoolLocation;
    rooms?: SchoolRoom[];
}
