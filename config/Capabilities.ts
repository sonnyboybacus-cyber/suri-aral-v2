import { Permission } from '../types';

export interface Capability {
    id: Permission;
    name: string;
    description: string;
    category: 'System' | 'Academic' | 'Users' | 'Content' | 'Analytics';
}

export const CAPABILITIES: Capability[] = [
    // --- System ---
    { id: 'view_dashboard', name: 'View Dashboard', description: 'Access the main dashboard.', category: 'System' },
    { id: 'view_settings', name: 'View Settings', description: 'Access system settings.', category: 'System' },
    { id: 'view_notifications', name: 'View Notifications', description: 'View system notifications.', category: 'System' },
    { id: 'view_announcements', name: 'View Announcements', description: 'View global announcements.', category: 'System' },
    { id: 'view_activity_log', name: 'View Activity Log', description: 'View personal or system activity logs.', category: 'System' },
    { id: 'view_calendar', name: 'View Calendar', description: 'Access the school calendar.', category: 'System' },
    { id: 'edit_system_prompts', name: 'Edit AI Prompts', description: 'Modify system-level AI behavior.', category: 'System' },
    { id: 'delete_records', name: 'Delete Records', description: 'Hard delete records from the database.', category: 'System' },

    // --- Users ---
    { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, or disable user accounts.', category: 'Users' },
    { id: 'view_account_information', name: 'View Accounts', description: 'View list of all accounts.', category: 'Users' },
    { id: 'view_student_registration', name: 'Register Students', description: 'Access student registration forms.', category: 'Users' },
    { id: 'view_teacher_information', name: 'View Teachers', description: 'Access teacher profiles and data.', category: 'Users' },

    // --- Academic ---
    { id: 'view_class_information', name: 'View Classes', description: 'View lists of classes and students.', category: 'Academic' },
    { id: 'view_school_information', name: 'View School Info', description: 'View school profiles and assets.', category: 'Academic' },
    { id: 'manage_classes', name: 'Manage Classes', description: 'Create or modify class structures.', category: 'Academic' },
    { id: 'view_subject_management', name: 'Manage Subjects', description: 'Create or modify subjects.', category: 'Academic' },
    { id: 'view_class_record', name: 'View Class Records', description: 'Access official class records.', category: 'Academic' },
    { id: 'edit_grades', name: 'Edit Grades', description: 'Modify student grades.', category: 'Academic' },
    { id: 'upload_class_record', name: 'Upload Class Record', description: 'Upload Excel/CSV class records.', category: 'Academic' },
    { id: 'view_master_schedule', name: 'View Master Schedule', description: 'Access the school-wide schedule.', category: 'Academic' },
    { id: 'view_teacher_schedule', name: 'View Teacher Schedule', description: 'Access teacher-specific schedules.', category: 'Academic' },

    // --- Content / Tools ---
    { id: 'view_lesson_planner', name: 'Lesson Planner', description: 'Access AI Lesson Planner.', category: 'Content' },
    { id: 'view_learn_sa', name: 'Learn SA (Tutor)', description: 'Access the AI Tutor.', category: 'Content' },
    { id: 'view_study_planner', name: 'Study Planner', description: 'Access Study Planner tool.', category: 'Content' },
    { id: 'view_history_sa', name: 'History SA', description: 'Access History AI tool.', category: 'Content' },
    { id: 'view_reading_sa', name: 'Reading SA', description: 'Access Reading Assistant.', category: 'Content' },
    { id: 'view_quiz_sa', name: 'Quiz SA', description: 'Access Quiz Generator.', category: 'Content' },
    { id: 'view_resources', name: 'View Resources', description: 'Access shared resources page.', category: 'Content' },
    { id: 'manage_resources', name: 'Manage Resources', description: 'Add, delete, or modify shared resources.', category: 'Content' },

    // --- Analytics ---
    { id: 'view_analytics', name: 'View Analytics', description: 'View basic charts and trends.', category: 'Analytics' },
    { id: 'view_all_analytics', name: 'View All Analytics', description: 'View advanced system-wide analytics.', category: 'Analytics' },
    { id: 'view_data_sa', name: 'Data SA', description: 'Access general data analysis tools.', category: 'Analytics' },
    { id: 'view_item_analysis', name: 'Item Analysis', description: 'Run item analysis on test scores.', category: 'Analytics' },
    { id: 'view_question_bank', name: 'Question Bank', description: 'Access and manage question banks.', category: 'Content' },
    { id: 'view_tos', name: 'Table of Specifications', description: 'Create and manage TOS templates.', category: 'Content' },
    { id: 'view_consolidated_report', name: 'Consolidated Report', description: 'Access departmental aggregated reports.', category: 'Analytics' },
];

export const getCapabilitiesByCategory = () => {
    const categories: Record<string, Capability[]> = {};
    CAPABILITIES.forEach(cap => {
        if (!categories[cap.category]) categories[cap.category] = [];
        categories[cap.category].push(cap);
    });
    return categories;
};
