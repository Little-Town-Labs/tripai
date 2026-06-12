# Implementation Plan: F10 Scrapbook Notes and Ratings

**Branch**: `010-scrapbook` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-scrapbook/spec.md`

## Summary

Add the first durable scrapbook surface to the owner trip detail view behind a disabled-by-default feature toggle. The implementation will reuse existing `notes`, `ratings`, and `photo_metadata` tables and RLS policies; expose owner-scoped read/write services for purchased trips; add server actions for note/rating forms; render notes, stop rating summaries, and a truthful deferred-photo section directly inside `/app/trips/[tripId]` when enabled. Binary photo upload, resize/compress, signed URLs, and object storage remain out of scope until a storage provider is selected.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Next.js Server Components/Server Actions, React `useActionState`, Neon Postgres via `pg`, existing owner auth and RLS helpers

**Storage**: Existing Neon Postgres tables: `notes`, `ratings`, `photo_metadata`, `trips`, `trip_days`, `stops`

**Testing**: `node:test` via `tsx --test`, focused DB-backed tests, ESLint, `tsc --noEmit`, Next build

**Target Platform**: Web app, mobile-first owner trip detail route

**Project Type**: Next.js web application with server-rendered owner pages and server-action mutations

**Performance Goals**: Trip detail page remains a single owner-scoped data load plus server-action mutations; no external provider calls in F10.

**Constraints**: Disabled by default via `TRIPAI_SCRAPBOOK_ENABLED`, owner-only, purchased trips only, durable DB write before confirmation, no object upload or fake photo success, large mobile-friendly form controls, no data leakage across owners.

**Scale/Scope**: One active family trip; notes and ratings for the current owner; photo metadata/status display only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: PASS. F10 stores owner scrapbook data with the purchased trip and does not add expiration or subscription behavior.
- **Article II: Your Family Joins Free, No Accounts Needed**: DEFERRED WITH SCOPE. Share-link contribution UI is explicitly F12; F10 remains owner-only and must not block future share-link RLS behavior.
- **Article VI: Built for the Moment**: PASS. Scrapbook UI is first-class in the mobile trip detail surface.
- **Article VIII: Your Trip Is Private By Default**: PASS. Existing owner auth/RLS gates all reads and writes.
- **Article IX: A Living Scrapbook, Not a One-Shot PDF**: PARTIAL PASS WITH DOCUMENTED EXCEPTION. Notes and ratings ship in F10. Photo upload storage remains deferred because no durable object storage provider is selected; the UI must disclose that uploads are unavailable and must not show fake uploaded state.
- **Article X: Your Money and Your Memories Are Safe**: PASS. F10 confirms notes/ratings only after successful DB writes and does not acknowledge photo uploads without storage confirmation.

**Feature Toggle**: `TRIPAI_SCRAPBOOK_ENABLED=1` enables the owner UI/actions. Any other value leaves the scrapbook UI in a coming-soon/read-only state and server actions reject writes.

## Project Structure

### Documentation (this feature)

```text
specs/010-scrapbook/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── scrapbook-service.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/app/trips/[tripId]/
│   └── actions.ts
├── components/trip/
│   ├── scrapbook-panel.tsx
│   ├── note-form.tsx
│   └── rating-form.tsx
└── lib/scrapbook/
    ├── config.ts
    ├── service.ts
    └── validation.ts

tests/
└── scrapbook/
    ├── service.test.ts
    └── validation.test.ts
```

Existing F9 files updated:

```text
src/lib/trip-detail/service.ts
src/components/trip/trip-detail.tsx
src/components/trip/day-section.tsx
src/components/trip/stop-card.tsx
```

**Structure Decision**: Keep durable mutation logic in `src/lib/scrapbook`, keep Next server actions in the route segment, and render scrapbook UI as trip components fed by the trip-detail read model.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Article IX photo upload not fully implemented | Durable object storage is not selected yet | Accepting binary uploads without durable storage would violate Article X and mislead users |
