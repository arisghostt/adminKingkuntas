import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

const ACTION_TOKENS = new Set(['view', 'add', 'create', 'edit', 'change', 'delete', 'manage']);

const normalizeCodename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');

const addResourceAliases = (action: string, resource: string, aliases: Set<string>) => {
  if (!action || !resource) return;

  const normalizedResource = normalizeCodename(resource);
  if (!normalizedResource) return;

  aliases.add(`${action}_${normalizedResource}`);
  aliases.add(`can_${action}_${normalizedResource}`);

  if (normalizedResource.endsWith('s') && normalizedResource.length > 1) {
    const singular = normalizedResource.slice(0, -1);
    aliases.add(`${action}_${singular}`);
    aliases.add(`can_${action}_${singular}`);
  } else {
    const plural = `${normalizedResource}s`;
    aliases.add(`${action}_${plural}`);
    aliases.add(`can_${action}_${plural}`);
  }
};

const expandPermissionAliases = (value: string): string[] => {
  const aliases = new Set<string>();
  const normalized = normalizeCodename(value);
  if (!normalized) return [];

  aliases.add(normalized);

  const tailFromDot = normalizeCodename(value.split('.').pop() ?? '');
  if (tailFromDot) aliases.add(tailFromDot);

  if (normalized.startsWith('can_')) {
    aliases.add(normalized.slice(4));
  } else {
    aliases.add(`can_${normalized}`);
  }

  const withoutCan = normalized.startsWith('can_') ? normalized.slice(4) : normalized;
  aliases.add(withoutCan);

  const tokens = withoutCan.split('_').filter(Boolean);
  if (tokens.length >= 2) {
    const [firstToken, ...restTokens] = tokens;
    const secondToken = tokens[1];

    if (ACTION_TOKENS.has(firstToken)) {
      addResourceAliases(firstToken, restTokens.join('_'), aliases);
    }

    if (secondToken && ACTION_TOKENS.has(secondToken)) {
      const resource = [tokens[0], ...tokens.slice(2)].join('_');
      addResourceAliases(secondToken, resource, aliases);
    }
  }

  return [...aliases.values()];
};

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const roleName = useAuthStore((state) => state.role?.name ?? state.user?.role?.name ?? '');
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const permissions = useAuthStore((state) => state.permissions);

  const permissionSet = useMemo(() => {
    const aliases = new Set<string>();
    permissions.forEach((entry) => {
      expandPermissionAliases(entry).forEach((alias) => aliases.add(alias));
    });
    return aliases;
  }, [permissions]);

  const hasPermission = (codename: string): boolean => {
    if (isSuperAdmin || user?.is_superuser) return true;

    const hasLegacyPrivilegedRole = /(admin|administrator|manager|owner|staff)/i.test(roleName);
    if (permissionSet.size === 0) return hasLegacyPrivilegedRole;

    const requiredAliases = expandPermissionAliases(codename);
    if (requiredAliases.length === 0) return false;
    return requiredAliases.some((alias) => permissionSet.has(alias));
  };

  const canViewDashboard = hasPermission('view_dashboard');
  const canManageUsers = hasPermission('manage_users');
  const canManageRoles = hasPermission('manage_roles');
  const canViewOrders = hasPermission('view_orders');
  const canEditOrders = hasPermission('edit_orders');
  const canViewProducts = hasPermission('view_products');
  const canEditProducts = hasPermission('edit_products');
  const canViewCustomers = hasPermission('view_customers');
  const canViewAnalytics = hasPermission('view_analytics');
  const canManagePromotions = hasPermission('manage_promotions');
  const canManageBilling = hasPermission('manage_billing');

  return {
    hasPermission,
    isSuperAdmin: isSuperAdmin || Boolean(user?.is_superuser),
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
