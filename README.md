# TripAI

TripAI is an AI-powered family road-trip planner built with Next.js 16, Neon Postgres/Auth, Drizzle, and Spec Kit driven development.

Product promise: families pay once for a trip, own it forever, revise it as plans change, and eventually turn it into a living scrapbook.

## Current State

Implemented roadmap features:

- F1 Platform bootstrap: Next.js 16 app, Tailwind, Drizzle, CI, Neon docs.
- F2 Data model and RLS: owner/share-link-aware schema and policy tests.
- F3 Owner authentication: Neon Auth owner sign-up/sign-in and protected owner app.
- F4 Intake wizard: authenticated responsive trip intake with owner-scoped persistence.
- F5 Retrieval layer: Google Places/Routes wrappers, cache keys, fake-provider tests.
- F6 AI generation pipeline: OpenRouter-backed provider contract, grounded planner, validator, narrator, progress events.
- F7 Plan review: owner-only plan page, itinerary display, progress-ready state, pre-purchase revision requests, version browsing.
- F8 Checkout and fulfillment: disabled-by-default Stripe checkout path, one-time Checkout session creation, raw-body webhook verification, webhook-only purchase fulfillment.
- F9 Trip detail co-pilot: owner-only purchased trip view, active day/current-next stop context, persisted route overview, Google Maps/Waze handoffs, park official links.
- F10 Scrapbook notes and ratings: disabled-by-default owner scrapbook surface, durable trip/day/stop notes, stop ratings, photo-storage placeholder.
- F11 Post-purchase and mid-trip revisions: owner revision counts, visited-stop marking, draft candidate controls, preservation-required commits for removed scrapbook content, previous-version restore.
- F12 Credential-free family sharing: owner-created hash-only share links, `/share/[token]` account-free trip view, family notes/ratings with display names, immediate revocation, and owner moderation.
- F13 Data export and deletion ops: internal support commands and runbook for owner-verified trip export and permanent trip deletion.

MVP roadmap implementation is complete through F13; remaining launch work is production/security review and external account gates.

## Important Boundaries

- Stripe is implemented but disabled by default with `TRIPAI_STRIPE_ENABLED=0`.
- Scrapbook UI/actions are implemented but disabled by default with `TRIPAI_SCRAPBOOK_ENABLED=0`.
- Photo/object upload storage remains deferred; F10 does not accept binary uploads or show fake uploaded state.
- Family share links are opt-in, revocable, and store only token hashes. Raw share URLs are returned only when the owner creates a link.
- F11 revision generation currently uses a conservative verified-route candidate seam in the app action path; provider-backed replanning can replace that generator without changing quota, commit, preservation, or restore rules.
- Checkout success redirects do not mark trips purchased; only verified Stripe webhooks do.
- Trip detail uses persisted route/place data and outbound navigation links; it does not implement turn-by-turn navigation, live map tiles, or live Disney data.
- Automated provider tests use fakes. Live Google, OpenRouter, and Stripe calls are manual/credential-gated.
- Data export/deletion is internal only. Use `docs/SUPPORT_DATA_OPS.md` and never print or commit database URLs, raw share tokens, or exported archives.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy environment placeholders:

```bash
cp .env.example .env.local
```

Required local values depend on what you are running:

- `DATABASE_URL`: Neon development database.
- `DATABASE_TEST_URL`: Neon testing branch for DB-backed tests.
- `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`: owner auth.
- `OPENROUTER_API_KEY`: live AI generation smoke only.
- `GOOGLE_MAPS_API_KEY`: live retrieval smoke only.
- `TRIPAI_STRIPE_ENABLED=0`: default checkout-off state.
- `TRIPAI_SCRAPBOOK_ENABLED=0`: default scrapbook-off state.
- `TRIPAI_APP_BASE_URL`: optional absolute base URL for newly created family share links; without it, created links are returned as `/share/{token}`.

Do not commit real `.env.local` values.

## Development

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Primary routes implemented so far:

- `/auth/sign-up`
- `/auth/sign-in`
- `/app`
- `/app/intake`
- `/app/plan/[tripId]`
- `/app/plan/[tripId]/checkout`
- `/app/trips/[tripId]`
- `/share/[token]`
- `/api/stripe/webhook`

## Validation

General checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Focused test commands:

```bash
npm run test:auth
npm run test:db
npm run test:intake
npm run test:retrieval
npm run test:generation
npm run test:plan-review
npm run test:checkout
npm run test:trip-detail
npm run test:scrapbook
npm run test:revisions
npm run test:sharing
npm run test:ops
npm run test:e2e
```

DB-backed suites reset the Neon testing branch. Run DB/auth/feature DB suites sequentially when running locally.

Internal support command:

```bash
npm run ops:trip-data -- export --database-url "$DATABASE_URL" --owner-id "<OWNER_UUID>" --trip-id "<TRIP_UUID>" --output "/secure/path/trip-export.json"
```

See `docs/SUPPORT_DATA_OPS.md` before running export or deletion against any non-test database.

## Spec Kit Workflow

The roadmap is `.specify/roadmap.md`. Feature artifacts live under `specs/NNN-feature-name/`.

Standard flow for each substantial feature:

1. Specify
2. Plan
3. Tasks
4. Analyze
5. Implement with tests first
6. Validate
7. Mark the roadmap only after validation passes
8. Commit, push, open PR
9. After merge, sync `main` and delete merged branches

Before touching Next.js APIs, read the relevant Next 16 docs under `node_modules/next/dist/docs/`; this project intentionally treats Next 16 as different from older training assumptions.

## CI

GitHub Actions runs on the self-hosted `aegis-tripai-ci` runner. Jobs run in a Playwright container. Keep CI checks deterministic and avoid live provider credentials in default test paths.
