import { useUser } from '../contexts/UserContext';
import { UserProfile, Permission } from '../types/core';
import { hasPermission } from '../config/PermissionMatrix';

// Optional: allow passing user explicitly for components not under context or for testing
export const usePermissions = (userOverride?: UserProfile | null) => {
    const { user: authUser, role, userProfile: contextProfile } = useUser();

    // Determine the source of truth
    // If override is provided, use it. Otherwise use context.
    // Note: userOverride might be partial or just the legacy UserProfile object structure

    // We prioritize the Context Data if no override provided.

    const can = (action: Permission): boolean => {
        // 1. Use override if provided
        if (userOverride) {
            if (userOverride.role === 'admin' || userOverride.isSuperAdmin) return true;
            // Granular override
            if (userOverride.permissions && userOverride.permissions[action] !== undefined) {
                return userOverride.permissions[action];
            }
            return hasPermission(userOverride.role, action);
        }

        // 2. Use Context
        // God Mode from Context (assuming we might load isSuperAdmin into separate state or derived)
        // For now, let's assume 'admin' role covers God Mode or we check contextProfile
        if (role === 'admin') return true;
        if (contextProfile?.isSuperAdmin) return true;

        // Granular from Context
        if (contextProfile?.permissions && contextProfile.permissions[action] !== undefined) {
            return contextProfile.permissions[action];
        }

        // Matrix Check
        return hasPermission(role, action);
    };

    return { can };
};

