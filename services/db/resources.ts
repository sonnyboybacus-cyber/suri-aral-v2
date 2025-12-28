import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { ManagedResource, UserRole } from '../../types';
import { parseSnapshot } from './core';

const getResourcesRef = () => db.ref('managed_resources');

export const createManagedResource = async (resource: Omit<ManagedResource, 'id' | 'createdAt'>, userId: string) => {
    const ref = getResourcesRef().push();
    const newResource: ManagedResource = {
        ...resource,
        id: ref.key!,
        createdAt: Date.now(),
        createdBy: userId
    };
    await ref.set(newResource);
    return newResource;
};

export const updateManagedResource = async (id: string, updates: Partial<ManagedResource>) => {
    await getResourcesRef().child(id).update(updates);
};

export const deleteManagedResource = async (id: string) => {
    await getResourcesRef().child(id).remove();
};

export const listManagedResources = async (): Promise<ManagedResource[]> => {
    const snapshot = await getResourcesRef().once('value');
    return parseSnapshot<ManagedResource>(snapshot);
};

export const getAccessibleResources = async (userRole: UserRole, userId: string, schoolId?: string): Promise<ManagedResource[]> => {
    const allResources = await listManagedResources();

    // Admins see everything
    if (userRole === 'admin') return allResources;

    console.log(`[Resources] Fetching for Role: ${userRole}, User: ${userId}, School: ${schoolId}`);
    return allResources.filter(resource => {
        // 1. Check School Restriction (if resource has schoolId and it's not empty, user must match)
        // We carefully ignore empty strings or nulls to allow "All Schools"
        if (resource.schoolId && typeof resource.schoolId === 'string' && resource.schoolId.trim() !== '') {
            if (resource.schoolId !== schoolId) {
                // console.log(`[Resources] Denied "${resource.title}" - School Mismatch (${resource.schoolId} vs ${schoolId})`);
                return false;
            }
        }

        // Safely get arrays (Firebase sometimes returns arrays as objects)
        const allowedUsers = Array.isArray(resource.allowedUsers)
            ? resource.allowedUsers
            : resource.allowedUsers ? Object.values(resource.allowedUsers) : [];

        const allowedRoles = Array.isArray(resource.allowedRoles)
            ? resource.allowedRoles
            : resource.allowedRoles ? Object.values(resource.allowedRoles) : [];

        // Normalize
        const normalizedUserRole = String(userRole).toLowerCase().trim();
        const normalizedAllowedRoles = allowedRoles.map(r => String(r).toLowerCase().trim());

        // 2. Check Specific User Access
        if (allowedUsers.includes(userId)) {
            return true;
        }

        // 3. Check Role Access
        if (normalizedAllowedRoles.includes(normalizedUserRole)) {
            return true;
        }

        // console.log(`[Resources] Denied "${resource.title}" - Role Mismatch (Allowed: ${normalizedAllowedRoles.join(', ')} vs User: ${normalizedUserRole})`);
        return false;
    });
};
