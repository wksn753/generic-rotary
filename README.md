# Rotary Club of Nakawa Registration + Attendance

Next.js registration frontend for weekly fellowship and event check-ins.

## Features

- First-time guest registration.
- Returning guest lookup by email or phone.
- Daily attendance admin dashboard.
- Admin password protection with an HttpOnly signed session cookie plus a signed session-token fallback for hosts that reject cookies.
- Attendance search by name, phone, email, club, classification, purpose, or event.
- Paginated admin tables with mobile attendance cards.
- CSV export for the selected date and current search filter.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Required environment variables

```bash
REGISTRATION_API_URL=http://your-backend-domain/api/register
ADMIN_PASSWORD=change-this-strong-admin-password
ADMIN_SESSION_SECRET=change-this-long-random-secret
```

Optional:

```bash
REGISTRATION_LOOKUP_API_URL=http://your-backend-domain/api/visitors/lookup
REGISTRATION_ATTENDANCE_API_URL=http://your-backend-domain/api/attendance
ADMIN_SESSION_HOURS=8
ADMIN_API_KEY=change-this-shared-backend-admin-key
```

`ADMIN_API_KEY` should match the Go backend `ADMIN_API_KEY` if you enable direct backend protection for `/api/attendance`.


## Admin session fix notes

This version fixes immediate logout after sign-in more defensively. The login API still sets the signed HttpOnly cookie, but it also returns the same signed session token to the browser as a fallback. The admin dashboard sends that token as a Bearer token when loading protected admin API data.

That means the admin stays logged in even when a hosting proxy, preview URL, browser policy, or HTTP/HTTPS mismatch rejects the cookie. Protected attendance data still requires a valid signed session, either from the cookie or the Bearer token.

Optional cookie control:

```bash
# Force Secure cookies only when you are sure the site is always HTTPS.
ADMIN_COOKIE_SECURE=true

# Force non-Secure cookies for HTTP/proxy testing.
ADMIN_COOKIE_SECURE=false
```

The `Permissions-Policy: browsing-topics` browser warning is not an auth error. A `next.config.js` header override is included to avoid emitting that unsupported directive from the app.

## Admin

Open `/admin`. Unauthenticated users are sent to `/admin/login`; attendance data is only loaded after a valid admin session is present.
## Backend admin key warning

If the dashboard loads but shows an attendance error, check `ADMIN_API_KEY`. When the Go backend has `ADMIN_API_KEY` set, the frontend deployment must use the exact same value. A backend key mismatch now shows an error on the dashboard instead of clearing the admin session and sending the user back to login.
