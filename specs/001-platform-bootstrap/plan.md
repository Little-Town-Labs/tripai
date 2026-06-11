# Implementation Plan: Platform Bootstrap

## Current Baseline

The app currently has:

- Next.js 16 + React 19.
- Tailwind CSS v4.
- Personal vacation MVP at `src/app/page.tsx`.
- Playwright mobile e2e smoke coverage.
- Neon runbook at `docs/NEON.md`.

## Proposed Changes

1. Add a checked-in env template that documents required variables without secrets.
2. Add a dedicated `typecheck` script so verification does not depend on raw `npm exec`.
3. Keep `test:e2e` as the browser acceptance script.
4. Defer Drizzle/Neon runtime dependencies until F2, when the schema and first migration are implemented.
5. If Neon credentials are available, validate a basic connection outside committed code.
6. Update docs to make Stripe explicitly deferred until F8.
7. Update docs to make photo bucket/object storage explicitly deferred until F10.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

## Risks

- Neon Auth may require console setup that cannot be completed purely from code.
- Installing database dependencies before schema work may create unused code. For this reason, dependency installation is deferred to F2 unless a Neon connection check needs a CLI-only tool.
- Vercel linking may require user account context and should not block local foundation work.
- Photo bucket setup should not block Neon/Auth foundation work.
