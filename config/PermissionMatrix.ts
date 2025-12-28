import { UserRole, View, Permission } from '../types';

type RolePermissions = {
    [key in UserRole]: Permission[];
};

export const PERMISSION_MATRIX: RolePermissions = {
    admin: [
        'view_dashboard',
        'view_student_registration',
        'view_teacher_information',
        'view_class_information',
        'view_school_information',
        'view_subject_management',
        'view_account_information',
        'view_announcements',
        'view_activity_log',
        'view_notifications',
        'view_settings',
        'view_lesson_planner',
        'view_learn_sa',
        'view_study_planner',
        'view_history_sa',
        'view_data_sa',
        'view_reading_sa',
        'view_quiz_sa',
        'view_item_analysis',
        'view_class_record',
        'view_master_schedule',
        'view_teacher_schedule',
        'manage_users',
        'manage_classes',
        'edit_grades',
        'view_all_analytics',
        'edit_system_prompts',
        'upload_class_record',
        'view_analytics',
        'view_calendar',
        'delete_records',
        'view_resources',
        'manage_resources',
        'view_question_bank',
        'view_tos',
        'view_consolidated_report',
        'manage_academic_config'
    ],
    teacher: [
        'view_dashboard',
        'view_class_information',
        'view_announcements',
        'view_notifications',
        'view_settings',
        'view_lesson_planner',
        'view_learn_sa',
        // 'view_history_sa', // Teachers might start with limited AI tools
        'view_data_sa',
        'view_reading_sa',
        'view_quiz_sa',
        'view_item_analysis',
        'view_class_record',
        'view_teacher_schedule',
        'edit_grades',
        'upload_class_record',
        'view_resources',
        'manage_resources',
        'view_question_bank',
        'view_tos'
    ],
    student: [
        'view_dashboard',
        'view_announcements',
        'view_notifications',
        'view_settings',
        'view_learn_sa',
        'view_study_planner',
        'view_history_sa',
        'view_reading_sa',
        'view_quiz_sa',
        'view_quiz_sa',
        'view_class_information',
        'view_resources'
    ],
    principal: [
        'view_dashboard',
        'view_teacher_information',
        'view_class_information',
        'view_school_information',
        'view_subject_management',
        'view_announcements',
        'view_notifications',
        'view_settings',
        'view_data_sa',
        'view_class_record',
        'view_master_schedule',
        'view_all_analytics',
        'view_resources',
        'manage_resources',
        'view_consolidated_report'
    ],
    ict_coordinator: [
        'view_dashboard',
        'view_student_registration',
        'view_teacher_information',
        'view_class_information',
        'view_school_information',
        'view_subject_management',
        'view_account_information',
        'view_announcements',
        'view_activity_log',
        'view_notifications',
        'view_settings',
        'manage_users',
        'manage_classes',
        'view_resources',
        'manage_resources',
        'view_consolidated_report'
    ]
};

// Map Views to required Permissions
// If a View is not here, it is considered public (or handle with care)
export const VIEW_PERMISSIONS: Partial<Record<View, Permission>> = {
    'studentRegistration': 'view_student_registration',
    'teacherInformation': 'view_teacher_information',
    'classInformation': 'view_class_information',
    'schoolInformation': 'view_school_information',
    'subjectManagement': 'view_subject_management',
    'accountInformation': 'view_account_information',
    'activityLog': 'view_activity_log',
    'lessonPlanner': 'view_lesson_planner',
    'learnSA': 'view_learn_sa',
    'studyPlanner': 'view_study_planner',
    'historySA': 'view_history_sa',
    'dataSA': 'view_data_sa',
    'readingSA': 'view_reading_sa',
    'quizSA': 'view_quiz_sa',
    'itemAnalysis': 'view_item_analysis',
    'classRecord': 'view_class_record',
    'masterSchedule': 'view_master_schedule',
    'teacherSchedule': 'view_teacher_schedule',

    // Core Views (Now Restricted/Managed)
    'dashboard': 'view_dashboard',
    'adminDashboard': 'view_dashboard', // Alias
    'settings': 'view_settings',
    'settings_profile': 'view_settings',
    'notifications': 'view_notifications',
    'announcements': 'view_announcements',
    'resources': 'view_resources',
    'questionBank': 'view_question_bank',
    'tos': 'view_tos',
    'academicConfig': 'manage_academic_config',
};


import { UserProfile } from '../types';

export const hasPermission = (role: UserRole | null, permission: Permission, userProfile?: UserProfile | null): boolean => {
    if (!role) return false;

    // 1. Check Dynamic Override (Grant/Revoke)
    if (userProfile && userProfile.permissions && userProfile.permissions[permission] !== undefined) {
        return userProfile.permissions[permission]!;
    }

    // 2. Fallback to Role Default
    const permissions = PERMISSION_MATRIX[role];
    return permissions ? permissions.includes(permission) : false;
};

export const canAccessView = (role: UserRole | null, view: View, userProfile?: UserProfile | null): boolean => {
    // 1. Check if view has a specific permission requirement
    // Expanded mapping ensures Dashboard/Settings are also checked against permissions (allowing revocation).
    const requiredPermission = VIEW_PERMISSIONS[view];

    if (requiredPermission) {
        return hasPermission(role, requiredPermission, userProfile);
    }

    // 2. Handle Unmapped Views (Exceptions)
    // If a View is not mapped, it is Restricted by default.

    // Explicit Exception: Resources (No specific permission defined yet, assumed public or internal check)
    // Explicit Exception: Resources (No specific permission defined yet, assumed public or internal check)
    // if (view === 'resources') return true; // NOW MANAGED BY VIEW_PERMISSIONS

    // Fail Closed (Restricted)
    return false;
};

