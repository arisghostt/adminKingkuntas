import { NextResponse } from 'next/server';
import { extractRoleFromPayload, getAccessTokenFromPayload } from '@/app/lib/auth';

type AnyRecord = Record<string, unknown>;

const RAW_DJANGO_API_URL =
  process.env.DJANGO_API_URL ||
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

const DJANGO_LOGIN_ENDPOINT =
  process.env.DJANGO_LOGIN_ENDPOINT ||
  process.env.NEXT_PUBLIC_DJANGO_LOGIN_ENDPOINT ||
  '/api/auth/login/';

const DJANGO_ME_ENDPOINT =
  process.env.DJANGO_ME_ENDPOINT ||
  process.env.NEXT_PUBLIC_DJANGO_ME_ENDPOINT ||
  '/api/auth/me/';
const DJANGO_ME_FALLBACK_ENDPOINT =
  process.env.DJANGO_ME_FALLBACK_ENDPOINT ||
  process.env.NEXT_PUBLIC_DJANGO_ME_FALLBACK_ENDPOINT ||
  '/api/users/me/';

const DJANGO_API_URL = RAW_DJANGO_API_URL.replace(/\/+$/, '');

const normalizeApiPath = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (DJANGO_API_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return normalizedPath.slice(4);
  }
  return normalizedPath;
};

const getEndpoint = (path: string) => `${DJANGO_API_URL}${normalizeApiPath(path)}`;

const DJANGO_ME_ENDPOINTS = Array.from(
  new Set([DJANGO_ME_ENDPOINT, DJANGO_ME_FALLBACK_ENDPOINT].filter(Boolean))
);

const hasRoleHints = (payload: AnyRecord): boolean => {
  return extractRoleFromPayload(payload) !== null;
};

async function tryLogin(payload: AnyRecord) {
  const response = await fetch(getEndpoint(DJANGO_LOGIN_ENDPOINT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as AnyRecord;
  return { response, data };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AnyRecord;

    const password = typeof body.password === 'string' ? body.password : '';
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!password || (!identifier && !username && !email)) {
      return NextResponse.json(
        { detail: 'identifier/email/username and password are required.' },
        { status: 400 }
      );
    }

    const payloads: AnyRecord[] = [];

    if (username || email) {
      payloads.push({ ...(username ? { username } : {}), ...(email ? { email } : {}), password });
    } else {
      const idIsEmail = identifier.includes('@');
      payloads.push(idIsEmail ? { email: identifier, password } : { username: identifier, password });
      payloads.push(idIsEmail ? { username: identifier, password } : { email: identifier, password });
    }

    let loginResult: { response: Response; data: AnyRecord } | null = null;
    let fallbackError: { response: Response; data: AnyRecord } | null = null;
    let transportError: unknown = null;

    for (const payload of payloads) {
      try {
        const result = await tryLogin(payload);
        if (result.response.ok) {
          loginResult = result;
          break;
        }
        fallbackError = result;
      } catch (error) {
        transportError = error;
      }
    }

    if (!loginResult) {
      if (transportError) {
        return NextResponse.json(
          { detail: `Unable to reach authentication server at ${DJANGO_API_URL}.` },
          { status: 502 }
        );
      }
      const status = fallbackError?.response.status || 401;
      return NextResponse.json(fallbackError?.data || { detail: 'Login failed.' }, { status });
    }

    let mergedData: AnyRecord = loginResult.data;

    const accessToken = getAccessTokenFromPayload(mergedData);
    if (accessToken) {
      try {
        let meData: AnyRecord | null = null;

        for (const endpoint of DJANGO_ME_ENDPOINTS) {
          let meResponse = await fetch(getEndpoint(endpoint), {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          });

          if (!meResponse.ok) {
            meResponse = await fetch(getEndpoint(endpoint), {
              headers: { Authorization: `Token ${accessToken}` },
              cache: 'no-store',
            });
          }

          if (meResponse.ok) {
            meData = (await meResponse.json().catch(() => ({}))) as AnyRecord;
            break;
          }
        }

        if (meData) {
          if (!mergedData.user) {
            mergedData = { ...mergedData, user: meData };
          } else {
            mergedData = { ...mergedData, user: { ...(mergedData.user as AnyRecord), ...meData } };
          }
        }
      } catch {
        // Keep successful login response even when /me is temporarily unavailable.
      }
    }

    const role = extractRoleFromPayload(mergedData);
    if (role && typeof mergedData.role !== 'string') {
      mergedData = { ...mergedData, role };
    }

    return NextResponse.json(mergedData, { status: 200 });
  } catch {
    return NextResponse.json({ detail: 'Unable to process login request.' }, { status: 500 });
  }
}
