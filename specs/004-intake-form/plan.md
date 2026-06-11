# Implementation Plan: Intake Form

**Branch**: `004-intake-form` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-intake-form/spec.md`

## Summary

Implement the first authenticated product workflow: a protected, responsive, multi-step trip intake wizard that captures the family's road-trip planning inputs and saves them as an owner-scoped draft. F4 reuses the existing `trip_intakes` table and RLS policies from F2, the owner session helpers from F3, and Next.js 16 Server Actions for final persistence. The interactive wizard is isolated in a small client component; validation and persistence live in server-side helpers so owner checks and RLS context are enforced on every mutation.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.9 App Router

**Primary Dependencies**: Existing `next`, `react`, `drizzle-orm`, `pg`, `@neondatabase/auth`; no new runtime dependency planned

**Storage**: Existing Neon Postgres `trip_intakes` table with F2 RLS policies and owner context

**Testing**: Existing `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:db`, `npm run test:auth`, `npm run test:e2e`; add focused intake validation/service tests and F4 Playwright coverage

**Target Platform**: Next.js web app on local development, self-hosted CI, and future Vercel deployment

**Project Type**: Single Next.js web application with App Router pages, Server Actions, and client UI components

**Performance Goals**: Intake page first meaningful content under 2 seconds on a median mobile connection; step transitions feel immediate; final save completes or returns actionable failure without discarding entered answers

**Constraints**: Read relevant Next.js 16 docs before touching App Router or Server Actions; verify authentication and authorization inside the save Server Action; do not commit secrets; preserve future anonymous/purchase compatibility but prioritize signed-in-owner MVP; do not add Stripe or photo storage

**Scale/Scope**: One active family trip draft per owner is the primary MVP workflow, but storage may allow multiple drafts; F4 covers intake capture and draft persistence only, not AI generation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article VI: Built for the Moment**: Pass. F4 is explicitly responsive on desktop and mobile and keeps the planning flow focused on one active trip.
- **Article VIII: Your Trip Is Private By Default**: Pass. F4 is owner-only and saves drafts through owner-scoped RLS context.
- **Article IV: We Suggest, We Never Dictate**: Pass. Intake labels must treat answers as planning preferences, not commands.
- **Article III: Every Recommendation Is Web-Verified**: Pass. F4 only captures input and makes no recommendations, venue claims, or drive-time claims.
- **Article II: Your Family Joins Free, No Accounts Needed**: Pass. F4 is owner-only; future share-link family recipients remain outside this flow.
- **Article X: Your Money and Your Memories Are Safe**: Pass. F4 does not touch money or scrapbook writes; save success must only appear after database persistence succeeds.

## Project Structure

### Documentation (this feature)

```text
specs/004-intake-form/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
│   └── app/
│       ├── page.tsx
│       └── intake/
│           ├── actions.ts
│           └── page.tsx
├── components/
│   └── intake/
│       ├── intake-wizard.tsx
│       └── intake-fields.tsx
├── db/
│   ├── client.ts
│   └── schema.ts
└── lib/
    ├── access/
    │   └── context.ts
    ├── auth/
    │   └── owner.ts
    └── intake/
        ├── service.ts
        └── validation.ts

tests/
├── intake/
│   ├── service.test.ts
│   └── validation.test.ts
└── e2e/
    └── intake.spec.ts
```

**Structure Decision**: Keep the protected route under the existing `/app` owner workspace, put interactive wizard components in `src/components/intake`, and keep server-only validation/persistence in `src/lib/intake`. This mirrors F3's separation of route UI, client forms, server actions, and server helpers while avoiding a second app architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/intake-contract.md](contracts/intake-contract.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article VI** remains satisfied because the wizard contract includes mobile and desktop acceptance coverage.
- **Article VIII** remains satisfied because the save contract requires an authenticated owner and owner-scoped database context.
- **Article IV** remains satisfied because the UI contract frames answers as preferences and avoids compulsory trip instructions.
- **Article III** remains satisfied because F4 creates no recommendations or factual venue claims.
- **Article II** remains satisfied because family share-link recipients are not routed through intake authentication.
- **Article X** remains satisfied because success is only returned after database persistence succeeds.
