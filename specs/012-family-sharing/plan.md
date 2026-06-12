# Implementation Plan: F12 Credential-free Family Sharing

**Branch**: `012-family-sharing` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-family-sharing/spec.md`

## Summary

Build account-free family sharing for purchased trips using the existing `share_links` table, hashed token helpers, and token-scoped RLS policies. The implementation will add an owner sharing service for create/list/revoke/moderate, a share-token service for read/contribute, a `/share/[token]` route that renders itinerary and scrapbook content without owner/payment fields, and server actions for owner management and family notes/ratings. Binary photo upload remains deferred; shared users see the existing photo-storage placeholder/status only.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Next.js, React, `pg`, existing Neon Auth owner guard, existing RLS helpers, existing trip-detail/scrapbook components where safe to reuse

**Storage**: Neon Postgres via existing `share_links`, `trips`, `trip_revisions`, `trip_days`, `stops`, `notes`, `ratings`, and `photo_metadata` tables

**Testing**: `node:test` via `tsx --test`, DB-backed Neon testing branch tests, existing RLS share tests, ESLint, `tsc --noEmit`, Next build

**Target Platform**: Web app with owner authenticated route and public token route

**Project Type**: Next.js web application with server-rendered owner and share pages plus server actions

**Performance Goals**: Shared trip page renders from one transaction and no external provider calls; share-link revocation is reflected on the next request/action without cache delay.

**Constraints**: No account required for family; no owner PII/payment fields in shared output; raw token returned only at creation; token stored hashed; share-token actions use RLS context; photo binary upload deferred; mobile-first shared trip UI; no revision controls exposed to share users.

**Scale/Scope**: One active family trip at a time; one owner sharing panel, one public shared trip route, note/rating contribution, revocation, and owner moderation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: PASS. Sharing is owner-controlled and deletion semantics remain owner authority.
- **Article II: Your Family Joins Free, No Accounts Needed**: PASS. F12 directly implements credential-free share links, view + contribute, display-name attribution, and owner moderation.
- **Article III: Every Recommendation Is Web-Verified**: PASS. Shared view displays already persisted grounded itinerary data and does not generate new recommendations.
- **Article IV: We Suggest, We Never Dictate**: PASS. Shared view preserves advisory itinerary copy and does not lock family members into actions.
- **Article VI: Built for the Moment**: PASS. Shared trip is a mobile-first in-trip surface with itinerary, handoffs, and scrapbook contribution on the same page.
- **Article VII: We Complement, We Don't Replace**: PASS. Shared stop cards keep external Google Maps/Waze handoffs and no turn-by-turn navigation.
- **Article VIII: Your Trip Is Private By Default**: PASS. Links are opt-in, revocable, token-secret, and shared data excludes owner PII/payment fields.
- **Article IX: A Living Scrapbook**: PASS. Share users can add notes and ratings with display-name attribution; photo upload remains truthfully deferred.
- **Article X: Your Money and Your Memories Are Safe**: PASS. Contributions are confirmed only after database writes; no payment fields are exposed to shared users.

## Project Structure

### Documentation (this feature)

```text
specs/012-family-sharing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sharing-service.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── app/trips/[tripId]/actions.ts
│   └── share/[token]/
│       ├── actions.ts
│       └── page.tsx
├── components/trip/
│   ├── share-panel.tsx
│   ├── shared-trip-detail.tsx
│   ├── shared-note-form.tsx
│   └── shared-rating-form.tsx
└── lib/sharing/
    ├── service.ts
    └── validation.ts

tests/
└── sharing/
    ├── service.test.ts
    └── validation.test.ts
```

**Structure Decision**: Keep owner management and token access rules in `src/lib/sharing`; keep shared route actions under `/share/[token]`; reuse trip components only where they do not import owner-only actions or expose owner controls.

## Complexity Tracking

No constitution violations or unusual complexity are required.
