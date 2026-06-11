# Tasks: Platform Bootstrap

- [x] T001 Move Stripe setup out of pre-implementation gates and into F8 scope.
- [x] T002 Add `.env.example` with Neon, object storage, Anthropic, Google, and Stripe placeholders grouped by feature phase.
- [x] T003 Add `typecheck` script to `package.json`.
- [x] T004 Decide Drizzle/Neon dependency timing and document the decision in this spec.
- [x] T005 Verify personal MVP still passes lint, typecheck, build, and e2e.
- [ ] T006 If Neon credentials are available, validate a non-committed connection check.
- [ ] T007 Update roadmap/checklist when F1 acceptance is actually met.

## Blocked / External

- T006 is blocked until `DATABASE_URL` or `NEON_API_KEY` is available locally. No Neon credentials were present in `.env.local` or the current shell environment during this pass.
- T007 remains open because F1 acceptance requires live Neon project/Auth setup.
