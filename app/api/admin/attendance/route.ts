import { NextRequest, NextResponse } from 'next/server';
import type { AttendanceResponse } from '../../../lib/definitions';
import { ADMIN_COOKIE_NAME, getBearerAdminSession, isValidAdminSession } from '../../../lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ATTENDANCE_URL =
  'http://n1065v34z9435876yrwcc9mx.213.136.66.81.sslip.io/api/attendance';

function jsonResponse(payload: AttendanceResponse, status: number) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

function getBackendAttendanceURL() {
  const registerUrl = process.env.REGISTRATION_API_URL?.trim();

  return (
    process.env.REGISTRATION_ATTENDANCE_API_URL?.trim() ||
    (registerUrl?.endsWith('/register') ? registerUrl.replace(/\/register$/, '/attendance') : '') ||
    FALLBACK_ATTENDANCE_URL
  );
}

function getRequestSession(request: NextRequest) {
  return (
    request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
    getBearerAdminSession(request.headers.get('authorization'))
  );
}

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);

  if (!isValidAdminSession(session)) {
    return jsonResponse({ success: false, code: 'UNAUTHORIZED', message: 'Admin login required.' }, 401);
  }

  const url = new URL(request.url);
  const date = url.searchParams.get('date')?.trim() || '';
  const backendUrl = getBackendAttendanceURL();
  const target = date ? `${backendUrl}?date=${encodeURIComponent(date)}` : backendUrl;
  const adminAPIKey = process.env.ADMIN_API_KEY?.trim();
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (adminAPIKey) {
    headers['X-Admin-API-Key'] = adminAPIKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const backendResponse = await fetch(target, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    let data: AttendanceResponse | null = null;
    try {
      data = (await backendResponse.json()) as AttendanceResponse;
    } catch {
      data = null;
    }

    if (!backendResponse.ok || !data?.success) {
      if (backendResponse.status === 401 || backendResponse.status === 403) {
        return jsonResponse(
          {
            success: false,
            code: 'BACKEND_UNAUTHORIZED',
            message:
              data?.message ||
              'Admin login is active, but the backend attendance API rejected the admin key. Check that ADMIN_API_KEY matches on the frontend and backend deployments.',
          },
          502,
        );
      }

      return jsonResponse(
        {
          success: false,
          code: data?.code || 'UNAVAILABLE',
          message: data?.message || 'Attendance is temporarily unavailable.',
        },
        502,
      );
    }

    return jsonResponse(data, 200);
  } catch {
    clearTimeout(timeout);
    return jsonResponse({ success: false, code: 'UNAVAILABLE', message: 'Attendance is temporarily unavailable.' }, 503);
  }
}
