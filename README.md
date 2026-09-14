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


## Attendance memory + club operations

A successful attendance confirmation now stores a 30-day `rotary_attendance_profile` browser cookie containing the attendee's check-in profile. Opening the attendance page again on that device shows a confirmation dialog with the saved details; it never auto-registers. The attendee must tap **Confirm attendance**, and every successful confirmation renews the cookie for another 30 days. **Edit details** restores the profile into the normal form, while **Not me** clears the saved identity for shared devices. Returning attendees with the cookie skip the splash screen so QR check-in stays fast.

The admin dashboard now has dedicated areas for overview analytics, attendance, club members, donations, goals, Rotary projects/finances/invoices, and communications. Communications are only queued from Next.js; scheduling, retrying, visitor alerts and actual Savara Mail sends run in the Go backend.

Set `REGISTRATION_BACKEND_ROOT_URL` when the backend root cannot be reliably derived from `REGISTRATION_API_URL`. The frontend `ADMIN_API_KEY` must match the Go backend value.

## Club operations deployment order

Deploy the updated Go backend before or together with this frontend. The Attendance tab can continue using the legacy `/api/attendance` endpoint, but Overview, Members, Donations, Goals, Projects, and Communications require the newer `/api/admin/*` routes.

For production, point the operations proxy at the backend API root (not an individual endpoint):

```bash
REGISTRATION_API_URL=https://your-backend.example.com/api/register
REGISTRATION_BACKEND_ROOT_URL=https://your-backend.example.com/api
ADMIN_API_KEY=the-exact-same-value-used-by-the-go-backend
```

The proxy also normalizes accidental `/register` or `/attendance` suffixes, but `/api` is the recommended explicit root.

## Communications

The admin Communications tab includes single-recipient mail, bulk audiences, visual reusable templates, live email preview, branding/logo/banner fields, scheduling and delivery history. Custom templates are persisted by the Go backend. Run the backend `migrations/20260914_email_templates.sql` migration before using template storage.
