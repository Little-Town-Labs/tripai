# Data Model: Owner Authentication

## Authenticated Owner Identity

Represents the verified identity returned by Neon Auth.

Fields consumed by TripAI:
- `id`: provider user id; used as the preferred TripAI owner id.
- `email`: verified or provider-returned email; required for owner lookup and display.
- `name`: optional display name.

Validation rules:
- Email must be present before owner reconciliation can create an owner row.
- Provider user id must be stable for a returning owner.

## Owner Session

Represents the active session created by Neon Auth and accepted by TripAI owner routes.

Fields consumed by TripAI:
- `session`: provider session metadata.
- `user`: authenticated owner identity.

State transitions:
- `anonymous` -> `authenticated` after successful signup, email login, or Google OAuth.
- `authenticated` -> `anonymous` after sign-out or expired/invalid session.

Rules:
- Owner-only pages require an authenticated session.
- Server-side app logic must treat missing session as unauthenticated and redirect or reject before owner data access.

## TripAI Owner Record

Existing F2 table: `owners`.

Fields relevant to F3:
- `id`: app owner id, aligned to the authenticated provider user id where possible.
- `email`: owner email, unique.
- `displayName`: owner-facing display name for attribution.
- `createdAt`, `updatedAt`: existing timestamps.

Reconciliation rules:
- If an owner row exists by authenticated user id, return it.
- If no id match exists but the verified email already exists, return that owner and avoid duplicate rows.
- If neither exists, create a new owner row using authenticated id, email, and display name.
- Reconciliation must be idempotent for repeated session checks.

## Auth Error State

Represents safe user-facing auth failures.

Cases:
- `invalid_input`: local validation failed before provider call.
- `invalid_credentials`: provider rejected login.
- `signup_failed`: provider rejected signup.
- `provider_unavailable`: provider call failed or returned an unexpected failure.
- `session_required`: signed-out visitor requested an owner-only route.

Rules:
- Error messages must be actionable but generic.
- Login errors must not reveal whether an email address is registered.
- Internal provider details and tokens must not be rendered or logged to the browser.
