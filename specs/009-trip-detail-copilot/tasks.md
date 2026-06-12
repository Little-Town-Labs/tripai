# Tasks: F9 Trip Detail View / Co-pilot UX

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/trip-detail-service.md`

## Phase 2.1: Setup

- [x] T001 Add `test:trip-detail` script to `package.json`.
- [x] T002 Update `AGENTS.md` active Spec Kit pointer to `specs/009-trip-detail-copilot/plan.md`.

## Phase 2.2: Tests First

- [x] T003 [P] Add navigation handoff tests in `tests/trip-detail/navigation.test.ts` for coordinate URLs, text fallback URLs, and park official links.
- [x] T004 [P] Add DB service tests in `tests/trip-detail/service.test.ts` for owner access, purchased-trip gate, ordered days/stops, active/current/next stop computation, and not-ready state.

## Phase 2.3: Core Implementation

- [x] T005 Implement deterministic navigation/park link helpers in `src/lib/trip-detail/navigation.ts`.
- [x] T006 Implement `getTripDetail` in `src/lib/trip-detail/service.ts` with existing app-role/owner-context RLS pattern.
- [x] T007 Add the owner route `src/app/app/trips/[tripId]/page.tsx` using async Next 16 `params`, `requireCurrentOwner`, and `getTripDetail`.
- [x] T008 Add `src/app/app/trips/[tripId]/loading.tsx` with a route-level loading state.

## Phase 2.4: UI Implementation

- [x] T009 [P] Add `src/components/trip/trip-detail.tsx` for page shell, not-ready state, active-day/current-next summary, and day list.
- [x] T010 [P] Add `src/components/trip/day-section.tsx` for day route facts and ordered stop rendering.
- [x] T011 [P] Add `src/components/trip/stop-card.tsx` for ETA, details, next-stop context, external handoff actions, and park official links with 44px+ targets.
- [x] T012 [P] Add `src/components/trip/trip-route-overview.tsx` for persisted route overview without live map provider dependency.
- [x] T013 Link purchased plan reviews to `/app/trips/[tripId]` from the existing plan review UI.

## Phase 2.5: Polish & Documentation

- [x] T014 Update `README.md` current state, route list, and validation commands for F9.
- [x] T015 Mark F9 done in `.specify/roadmap.md` only after validation passes.

## Phase 2.6: Validation

- [x] T016 Run `npm run test:trip-detail`.
- [x] T017 Run `npm run lint`.
- [x] T018 Run `npm run typecheck`.
- [x] T019 Run `npm run build`.

## Dependencies

- T003-T004 before T005-T006.
- T005 before T006 and T011.
- T006 before T007 and route rendering validation.
- T009-T012 before T013.
- T014-T015 after implementation and validation.

## Parallel Notes

- T003 and T004 can be authored in parallel.
- T009-T012 are component-scoped and can be implemented in parallel after the service model shape is stable.
