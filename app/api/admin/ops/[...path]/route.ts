import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getBearerAdminSession, isValidAdminSession } from '../../../../lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_BACKEND_ROOT = 'https://generic-rotary-backend.vercel.app/api';

function requestSession(request: NextRequest) {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value || getBearerAdminSession(request.headers.get('authorization'));
}

function backendRoot() {
  const register = process.env.REGISTRATION_API_URL?.trim();
  if (register?.endsWith('/register')) return register.slice(0, -'/register'.length);
  return process.env.REGISTRATION_BACKEND_ROOT_URL?.trim() || FALLBACK_BACKEND_ROOT;
}

function noStore(payload: unknown, status: number) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  if (!isValidAdminSession(requestSession(request))) {
    return noStore({ success: false, code: 'UNAUTHORIZED', message: 'Admin login required.' }, 401);
  }

  const parts = Array.isArray(context.params.path) ? context.params.path : [];
  if (!parts.length || parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    return noStore({ success: false, message: 'Invalid operations route.' }, 400);
  }

  const incoming = new URL(request.url);
  const target = new URL(`${backendRoot()}/admin/${parts.map(encodeURIComponent).join('/')}`);
  incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers: Record<string, string> = { Accept: 'application/json' };
  const adminKey = process.env.ADMIN_API_KEY?.trim();
  if (adminKey) headers['X-Admin-API-Key'] = adminKey;

  let body: string | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.text();
    if (body) headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let payload: unknown;
    try {
      payload = await backendResponse.json();
    } catch {
      payload = { success: false, message: 'Backend returned an unreadable response.' };
    }

    if (backendResponse.status === 401 || backendResponse.status === 403) {
      return noStore({ success: false, code: 'BACKEND_UNAUTHORIZED', message: 'The backend rejected the admin API key.' }, 502);
    }
    return noStore(payload, backendResponse.status);
  } catch {
    clearTimeout(timeout);
    return noStore({ success: false, code: 'UNAVAILABLE', message: 'Club operations are temporarily unavailable.' }, 503);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
