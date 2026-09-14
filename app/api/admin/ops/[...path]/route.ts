import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getBearerAdminSession, isValidAdminSession } from '../../../../lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_BACKEND_ROOT = 'https://generic-rotary-backend.vercel.app/api';

function requestSession(request: NextRequest) {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value || getBearerAdminSession(request.headers.get('authorization'));
}

function normalizeBackendRoot(value?: string) {
  const cleaned = value?.trim().replace(/\/+$/, '') || '';
  if (!cleaned) return '';
  if (cleaned.endsWith('/register')) return cleaned.slice(0, -'/register'.length);
  if (cleaned.endsWith('/attendance')) return cleaned.slice(0, -'/attendance'.length);
  return cleaned;
}

function backendRoot() {
  return (
    normalizeBackendRoot(process.env.REGISTRATION_BACKEND_ROOT_URL) ||
    normalizeBackendRoot(process.env.REGISTRATION_API_URL) ||
    FALLBACK_BACKEND_ROOT
  );
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

    const rawBody = await backendResponse.text();
    let payload: unknown = null;
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    }

    if (backendResponse.status === 401 || backendResponse.status === 403) {
      return noStore({
        success: false,
        code: 'BACKEND_UNAUTHORIZED',
        message: 'The backend rejected the admin API key. Make sure ADMIN_API_KEY is identical on the frontend and Go backend.',
      }, 502);
    }

    if (payload === null) {
      const contentType = backendResponse.headers.get('content-type') || 'unknown';
      console.error(
        `[admin-ops-proxy] Non-JSON backend response: ${backendResponse.status} ${target.toString()} (${contentType}) ${rawBody.slice(0, 300)}`,
      );

      if (backendResponse.status === 404) {
        return noStore({
          success: false,
          code: 'OPERATIONS_NOT_DEPLOYED',
          message: 'The new club-operations API was not found on the Go backend. Deploy the updated backend and point REGISTRATION_BACKEND_ROOT_URL to the backend /api root.',
        }, 502);
      }

      if (backendResponse.status >= 500) {
        return noStore({
          success: false,
          code: 'BACKEND_INIT_FAILED',
          message: 'The Go backend failed while starting or loading club operations. Check the backend deployment logs and database migration/configuration.',
        }, 502);
      }

      return noStore({
        success: false,
        code: 'BACKEND_INVALID_RESPONSE',
        message: `The Go backend returned HTTP ${backendResponse.status} instead of JSON for the club-operations API.`,
      }, 502);
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
