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

Next roadmap feature: F11 Post-purchase and mid-trip revisions.

## Important Boundaries

- Stripe is implemented but disabled by default with `TRIPAI_STRIPE_ENABLED=0`.
- Scrapbook UI/actions are implemented but disabled by default with `TRIPAI_SCRAPBOOK_ENABLED=0`.
- Photo/object upload storage remains deferred; F10 does not accept binary uploads or show fake uploaded state.
- Share-link family access exists in the data/RLS foundation but the user-facing sharing feature is F12.
- Checkout success redirects do not mark trips purchased; only verified Stripe webhooks do.
- Trip detail uses persisted route/place data and outbound navigation links; it does not implement turn-by-turn navigation, live map tiles, or live Disney data.
- Automated provider tests use fakes. Live Google, OpenRouter, and Stripe calls are manual/credential-gated.

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
npm run test:e2e
```

DB-backed suites reset the Neon testing branch. Run DB/auth/feature DB suites sequentially when running locally.

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
