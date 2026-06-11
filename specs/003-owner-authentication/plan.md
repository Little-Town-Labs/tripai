# Implementation Plan: Owner Authentication

**Branch**: `003-owner-authentication` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-owner-authentication/spec.md`

## Summary

Implement production owner authentication for TripAI using Neon Auth with Better Auth. F3 adds the auth SDK, server auth instance, auth route handler, Next.js 16 `proxy.ts` route protection, sign-in/sign-up surfaces, sign-out, session helpers, and owner-record reconciliation so authenticated identities can drive the F2 owner-scoped RLS context. Family share-link recipients remain outside authentication and continue to be deferred to F12.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.9 App Router

**Primary Dependencies**: `@neondatabase/auth`, existing `drizzle-orm`, existing `pg`

**Storage**: Neon Postgres via existing F2 schema; Neon Auth provider data lives in the Neon project

**Testing**: Existing `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `npm run test:db`; add focused unit/integration tests for auth validation and owner reconciliation where provider calls can be mocked

**Target Platform**: Next.js web app on local development and future Vercel deployment

**Project Type**: Single Next.js web application with server route handlers, server actions, and client UI components

**Performance Goals**: Protected route redirects should complete before rendering protected owner content; authenticated app shell should render first meaningful owner surface in under 2 seconds on a median mobile connection

**Constraints**: Do not commit secrets; use Next.js 16 `proxy.ts` rather than legacy middleware naming; do not require accounts for future family share-link recipients; keep owner auth separate from browser-local vacation passcode behavior; route-protection tests must prove no protected data flashes while signed out

**Scale/Scope**: MVP family-trip workload: one active owner session at a time, one owner identity per trip owner, email/password and Google OAuth sign-in only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article II: Your Family Joins Free, No Accounts Needed**: Pass. F3 authenticates only trip owners and explicitly excludes family share-link recipients from account requirements.
- **Article VIII: Your Trip Is Private By Default**: Pass. F3 protects owner routes and maps authenticated identity into the F2 owner access context.
- **Article VI: Built for the Moment**: Pass. Auth screens must be responsive and avoid blocking the future single-trip focus.
- **Article X: Your Money and Your Memories Are Safe**: Pass. F3 does not touch payments or scrapbook writes, but session/owner reconciliation must not misattribute data.
- **Other Articles**: No direct impact. No exception required.

## Project Structure

### Documentation (this feature)

```text
specs/003-owner-authentication/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/auth/[...path]/route.ts
│   ├── auth/sign-in/page.tsx
│   ├── auth/sign-up/page.tsx
│   ├── auth/sign-out/page.tsx
│   ├── app/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/auth/
│   ├── auth-card.tsx
│   ├── google-sign-in-button.tsx
│   ├── sign-in-form.tsx
│   └── sign-up-form.tsx
├── lib/auth/
│   ├── actions.ts
│   ├── client.ts
│   ├── owner.ts
│   ├── server.ts
│   └── validation.ts
├── db/
│   ├── client.ts
│   └── schema.ts
└── lib/access/
    └── context.ts

proxy.ts

tests/
├── auth/
│   ├── owner-reconciliation.test.ts
│   └── validation.test.ts
└── e2e/
    └── auth.spec.ts
```

**Structure Decision**: Keep auth in `src/lib/auth` and route/UI code in the App Router tree. Use a root `proxy.ts` per Next.js 16 conventions so protected owner routes are checked before render. Add tests beside existing `tests/` suites rather than creating a second test runner.

## Complexity Tracking

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/auth-contract.md](contracts/auth-contract.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article II** remains satisfied because the contracts state that `/share/*` and future token access are not protected by owner auth.
- **Article VIII** remains satisfied because `/app/*` is protected by proxy and owner-scoped server helpers require a session.
- **Article VI** remains satisfied because auth pages are responsive and the protected app landing remains a direct single-trip workspace placeholder.
- **Article X** remains satisfied because owner reconciliation is idempotent and avoids creating duplicate owner rows for the same auth identity/email.
