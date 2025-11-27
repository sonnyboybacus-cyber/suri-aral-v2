
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import { SessionData, SessionInfo, StudentSF1, Teacher, ClassInfo, SchoolInfo, Subject, ProgressRecord, UserProfile, UserRole, ActivityLogEntry, GamificationProfile, UserDailyMissions, DailyMission, MissionType, PinnedNote, StudyPlan, UserActivity, Announcement, AppNotification, UserSettings, LessonPlan } from '../types';
import { db, firebaseConfig } from './firebase';

// --- PRIVATE DATA (Specific to the logged-in user) ---
const getSessionsRef = (userId: string) => db.ref(`users/${userId}/sessions`);
const getSessionRef = (userId:string, sessionId: string) => db.ref(`users/${userId}/sessions/${sessionId}`);
const getUserProfileRef = (userId: string) => db.ref(`users/${userId}/profile`);
const getUserSettingsRef = (userId: string) => db.ref(`users/${userId}/settings`);
const getGamificationRef = (userId: string) => db.ref(`users/${userId}/gamification`);
const getNotebookRef = (userId: string) => db.ref(`users/${userId}/notebook`);
const getDailyMissionRef = (userId: string, dateStr: string) => db.ref(`users/${userId}/daily_missions_calendar/${dateStr}`);
const getStudyPlansRef = (userId: string) => db.ref(`users/${userId}/study_plans`);
const getLessonPlansRef = (userId: string) => db.ref(`users/${userId}/lesson_plans`);
const getUserActivitiesRef = (userId: string) => db.ref(`users/${userId}/activity_log`);
const getNotificationsRef = (userId: string) => db.ref(`users/${userId}/notifications`);

// --- GLOBAL SHARED DATA (Accessible by all authenticated users) ---
const getStudentsSF1Ref = () => db.ref(`students_sf1`);
const getTeachersRef = () => db.ref(`teachers`);
const getClassesRef = () => db.ref(`classes`);
const getSchoolsRef = () => db.ref(`schools`);
const getSubjectsRef = () => db.ref(`subjects`);
const getStudentProgressRef = (studentId: string) => db.ref(`student_progress/${studentId}`);
const getActivityLogsRef = () => db.ref('activity_logs');
const getAnnouncementsRef = () => db.ref('announcements');

// --- HELPER: Safe Snapshot Parsing ---
// Refactored to robustly handle Object-to-Array conversion and Timestamp sorting
const parseSnapshot = <T extends { id?: string }>(snapshot: firebase.database.DataSnapshot): T[] => {
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    if (!val) return [];
    
    let list: any[] = [];
    
    if (Array.isArray(val)) {
        // Handle array structures (filtering out empty slots)
        list = val.filter(x => x !== null && x !== undefined);
    } else if (typeof val === 'object') {
        // Handle object maps (Firebase default for push())
        // We explicitly map keys to the 'id' field if it's missing in the object body
        list = Object.entries(val).map(([key, value]: [string, any]) => ({
            ...value,
            id: value.id || key 
        }));
    }
    
    // Sort by timestamp or createdAt descending (Safely handling non-number types)
    return list.sort((a: any, b: any) => {
        const getTimestamp = (obj: any) => {
            // Check for various common timestamp field names
            const t = obj.timestamp || obj.createdAt || obj.date;
            // Ensure it's a number; if it's a Firebase ServerValue placeholder, treat as 0 or Infinity depending on need
            return typeof t === 'number' ? t : 0;
        };
        
        const tA = getTimestamp(a);
        const tB = getTimestamp(b);
        return tB - tA; // Descending
    }) as T[];
};

export const saveUserSettings = async (userId: string, settings: UserSettings) => {
    try {
        const settingsRef = getUserSettingsRef(userId);
        await settingsRef.set(settings);
    } catch (error) {
        console.error("Failed to save user settings:", error);
    }
};

export const loadUserSettings = async (userId: string): Promise<UserSettings> => {
    const settingsRef = getUserSettingsRef(userId);
    const snapshot = await settingsRef.once('value');
    if (snapshot.exists()) {
        return snapshot.val() as UserSettings;
    }
    // Default settings
    return {
        theme: 'dark', // Changed from 'system' to force dark mode by default
        fontSize: 'medium',
        language: 'english',
        showWebImages: true,
        saveHistory: true,
        responseStyle: 'detailed',
        studyReminderTime: '20:00'
    };
};

// --- NOTIFICATIONS ---
export const sendNotification = async (userId: string, notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    try {
        const notifRef = getNotificationsRef(userId);
        const newRef = notifRef.push();
        const entry: AppNotification = {
            id: newRef.key!,
            ...notification,
            timestamp: Date.now(),
            read: false
        };
        await newRef.set(entry);
    } catch (error) {
        console.error("Failed to send notification:", error);
    }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
    const notifRef = getNotificationsRef(userId).limitToLast(50);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        const list = parseSnapshot<AppNotification>(snapshot);
        callback(list);
    };
    notifRef.on('value', handler);
    return () => notifRef.off('value', handler);
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    const notifRef = db.ref(`users/${userId}/notifications/${notificationId}`);
    await notifRef.update({ read: true });
};

export const deleteNotification = async (userId: string, notificationId: string) => {
    const notifRef = db.ref(`users/${userId}/notifications/${notificationId}`);
    await notifRef.remove();
};

export const clearAllNotifications = async (userId: string) => {
    const notifRef = getNotificationsRef(userId);
    await notifRef.remove();
};

// --- ANNOUNCEMENTS ---
export const createAnnouncement = async (data: Omit<Announcement, 'id'>) => {
    try {
        const announcementsRef = getAnnouncementsRef();
        const newRef = announcementsRef.push();
        const announcement: Announcement = {
            id: newRef.key!,
            ...data
        };
        await newRef.set(announcement);
    } catch (error) {
        console.error("Error creating announcement:", error);
        throw error;
    }
};

export const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
        const announcementRef = db.ref(`announcements/${id}`);
        await announcementRef.update(updates);
    } catch (error) {
        console.error("Error updating announcement:", error);
        throw error;
    }
};

export const deleteAnnouncement = async (id: string) => {
    try {
        const announcementRef = db.ref(`announcements/${id}`);
        await announcementRef.remove();
    } catch (error) {
        console.error("Error deleting announcement:", error);
        throw error;
    }
};

export const subscribeToAnnouncements = (callback: (announcements: Announcement[]) => void) => {
    const announcementsRef = getAnnouncementsRef();
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.values(data) as Announcement[];
            list.sort((a, b) => b.date - a.date); // Newest first
            callback(list);
        } else {
            callback([]);
        }
    };
    announcementsRef.on('value', handler);
    return () => announcementsRef.off('value', handler);
};


// --- USER ACTIVITY LOGGING (SURI TRACKER) ---
export const logUserActivity = async (userId: string, activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    try {
        const activitiesRef = getUserActivitiesRef(userId);
        const newActivityRef = activitiesRef.push();
        const entry: UserActivity = {
            id: newActivityRef.key!,
            ...activity,
            timestamp: Date.now()
        };
        await newActivityRef.set(entry);
    } catch (error) {
        console.warn("User Activity Log failed:", error);
    }
};

export const subscribeToUserActivities = (userId: string, callback: (activities: UserActivity[]) => void): () => void => {
    const activitiesRef = getUserActivitiesRef(userId).limitToLast(50);
    
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        try {
            const logs = parseSnapshot<UserActivity>(snapshot);
            callback(logs);
        } catch (e) {
            console.warn("Error parsing user activities", e);
            callback([]);
        }
    };
    
    const errorHandler = (error: any) => {
        console.warn("Error subscribing to user activities:", error);
        callback([]);
    };
    
    activitiesRef.on('value', handler, errorHandler);
    
    return () => { 
        activitiesRef.off('value', handler); 
    };
};

// --- ACTIVITY LOGGING (ADMIN) ---
export const logActivity = async (userId: string, userName: string, action: ActivityLogEntry['action'], module: ActivityLogEntry['module'], details: string) => {
    try {
        const logsRef = getActivityLogsRef();
        const newLogRef = logsRef.push();
        const entry: ActivityLogEntry = {
            id: newLogRef.key!,
            userId,
            userName,
            action,
            module,
            details,
            timestamp: firebase.database.ServerValue.TIMESTAMP as any
        };
        await newLogRef.set(entry);
    } catch (error) {
        console.warn("Activity Log failed (non-critical):", error);
    }
};

export const deleteActivityLog = async (logId: string) => {
    const logRef = db.ref(`activity_logs/${logId}`);
    await logRef.remove();
};

export const clearAllActivityLogs = async () => {
    const logsRef = getActivityLogsRef();
    await logsRef.remove();
};

export const subscribeToActivityLogs = (callback: (logs: ActivityLogEntry[]) => void): () => void => {
    const logsRef = getActivityLogsRef().limitToLast(200); 
    
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        try {
            const logs = parseSnapshot<ActivityLogEntry>(snapshot);
            callback(logs);
        } catch (e) {
            console.warn("Error parsing activity logs", e);
            callback([]);
        }
    };
    
    const errorHandler = (error: any) => {
        console.warn("Error subscribing to activity logs (Check Permissions):", error);
        // If permission denied or error, return empty list to unblock UI
        callback([]);
    };
    
    logsRef.on('value', handler, errorHandler);
    
    // Return a cleanup function
    return () => { logsRef.off('value', handler); };
};

// --- GAMIFICATION & MISSIONS ---
export const loadGamificationProfile = async (userId: string): Promise<GamificationProfile> => {
    const profileRef = getGamificationRef(userId);
    const snapshot = await profileRef.once('value');
    if (snapshot.exists()) {
        return snapshot.val() as GamificationProfile;
    } else {
        const defaults: GamificationProfile = {
            current_xp: 0,
            current_level: 1,
            current_streak: 1,
            last_login_date: new Date().toISOString().split('T')[0],
            badges_earned: []
        };
        await profileRef.set(defaults);
        return defaults;
    }
};

export const updateGamificationProfile = async (userId: string, updates: Partial<GamificationProfile>) => {
    const profileRef = getGamificationRef(userId);
    await profileRef.update(updates);
};

export const checkAndIncrementStreak = async (userId: string): Promise<{ streak: number, message?: string }> => {
    const profile = await loadGamificationProfile(userId);
    const today = new Date().toISOString().split('T')[0];
    
    if (profile.last_login_date === today) {
        return { streak: profile.current_streak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let message = "";

    if (profile.last_login_date === yesterdayStr) {
        newStreak = profile.current_streak + 1;
        message = `🔥 ${newStreak} Day Streak! Keep it up!`;
    } else {
        message = "Streak reset. Let's build a new one!";
    }

    await updateGamificationProfile(userId, {
        current_streak: newStreak,
        last_login_date: today
    });

    // Log Login Activity for Suri Tracker
    await logUserActivity(userId, {
        type: 'LOGIN',
        title: 'Logged In',
        subtitle: `Streak: ${newStreak} Days`,
    });
    
    // Notify User about Streak
    if (newStreak > 1) {
        sendNotification(userId, {
            title: 'Streak Increased!',
            message: `You are on a ${newStreak} day streak. Great consistency!`,
            type: 'info'
        });
    }

    // Check for Study Missions for TODAY and notify (only on first login of the day)
    const dailyRef = getDailyMissionRef(userId, today);
    const snapshot = await dailyRef.once('value');
    if (snapshot.exists()) {
        const data = snapshot.val() as UserDailyMissions;
        const studyCount = data.missions.filter(m => m.type === 'STUDY_SESSION' && !m.completed).length;
        if (studyCount > 0) {
             sendNotification(userId, {
                title: 'Study Plan Reminder',
                message: `You have ${studyCount} study session(s) scheduled for today. Good luck!`,
                type: 'info',
                link: 'studyPlanner'
            });
        }
    }

    return { streak: newStreak, message };
};

export const awardXP = async (userId: string, amount: number): Promise<{ newXP: number, newLevel: number, leveledUp: boolean }> => {
    const profile = await loadGamificationProfile(userId);
    const newXP = profile.current_xp + amount;
    const newLevel = Math.floor(newXP / 500) + 1;
    const leveledUp = newLevel > profile.current_level;

    await updateGamificationProfile(userId, {
        current_xp: newXP,
        current_level: newLevel
    });
    
    if (leveledUp) {
        sendNotification(userId, {
            title: 'Level Up!',
            message: `Congratulations! You've reached Level ${newLevel}.`,
            type: 'success'
        });
    }

    return { newXP, newLevel, leveledUp };
};

export const subscribeToGamification = (userId: string, callback: (profile: GamificationProfile) => void) => {
    const profileRef = getGamificationRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            const defaults = {
                current_xp: 0,
                current_level: 1,
                current_streak: 1,
                last_login_date: new Date().toISOString().split('T')[0],
                badges_earned: []
            };
            callback(defaults);
        }
    };
    profileRef.on('value', handler);
    return () => profileRef.off('value', handler);
};

// --- DAILY MISSIONS LOGIC ---
const MISSION_POOL: { type: MissionType, desc: string, target: number }[] = [
    { type: 'MATH_SOLVER', desc: 'Complete a Quiz or Problem Solving Session', target: 1 },
    { type: 'READING_SESSION', desc: 'Complete 1 Reading Practice Session', target: 1 },
    { type: 'HISTORY_QUERY', desc: 'Ask the History Tutor about an event', target: 1 },
    { type: 'FILE_UPLOAD', desc: 'Upload a File for Analysis', target: 1 },
    { type: 'STATS_ANALYSIS', desc: 'Run a Statistical Analysis', target: 1 },
    { type: 'MATH_SOLVER', desc: 'Correctly Answer 3 Quiz Questions', target: 3 },
];

export const getDailyMissions = async (userId: string): Promise<UserDailyMissions> => {
    const today = new Date().toISOString().split('T')[0];
    const missionsRef = getDailyMissionRef(userId, today);
    const snapshot = await missionsRef.once('value');

    if (snapshot.exists()) {
        const data = snapshot.val() as UserDailyMissions;
        if (data.missions.length < 3) {
            const additionalCount = 3 - data.missions.length;
            const newMissions = generateRandomMissions(additionalCount);
            const updatedMissions = [...data.missions, ...newMissions];
            
            await missionsRef.update({ missions: updatedMissions });
            return { ...data, missions: updatedMissions };
        }
        return data;
    }

    return await createDailyMissions(userId, today, 3);
};

const generateRandomMissions = (count: number): DailyMission[] => {
    const shuffled = [...MISSION_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    return selected.map((m, index) => ({
        id: `mission_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
        type: m.type,
        description: m.desc,
        target: m.target,
        progress: 0,
        completed: false,
        rewardXP: 20
    }));
};

const createDailyMissions = async (userId: string, date: string, count: number): Promise<UserDailyMissions> => {
    const missions = generateRandomMissions(count);
    const newDaily: UserDailyMissions = {
        userId,
        date: date,
        missions: missions,
        bonusClaimed: false
    };
    await getDailyMissionRef(userId, date).set(newDaily);
    return newDaily;
};

export const updateMissionProgress = async (userId: string, missionType: MissionType, amount: number = 1): Promise<DailyMission | null> => {
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = getDailyMissionRef(userId, today);
    const snapshot = await dailyRef.once('value');
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.val() as UserDailyMissions;
    
    const missionIndex = data.missions.findIndex(m => m.type === missionType && !m.completed);
    
    if (missionIndex !== -1) {
        const mission = data.missions[missionIndex];
        const newProgress = mission.progress + amount;
        const completed = newProgress >= mission.target;
        
        const updates: any = {};
        updates[`missions/${missionIndex}/progress`] = newProgress;
        updates[`missions/${missionIndex}/completed`] = completed;
        
        await dailyRef.update(updates);

        if (completed) {
            await awardXP(userId, mission.rewardXP);
            sendNotification(userId, {
                title: 'Mission Complete!',
                message: `You completed: ${mission.description}`,
                type: 'success'
            });
        }
        
        return { ...mission, progress: newProgress, completed };
    }
    
    return null;
};

export const claimDailyBonus = async (userId: string): Promise<boolean> => {
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = getDailyMissionRef(userId, today);
    const snapshot = await dailyRef.once('value');
    
    if (!snapshot.exists()) return false;
    
    const data = snapshot.val() as UserDailyMissions;
    const allCompleted = data.missions.every(m => m.completed);
    
    if (allCompleted && !data.bonusClaimed) {
        await dailyRef.update({ bonusClaimed: true });
        await awardXP(userId, 100); 
        sendNotification(userId, {
            title: 'Daily Bonus Claimed',
            message: 'You earned 100 XP for completing all daily missions!',
            type: 'success'
        });
        return true;
    }
    
    return false;
};

export const subscribeToMissions = (userId: string, callback: (missions: UserDailyMissions | null) => void) => {
    const today = new Date().toISOString().split('T')[0];
    const missionsRef = getDailyMissionRef(userId, today);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    };
    missionsRef.on('value', handler);
    return () => missionsRef.off('value', handler);
};


// --- STUDY PLANNER LOGIC ---
export const saveStudyPlan = async (userId: string, plan: Omit<StudyPlan, 'id' | 'createdAt'>): Promise<void> => {
    const plansRef = getStudyPlansRef(userId);
    const newPlanRef = plansRef.push();
    const fullPlan: StudyPlan = {
        id: newPlanRef.key!,
        ...plan,
        createdAt: Date.now()
    };
    await newPlanRef.set(fullPlan);
    await injectFutureMissions(userId, plan.schedule);
};

export const loadStudyPlans = async (userId: string): Promise<StudyPlan[]> => {
    const plansRef = getStudyPlansRef(userId);
    const snapshot = await plansRef.once('value');
    return parseSnapshot<StudyPlan>(snapshot);
};

const injectFutureMissions = async (userId: string, schedule: { date: string; topic: string; focus: string }[]): Promise<void> => {
    for (const item of schedule) {
        const dateRef = getDailyMissionRef(userId, item.date);
        const snapshot = await dateRef.once('value');
        
        const studyMission: DailyMission = {
            id: `study_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
            type: 'STUDY_SESSION',
            description: `Study: ${item.topic} - ${item.focus}`,
            target: 1,
            progress: 0,
            completed: false,
            rewardXP: 50
        };

        if (snapshot.exists()) {
            const currentData = snapshot.val() as UserDailyMissions;
            if (!currentData.missions.some(m => m.description.includes(item.topic))) {
                const updatedMissions = [studyMission, ...currentData.missions];
                await dateRef.update({ missions: updatedMissions });
            }
        } else {
            const newDaily: UserDailyMissions = {
                userId,
                date: item.date,
                missions: [studyMission],
                bonusClaimed: false
            };
            await dateRef.set(newDaily);
        }
    }
};

// --- DIGITAL NOTEBOOK LOGIC ---
export const savePinnedNote = async (userId: string, content: string, sourceMode: string, images?: string[]): Promise<string> => {
    const notebookRef = getNotebookRef(userId);
    const newNoteRef = notebookRef.push();
    
    const note: PinnedNote = {
        id: newNoteRef.key!,
        content,
        timestamp: Date.now(),
        sourceMode,
        images: images || []
    };
    
    await newNoteRef.set(note);
    return note.id;
};

export const deletePinnedNote = async (userId: string, noteId: string): Promise<void> => {
    const noteRef = db.ref(`users/${userId}/notebook/${noteId}`);
    await noteRef.remove();
};

export const subscribeToNotebook = (userId: string, callback: (notes: PinnedNote[]) => void) => {
    const notebookRef = getNotebookRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        const list = parseSnapshot<PinnedNote>(snapshot);
        callback(list);
    };
    notebookRef.on('value', handler);
    return () => notebookRef.off('value', handler);
};

export const checkAndAwardPinBonus = async (userId: string): Promise<boolean> => {
    const profileRef = getGamificationRef(userId);
    const snapshot = await profileRef.once('value');
    
    const today = new Date().toISOString().split('T')[0];
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.last_pin_date !== today) {
            await profileRef.update({ last_pin_date: today });
            await awardXP(userId, 10);
            return true;
        }
    }
    return false;
};

// --- LESSON PLANNER LOGIC ---

// Updated: Returns the ID of the saved plan
export const saveLessonPlan = async (userId: string, plan: LessonPlan, planId?: string): Promise<string> => {
    if (planId) {
        // Update Existing
        const planRef = db.ref(`users/${userId}/lesson_plans/${planId}`);
        await planRef.set({ ...plan, id: planId, lastModified: Date.now() });
        
        await logActivity(userId, "User", "update", "Lesson Plan", `Updated lesson plan: ${plan.topic}`);
        return planId;
    } else {
        // Create New
        const plansRef = getLessonPlansRef(userId);
        const newRef = plansRef.push();
        const newId = newRef.key!;
        await newRef.set({ ...plan, id: newId, createdAt: Date.now(), lastModified: Date.now() });
        
        await logActivity(userId, "User", "create", "Lesson Plan", `Created lesson plan: ${plan.topic}`);
        return newId;
    }
};

export const deleteLessonPlan = async (userId: string, planId: string): Promise<void> => {
    const planRef = db.ref(`users/${userId}/lesson_plans/${planId}`);
    await planRef.remove();
    await logActivity(userId, "User", "delete", "Lesson Plan", `Deleted lesson plan ID: ${planId}`);
};

export const loadLessonPlans = async (userId: string): Promise<LessonPlan[]> => {
    const plansRef = getLessonPlansRef(userId);
    const snapshot = await plansRef.once('value');
    return parseSnapshot<LessonPlan>(snapshot);
};

// --- SESSION MANAGEMENT (Private - User Specific) ---
export const saveSession = async (userId: string, sessionId: string, data: Omit<SessionData, 'lastModified' | 'lastModified'>): Promise<void> => {
    const sessionRef = getSessionRef(userId, sessionId);
    const dataWithTimestamp = {
        ...data,
        lastModified: firebase.database.ServerValue.TIMESTAMP
    };
    await sessionRef.set(dataWithTimestamp);
};

export const createNewSession = async (userId: string, data: Omit<SessionData, 'lastModified'>): Promise<string> => {
    const sessionsRef = getSessionsRef(userId);
    const newSessionRef = sessionsRef.push();
    const dataWithTimestamp: SessionData = {
        ...data,
        lastModified: firebase.database.ServerValue.TIMESTAMP as any
    };
    await newSessionRef.set(dataWithTimestamp);
    if (!newSessionRef.key) {
        throw new Error("Failed to create new session in Firebase.");
    }
    return newSessionRef.key;
};

export const listSessions = async (userId: string): Promise<SessionInfo[]> => {
    const sessionsRef = getSessionsRef(userId);
    const snapshot = await sessionsRef.once('value');
    if (!snapshot.exists()) {
        return [];
    }
    const sessionsData = snapshot.val();
    return Object.entries(sessionsData).map(([id, session]: [string, any]) => ({
        id,
        titleOfExamination: session.metadata.titleOfExamination,
        lastModified: session.lastModified
    })).sort((a, b) => b.lastModified - a.lastModified);
};

export const loadSession = async (userId: string, sessionId: string): Promise<SessionData | null> => {
    const sessionRef = getSessionRef(userId, sessionId);
    const snapshot = await sessionRef.once('value');
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.val() as SessionData;
};

export const deleteSession = async (userId: string, sessionId: string): Promise<void> => {
    const sessionRef = getSessionRef(userId, sessionId);
    await sessionRef.remove();
};


// --- MASTER DATA MANAGEMENT (Global / Shared) ---
export const saveStudents_SF1 = async (userId: string, students: StudentSF1[]): Promise<void> => {
    const studentsRef = getStudentsSF1Ref(); 
    await studentsRef.set(students);
};

export const loadStudents_SF1 = async (userId: string): Promise<StudentSF1[]> => {
    const studentsRef = getStudentsSF1Ref(); 
    const snapshot = await studentsRef.once('value');
    return parseSnapshot<StudentSF1>(snapshot);
};

export const saveTeachers = async (userId: string, teachers: Teacher[]): Promise<void> => {
    const teachersRef = getTeachersRef();
    await teachersRef.set(teachers);
};

export const loadTeachers = async (userId: string): Promise<Teacher[]> => {
    const teachersRef = getTeachersRef();
    const snapshot = await teachersRef.once('value');
    return parseSnapshot<Teacher>(snapshot);
};

export const saveClasses = async (userId: string, classes: ClassInfo[]): Promise<void> => {
    const classesRef = getClassesRef();
    await classesRef.set(classes);
};

export const loadClasses = async (userId: string): Promise<ClassInfo[]> => {
    const classesRef = getClassesRef();
    const snapshot = await classesRef.once('value');
    return parseSnapshot<ClassInfo>(snapshot);
};

export const saveSchools = async (userId: string, schools: SchoolInfo[]): Promise<void> => {
    const schoolsRef = getSchoolsRef();
    await schoolsRef.set(schools);
};

export const loadSchools = async (userId: string): Promise<SchoolInfo[]> => {
    const schoolsRef = getSchoolsRef();
    const snapshot = await schoolsRef.once('value');
    return parseSnapshot<SchoolInfo>(snapshot);
};

export const saveSubjects = async (subjects: Subject[]): Promise<void> => {
    const subjectsRef = getSubjectsRef();
    await subjectsRef.set(subjects);
};

export const loadSubjects = async (): Promise<Subject[]> => {
    const subjectsRef = getSubjectsRef();
    const snapshot = await subjectsRef.once('value');
    return parseSnapshot<Subject>(snapshot);
};

export const createManagedUser = async (adminId: string, email: string, password: string, profileData: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<string> => {
    const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
    try {
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        if (!newUser) throw new Error("Failed to create user");

        // Save profile to DB using main app's DB reference (admin context)
        const userProfile: UserProfile = {
            uid: newUser.uid,
            createdAt: Date.now(),
            ...profileData
        };
        
        await getUserProfileRef(newUser.uid).set(userProfile);
        await secondaryApp.auth().signOut();
        await secondaryApp.delete();
        return newUser.uid;
    } catch (error) {
        await secondaryApp.delete();
        throw error;
    }
};

export const listManagedUsers = async (adminId: string): Promise<UserProfile[]> => {
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            return Object.values(usersData).map((u: any) => u.profile).filter(p => p); 
        }
        return [];
    } catch (error: any) {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn("List users permission denied.");
            return [];
        }
        throw error;
    }
};

// Role Management
export const initializeUserProfile = async (user: firebase.User, displayName: string, role: UserRole) => {
    const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        role,
        createdAt: Date.now()
    };
    await getUserProfileRef(user.uid).set(profile);
};

export const subscribeToUserRole = (userId: string, callback: (role: UserRole | null) => void) => {
    const userRef = getUserProfileRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val().role);
        } else {
            callback(null);
        }
    };
    userRef.on('value', handler);
    return () => userRef.off('value', handler);
};

export const syncTeacherAccountLink = async (user: firebase.User) => {
    if (!user.email) return;
    
    const teachersRef = getTeachersRef();
    const snapshot = await teachersRef.once('value');
    
    if (snapshot.exists()) {
        const teachers = Object.values(snapshot.val()) as Teacher[];
        const match = teachers.find(t => t.email.toLowerCase() === user.email!.toLowerCase());
        
        if (match && (!match.linkedAccountId || match.linkedAccountId !== user.uid)) {
            const updatedTeachers = teachers.map(t => 
                t.id === match.id ? { ...t, linkedAccountId: user.uid, hasAccount: true } : t
            );
            await teachersRef.set(updatedTeachers);
        }
    }
};

export const updateTeacherAccountStatus = async (teacherId: string, updates: { linkedAccountId?: string, hasAccount?: boolean }) => {
    const teachersRef = getTeachersRef();
    const snapshot = await teachersRef.once('value');
    if (snapshot.exists()) {
        const teachers = Object.values(snapshot.val()) as Teacher[];
        const updated = teachers.map(t => t.id === teacherId ? { ...t, ...updates } : t);
        await teachersRef.set(updated);
    }
};

// --- STUDENT PROGRESS ---
export const saveStudentProgress = async (userId: string, studentId: string, history: ProgressRecord[]) => {
    await getStudentProgressRef(studentId).set(history);
};

export const loadStudentProgress = async (userId: string, studentId: string): Promise<ProgressRecord[]> => {
    const snapshot = await getStudentProgressRef(studentId).once('value');
    return parseSnapshot<ProgressRecord>(snapshot);
};