import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import { UserProfile, UserSettings, UserRole, Permission } from '../../types/core';
import { AppNotification, Announcement, UserActivity, ActivityLogEntry, AccessCode } from '../../types';
import { Teacher } from '../../types/academic';
import { db, auth, functions } from '../firebase';

// --- PRIVATE HELPERS ---
const getUserSettingsRef = (userId: string) => db.ref(`users/${userId}/settings`);
const getUserActivitiesRef = (userId: string) => db.ref(`users/${userId}/activity_log`);
const getNotificationsRef = (userId: string) => db.ref(`users/${userId}/notifications`);
const getActivityLogsRef = () => db.ref('activity_logs');
const getAnnouncementsRef = () => db.ref('announcements');
const getAccessCodesRef = () => db.ref('access_codes');

export const parseSnapshot = <T extends { id?: string }>(snapshot: firebase.database.DataSnapshot): T[] => {
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    if (!val) return [];

    let list: any[] = [];

    if (Array.isArray(val)) {
        list = val.filter(x => x !== null && x !== undefined);
    } else if (typeof val === 'object') {
        list = Object.entries(val).map(([key, value]: [string, any]) => ({
            ...value,
            id: value.id || key
        }));
    }

    return list.sort((a: any, b: any) => {
        const getTimestamp = (obj: any) => {
            const t = obj.timestamp || obj.createdAt || obj.date;
            return typeof t === 'number' ? t : 0;
        };
        const tA = getTimestamp(a);
        const tB = getTimestamp(b);
        return tB - tA; // Descending
    }) as T[];
};

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            console.warn("crypto.randomUUID() failed (likely insecure context), falling back.");
        }
    }

    // Fallback for insecure contexts (http://IP_ADDRESS)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- USER MANAGEMENT (Admin) ---
export const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    // Note: This only disables the user in the database application logic.
    // To fully disable Auth, Cloud Functions or Admin SDK is required.
    // The frontend should check this flag on login.
    await db.ref(`users/${uid}/profile`).update({ disabled: !currentStatus });
};

export const deleteUserProfile = async (uid: string) => {
    // Attempt to delete from Authentication via Cloud Function
    try {
        const deleteUserFn = functions.httpsCallable('deleteUser');
        await deleteUserFn({ uid });
    } catch (error) {
        console.warn("Failed to delete from Auth (Cloud Function likely not deployed):", error);
        // We continue to delete from DB so the UI updates
    }

    // Remove user data from Realtime Database
    await db.ref(`users/${uid}`).remove();
    // Also try to remove from teachers if linked
    const teachersRef = db.ref('teachers');
    const snapshot = await teachersRef.orderByChild('linkedAccountId').equalTo(uid).once('value');
    if (snapshot.exists()) {
        const updates: any = {};
        snapshot.forEach(child => {
            updates[`${child.key}/linkedAccountId`] = null;
            updates[`${child.key}/hasAccount`] = false;
        });
        await teachersRef.update(updates);
    }
};

export const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const snapshot = await db.ref(`users/${uid}/profile`).once('value');
    return snapshot.exists() ? snapshot.val() as UserProfile : null;
};

export const sendPasswordReset = async (email: string) => {
    await auth.sendPasswordResetEmail(email);
};

// --- ACCESS CODES ---
export const verifyAccessCode = async (code: string): Promise<AccessCode | null> => {
    const ref = getAccessCodesRef();
    const snapshot = await ref.orderByChild('code').equalTo(code).once('value');

    if (snapshot.exists()) {
        const data = snapshot.val();
        const id = Object.keys(data)[0];
        const accessCode = { id, ...data[id] } as AccessCode;

        // Check Expiration
        if (accessCode.expiresAt && Date.now() > accessCode.expiresAt) {
            console.log("Access code expired");
            return null;
        }

        if (accessCode.active) {
            return accessCode;
        }
    }
    return null;
};

export const incrementAccessCodeUsage = async (id: string) => {
    const ref = getAccessCodesRef().child(id);
    await ref.child('usageCount').transaction((current) => (current || 0) + 1);
};

export const createAccessCode = async (codeData: Omit<AccessCode, 'id' | 'usageCount'>) => {
    const ref = getAccessCodesRef();
    const newRef = ref.push();
    await newRef.set({
        ...codeData,
        usageCount: 0
    });
};

export const listAccessCodes = async (): Promise<AccessCode[]> => {
    const ref = getAccessCodesRef();
    const snapshot = await ref.once('value');
    return parseSnapshot<AccessCode>(snapshot);
};

export const deleteAccessCode = async (id: string) => {
    await getAccessCodesRef().child(id).remove();
};

export const toggleAccessCode = async (id: string, currentStatus: boolean) => {
    await getAccessCodesRef().child(id).update({ active: !currentStatus });
};

// --- SETTINGS ---
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
    return {
        theme: 'dark',
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
            list.sort((a, b) => b.date - a.date);
            callback(list);
        } else {
            callback([]);
        }
    };
    announcementsRef.on('value', handler);
    return () => announcementsRef.off('value', handler);
};

// --- ACTIVITY LOGGING ---
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
            callback([]);
        }
    };
    activitiesRef.on('value', handler);
    return () => activitiesRef.off('value', handler);
};

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
        console.warn("Activity Log failed:", error);
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
            callback([]);
        }
    };
    logsRef.on('value', handler);
    return () => logsRef.off('value', handler);
};

export const updateUserRoleService = async (
    targetUid: string,
    newRole: UserRole,
    permissions?: Partial<Record<Permission, boolean>>
): Promise<void> => {
    const updates: any = {};
    updates[`users/${targetUid}/profile/role`] = newRole;
    if (permissions) {
        updates[`users/${targetUid}/profile/permissions`] = permissions;
    }

    // Role Synchronization Logic
    if (newRole === 'teacher' || newRole === 'admin') {
        // Check if teacher record exists
        const teacherSnapshot = await db.ref('teachers')
            .orderByChild('linkedAccountId').equalTo(targetUid).once('value');

        if (!teacherSnapshot.exists()) {
            // Create Placeholder Teacher Record if missing
            const userSnapshot = await db.ref(`users/${targetUid}/profile`).once('value');
            const userProfile = userSnapshot.val();

            const newTeacher: Teacher = {
                id: generateUUID(),
                linkedAccountId: targetUid,
                hasAccount: true,
                email: userProfile.email || '',
                firstName: userProfile.displayName?.split(' ')[0] || 'User',
                lastName: userProfile.displayName?.split(' ').slice(1).join(' ') || 'Name',
                middleName: '',
                extensionName: '',
                sex: 'Male', // Default
                phoneNumber: '',
                position: newRole === 'admin' ? 'Administrator' : 'Teacher I',
                specialization: '',
                dateOfAppointment: new Date().toISOString().split('T')[0],
                status: 'Permanent',
                schoolId: userProfile.schoolId, // Inherit School ID
                role: newRole,
                employeeId: 'TBD' // Placeholder
            };
            // Push new teacher record
            const newRef = db.ref('teachers').push();
            updates[`teachers/${newRef.key}`] = { ...newTeacher, id: newRef.key };
        } else {
            // Update existing teacher record's role
            teacherSnapshot.forEach(child => {
                updates[`teachers/${child.key}/role`] = newRole;
            });
        }
    }

    await db.ref().update(updates);
};
