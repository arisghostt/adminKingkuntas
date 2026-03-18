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

  /** True while the store has not yet loaded/hydrated any user data */
  const isLoading = user === null && modulePermissions.length === 0;

  /** True when the user is authenticated and has a role assigned */
  const hasRole = Boolean(
    user && (isSuperAdmin || user.is_superuser || user.is_superadmin || user.role?.id)
  );

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
  const canViewInventory = hasPermission('/inventory', 'is_view');
  const canViewReports = hasPermission('/reports', 'is_view');
  const canViewEvents    = hasPermission('/events', 'is_view');
  const canAddEvents     = hasPermission('/events', 'is_add');
  const canEditEvents    = hasPermission('/events', 'is_edit');
  const canDeleteEvents  = hasPermission('/events', 'is_delete');
  const canViewChat      = hasPermission('/chat', 'is_view');
  const canViewEmail     = hasPermission('/email', 'is_view');
  const canViewSettings  = hasPermission('/settings', 'is_view');

  return {
    hasPermission,
    isLoading,
    hasRole,
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
    canViewInventory,
    canViewReports,
    canViewEvents,
    canAddEvents,
    canEditEvents,
    canDeleteEvents,
    canViewChat,
    canViewEmail,
    canViewSettings,
  };
}
