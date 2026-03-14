import { useSyncExternalStore } from 'react';
import { getAuthSession, type AuthSession } from '@/app/lib/auth';
import { apiClient } from '@/services/apiClient';
import type { ModulePermission } from '@/src/types/rbac';

export interface PermissionItem {
  id?: number;
  codename: string;
  name?: string;
}

export interface RolePermissionProfile {
  id: number;
  name: string;
  description?: string;
  permissions: PermissionItem[];
}

export interface AdminUserState {
  id?: number | string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  profile_image?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_superadmin?: boolean;
  role?: {
    id: number;
    name: string;
    permissions?: PermissionItem[];
  } | null;
}

export interface AuthDataState {
  user: AdminUserState | null;
  role: RolePermissionProfile | null;
  permissions: string[];
  modulePermissions: ModulePermission[];
  isSuperAdmin: boolean;
}

interface AuthActions {
  setAuthData: (partial: Partial<AuthDataState>) => void;
  clearAuthData: () => void;
  hydrateFromSession: () => void;
  refreshAuthData: () => Promise<void>;
  syncFromLoginPayload: (payload: unknown, fallbackSession?: AuthSession | null) => void;
  getModulePermission: (moduleUrl: string) => ModulePermission | null;
}

export type AuthStore = AuthDataState & AuthActions;

const STORAGE_KEY = 'kk_auth_store_v1';

const defaultState: AuthDataState = {
  user: null,
  role: null,
  permissions: [],
  modulePermissions: [],
  isSuperAdmin: false,
};

let state: AuthDataState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
};

const normalizeCodename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizePermissionItem = (payload: unknown): PermissionItem | null => {
  const permission = toRecord(payload);
  const codename =
    normalizeCodename(toText(permission.codename)) ||
    normalizeCodename(toText(permission.code)) ||
    normalizeCodename(toText(permission.slug)) ||
    normalizeCodename(toText(permission.name));

  if (!codename) return null;

  return {
    id:
      typeof permission.id === 'number'
        ? Math.trunc(permission.id)
        : typeof permission.id === 'string' && Number.isFinite(Number(permission.id))
          ? Math.trunc(Number(permission.id))
          : undefined,
    codename,
    name: toText(permission.name) || undefined,
  };
};

const extractPermissionItems = (source: unknown): PermissionItem[] => {
  if (!Array.isArray(source)) return [];

  const items = source
    .map((entry) => {
      if (typeof entry === 'string') {
        const codename = normalizeCodename(entry);
        return codename ? { codename } : null;
      }

      if (typeof entry === 'number') {
        return {
          id: Math.trunc(entry),
          codename: `permission_${Math.trunc(entry)}`,
        };
      }

      return normalizePermissionItem(entry);
    })
    .filter((permission): permission is PermissionItem => permission !== null);

  const byCodename = new Map<string, PermissionItem>();
  items.forEach((permission) => {
    byCodename.set(permission.codename, permission);
  });

  return [...byCodename.values()];
};

const mergePermissionSources = (sources: unknown[]): PermissionItem[] => {
  const byCodename = new Map<string, PermissionItem>();

  sources.forEach((source) => {
    extractPermissionItems(source).forEach((permission) => {
      byCodename.set(permission.codename, permission);
    });
  });

  return [...byCodename.values()];
};

const extractDirectPermissionCodenames = (payload: unknown): string[] => {
  const root = toRecord(payload);
  const rootUser = toRecord(root.user);
  const roleRaw = isRecord(root.role) ? root.role : isRecord(rootUser.role) ? rootUser.role : null;

  const merged = mergePermissionSources([
    root.permissions,
    root.permission_ids,
    root.permissionIds,
    root.user_permissions,
    root.userPermissions,
    root.scopes,
    root.authorities,
    rootUser.permissions,
    rootUser.permission_ids,
    rootUser.permissionIds,
    rootUser.user_permissions,
    rootUser.userPermissions,
    roleRaw?.permissions,
    roleRaw?.permission_ids,
    roleRaw?.permissionIds,
  ]);

  return merged.map((permission) => permission.codename);
};

const extractModulePermissions = (payload: unknown): ModulePermission[] => {
  const root = toRecord(payload);
  const rootUser = toRecord(root.user);

  const source = Array.isArray(root.permissions)
    ? root.permissions
    : Array.isArray(rootUser.permissions)
      ? rootUser.permissions
      : [];

  return source.map((p: any) => ({
    module_id: toNumber(p.module_id || p.id),
    module_name: toText(p.module_name || p.name || p.label),
    module_url: toText(p.module_url || p.url || p.href),
    is_menu: Boolean(p.is_menu),
    is_view: Boolean(p.is_view),
    is_add: Boolean(p.is_add),
    is_edit: Boolean(p.is_edit),
    is_delete: Boolean(p.is_delete),
  }));
};

const extractRoleFromPayload = (payload: unknown): RolePermissionProfile | null => {
  const root = toRecord(payload);
  const rootUser = toRecord(root.user);
  const rawRole = isRecord(root.role) ? root.role : isRecord(rootUser.role) ? rootUser.role : null;
  if (!rawRole) return null;

  const permissions = mergePermissionSources([
    rawRole.permissions,
    rawRole.permission_ids,
    rawRole.permissionIds,
  ]);

  return {
    id: toNumber(rawRole.id),
    name: toText(rawRole.name) || 'Role',
    description: toText(rawRole.description) || undefined,
    permissions,
  };
};

const extractUserFromPayload = (payload: unknown): AdminUserState | null => {
  const root = toRecord(payload);
  const rawUser = isRecord(root.user) ? root.user : root;
  const rawProfile = isRecord(rawUser.profile) ? rawUser.profile : {};

  if (Object.keys(rawUser).length === 0) return null;

  const roleRaw = isRecord(rawUser.role) ? rawUser.role : null;
  const rolePermissions = roleRaw
    ? mergePermissionSources([roleRaw.permissions, roleRaw.permission_ids, roleRaw.permissionIds])
    : [];

  return {
    id:
      typeof rawUser.id === 'number' || typeof rawUser.id === 'string'
        ? rawUser.id
        : undefined,
    email: toText(rawUser.email) || undefined,
    username: toText(rawUser.username) || undefined,
    first_name: toText(rawUser.first_name) || undefined,
    last_name: toText(rawUser.last_name) || undefined,
    avatar:
      pickString(
        rawUser.avatar,
        rawUser.profile_image,
        rawUser.profileImage,
        rawUser.avatar_url,
        rawUser.image,
        rawUser.image_url,
        rawProfile.avatar,
        rawProfile.profile_image,
        rawProfile.profileImage,
        rawProfile.avatar_url,
        rawProfile.image,
        rawProfile.image_url
      ) || undefined,
    profile_image:
      pickString(
        rawUser.profile_image,
        rawUser.avatar,
        rawUser.profileImage,
        rawProfile.profile_image,
        rawProfile.avatar,
        rawProfile.profileImage
      ) || undefined,
    is_active: typeof rawUser.is_active === 'boolean' ? rawUser.is_active : undefined,
    is_superuser: Boolean(rawUser.is_superuser || rawUser.is_superadmin),
    is_superadmin: Boolean(rawUser.is_superuser || rawUser.is_superadmin),
    role: roleRaw
      ? {
          id: toNumber(roleRaw.id),
          name: toText(roleRaw.name) || 'Role',
          permissions: rolePermissions,
        }
      : null,
  };
};

const derivePermissionsFromState = (nextState: AuthDataState): string[] => {
  const sourcePermissions = [
    ...(nextState.role?.permissions ?? []),
    ...(nextState.user?.role?.permissions ?? []),
  ];

  const byCodename = new Set<string>();
  sourcePermissions.forEach((permission) => {
    const normalized = normalizeCodename(permission.codename);
    if (normalized) byCodename.add(normalized);
  });

  if (nextState.permissions.length > 0) {
    nextState.permissions.forEach((codename) => {
      const normalized = normalizeCodename(codename);
      if (normalized) byCodename.add(normalized);
    });
  }

  return [...byCodename.values()];
};

const persistState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (updater: Partial<AuthDataState> | ((current: AuthDataState) => AuthDataState)) => {
  const nextPartial =
    typeof updater === 'function'
      ? (updater as (current: AuthDataState) => AuthDataState)(state)
      : ({ ...state, ...updater } as AuthDataState);

  const nextState: AuthDataState = {
    ...state,
    ...nextPartial,
  };

  nextState.permissions = derivePermissionsFromState(nextState);
  nextState.isSuperAdmin =
    Boolean(nextState.isSuperAdmin) ||
    Boolean(nextState.user?.is_superuser) ||
    Boolean(nextState.user?.is_superadmin) ||
    nextState.permissions.includes('superadmin') ||
    nextState.permissions.includes('manage_all');

  state = nextState;
  persistState();
  notify();
};

const hydrate = () => {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const session = getAuthSession();
    if (!session) return;

    setState({
      user: session.user
        ? {
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            first_name: session.user.firstName,
            last_name: session.user.lastName,
            is_superuser: /super\s*admin|superadmin/i.test(session.role),
            is_superadmin: /super\s*admin|superadmin/i.test(session.role),
          }
        : null,
      role: {
        id: 0,
        name: session.role,
        permissions: [],
      },
      permissions: [],
      modulePermissions: [],
      isSuperAdmin: /super\s*admin|superadmin/i.test(session.role),
    });
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthDataState>;
    setState({
      user: parsed.user ?? null,
      role: parsed.role ?? null,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
      modulePermissions: Array.isArray(parsed.modulePermissions) ? parsed.modulePermissions : [],
      isSuperAdmin: Boolean(parsed.isSuperAdmin),
    });
  } catch {
    state = defaultState;
  }
};

const ME_ENDPOINTS = ['/api/users/me/', '/api/users/me', '/api/auth/me/', '/api/auth/me'] as const;
const ROLE_DETAIL_ENDPOINTS = [
  '/api/roles/{id}/',
  '/api/roles/{id}',
  '/api/admin/roles/{id}/',
  '/api/admin/roles/{id}',
] as const;
const AUTH_REFRESH_COOLDOWN_MS = 60_000;
const ROLE_DETAIL_ENDPOINT_UNAVAILABLE_TTL_MS = 5 * 60_000;

let refreshAuthDataInFlight: Promise<void> | null = null;
let lastAuthRefreshAt = 0;
let lastAuthRefreshToken = '';
const roleDetailEndpointUnavailableUntil = new Map<string, number>();

const getErrorStatus = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
  ) {
    return (error as { response?: { status?: number } }).response?.status ?? null;
  }
  return null;
};

const isRecoverableEndpointError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 403 || status === 404 || status === 405;
};

const getAvailableRoleDetailEndpoints = (roleId: number): string[] => {
  const now = Date.now();

  return ROLE_DETAIL_ENDPOINTS.map((template) => template.replace('{id}', String(roleId))).filter(
    (endpoint) => (roleDetailEndpointUnavailableUntil.get(endpoint) ?? 0) <= now
  );
};

const markRoleDetailEndpointUnavailable = (endpoint: string) => {
  roleDetailEndpointUnavailableUntil.set(
    endpoint,
    Date.now() + ROLE_DETAIL_ENDPOINT_UNAVAILABLE_TTL_MS
  );
};

const actions: AuthActions = {
  setAuthData: (partial) => {
    setState(partial);
  },
  clearAuthData: () => {
    state = defaultState;
    persistState();
    notify();
  },
  hydrateFromSession: () => {
    hydrate();
    const session = getAuthSession();
    if (!session) return;

    setState((current) => ({
      ...current,
      user: {
        ...current.user,
        id: current.user?.id ?? session.user?.id,
        email: current.user?.email ?? session.user?.email,
        username: current.user?.username ?? session.user?.username,
        first_name: current.user?.first_name ?? session.user?.firstName,
        last_name: current.user?.last_name ?? session.user?.lastName,
        avatar: current.user?.avatar ?? session.user?.avatar,
        profile_image: current.user?.profile_image ?? session.user?.avatar,
        is_superadmin: current.user?.is_superadmin || /super\s*admin|superadmin/i.test(session.role),
        is_superuser: current.user?.is_superuser || /super\s*admin|superadmin/i.test(session.role),
      },
      role:
        current.role ??
        ({
          id: 0,
          name: session.role,
          permissions: [],
        } as RolePermissionProfile),
      isSuperAdmin: current.isSuperAdmin || /super\s*admin|superadmin/i.test(session.role),
    }));
  },
  refreshAuthData: async () => {
    const session = getAuthSession();
    if (!session) return;

    const sessionToken =
      typeof session.accessToken === 'string' ? session.accessToken.trim() : '';
    const now = Date.now();

    if (
      sessionToken &&
      sessionToken === lastAuthRefreshToken &&
      now - lastAuthRefreshAt < AUTH_REFRESH_COOLDOWN_MS
    ) {
      return;
    }

    if (refreshAuthDataInFlight) {
      await refreshAuthDataInFlight;
      return;
    }

    refreshAuthDataInFlight = (async () => {
      let profilePayload: unknown = null;
      for (const endpoint of ME_ENDPOINTS) {
        try {
          const response = await apiClient.get<unknown>(endpoint);
          profilePayload = response.data;
          break;
        } catch (error) {
          if (isRecoverableEndpointError(error)) continue;
          return;
        }
      }

      if (!profilePayload) return;

      const profileRoot = toRecord(profilePayload);
      const profileUser = toRecord(profileRoot.user);
      const profileRole = isRecord(profileRoot.role)
        ? profileRoot.role
        : isRecord(profileUser.role)
          ? profileUser.role
          : null;

      const hasRolePermissions = Boolean(
        profileRole &&
          (Array.isArray(profileRole.permissions) ||
            Array.isArray(profileRole.permission_ids) ||
            Array.isArray(profileRole.permissionIds))
      );

      const roleId = profileRole ? toNumber(profileRole.id, 0) : 0;
      let mergedPayload: unknown = profilePayload;

      if (roleId > 0 && !hasRolePermissions) {
        for (const endpoint of getAvailableRoleDetailEndpoints(roleId)) {
          try {
            const response = await apiClient.get<unknown>(endpoint);
            const rolePayload = response.data;

            const mergedRoot: Record<string, unknown> = {
              ...profileRoot,
              role: rolePayload,
            };

            if (isRecord(profileRoot.user)) {
              mergedRoot.user = {
                ...profileUser,
                role: rolePayload,
              };
            }

            mergedPayload = mergedRoot;
            break;
          } catch (error) {
            if (isRecoverableEndpointError(error)) {
              markRoleDetailEndpointUnavailable(endpoint);
              continue;
            }
            break;
          }
        }
      }

      actions.syncFromLoginPayload(mergedPayload, session);
      lastAuthRefreshAt = Date.now();
      lastAuthRefreshToken = sessionToken;
    })();

    try {
      await refreshAuthDataInFlight;
    } finally {
      refreshAuthDataInFlight = null;
    }
  },
  syncFromLoginPayload: (payload, fallbackSession) => {
    const role = extractRoleFromPayload(payload);
    const user = extractUserFromPayload(payload);
    const directPermissionCodenames = extractDirectPermissionCodenames(payload);
    const modulePermissions = extractModulePermissions(payload);

    const fallback = fallbackSession ?? getAuthSession();

    const fallbackUser = fallback?.user
      ? {
          id: fallback.user.id,
          email: fallback.user.email,
          username: fallback.user.username,
          first_name: fallback.user.firstName,
          last_name: fallback.user.lastName,
          avatar: fallback.user.avatar,
          profile_image: fallback.user.avatar,
          is_superuser: /super\s*admin|superadmin/i.test(fallback.role),
          is_superadmin: /super\s*admin|superadmin/i.test(fallback.role),
        }
      : null;

    const fallbackRole = fallback
      ? {
          id: 0,
          name: fallback.role,
          permissions: [],
        }
      : null;

    const getUserKey = (value: AdminUserState | null): string => {
      if (!value) return '';
      if (value.id !== undefined && value.id !== null) return String(value.id);
      return value.email ?? value.username ?? '';
    };

    setState((current) => {
      const nextUser = user ?? fallbackUser ?? current.user;
      const sameUser = (() => {
        const currentKey = getUserKey(current.user);
        const nextKey = getUserKey(nextUser);
        return currentKey.length > 0 && nextKey.length > 0 && currentKey === nextKey;
      })();

      const baseRole = role ?? fallbackRole ?? current.role;
      const nextRole =
        baseRole &&
        sameUser &&
        (baseRole.permissions?.length ?? 0) === 0 &&
        current.role &&
        current.role.name === baseRole.name &&
        current.role.permissions.length > 0
          ? {
              ...baseRole,
              permissions: current.role.permissions,
            }
          : baseRole;

      const incomingPermissions = [
        ...(nextRole?.permissions.map((permission) => normalizeCodename(permission.codename)) ?? []),
        ...directPermissionCodenames.map((permission) => normalizeCodename(permission)),
      ].filter((permission) => permission.length > 0);

      const permissions =
        incomingPermissions.length > 0
          ? incomingPermissions
          : sameUser
            ? current.permissions
            : [];

      return {
        ...current,
        user: nextUser,
        role: nextRole,
        permissions,
        modulePermissions,
        isSuperAdmin:
          current.isSuperAdmin ||
          Boolean(nextUser?.is_superuser) ||
          Boolean(nextUser?.is_superadmin) ||
          /super\s*admin|superadmin/i.test(nextRole?.name ?? fallback?.role ?? ''),
      };
    });
  },
  getModulePermission: (moduleUrl: string) => {
    return state.modulePermissions.find((p) => p.module_url === moduleUrl) || null;
  },
};

const getSnapshot = (): AuthStore => {
  hydrate();
  return {
    ...state,
    ...actions,
  };
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useAuthStore<T = AuthStore>(selector?: (state: AuthStore) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      const snapshot = getSnapshot();
      return selector ? selector(snapshot) : (snapshot as unknown as T);
    },
    () => {
      const snapshot: AuthStore = {
        ...defaultState,
        ...actions,
      };
      return selector ? selector(snapshot) : (snapshot as unknown as T);
    }
  );
}

useAuthStore.getState = getSnapshot;
useAuthStore.subscribe = subscribe;
useAuthStore.setState = (partial: Partial<AuthDataState>) => setState(partial);
