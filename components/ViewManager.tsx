
import React from 'react';
import firebase from 'firebase/compat/app';
import { View, UserRole, ChatMessage, AIContext, UserSettings, LearnSAContext, UserProfile } from '../types';
import { canAccessView } from '../config/PermissionMatrix';
import { AccessRestricted } from './AccessRestricted';

// Dashboards
import { Dashboard } from './Dashboard';

// Core
import { Announcements } from './Announcements';
import ActivityLogView from './ActivityLogView';
import NotificationView from './NotificationView';

import SettingsView from './SettingsView';
import { LoadingScreen } from './ui/Loaders';

// Academic Modules
import StudentRegistration from './StudentRegistration';
import TeacherInformation from './TeacherInformation';
import ClassInformation from './ClassInformation';
import SchoolInformation from './SchoolInformation';
import SubjectManager from './SubjectManager';
import { ClassRecordView } from './ClassRecord';
import { SchoolSchedule } from './SchoolSchedule';
import AccountInformation from './AccountInformation';
import { TeacherScheduleView } from './TeacherScheduleView';
import { ManagedResourcesList } from './ManagedResourcesList';
import { AcademicSettings } from './settings/AcademicSettings';

// AI Tools
import { ItemAnalysis } from './ItemAnalysis';
import LessonPlanner from './LessonPlanner';
import { LearnSA } from './LearnSA';
import { DataSA } from './DataSA';
import { HistorySA } from './HistorySA';
import { ReadingSA } from './ReadingSA';
import { QuizSA } from './QuizSA';
import { StudyPlanner } from './StudyPlanner';

interface ViewManagerProps {
    user: firebase.User;
    role: UserRole | null;
    userProfile?: UserProfile | null; // Add userProfile
    activeView: View;
    setActiveView: (view: View) => void;
    onLaunchTutor: (context: LearnSAContext) => void;
    onStartAnalysis: (context: AIContext) => void;
    insightsMessages: ChatMessage[];
    onSettingsChange: (settings: UserSettings) => void;
    learnSaContext: LearnSAContext | null;
    lessonPlanContext: { topic: string, learningArea: string, gradeLevel: string, competency: string } | null;
    onLogout: () => void;
    onGenerateLessonPlan: (data: any) => void;
}

export const ViewManager = ({
    user,
    role,
    userProfile, // Destructure userProfile
    activeView,
    setActiveView,
    onLaunchTutor,
    onStartAnalysis,
    insightsMessages,
    onSettingsChange,
    learnSaContext,
    lessonPlanContext,
    onLogout, // Destructure onLogout
    onGenerateLessonPlan
}: ViewManagerProps) => {

    // We no longer block on !role here, because App.tsx might timeout and force render with null role.
    // Instead, we let the individual views handle the null role (or restricted access).

    // If role is missing (or loading timed out), we render the Dashboard which now handles the null case gracefully.
    if (!role) {
        return <Dashboard user={user} role={null} setActiveView={setActiveView} onLaunchTutor={(topic) => onLaunchTutor({ topic, contextData: `General Topic: ${topic}` })} />;
    }

    // Security Check: If role is known but profile is missing, we cannot verify dynamic permissions.
    // Prevent fallback to default role permissions by blocking access until profile loads.
    if (role && !userProfile && activeView !== 'dashboard') {
        return <div className="flex items-center justify-center h-full text-slate-400">Loading permissions...</div>;
    }

    if (!canAccessView(role, activeView, userProfile)) { // Pass userProfile to check
        return <AccessRestricted onBack={() => setActiveView('dashboard')} message="You do not have permission to view this module." />;
    }

    switch (activeView) {
        // --- Core Dashboards ---
        case 'resources':
            return <ManagedResourcesList />;
        case 'dashboard':

            return (
                <Dashboard
                    user={user}
                    role={role}
                    setActiveView={setActiveView}
                    onLaunchTutor={(topic) => onLaunchTutor({ topic, contextData: `General Topic: ${topic}` })}
                />
            );

        // --- Core Utilities ---
        case 'adminDashboard': // Obsolete route name, redirects to main dashboard
            return <Dashboard user={user} role={role} setActiveView={setActiveView} onLaunchTutor={(topic) => onLaunchTutor({ topic, contextData: `General Topic: ${topic}` })} />;

        case 'announcements':
            return <Announcements user={user} role={role} />;
        case 'activityLog':
            return <ActivityLogView user={user} role={role} />;
        case 'notifications':
            return <NotificationView user={user} onNavigate={setActiveView} />;
        case 'settings':
            return <SettingsView user={user} role={role} onSettingsChange={onSettingsChange} onClose={() => setActiveView('dashboard')} onLogout={onLogout} />;
        case 'settings_profile':
            return <SettingsView user={user} role={role} onSettingsChange={onSettingsChange} onClose={() => setActiveView('dashboard')} onLogout={onLogout} initialTab="account" />;

        // --- Academic ---
        case 'studentRegistration':
            return <StudentRegistration user={user} />;
        case 'teacherInformation':
            return <TeacherInformation user={user} />;
        case 'classInformation':
            return <ClassInformation user={user} userProfile={userProfile} />;
        case 'schoolInformation':
            return <SchoolInformation user={user} />;
        case 'subjectManagement':
            return <SubjectManager user={user} onLaunchTutor={onLaunchTutor} />;
        case 'classRecord':
            return <ClassRecordView user={user} />;
        case 'masterSchedule':
            return <SchoolSchedule user={user} />;
        case 'accountInformation':
            return <AccountInformation user={user} />;
        case 'academicConfig':
            return <AcademicSettings />;


        // --- Tools (Embedded) ---
        case 'itemAnalysis':
            return <ItemAnalysis user={user} onStartAnalysis={onStartAnalysis} chatMessages={insightsMessages} onGenerateLessonPlan={onGenerateLessonPlan} />;
        case 'lessonPlanner':
            return <LessonPlanner user={user} initialContext={lessonPlanContext} />;
        case 'learnSA':
            return <LearnSA user={user} initialContext={learnSaContext} />;
        case 'dataSA':
            return <DataSA user={user} onStartAnalysis={onStartAnalysis} />;
        case 'historySA':
            return <HistorySA user={user} />;
        case 'quizSA':
            return <QuizSA user={user} />;
        case 'readingSA':
            return <ReadingSA user={user} />;
        case 'studyPlanner':
            return <StudyPlanner userId={user.uid} onClose={() => setActiveView('dashboard')} isStandalone={true} onLaunchTutor={(topic) => onLaunchTutor({ topic, contextData: `General Topic: ${topic}` })} />;
        case 'teacherSchedule':
            return <TeacherScheduleView user={user} />;

        default:
            return <Dashboard user={user} role={role} setActiveView={setActiveView} onLaunchTutor={(topic) => onLaunchTutor({ topic, contextData: `General Topic: ${topic}` })} />;
    }
};
