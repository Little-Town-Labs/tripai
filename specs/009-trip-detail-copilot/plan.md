# Implementation Plan: F9 Trip Detail View / Co-pilot UX

**Branch**: `009-trip-detail-copilot` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-trip-detail-copilot/spec.md`

## Summary

Build the owner-only purchased-trip co-pilot route at `/app/trips/[tripId]`. The implementation will read the trip's current revision through the existing Neon/RLS owner context, shape days/stops into a mobile-first route model, generate Google Maps/Waze outbound handoff links from persisted stop data, expose official park links for park stops, and render a glanceable in-trip UI. No live map provider, turn-by-turn navigation, live Disney data, or photo/scrapbook upload work is included in F9.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Next.js, React, Drizzle schema types, `pg`, Neon Auth owner guard

**Storage**: Neon Postgres via existing schema: `trips`, `trip_revisions`, `trip_days`, `stops`

**Testing**: `node:test` via `tsx --test`, ESLint, `tsc --noEmit`, Next build

**Target Platform**: Web app, mobile-first in-trip owner route

**Project Type**: Next.js web application with server-rendered owner pages

**Performance Goals**: First meaningful trip detail render under 2 seconds on a median mobile connection using one server-side data fetch and no live provider calls.

**Constraints**: Owner-only by default, purchased-trip gate, no live turn-by-turn navigation, no live Disney data, no photo storage, 44px minimum touch targets, high-contrast UI, no invented route facts.

**Scale/Scope**: One active family trip at a time; one trip detail route, one data service, focused tests and UI components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: PASS. F9 exposes purchased trips after F8 fulfillment and does not add subscription gates.
- **Article III: Every Recommendation Is Web-Verified**: PASS. F9 only displays persisted route/place data produced by earlier verified pipeline work; it does not generate new facts.
- **Article VI: Built for the Moment**: PASS. F9 is mobile-first, current/next-stop oriented, high contrast, and large target focused.
- **Article VII: We Complement, We Don't Replace**: PASS. F9 uses external Google Maps/Waze handoffs and official park links; it does not implement navigation or live park operations.
- **Article VIII: Your Trip Is Private By Default**: PASS. F9 remains owner-only and uses existing owner auth/RLS context.
- **Article IX: A Living Scrapbook, Not a One-Shot PDF**: PASS WITH DEFERRED SCOPE. F9 does not implement notes/ratings/photos UI. F10 owns the first-class scrapbook surface.
- **Article X: Your Money and Your Memories Are Safe**: PASS. F9 reads F8 purchase state and performs no money or media writes.

## Project Structure

### Documentation (this feature)

```text
specs/009-trip-detail-copilot/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── trip-detail-service.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/app/trips/[tripId]/
│   ├── loading.tsx
│   └── page.tsx
├── components/trip/
│   ├── day-section.tsx
│   ├── stop-card.tsx
│   ├── trip-detail.tsx
│   └── trip-route-overview.tsx
└── lib/trip-detail/
    ├── navigation.ts
    └── service.ts

tests/
└── trip-detail/
    ├── navigation.test.ts
    └── service.test.ts
```

**Structure Decision**: Keep the route inside the existing authenticated owner workspace (`/app/...`) and keep business logic in `src/lib/trip-detail` so the page remains a thin Next.js server component.

## Complexity Tracking

No constitution violations or unusual complexity are required.
