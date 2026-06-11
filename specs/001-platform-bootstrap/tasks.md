# Tasks: Platform Bootstrap

- [x] T001 Move Stripe setup out of pre-implementation gates and into F8 scope.
- [x] T002 Add `.env.example` with Neon, Anthropic, Google, and deferred Stripe/photo placeholders grouped by feature phase.
- [x] T003 Add `typecheck` script to `package.json`.
- [x] T004 Decide Drizzle/Neon dependency timing and document the decision in this spec.
- [x] T005 Verify personal MVP still passes lint, typecheck, build, and e2e.
- [x] T006 If Neon credentials are available, validate a non-committed connection check.
- [x] T007 Update roadmap/checklist when F1 acceptance is actually met.
- [x] T008 Defer photo bucket/object storage selection until F10.

## Validation Notes

- `NEON_API_KEY` was validated with `npx neonctl@latest projects list --output json`; the `tripai` project was visible.
- `DATABASE_URL` was validated with `npx neonctl@latest psql --project-id sparkling-thunder-06034517 -- -c "SELECT 1 AS ok"`; the query returned `1`.
- Neon Auth was validated with `npx neonctl@latest neon-auth status --project-id sparkling-thunder-06034517 --output json`; Better Auth is enabled and the local `NEON_AUTH_BASE_URL` value was populated.
- `NEON_AUTH_COOKIE_SECRET` was generated locally with `openssl rand -base64 32`.
