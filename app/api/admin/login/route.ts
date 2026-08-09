import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  getAdminSessionMaxAgeSeconds,
  getBearerAdminSession,
  isCorrectAdminPassword,
  isValidAdminSession,
} from '../../../lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LoginPayload = {
  password?: string;
};

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

function shouldUseSecureCookie(request: NextRequest) {
  if (process.env.ADMIN_COOKIE_SECURE?.trim().toLowerCase() === 'true') return true;
  if (process.env.ADMIN_COOKIE_SECURE?.trim().toLowerCase() === 'false') return false;

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();

  if (forwardedProto) return forwardedProto === 'https';

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function getRequestSession(request: NextRequest) {
  return (
    request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
    getBearerAdminSession(request.headers.get('authorization'))
  );
}

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);

  return noStore(NextResponse.json({ authenticated: isValidAdminSession(session) }, { status: 200 }));
}

export async function POST(request: NextRequest) {
  let payload: LoginPayload | null = null;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    payload = null;
  }

  if (!payload?.password || !isCorrectAdminPassword(payload.password)) {
    return noStore(NextResponse.json({ success: false, message: 'Invalid admin password.' }, { status: 401 }));
  }

  const token = createAdminSessionValue();
  const response = noStore(
    NextResponse.json(
      {
        success: true,
        message: 'Admin session started.',
        token,
      },
      { status: 200 },
    ),
  );

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: getAdminSessionMaxAgeSeconds(),
  });

  return response;
}
