import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'kitende_admin_session';
export const ADMIN_AUTH_HEADER = 'authorization';
const SESSION_VERSION = 'v1';
const DEFAULT_SESSION_HOURS = 8;

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    'kitende-rotary-change-this-admin-session-secret'
  );
}

function getSessionHours() {
  const parsed = Number(process.env.ADMIN_SESSION_HOURS || DEFAULT_SESSION_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_HOURS;
}

function signPayload(expiresAt: number) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(`${SESSION_VERSION}.${expiresAt}`)
    .digest('hex');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSessionValue() {
  const expiresAt = Date.now() + getSessionHours() * 60 * 60 * 1000;
  const signature = signPayload(expiresAt);

  return `${SESSION_VERSION}.${expiresAt}.${signature}`;
}

export function getAdminSessionMaxAgeSeconds() {
  return getSessionHours() * 60 * 60;
}

export function getBearerAdminSession(authorizationHeader?: string | null) {
  if (!authorizationHeader) return '';

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';

  return token.trim();
}

export function isValidAdminSession(value?: string | null) {
  if (!value) return false;

  const [version, expiresAtRaw, signature] = value.split('.');
  const expiresAt = Number(expiresAtRaw);

  if (version !== SESSION_VERSION || !Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Date.now()) return false;

  return safeEqual(signature, signPayload(expiresAt));
}

export function isCorrectAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!expectedPassword) return false;

  return safeEqual(password, expectedPassword);
}
