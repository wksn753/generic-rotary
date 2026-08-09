import { NextResponse } from 'next/server';
import type { RegistrationResponse, Submission } from '../../lib/definitions';

export const runtime = 'nodejs';

type RegisterPayload = Partial<Submission> & {
  honeypot?: string;
};

const FALLBACK_BACKEND_URL =
  "https://generic-rotary-backend.vercel.app/api/register";

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

export async function POST(request: Request) {
  let body: RegisterPayload;

  try {
    body = (await request.json()) as RegisterPayload;
  } catch {
    return jsonResponse(
      {
        success: false,
        code: 'VALIDATION',
        message: 'Please check the form and try again.',
      },
      400,
    );
  }

  /**
   * Honeypot: bots may fill this hidden field.
   * We return success without forwarding it to the backend.
   */
  if (cleanText(body.honeypot)) {
    return jsonResponse(
      {
        success: true,
        message: 'Registration successful',
      },
      200,
    );
  }

  const fullName = cleanText(body.fullName);
  const phone = formatUgandanPhone(cleanText(body.phone));
  const email = cleanText(body.email).toLowerCase();
  const rotaryClub = cleanText(body.rotaryClub);
  const purpose = cleanText(body.purpose) || 'Club Fellowship';
  const otherPurpose = cleanText(body.otherPurpose);

  if (!fullName) {
    return jsonResponse(
      {
        success: false,
        code: 'VALIDATION',
        message: 'Please enter a full name, or use the returning guest lookup first.',
      },
      400,
    );
  }

  if (!phone && !email) {
    return jsonResponse(
      {
        success: false,
        code: 'VALIDATION',
        message: 'Please enter a phone number or email so returning fellowship check-ins are quick.',
      },
      400,
    );
  }

  if (!rotaryClub) {
    return jsonResponse(
      {
        success: false,
        code: 'VALIDATION',
        message: 'Please select your Rotary club or choose non-member.',
      },
      400,
    );
  }

  if (purpose === 'Other' && !otherPurpose) {
    return jsonResponse(
      {
        success: false,
        code: 'VALIDATION',
        message: 'Please describe your purpose of visit.',
      },
      400,
    );
  }

  const backendUrl = process.env.REGISTRATION_API_URL?.trim() || FALLBACK_BACKEND_URL;
  const attendanceDate = cleanText(body.attendanceDate) || new Date().toISOString().slice(0, 10);

  const payload: Submission = {
    fullName,
    phone,
    email,
    rotaryClub,
    classification: cleanText(body.classification),
    purpose,
    otherPurpose: purpose === 'Other' ? otherPurpose : '',
    event: cleanText(body.event) || 'Rotary Club of Nakawa Monday Fellowship',
    date: cleanText(body.date) || attendanceDate,
    attendanceDate,
    venue: cleanText(body.venue) || 'Rotary Club of Nakawa',
    submittedAt: cleanText(body.submittedAt) || new Date().toISOString(),
    checkInSource: cleanText(body.checkInSource) || 'web',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    let backendData: Partial<RegistrationResponse> | null = null;
    try {
      backendData = (await backendResponse.json()) as Partial<RegistrationResponse>;
    } catch {
      backendData = null;
    }

    if (!backendResponse.ok) {
      return jsonResponse(
        {
          success: false,
          code: backendData?.code || 'UNAVAILABLE',
          message:
            backendData?.message ||
            'Registration is temporarily unavailable. Please try again in a moment or speak to the registration desk.',
        },
        backendResponse.status === 400 ? 400 : 502,
      );
    }

    return jsonResponse(
      {
        success: true,
        alreadyRegistered: Boolean(backendData?.alreadyRegistered),
        message:
          backendData?.message ||
          (backendData?.alreadyRegistered ? 'Already checked in for this day.' : 'Registration successful'),
      },
      200,
    );
  } catch {
    clearTimeout(timeout);

    return jsonResponse(
      {
        success: false,
        code: 'UNAVAILABLE',
        message:
          'We could not confirm the registration right now. Please check your connection and try again.',
      },
      503,
    );
  }
}

export function GET() {
  return jsonResponse(
    {
      success: false,
      code: 'UNKNOWN',
      message: 'This endpoint only accepts registrations.',
    },
    405,
  );
}
