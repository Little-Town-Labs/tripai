# Implementation Plan: F11 Post-purchase and Mid-trip Revisions

**Branch**: `011-mid-trip-revisions` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-mid-trip-revisions/spec.md`

## Summary

Build owner-only post-purchase revision controls for purchased trips. The implementation will add validation and service-layer revision operations for request, candidate review, commit, visited-stop marking, preservation decisions, and previous-version restore. It will reuse the existing `trip_revisions`, revision counters, checked stops, generation grounding contract, scrapbook contribution detection, and trip detail route. The first delivered slice uses deterministic service tests and a replaceable revision generator seam so the behavior can be validated without calling OpenRouter or Google providers in local tests.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Next.js, React, Drizzle schema types, `pg`, Neon Auth owner guard, existing generation/retrieval validation contracts

**Storage**: Neon Postgres via existing `trips`, `trip_revisions`, `trip_days`, `stops`, `notes`, `ratings`, and `photo_metadata` tables

**Testing**: `node:test` via `tsx --test`, DB-backed Neon testing branch tests, ESLint, `tsc --noEmit`, Next build

**Target Platform**: Web app, mobile-first owner trip detail route

**Project Type**: Next.js web application with server-rendered owner pages and server actions

**Performance Goals**: Trip detail revision controls render with the existing trip detail data load; non-generating actions complete with one transaction and no external provider calls.

**Constraints**: Owner-only in F11, purchased-trip gate, no share-link revision access, no paid top-up checkout, no ungrounded itinerary facts, no scrapbook data loss, current itinerary unchanged until explicit commit, mobile-friendly 44px controls.

**Scale/Scope**: One active family trip at a time; one revision service, one validation module, server actions for trip detail, focused UI additions, and DB-backed tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: PASS. F11 modifies purchased trip versions without adding subscriptions or expiration.
- **Article III: Every Recommendation Is Web-Verified**: PASS. Revision candidates must come through the same grounded generation/validation contract as initial plans; tests use fakes only behind the service seam.
- **Article IV: We Suggest, We Never Dictate**: PASS. Revision request UI and copy stay advisory and owner-controlled.
- **Article V: You Can Change Your Mind**: PASS. This feature directly implements two planning rounds, three mid-trip rounds, future-stop-only mid-trip changes, and restore of the previous version.
- **Article VI: Built for the Moment**: PASS. Revision controls live in the mobile-first trip detail surface with glanceable counts and large controls.
- **Article VIII: Your Trip Is Private By Default**: PASS. F11 remains owner-only through existing auth/RLS context.
- **Article IX: A Living Scrapbook**: PASS. Removed-stop contribution detection and preservation decisions are required before commit.
- **Article X: Your Money and Your Memories Are Safe**: PASS. Counts change only after durable commit; scrapbook preservation happens in the same transaction as revision commit.

## Project Structure

### Documentation (this feature)

```text
specs/011-mid-trip-revisions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── revision-service.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/app/trips/[tripId]/
│   ├── actions.ts
│   └── page.tsx
├── components/trip/
│   ├── day-section.tsx
│   ├── revision-panel.tsx
│   ├── stop-card.tsx
│   └── trip-detail.tsx
├── lib/revisions/
│   ├── config.ts
│   ├── service.ts
│   └── validation.ts
└── lib/trip-detail/
    └── service.ts

tests/
├── revisions/
│   ├── service.test.ts
│   └── validation.test.ts
└── trip-detail/
    └── service.test.ts
```

**Structure Decision**: Keep revision business rules in `src/lib/revisions` and keep the route as a thin authenticated trip detail entry point. Reuse F9/F10 trip components so the in-trip surface remains one screen, not a separate dashboard.

## Complexity Tracking

No constitution violations or unusual complexity are required.
