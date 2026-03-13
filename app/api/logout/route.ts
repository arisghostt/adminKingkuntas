import { NextResponse } from 'next/server';

type AnyRecord = Record<string, unknown>;

const RAW_DJANGO_API_URL =
  process.env.DJANGO_API_URL ||
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

const DJANGO_LOGOUT_ENDPOINT =
  process.env.DJANGO_LOGOUT_ENDPOINT ||
  process.env.NEXT_PUBLIC_DJANGO_LOGOUT_ENDPOINT ||
  '/api/auth/logout/';

const DJANGO_LOGOUT_FALLBACK_ENDPOINT =
  process.env.DJANGO_LOGOUT_FALLBACK_ENDPOINT ||
  process.env.NEXT_PUBLIC_DJANGO_LOGOUT_FALLBACK_ENDPOINT ||
  '';

const DJANGO_API_URL = RAW_DJANGO_API_URL.replace(/\/+$/, '');

const normalizeApiPath = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (DJANGO_API_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return normalizedPath.slice(4);
  }
  return normalizedPath;
};

const getEndpoint = (path: string) => `${DJANGO_API_URL}${normalizeApiPath(path)}`;

const DJANGO_LOGOUT_ENDPOINTS = Array.from(
  new Set([DJANGO_LOGOUT_ENDPOINT, DJANGO_LOGOUT_FALLBACK_ENDPOINT].filter(Boolean))
);

let logoutEndpointUnavailable = false;

export async function POST(request: Request) {
  try {
    if (logoutEndpointUnavailable || DJANGO_LOGOUT_ENDPOINTS.length === 0) {
      return NextResponse.json({ success: true, message: 'Logged out locally.' });
    }

    const body = (await request.json().catch(() => ({}))) as AnyRecord;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ success: true, message: 'Logged out locally.' });
    }

    const payload = refreshToken ? { refresh: refreshToken } : {};

    let response: Response | null = null;
    let lastErrorPayload: AnyRecord = {};
    let onlyNotFoundErrors = true;

    for (const endpoint of DJANGO_LOGOUT_ENDPOINTS) {
      response = await fetch(getEndpoint(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (response.ok) break;

      lastErrorPayload = (await response.json().catch(() => ({}))) as AnyRecord;

      // Endpoint missing: try next known endpoint, no token-scheme retry on the same URL.
      if (response.status === 404) {
        continue;
      }

      onlyNotFoundErrors = false;

      if (accessToken) {
        response = await fetch(getEndpoint(endpoint), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${accessToken}`,
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });

        if (response.ok) break;
        lastErrorPayload = (await response.json().catch(() => ({}))) as AnyRecord;
        if (response.status !== 404) {
          onlyNotFoundErrors = false;
        }
      }
    }

    if (!response?.ok && onlyNotFoundErrors) {
      logoutEndpointUnavailable = true;
      return NextResponse.json({
        success: true,
        message: 'No backend logout endpoint available. Local logout completed.',
      });
    }

    if (!response?.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Backend logout failed, but local logout can still proceed.',
          backend: lastErrorPayload,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'Logout successful.' });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Logout request failed, but local logout can still proceed.' },
      { status: 200 }
    );
  }
}
