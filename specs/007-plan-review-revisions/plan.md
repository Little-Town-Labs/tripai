# Implementation Plan: Plan Review & Pre-Purchase Revisions

**Branch**: `007-plan-review-revisions` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-plan-review-revisions/spec.md`

## Summary

Implement F7 as the authenticated owner review surface for persisted draft trips. The feature loads owner-scoped trip revisions through RLS, renders the current or selected committed version at `/app/plan/[tripId]`, displays progress-ready states when a plan is not ready, and captures unlimited pre-purchase revision requests as `draft` `pre_purchase` revision records. F7 does not run live AI revision jobs, charge through Stripe, expose family share links, or implement scrapbook behavior.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.9 App Router

**Primary Dependencies**: Existing dependencies only: Next.js App Router, React Server Components/Server Actions, `pg`, existing RLS helpers, and Node test runner via `tsx`

**Storage**: Existing Neon Postgres schema: `trips`, `trip_revisions`, `trip_days`, and `stops`. Pending pre-purchase requests are stored as `trip_revisions.kind = 'pre_purchase'` with `status = 'draft'` and `summary` containing the request text.

**Testing**: Add `npm run test:plan-review` with `tsx --test --test-concurrency=1 tests/plan-review/**/*.test.ts`; run `npm run lint`, `npm run typecheck`, `npm run test:plan-review`, `npm run test:generation`, and `npm run build`

**Target Platform**: Server-rendered Next.js owner app, self-hosted Ubuntu CI

**Project Type**: Single Next.js web application

**Performance Goals**: Review page data should load in one owner-scoped DB round trip group; progress-ready shell renders without live provider calls

**Constraints**: Server Actions are directly reachable and must verify auth/authorization; Next.js 16 dynamic route `params` are a Promise; no provider secrets, live AI calls, Stripe, share tokens, or photo storage in F7

**Scale/Scope**: One owner reviewing one draft trip at a time. Version lists are small for MVP family use.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article III: Every Recommendation Is Web-Verified**: Pass. F7 displays persisted verified place ids/badges and route facts without inventing missing data.
- **Article IV: We Suggest, We Never Dictate**: Pass. UI copy keeps revision language advisory.
- **Article V: You Can Change Your Mind**: Pass. Unlimited pre-purchase revision requests and previous-version browsing are the core feature.
- **Article VI: Built for the Moment**: Pass. Review page includes progress-ready status and mobile-responsive itinerary layout.
- **Article VIII: Your Trip Is Private By Default**: Pass. Owner-only page and mutations use RLS and explicit auth checks.
- **Article X: Your Money and Your Memories Are Safe**: Pass. F7 does not touch payments or scrapbook writes; purchased trips refuse pre-purchase revision requests.

## Project Structure

### Documentation (this feature)

```text
specs/007-plan-review-revisions/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── plan-review.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── app/
│       └── plan/
│           └── [tripId]/
│               ├── actions.ts
│               ├── loading.tsx
│               └── page.tsx
├── components/
│   └── plan-review/
│       ├── plan-review.tsx
│       └── revision-request-form.tsx
└── lib/
    └── plan-review/
        ├── service.ts
        └── validation.ts

tests/
└── plan-review/
    ├── service.test.ts
    └── validation.test.ts
```

**Structure Decision**: Keep DB/query behavior in `src/lib/plan-review` so it can be tested independently and reused by F8/F11. Keep the route action beside the page because it is a UI mutation boundary that must re-check auth before calling the domain service.

## Complexity Tracking

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/plan-review.md](contracts/plan-review.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article III** remains satisfied because the review model only displays route/place facts present in persisted rows.
- **Article IV** remains satisfied because request and status copy is advisory, not compulsory.
- **Article V** remains satisfied because pending pre-purchase revision rows preserve the current committed revision pointer.
- **Article VI** remains satisfied because `/app/plan/[tripId]/loading.tsx` and progress-ready states give immediate feedback.
- **Article VIII** remains satisfied because every service function sets `tripai_app` plus owner context and the Server Action verifies current owner.
- **Article X** remains satisfied because purchased trips reject this feature's pre-purchase request path.
