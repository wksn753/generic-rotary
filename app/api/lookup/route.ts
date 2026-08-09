import { NextResponse } from 'next/server';
import type { LookupResponse } from '../../lib/definitions';

export const runtime = 'nodejs';

const FALLBACK_LOOKUP_URL =
  'http://n1065v34z9435876yrwcc9mx.213.136.66.81.sslip.io/api/visitors/lookup';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonResponse(payload: LookupResponse, status: number) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  let body: { query?: string };

  try {
    body = (await request.json()) as { query?: string };
  } catch {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Enter an email or phone number.' }, 400);
  }

  const query = cleanText(body.query);
  if (!query) {
    return jsonResponse({ success: false, code: 'VALIDATION', message: 'Enter an email or phone number.' }, 400);
  }

  const registerUrl = process.env.REGISTRATION_API_URL?.trim();
  const backendUrl =
    process.env.REGISTRATION_LOOKUP_API_URL?.trim() ||
    (registerUrl?.endsWith('/register') ? registerUrl.replace(/\/register$/, '/visitors/lookup') : '') ||
    FALLBACK_LOOKUP_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    let data: LookupResponse | null = null;
    try {
      data = (await backendResponse.json()) as LookupResponse;
    } catch {
      data = null;
    }

    if (!backendResponse.ok || !data?.success) {
      return jsonResponse(
        {
          success: false,
          code: data?.code || (backendResponse.status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE'),
          message:
            data?.message ||
            (backendResponse.status === 404
              ? 'No previous record found. Please complete the short form once.'
              : 'We could not look up this visitor right now.'),
        },
        backendResponse.status === 404 ? 404 : 502,
      );
    }

    return jsonResponse(data, 200);
  } catch {
    clearTimeout(timeout);
    return jsonResponse({ success: false, code: 'UNAVAILABLE', message: 'Lookup is temporarily unavailable.' }, 503);
  }
}
