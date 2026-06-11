# Research: Owner Authentication

## Decision: Use Neon Auth API-method integration rather than prebuilt UI components

**Rationale**: TripAI needs branded, family-focused login and signup screens, safe generic error copy, and route flows that fit the existing app. Neon's API-method guide supports a custom UI while still using the managed server auth instance, route handler, session methods, and Better Auth methods.

**Alternatives considered**:
- Neon Auth prebuilt UI components: fastest, but less control over user-facing copy and auth page composition.
- Direct Better Auth setup without Neon Auth wrapper: more control, but bypasses the chosen Neon-managed auth provider and creates extra setup surface.

**Sources**:
- https://neon.com/docs/auth/quick-start/nextjs-api-only
- https://neon.com/docs/auth/reference/nextjs-server

## Decision: Use Next.js 16 `proxy.ts` for optimistic owner-route protection

**Rationale**: Next.js 16 replaces the middleware naming convention with `proxy.ts`, and the local Next docs say Proxy is appropriate for redirects based on request data but not slow authorization work. Neon Auth's server SDK exposes `auth.middleware()` for route protection, so F3 will use `proxy.ts` with focused matchers for owner-only routes.

**Alternatives considered**:
- Legacy `middleware.ts`: conflicts with the repo's Next.js 16 instruction and current docs.
- Page-only session checks: useful as defense in depth but can allow avoidable protected-page render work before redirect.

**Sources**:
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- https://neon.com/docs/auth/quick-start/nextjs-api-only

## Decision: Add owner reconciliation behind authenticated server helpers

**Rationale**: F2's `owners` table is the app ownership anchor. Neon Auth creates the auth identity/session, but TripAI still needs an app-level owner record for RLS context and future trip ownership. F3 will add an idempotent helper that maps the authenticated user id/email/name to `owners`, creates the owner row if missing, and returns an owner context for server-side work.

**Alternatives considered**:
- Create owner rows only during signup: misses social login and provider-linking cases.
- Use email alone as owner id: weaker than the provider user id and creates future account-linking ambiguity.

## Decision: Google OAuth is enabled for development, production credentials remain a deployment gate

**Rationale**: Neon documents that Google OAuth is available by default with shared credentials for development/testing, while production should configure custom OAuth app credentials. F3 can implement the Google sign-in UI and callback behavior now, and document production OAuth setup without blocking local MVP progress.

**Alternatives considered**:
- Block F3 until production Google OAuth credentials exist: slows development without improving the local owner-auth implementation.
- Email/password only: does not satisfy the roadmap requirement for Google OAuth.

**Source**:
- https://neon.com/docs/auth/guides/setup-oauth

## Decision: Keep auth tests mostly local and provider-mocked, with E2E smoke around route behavior

**Rationale**: Real OAuth cannot be reliably exercised in CI without external credentials and browser/provider interaction. F3 should unit-test input validation and owner reconciliation, mock provider calls for server actions, and use Playwright to prove signed-out protected-route redirect behavior.

**Alternatives considered**:
- Full live provider E2E: brittle and credential-heavy for the current self-hosted runner.
- No auth tests until provider is live: violates the project's TDD expectation and leaves route protection unverified.
