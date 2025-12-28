import React from 'react';
import { Permission } from '../types/core';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
    permission: Permission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, children, fallback = null }) => {
    const { can } = usePermissions();

    if (!can(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
