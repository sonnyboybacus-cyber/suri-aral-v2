
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import {
    UserSettings, AppNotification, Announcement, UserActivity, ActivityLogEntry,
    StudentSF1, Teacher, ClassInfo, SchoolInfo, Subject, UserProfile, UserRole,
    StudyPlan, LessonPlan, SessionData, SessionInfo, ProgressRecord, GamificationProfile, UserDailyMissions, DailyMission, PinnedNote,
    ClassRecord, LearningJourney, Curriculum, SavedQuiz, QuizResult, AccessCode
} from '../types';
import { db, firebaseConfig } from './firebase';


// -------------------------------------------------------------------------
// SURI-ARAL V2 DATABASE SERVICE FACADE
// -------------------------------------------------------------------------

export * from './db/core';
export * from './db/academic';
export * from './db/learning';
export * from './db/grading';
export * from './db/calendar';
export * from './db/questionBank';
export * from './db/tos';
export * from './db/config';

