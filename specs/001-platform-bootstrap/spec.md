# Feature Spec: Platform Bootstrap

**Status:** Specified
**Roadmap item:** F1 Platform bootstrap
**Scope owner:** Production foundation after the personal vacation MVP

## User Need

TripAI needs a real foundation so future features can move from browser-local prototype state toward a production app with database-backed ownership and login.

This feature establishes the project baseline for Neon Postgres, Neon Auth, environment setup, test scripts, and deployment readiness without introducing Stripe or paid ownership yet.

## Scope

### In Scope

- Documented local environment setup for Neon Postgres and Neon Auth.
- Application configuration prepared for `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`.
- Dependency choices for Drizzle and Neon connectivity.
- A repository-level validation baseline: lint, typecheck, build, and Playwright e2e.
- Preservation of the personal vacation MVP as the current usable surface.
- A clear implementation path from local passcode login to Neon Auth.
- Neon CLI/MCP setup instructions remain linked from `docs/NEON.md`.

### Out of Scope

- Stripe checkout or payment setup.
- Full data model and RLS policy implementation. That belongs to F2.
- Production owner auth UI. That belongs to F3.
- Google Places/Directions integrations.
- Claude generation.
- Photo/object storage selection and implementation. That belongs to F10.

## Functional Requirements

- FR-001: The app SHALL keep the personal vacation MVP functional while foundation work is added.
- FR-002: The repo SHALL define the environment variables required for Neon database and auth setup.
- FR-003: The repo SHALL include or retain scripts for lint, typecheck, build, and e2e verification.
- FR-004: The repo SHALL document how an agent/developer connects to Neon with Neon CLI and MCP.
- FR-005: The foundation SHALL not require Stripe credentials or Stripe project setup.
- FR-006: The foundation SHALL not store secrets in committed files.
- FR-007: The foundation SHALL prepare for Drizzle migrations without requiring the full F2 schema yet.
- FR-008: The foundation SHALL keep Next.js 16 conventions aligned with local `node_modules/next/dist/docs/`.
- FR-009: The foundation SHALL not require photo bucket/object storage configuration.

## Success Criteria

- A new developer can read the docs and know how to configure Neon locally.
- The personal MVP still passes lint, typecheck, build, and e2e checks.
- Stripe is not required to run or verify the app.
- The next feature, F2 Data model & RLS policies, has an explicit place to add schema and migrations.
- The local environment has validated Neon API access, database connectivity, and Neon Auth status without committing secrets.

## Open Questions

- Which Neon project and branch names should be used for development and production?
- Should Vercel project linking happen in F1, or after Neon Auth is integrated in F3?

## Decisions

- Stripe setup is deferred until F8 and does not block F1.
- Drizzle and Neon runtime dependencies are deferred until F2 unless a live connection check requires a temporary CLI-only path.
- Photo bucket/object storage selection is deferred until F10 and does not block F1.
- F1 uses the existing Neon `tripai` project (`sparkling-thunder-06034517`) and defers runtime database dependencies until F2 schema work.
