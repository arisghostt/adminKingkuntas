import axios from 'axios';
import {
  clearAuthSession,
  getAccessTokenFromPayload,
  getAuthSession,
  getRefreshTokenFromPayload,
  setAuthSession,
} from '@/app/lib/auth';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '') + '/';

export const normalizeApiPath = (path: string) => {
  if (path.startsWith('/api/')) {
    return path.slice(5);
  }
  if (path.startsWith('api/')) {
    return path.slice(4);
  }
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeStoredToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^(Bearer|Token)\s+/i, '').trim();
  return normalized.length > 0 ? normalized : null;
};

const getCookieAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  const cookieToken = document.cookie
    .split(';')
    .find((cookie) => cookie.trim().startsWith('access_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!cookieToken) return null;
  return normalizeStoredToken(decodeURIComponent(cookieToken));
};

const getLegacyAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const directAccess =
    window.localStorage.getItem('auth_access_token') ??
    window.localStorage.getItem('access_token');
  const normalizedDirectAccess = normalizeStoredToken(directAccess);
  if (normalizedDirectAccess) return normalizedDirectAccess;

  const rawSession = window.localStorage.getItem('kk_auth_session');
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as { accessToken?: unknown };
      const normalizedSessionToken = normalizeStoredToken(parsed.accessToken);
      if (normalizedSessionToken) return normalizedSessionToken;
    } catch {
      // Ignore parsing errors and fallback to cookie token.
    }
  }

  return getCookieAccessToken();
};

const getLegacyRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const directRefresh =
    window.localStorage.getItem('auth_refresh_token') ??
    window.localStorage.getItem('refresh_token');
  const normalizedDirectRefresh = normalizeStoredToken(directRefresh);
  if (normalizedDirectRefresh) return normalizedDirectRefresh;

  const rawSession = window.localStorage.getItem('kk_auth_session');
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as { refreshToken?: unknown };
    return normalizeStoredToken(parsed.refreshToken);
  } catch {
    return null;
  }
};

const setLegacyTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  const normalizedAccessToken = normalizeStoredToken(accessToken);
  if (!normalizedAccessToken) return;

  window.localStorage.setItem('auth_access_token', normalizedAccessToken);
  window.localStorage.setItem('access_token', normalizedAccessToken);
  document.cookie = `access_token=${encodeURIComponent(normalizedAccessToken)}; path=/`;

  const normalizedRefreshToken = normalizeStoredToken(refreshToken);
  if (normalizedRefreshToken) {
    window.localStorage.setItem('auth_refresh_token', normalizedRefreshToken);
    window.localStorage.setItem('refresh_token', normalizedRefreshToken);
  }
};

const clearLegacyTokens = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('auth_access_token');
  window.localStorage.removeItem('auth_refresh_token');
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const getJwtExp = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof payload.exp === 'number') return payload.exp;
    if (typeof payload.exp === 'string' && Number.isFinite(Number(payload.exp))) {
      return Number(payload.exp);
    }
    return null;
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (token: string, leewaySeconds = 20): boolean => {
  const exp = getJwtExp(token);
  if (!exp) return false;
  return Date.now() >= (exp - leewaySeconds) * 1000;
};

const setAuthorizationHeader = (headersSource: unknown, token: string) => {
  const headers = headersSource as
    | { set?: (key: string, value: string) => void; Authorization?: string }
    | undefined;
  const bearer = `Bearer ${token.replace(/^(Bearer|Token)\s+/i, '').trim()}`;

  if (typeof headers?.set === 'function') {
    headers.set('Authorization', bearer);
    return headersSource;
  }

  const nextHeaders = (headers ?? {}) as { Authorization?: string };
  nextHeaders.Authorization = bearer;
  return nextHeaders;
};

const updateSessionTokens = (accessToken: string, refreshToken: string, session = getAuthSession()) => {
  if (session) {
    setAuthSession({
      ...session,
      accessToken,
      refreshToken,
    });
  }

  setLegacyTokens(accessToken, refreshToken);
};

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessTokenShared = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = getAuthSession();
    const refreshToken = normalizeStoredToken(session?.refreshToken) ?? getLegacyRefreshToken();

    if (!refreshToken) return null;

    try {
      const refreshResponse = await refreshClient.post<Record<string, unknown>>(
        normalizeApiPath('/api/auth/refresh/'),
        { refresh: refreshToken }
      );

      const refreshedPayload = refreshResponse.data;
      const refreshedAccessToken = getAccessTokenFromPayload(refreshedPayload);
      const refreshedRefreshToken = getRefreshTokenFromPayload(refreshedPayload) ?? refreshToken;

      if (!refreshedAccessToken) return null;

      updateSessionTokens(refreshedAccessToken, refreshedRefreshToken, session);
      return normalizeStoredToken(refreshedAccessToken);
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

apiClient.interceptors.request.use(async (config) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url);
  }

  const sessionToken = normalizeStoredToken(getAuthSession()?.accessToken);
  let token = sessionToken ?? getLegacyAccessToken();

  if (token && isTokenExpiringSoon(token)) {
    const refreshed = await refreshAccessTokenShared();
    if (refreshed) token = refreshed;
  }

  if (token) {
    config.headers = setAuthorizationHeader(config.headers, token) as typeof config.headers;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as ({ _retry?: boolean; headers?: unknown } & Record<string, unknown>) | undefined;

    const requestUrl = typeof originalRequest?.url === 'string' ? originalRequest.url : '';
    const isRefreshPath = /\/api\/auth\/refresh\/?$|\/auth\/refresh\/?$/.test(requestUrl);

    if (status !== 401 || !originalRequest || originalRequest._retry || isRefreshPath) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const refreshedAccessToken = await refreshAccessTokenShared();
      if (!refreshedAccessToken) {
        clearAuthSession();
        clearLegacyTokens();
        redirectToLogin();
        throw error;
      }

      originalRequest.headers = setAuthorizationHeader(
        originalRequest.headers,
        refreshedAccessToken
      ) as unknown;

      return apiClient.request(originalRequest as any);
    } catch {
      clearAuthSession();
      clearLegacyTokens();
      redirectToLogin();
      throw error;
    }
  }
);
