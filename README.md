# CybrDial

CybrDial is a cloud communications application built with Next.js App Router,
TypeScript, Tailwind CSS, Prisma, PostgreSQL/Supabase, and Twilio. It provides
JWT session authentication, contact management, browser-based Voice/WebRTC
calls, SMS conversations, call history, voicemail handling, and a Cyber-Dark
command center interface.

## Requirements

- Node.js 20 or later
- PostgreSQL, with a Supabase database recommended
- A Twilio account with Voice and SMS enabled
- Twilio credentials and public HTTPS webhook URLs for live integrations

## Technical Architecture

- **Next.js App Router:** Server and client components, protected route groups,
  server-side authentication checks, and dynamic API routes.
- **TypeScript and Tailwind CSS:** Strict typing and a responsive dark command
  center interface.
- **Prisma ORM and Supabase PostgreSQL:** Relational models for `User`,
  `Contact`, `CallLog`, and `Message`, including user-scoped relations and
  performance-critical indexes.
- **Supabase poolers:** `DATABASE_URL` uses the Transaction Pooler on port
  `6543` with `pgbouncer=true`; `DIRECT_URL` uses the Session Pooler on port
  `5432` for schema operations such as `db push` and migrations.
- **Twilio Voice:** `@twilio/voice-sdk` registers the browser device and handles
  incoming/outgoing calls, mute, DTMF, and call state events. The server creates
  signed Voice access tokens and TwiML responses.
- **Twilio SMS:** The server creates outbound SMS records before invoking
  Twilio, receives delivery callbacks, and processes inbound messages with
  signatures and Account SID verification.
- **Webhook security:** Incoming SMS and Voice webhooks validate the Twilio
  signature, URL-encoded content type, exact allowed paths, public URL, and
  `AccountSid` before database operations.

## Database Models

The Prisma schema includes:

- `User`: session and Twilio ownership information.
- `Contact`: a user-scoped phone directory entry.
- `CallLog`: inbound and outbound call state, SID, caller, duration, and timestamps.
- `Message`: inbound and outbound SMS state and Twilio message SID.
- Composite and unique indexes for user/contact queries, call SIDs, and message SIDs.

Use `npx prisma db push` to apply the current schema. The project does not
currently include a formal migration history, so keep schema changes reviewed
and synchronized carefully.

## Local Installation

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Configure PostgreSQL/Supabase:
   - `DATABASE_URL`: Transaction Pooler, port `6543`
   - `DIRECT_URL`: Session Pooler, port `5432`
   - Both URLs must use the exact pooler host and credentials from the Supabase dashboard.

4. Generate a private `AUTH_SECRET` of at least 32 bytes and configure the
   Twilio credentials listed in `.env.example`.

5. Generate Prisma Client and apply the database schema:

```bash
npm run db:generate
npx prisma db push
```

6. Configure a demo password of 12 to 72 bytes and seed the demo account:

```bash
DEMO_USER_PASSWORD="choose-your-own-secure-password" npx prisma db seed
```

The seed creates or updates `agent@cybrdial.io` and assigns
`TWILIO_PHONE_NUMBER` as the demo user's Twilio number. The password is not
included in the repository and must be supplied locally.

7. Start the development server:

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

## Environment Variables

See `.env.example` for the complete template. The required variables include:

- `DATABASE_URL`: Supabase Transaction Pooler URL.
- `DIRECT_URL`: Supabase Session Pooler URL.
- `AUTH_SECRET`: Secret used to sign and verify JWT sessions.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`: Twilio account credentials.
- `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`: Twilio API key credentials.
- `TWILIO_TWIML_APP_SID`: Voice TwiML application SID.
- `TWILIO_PHONE_NUMBER`: Voice and SMS number assigned to the demo or target user.
- `APP_URL`: Public HTTPS base URL used by Twilio webhooks and callbacks.
- `NEXT_PUBLIC_APP_URL`: Temporary fallback only; prefer `APP_URL`.
- `ALLOWED_CALL_PREFIXES`: Comma-separated E.164 prefixes such as `+1,+57`.
- `MAX_OUTBOUND_CALLS_PER_DAY`: Per-user outbound call limit.
- `REGISTRATION_INVITE_CODE`: Private code required to register an account.
- `DEMO_USER_PASSWORD`: Local-only password used by `prisma db seed`.

Never commit `.env` or real credentials. URL-encode reserved characters in
database passwords and use TLS in production.

## Public HTTPS and Twilio Tunnels

For local end-to-end Voice and SMS testing, expose port `3000` through a public
HTTPS tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set `APP_URL` to the HTTPS tunnel URL before starting Next.js. Configure
Twilio with these public callback paths:

- Incoming Voice: `POST /api/webhooks/voice/incoming`
- Outbound Voice: `POST /api/webhooks/voice/outbound`
- Voice status callbacks: `POST /api/webhooks/voice/status`
- Incoming SMS: `POST /api/webhooks/sms/incoming`
- SMS status callbacks: `POST /api/webhooks/sms/status`

Keep the public URL stable while testing. `NEXT_PUBLIC_APP_URL` is retained only
as a temporary compatibility fallback and emits an obsolescence warning.

## Embeddable Widget (RingCentral-style)

### How to integrate in any website

Add the CybrDial widget to an external HTTPS website with:

```html
<script
  src="https://TU-DOMINIO/widget.js"
  data-position="right"
  data-theme="dark"
  data-open="false"
></script>
```

The script attributes are:

- `data-position="right|left"`: Dock position.
- `data-theme="dark|light"`: Initial iframe theme hint.
- `data-open="true|false"`: Open or minimize the widget after loading.

### Dialer controls

The widget Dialer supports:

- A visible `+` button for adding an international E.164 prefix.
- On-screen `0-9`, `*`, and `#` keys.
- A backspace button for deleting the last character.
- Physical keyboard input for `0-9`, `*`, `#`, `+`, and `Backspace`.
- DTMF tones for `0-9`, `*`, and `#` when a call is active.

The physical keyboard handler is scoped to the widget Dialer and skips other
inputs, textareas, selects, and editable fields, including Messages and Contacts
search fields.

Control the widget from the host page through `window.CybrDialWidget`:

```js
window.CybrDialWidget.open();
window.CybrDialWidget.minimize();
window.CybrDialWidget.close();
window.CybrDialWidget.dial("+573002061209");
```

The iframe posts structured `cybrdial:*` events to the host, including
`ready`, `call-state`, `auth-state`, and `error`. The script validates the
message origin and iframe source before dispatching events.

Set `WIDGET_ALLOWED_ORIGINS` to a comma-separated allowlist of external origins:

```env
WIDGET_ALLOWED_ORIGINS="https://client.example.com,https://portal.example.com"
```

In production, the fallback allows only `frame-ancestors 'self'`; localhost is
allowed only when `NODE_ENV !== "production"`.

### Local widget demo

Start CybrDial locally, then open:

```text
http://localhost:3000/widget-demo.html
```

The demo includes open/minimize/close/dial buttons and an event log. Because
the same origin is used by the demo and widget, no additional
`WIDGET_ALLOWED_ORIGINS` entry is required for the local test.

For testing from another HTTPS origin or port, place that exact origin in
`WIDGET_ALLOWED_ORIGINS`, restart Next.js, and ensure the browser is allowed
to access the microphone inside the iframe. User gestures are required for

### Login and return to the widget

For widget authentication, open the login page with:

```text
http://localhost:3000/login?next=/widget
```

After a successful login or registration, CybrDial redirects to `/widget`
instead of `/dashboard`. From `/widget`, open `/widget-demo.html` to test the
embeddable host page. The login screen also retains `/dashboard` as the default
destination when `next=/widget` is not provided. User gestures are required for
microphone access, and Safari or Firefox privacy settings may block third-party
cookies even when `SameSite=None; Secure` is configured.

## Application Routes

- `POST /api/auth/register`: Create an invited account.
- `POST /api/auth/login`: Authenticate and create an HTTP-only session cookie.
- `GET /api/auth`: Inspect the current session.
- `DELETE /api/auth`: Revoke the session and clear the cookie.
- `GET` and `POST /api/contacts`: List and create authenticated user contacts.
- `GET`, `PATCH`, and `DELETE /api/contacts/:contactId`: Manage one contact.
- `GET /api/messages?contactId=...`: Load an authenticated conversation.
- `POST /api/messages/send`: Send an SMS through Twilio.
- `POST /api/token`: Issue a Voice access token for the authenticated user.
- `/dashboard`, `/dashboard/calls`, `/contacts`, and `/messages`: Protected
  Command Center pages.

## Production Build

Validate and build the application with:

```bash
npx prisma validate
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

For a local production test:

```bash
npm run build && npm run start
```

Next.js normally serves the production application at `http://localhost:3000`.

## Trial Account Testing

In a Twilio Trial account:

- Outbound calls to unverified destination numbers may require Twilio upgrade
  and can be rejected with a Trial-related upgrade notice.
- Free-form SMS sends may return Twilio error code `572006`, which relates to
  template/approval restrictions on Trial or restricted messaging setups.

CybrDial handles both responses with controlled Spanish API errors, records
the SMS or call state where applicable, and does not expose credentials or
Twilio secrets to the browser.

## Known Limitations

- Rate limiting is in-memory and only provides effective protection for a
  single application instance. Use Redis or Upstash for multi-instance deployments.
- The schema is currently applied with `db push`; formal versioned migrations
  are not yet established.
- `bcryptjs` runs as a pure JavaScript implementation.
- Next.js 15 is maintained as the project runtime for this delivery. Future
  major upgrades require a planned migration.
- Next.js 15's nested PostCSS dependency has known high-severity audit findings;
  they should be resolved during a future Next.js migration.

## Validation and Delivery

The repository includes strict TypeScript checking, ESLint, Vitest, Next.js
production builds, Prisma schema validation, secure session revocation,
webhook signature verification, and CI configuration for type, lint, test,
build, and critical dependency audit checks.
