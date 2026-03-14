import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { ModulePermission } from '@/src/types/rbac';

export type PermissionAction = 'is_view' | 'is_add' | 'is_edit' | 'is_delete';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const modulePermissions = useAuthStore((state) => state.modulePermissions);

  const permissionMap = useMemo(() => {
    const map = new Map<string, ModulePermission>();
    if (Array.isArray(modulePermissions)) {
      modulePermissions.forEach((p) => {
        if (p.module_url) {
          map.set(p.module_url, p);
        }
      });
    }
    return map;
  }, [modulePermissions]);

  const hasPermission = (
    moduleUrl: string,
    action: PermissionAction = 'is_view'
  ): boolean => {
    if (isSuperAdmin || user?.is_superuser || user?.is_superadmin) return true;
    if (permissionMap.size === 0) return false;

    const modulePerm = permissionMap.get(moduleUrl);
    if (!modulePerm) return false;

    return Boolean(modulePerm[action]);
  };

  const canViewDashboard = hasPermission('/dashboard', 'is_view');
  const canViewProducts = hasPermission('/products', 'is_view');
  const canEditProducts = hasPermission('/products', 'is_edit');
  const canViewOrders = hasPermission('/orders', 'is_view');
  const canEditOrders = hasPermission('/orders', 'is_edit');
  const canViewCustomers = hasPermission('/customers', 'is_view');
  const canManageUsers = hasPermission('/settings/users', 'is_view');
  const canManageRoles = hasPermission('/settings/users', 'is_add');
  const canViewAnalytics = hasPermission('/analytics', 'is_view');
  const canManagePromotions = hasPermission('/promotions', 'is_add');
  const canManageBilling = hasPermission('/billing', 'is_view');

  return {
    hasPermission,
    isSuperAdmin: isSuperAdmin || Boolean(user?.is_superuser) || Boolean(user?.is_superadmin),
    canViewDashboard,
    canManageUsers,
    canManageRoles,
    canViewOrders,
    canEditOrders,
    canViewProducts,
    canEditProducts,
    canViewCustomers,
    canViewAnalytics,
    canManagePromotions,
    canManageBilling,
  };
}
