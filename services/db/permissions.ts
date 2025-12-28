import { db } from '../firebase';
import { Permission, UserRole } from '../../types';
import { UserProfile } from '../../types';

/**
 * Grant a specific permission to a user.
 * This overrides the default role-based permission.
 */
export const grantPermission = async (targetUid: string, permission: Permission) => {
    await db.ref(`users/${targetUid}/profile/permissions/${permission}`).set(true);
};

/**
 * Revoke a specific permission from a user.
 * Setting it to false explicitly denies it, even if their role normally allows it.
 */
export const revokePermission = async (targetUid: string, permission: Permission) => {
    await db.ref(`users/${targetUid}/profile/permissions/${permission}`).set(false);
};

/**
 * Reset a specific permission to default (remove the override).
 */
export const resetPermission = async (targetUid: string, permission: Permission) => {
    await db.ref(`users/${targetUid}/profile/permissions/${permission}`).remove();
};

/**
 * Reset all permission overrides for a user.
 */
export const resetAllPermissions = async (targetUid: string) => {
    await db.ref(`users/${targetUid}/profile/permissions`).remove();
};

/**
 * Helper to check if a permission is explicitly granted, denied, or default (undefined)
 * Useful for UI tri-state checkboxes.
 */
export const getPermissionStatus = (userProfile: UserProfile, permission: Permission): 'granted' | 'denied' | 'default' => {
    if (!userProfile.permissions) return 'default';
    const val = userProfile.permissions[permission];
    if (val === true) return 'granted';
    if (val === false) return 'denied';
    return 'default';
};
