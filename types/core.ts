
export type UserRole = 'admin' | 'teacher' | 'student' | 'principal' | 'ict_coordinator';

export type View = 'dashboard' | 'studentRegistration' | 'itemAnalysis' | 'teacherInformation' | 'classInformation' | 'schoolInformation' | 'subjectManagement' | 'accountInformation' | 'announcements' | 'activityLog' | 'notifications' | 'settings' | 'settings_profile' | 'lessonPlanner' | 'learnSA' | 'studyPlanner' | 'historySA' | 'dataSA' | 'readingSA' | 'quizSA' | 'classRecord' | 'masterSchedule' | 'adminDashboard' | 'adminProfile' | 'teacherSchedule' | 'resources' | 'questionBank' | 'tos' | 'academicConfig';

export type Permission =
    | 'view_dashboard'
    | 'view_student_registration'
    | 'view_teacher_information'
    | 'view_class_information'
    | 'view_school_information'
    | 'view_subject_management'
    | 'view_account_information'
    | 'view_announcements'
    | 'view_activity_log'
    | 'view_notifications'
    | 'view_settings'
    | 'view_lesson_planner'
    | 'view_learn_sa'
    | 'view_study_planner'
    | 'view_history_sa'
    | 'view_data_sa'
    | 'view_reading_sa'
    | 'view_quiz_sa'
    | 'view_item_analysis'
    | 'view_class_record'
    | 'view_master_schedule'
    | 'view_teacher_schedule'
    | 'manage_users'
    | 'manage_classes'
    | 'edit_grades'
    | 'view_all_analytics'
    | 'edit_system_prompts'
    | 'upload_class_record'
    | 'view_calendar'
    | 'delete_records'
    | 'view_analytics'
    | 'view_resources'
    | 'manage_resources'
    | 'view_question_bank'
    | 'view_tos'
    | 'view_consolidated_report'
    | 'manage_academic_config';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: number;
    disabled?: boolean;
    schoolId?: string; // Links user to a specific school
    isSuperAdmin?: boolean; // God Mode
    permissions?: Partial<Record<Permission, boolean>>; // Granular Access
}

export interface AccessCode {
    id: string;
    code: string;
    role: UserRole;
    label: string;
    active: boolean;
    usageCount: number;
    expiresAt?: number;
    schoolId?: string; // Validates against a specific school
    permissions?: string[]; // Granular permissions: 'can_delete_records', 'can_edit_content', etc.
}

export interface ManagedResource {
    id: string;
    title: string;
    description?: string;
    type: 'link' | 'file';
    url: string;
    createdAt: number;
    createdBy: string;
    schoolId?: string; // Link to specific school

    // NEW Fields for Refactored Management
    uploadedBy: string;
    targetRoles: UserRole[];

    // Legacy support (optional)
    allowedRoles?: UserRole[];
    allowedUsers?: string[];
}

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    language: 'english' | 'filipino';
    showWebImages: boolean;
    saveHistory: boolean;
    responseStyle: 'concise' | 'detailed';
    studyReminderTime: string;
    pushNotifications?: boolean;
    aiModel?: string;
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: View;
}

export interface ActivityLogEntry {
    id: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'other';
    module: 'Student' | 'Teacher' | 'Class' | 'School' | 'Item Analysis' | 'Account' | 'Planner' | 'Announcements' | 'SURI-ARAL Chat' | 'Lesson Plan' | 'Subject' | 'Schedule' | 'Learn SA' | 'History SA' | 'Data SA' | 'Reading SA' | 'Class Record' | 'Master Schedule' | 'Quiz SA';
    details: string;
    timestamp: number;
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    images?: string[]; // Base64 strings for generated charts
}

export interface AIContext {
    // Item Analysis Fields
    metadata?: any; // Avoiding circular dependency, defined in tools
    students?: any[];
    analysisResults?: any[];
    questions?: string;

    // Data Analysis Fields
    dataAnalysisResult?: any;
    advancedAnalysisResult?: any;
}

// Gamification
export interface GamificationProfile {
    current_xp: number;
    current_level: number;
    current_streak: number;
    last_login_date: string; // YYYY-MM-DD
    badges_earned: string[];
    last_pin_date?: string; // YYYY-MM-DD
}

export type MissionType = 'MATH_SOLVER' | 'READING_SESSION' | 'HISTORY_QUERY' | 'FILE_UPLOAD' | 'STATS_ANALYSIS' | 'STUDY_SESSION';

export interface DailyMission {
    id: string;
    type: MissionType;
    description: string;
    target: number;
    progress: number;
    completed: boolean;
    rewardXP: number;
}

export interface UserDailyMissions {
    userId: string;
    date: string; // YYYY-MM-DD
    missions: DailyMission[];
    bonusClaimed: boolean;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: number;
    authorName: string;
    authorId: string;
    isPinned?: boolean;
    type?: 'general' | 'urgent' | 'event' | 'reminder';
}

export interface PinnedNote {
    id: string;
    content: string;
    timestamp: number;
    sourceMode: string;
    images?: string[];
}

export interface UserActivity {
    id: string;
    type: 'LOGIN' | 'TUTOR' | 'EXAM' | 'STATS' | 'NOTEBOOK' | 'READING' | 'HISTORY' | 'DATA_ANALYSIS';
    title: string;
    subtitle?: string;
    timestamp: number;
    contextData?: {
        chatMode: 'tutor' | 'history' | 'stats' | 'writing' | 'exam_prep' | 'reading' | 'sa_tutor';
        messages: ChatMessage[];
    };
}

export interface AssistantContext {
    schoolName: string;
    location: string;
    schoolYear: string;
    totalStudents: number;
    totalTeachers: number;
    activeClasses: number;
    totalSubjects: number;
}

// Learn SA Personalization
export type LearningStyle = 'Socratic' | 'ELI5' | 'Academic' | 'Practical';

export interface LearningJourney {
    id: string;
    topic: string;
    style: LearningStyle;
    totalModules: number;
    completedModules: number;
    createdAt: number;
    lastAccessed: number;
    curriculumData: any; // The generated Curriculum object

    // Personalization & Linking
    linkedSubjectId?: string;
    linkedWeekId?: string;
    contextTags?: string[];
}

// Shared type for launching LearnSA with context
export interface LearnSAContext {
    topic: string;
    contextData: string; // Full curriculum context string
    subjectId?: string;
    weekId?: string;
}

export type SettingsTab = 'general' | 'account' | 'ai_tutor' | 'notifications' | 'support' | 'documentation' | 'academic_config';
