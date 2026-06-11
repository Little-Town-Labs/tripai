# Auth Contract: Owner Authentication

## Routes

### `GET /auth/sign-up`

Purpose: Render owner signup form.

Visible to:
- Anonymous visitors.
- Signed-in owners may be redirected to `/app`.

Acceptance:
- Includes email, password, display name, submit action, and Google sign-in option.
- Does not mention family share-link recipients needing accounts.

### `POST /auth/sign-up` via server action

Purpose: Create an owner auth identity with email/password.

Inputs:
- `name`: required, 2-80 display characters.
- `email`: required, valid email shape.
- `password`: required, at least 8 characters.

Success:
- Creates provider account/session.
- Reconciles TripAI owner record before redirecting to `/app`.

Failure:
- Returns field validation errors or generic signup failure.
- Does not disclose whether an email belongs to another account.

### `GET /auth/sign-in`

Purpose: Render owner sign-in form.

Visible to:
- Anonymous visitors.
- Signed-in owners may be redirected to `/app`.

Acceptance:
- Includes email/password sign-in and Google sign-in.

### `POST /auth/sign-in` via server action

Purpose: Sign in owner with email/password.

Inputs:
- `email`: required, valid email shape.
- `password`: required.

Success:
- Establishes session.
- Reconciles TripAI owner record.
- Redirects to `/app`.

Failure:
- Returns generic sign-in failure.
- Does not disclose whether the email exists.

### `POST /auth/google` via client action

Purpose: Start Google OAuth sign-in.

Success:
- Redirects to provider and then back to `/app`.

Failure:
- Shows generic provider-unavailable copy.

### `GET /auth/sign-out`

Purpose: End the owner session.

Success:
- Signs out the current owner.
- Redirects to `/auth/sign-in`.

## Auth API Proxy

### `/api/auth/[...path]`

Purpose: Proxy Neon Auth API requests and callbacks.

Handlers:
- `GET`
- `POST`

Rules:
- Must not be protected by owner route proxy.
- Must not log secrets or raw provider callback payloads.

## Protected Route Policy

Protected:
- `/app`
- `/app/:path*`
- Future owner-only planning/trip-management routes when introduced.

Unprotected:
- `/`
- `/auth/:path*`
- `/api/auth/:path*`
- Future `/share/:path*` credential-free family routes.

Signed-out behavior:
- Redirect to `/auth/sign-in`.
- Do not render owner data before redirect.

Signed-in behavior:
- Allow route.
- Server components and actions may call the owner-session helper to obtain a reconciled owner context.
