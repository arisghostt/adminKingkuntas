import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { ModulePermission } from '../../types/rbac';

interface PermissionGuardProps {
    module: string; // ex: '/products' ou module_name selon votre structure
    action: keyof Omit<ModulePermission, 'module_id' | 'module_name' | 'module_url' | 'is_menu'>; // 'is_view', 'is_add', 'is_edit', 'is_delete'
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    module,
    action,
    children,
    fallback = null
}) => {
    const hasPermission = useAuthStore((state) => state.hasPermission);

    // Vérifie si l'utilisateur possède l'action requise pour le module demandé
    const isAllowed = hasPermission(module, action);

    if (isAllowed) {
        return <>{children}</>;
    }

    // Si refusé, renvoie le composant de fallback
    return <>{fallback}</>;
};
