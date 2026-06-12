<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- SPECKIT START -->
For active Spec Kit work, read the current roadmap in `.specify/roadmap.md`.
There is no active feature branch at this handoff point; start by checking `.specify/roadmap.md` and the production MVP notes before opening new Spec Kit work.
The latest completed feature plan is `specs/013-export-delete-ops/plan.md`.
<!-- SPECKIT END -->

<!-- MVP HANDOFF START -->
Current production app: `https://tripai-theta-nine.vercel.app`.

Recent operational notes:

- PR #16 generalized `/app/intake` away from Florida-specific wording and hardened Neon Auth email form error handling.
- Owner auth uses Neon Auth with Better Auth. App `owners` rows do not create login credentials; login users live in `neon_auth."user"` and related auth tables.
- Deployed owner auth also requires adding the Vercel origin to Neon Auth's branch-level trusted domain allowlist. The production branch currently allows `https://tripai-theta-nine.vercel.app`.
- If signup says "User already exists" after app-table cleanup, delete/reset the Neon Auth user as well as any matching `public.owners` row before retrying.
- Stripe remains feature-toggled off with `TRIPAI_STRIPE_ENABLED=0`; scrapbook remains feature-toggled off with `TRIPAI_SCRAPBOOK_ENABLED=0`; photo bucket/object upload storage is still deferred.

Before resuming coding:

- Verify `git status -sb`; the expected baseline after PR #16 cleanup was clean `main` at merge commit `161b921e61bc76e0adab0d7e84fbe7ddc4e45009`.
- Read relevant Next.js 16 docs in `node_modules/next/dist/docs/` before touching Next APIs.
- Keep DB-backed tests that reset the Neon testing branch sequential.
<!-- MVP HANDOFF END -->
