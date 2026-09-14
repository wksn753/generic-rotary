import { NextResponse } from 'next/server';
import type { RegistrationResponse, Submission } from '../../lib/definitions';

export const runtime = 'nodejs';

const ATTENDANCE_PROFILE_COOKIE = 'rotary_attendance_profile';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

type RegisterPayload = Partial<Submission> & { honeypot?: string };

const FALLBACK_BACKEND_URL = 'https://generic-rotary-backend.vercel.app/api/register';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatUgandanPhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '').replace(/^256/, '').replace(/^0+/, '');
  return digits ? `+256${digits}` : '';
}

function jsonResponse(payload: RegistrationResponse, status: number) {
  return NextResponse.json(payload, { status });
}

function splitClub(value: string) {
  const [club = '', group = ''] = value.split('|', 2);
  return { club: club.trim(), group: group.trim() };
}

function shouldSecureCookie(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

function setRememberedProfile(response: NextResponse, request: Request, submission: Submission) {
  const split = splitClub(submission.rotaryClub);
  const profile = {
    fullName: submission.fullName,
    phone: submission.phone,
    email: submission.email,
    rotaryClub: submission.rotaryClub,
    baseRotaryClub: submission.baseRotaryClub || split.club,
    buddyGroup: submission.buddyGroup || split.group,
    invitedBy: submission.invitedBy || '',
    customClub: Boolean(submission.customClub),
    classification: submission.classification || '',
    renewedAt: new Date().toISOString(),
  };

  response.cookies.set({
    name: ATTENDANCE_PROFILE_COOKIE,
    value: encodeURIComponent(JSON.stringify(profile)),
    maxAge: THIRTY_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: shouldSecureCookie(request),
    httpOnly: false,
  });
}

export async function POST(request: Request) {
  let body: RegisterPayload;

  try {
    body = (await request.json()) as RegisterPayload;
  } catch {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Please check the form and try again.' }, 400);
  }

  if (cleanText(body.honeypot)) {
    return jsonResponse({ success: true, message: 'Registration successful' }, 200);
  }

  const fullName = cleanText(body.fullName);
  const phone = formatUgandanPhone(cleanText(body.phone));
  const email = cleanText(body.email).toLowerCase();
  const rotaryClub = cleanText(body.rotaryClub);
  const split = splitClub(rotaryClub);
  const baseRotaryClub = cleanText(body.baseRotaryClub) || split.club;
  const buddyGroup = cleanText(body.buddyGroup) || split.group;
  const purpose = cleanText(body.purpose) || 'Club Fellowship';
  const otherPurpose = cleanText(body.otherPurpose);

  if (!fullName) {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Please enter a full name, or use the returning guest lookup first.' }, 400);
  }
  if (!phone && !email) {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Please enter a phone number or email so returning fellowship check-ins are quick.' }, 400);
  }
  if (!rotaryClub && !baseRotaryClub) {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Please select your Rotary club or choose non-member.' }, 400);
  }
  if (purpose === 'Other' && !otherPurpose) {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Please describe your purpose of visit.' }, 400);
  }

  const backendUrl = process.env.REGISTRATION_API_URL?.trim() || FALLBACK_BACKEND_URL;
  const attendanceDate = cleanText(body.attendanceDate) || new Date().toISOString().slice(0, 10);

  const payload: Submission = {
    fullName,
    phone,
    email,
    rotaryClub: rotaryClub || [baseRotaryClub, buddyGroup].filter(Boolean).join(' | '),
    baseRotaryClub,
    buddyGroup,
    invitedBy: cleanText(body.invitedBy),
    customClub: Boolean(body.customClub),
    classification: cleanText(body.classification),
    purpose,
    otherPurpose: purpose === 'Other' ? otherPurpose : '',
    event: cleanText(body.event) || 'Rotary Fellowship',
    date: cleanText(body.date) || attendanceDate,
    attendanceDate,
    venue: cleanText(body.venue) || 'Rotary Club',
    submittedAt: cleanText(body.submittedAt) || new Date().toISOString(),
    checkInSource: cleanText(body.checkInSource) || 'web',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    let backendData: Partial<RegistrationResponse> | null = null;
    try { backendData = (await backendResponse.json()) as Partial<RegistrationResponse>; } catch { backendData = null; }

    if (!backendResponse.ok) {
      return jsonResponse({
        success: false,
        code: backendData?.code || 'UNAVAILABLE',
        message: backendData?.message || 'Registration is temporarily unavailable. Please try again in a moment or speak to the registration desk.',
      }, backendResponse.status === 400 ? 400 : 502);
    }

    const response = jsonResponse({
      success: true,
      alreadyRegistered: Boolean(backendData?.alreadyRegistered),
      message: backendData?.message || (backendData?.alreadyRegistered ? 'Already checked in for this day.' : 'Registration successful'),
      record: backendData?.record,
    }, 200);

    // Every confirmed scan/check-in renews the remembered identity for another
    // 30 days, including a harmless repeat confirmation on the same day.
    setRememberedProfile(response, request, payload);
    return response;
  } catch {
    clearTimeout(timeout);
    return jsonResponse({ success: false, code: 'UNAVAILABLE', message: 'We could not confirm the registration right now. Please check your connection and try again.' }, 503);
  }
}

export function GET() {
  return jsonResponse({ success: false, code: 'UNKNOWN', message: 'This endpoint only accepts registrations.' }, 405);
}
