# Quickstart: Owner Authentication

## 1. Environment

Confirm `.env.local` contains non-empty values:

```bash
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
DATABASE_URL=
DATABASE_TEST_URL=
```

Do not print or commit real values. `NEON_AUTH_COOKIE_SECRET` must be at least 32 characters.

## 2. Install F3 Dependency

```bash
npm install @neondatabase/auth@latest
```

## 3. Implement With Tests First

Recommended order:

1. Add auth validation tests for email, password, and display-name inputs.
2. Add owner reconciliation tests against `DATABASE_TEST_URL`.
3. Add Playwright coverage proving `/app` redirects when signed out.
4. Add Neon Auth server/client instances and auth route handler.
5. Add sign-up, sign-in, Google sign-in, sign-out, and `/app` shell.
6. Add `proxy.ts` route protection.
7. Re-run all validation.

## 4. Validation

```bash
npm run lint
npm run typecheck
npm run test:auth
npm run test:db
npm run build
npm run test:e2e
```

## 5. Manual Smoke

```bash
npm run dev
```

Then verify:
- `/auth/sign-up` renders.
- `/auth/sign-in` renders.
- `/app` redirects to `/auth/sign-in` while signed out.
- Email/password signup creates an owner session when Neon Auth is reachable.
- Google sign-in starts the provider flow.
- Sign-out blocks `/app` again.

## 6. Production Follow-Up

Before production launch, configure custom Google OAuth credentials in Neon Auth settings and confirm trusted redirect domains. Development Google OAuth may use Neon's shared credentials.
