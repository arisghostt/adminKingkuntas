export type AppRole = string;

export interface AuthUser {
  id?: number | string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  role: AppRole;
  user?: AuthUser;
}

const AUTH_SESSION_KEY = 'kk_auth_session';
const ACCESS_TOKEN_KEY = 'auth_access_token';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const unwrapPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.data)) return payload.data;
  if (isRecord(payload.result)) return payload.result;
  if (isRecord(payload.results)) return payload.results;

  return payload;
};

const toRole = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized.length > 0) return normalized;
    }
  }
  return undefined;
};

const normalizeRoleName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const isAllowedRole = (role: unknown): role is AppRole => toRole(role) !== null;

export const hasAdminAccessRole = (role: unknown): boolean => {
  const resolvedRole = toRole(role);
  if (!resolvedRole) return false;

  const normalized = normalizeRoleName(resolvedRole);
  return (
    normalized === 'admin' ||
    normalized === 'administrator' ||
    normalized === 'superadmin' ||
    normalized === 'super_admin' ||
    normalized === 'staff' ||
    normalized === 'owner' ||
    normalized.endsWith('_admin')
  );
};

export const getAccessTokenFromPayload = (payload: unknown): string | null => {
  const record = unwrapPayload(payload);
  if (!record) return null;

  return (
    (typeof record.access === 'string' && record.access) ||
    (typeof record.accessToken === 'string' && record.accessToken) ||
    (typeof record.access_token === 'string' && record.access_token) ||
    (typeof record.token === 'string' && record.token) ||
    (typeof record.auth_token === 'string' && record.auth_token) ||
    (typeof record.key === 'string' && record.key) ||
    (typeof record.jwt === 'string' && record.jwt) ||
    null
  );
};

export const getRefreshTokenFromPayload = (payload: unknown): string | undefined => {
  const record = unwrapPayload(payload);
  if (!record) return undefined;

  return (
    (typeof record.refresh === 'string' && record.refresh) ||
    (typeof record.refreshToken === 'string' && record.refreshToken) ||
    (typeof record.refresh_token === 'string' && record.refresh_token) ||
    undefined
  );
};

export const getAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !isAllowedRole(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setAuthSession = (session: AuthSession): void => {
  if (typeof window === 'undefined') return;

  const normalizedAccessToken = session.accessToken.replace(/^(Bearer|Token)\s+/i, '').trim();
  const normalizedRefreshToken = session.refreshToken
    ? session.refreshToken.replace(/^(Bearer|Token)\s+/i, '').trim()
    : undefined;

  window.localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      ...session,
      accessToken: normalizedAccessToken,
      refreshToken: normalizedRefreshToken,
    })
  );
  window.localStorage.setItem(ACCESS_TOKEN_KEY, normalizedAccessToken);
  document.cookie = `access_token=${encodeURIComponent(normalizedAccessToken)}; path=/`;
};

export const clearAuthSession = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem('kk_auth_store_v1');
  document.cookie = 'access_token=; Max-Age=0; path=/';
};

const extractRoleValue = (value: unknown): AppRole | null => {
  const direct = toRole(value);
  if (direct) return direct;

  if (!isRecord(value)) return null;
  return (
    toRole(value.name) ||
    toRole(value.code) ||
    toRole(value.slug) ||
    toRole(value.role) ||
    toRole(value.type)
  );
};

export const extractRoleFromPayload = (payload: unknown): AppRole | null => {
  const root = unwrapPayload(payload);
  if (!root) return null;

  const directRole =
    extractRoleValue(root.role) ||
    extractRoleValue(root.user_role) ||
    extractRoleValue(root.account_type) ||
    extractRoleValue(root.type);
  if (directRole) return directRole;

  if (isRecord(root.user)) {
    const userRole =
      extractRoleValue(root.user.role) ||
      extractRoleValue(root.user.user_role) ||
      extractRoleValue(root.user.account_type) ||
      extractRoleValue(root.user.type);
    if (userRole) return userRole;

    if (isRecord(root.user.profile)) {
      const profileRole =
        extractRoleValue(root.user.profile.role) ||
        extractRoleValue(root.user.profile.user_role) ||
        extractRoleValue(root.user.profile.account_type) ||
        extractRoleValue(root.user.profile.type);
      if (profileRole) return profileRole;
    }

    if (root.user.is_superuser === true) return 'superadmin';
    if (root.user.is_staff === true) return 'admin';

    if (Array.isArray(root.user.roles)) {
      for (const role of root.user.roles) {
        const resolvedRole = extractRoleValue(role);
        if (resolvedRole) return resolvedRole;
      }
    }

    if (Array.isArray(root.user.groups)) {
      for (const group of root.user.groups) {
        const role = extractRoleValue(group);
        if (role) return role;
      }
    }
  }

  if (root.is_superuser === true) return 'superadmin';
  if (root.is_staff === true) return 'admin';
  return null;
};

export const buildAuthSession = (payload: unknown): AuthSession | null => {
  const root = unwrapPayload(payload);
  if (!root) return null;

  const accessToken = getAccessTokenFromPayload(root);

  if (!accessToken) return null;

  const role = extractRoleFromPayload(root);
  if (!role) return null;

  const refreshToken = getRefreshTokenFromPayload(root);

  const rawUser = isRecord(root.user) ? root.user : root;
  const rawProfile = isRecord(rawUser.profile) ? rawUser.profile : null;
  const user: AuthUser = {
    id: typeof rawUser.id === 'number' || typeof rawUser.id === 'string' ? rawUser.id : undefined,
    username: typeof rawUser.username === 'string' ? rawUser.username : undefined,
    email: typeof rawUser.email === 'string' ? rawUser.email : undefined,
    firstName: typeof rawUser.first_name === 'string' ? rawUser.first_name : undefined,
    lastName: typeof rawUser.last_name === 'string' ? rawUser.last_name : undefined,
    avatar: pickString(
      rawUser.avatar,
      rawUser.profile_image,
      rawUser.profileImage,
      rawUser.avatar_url,
      rawUser.image,
      rawUser.image_url,
      rawProfile?.avatar,
      rawProfile?.profile_image,
      rawProfile?.profileImage,
      rawProfile?.avatar_url,
      rawProfile?.image,
      rawProfile?.image_url
    ),
  };

  return { accessToken, refreshToken, role, user };
};
