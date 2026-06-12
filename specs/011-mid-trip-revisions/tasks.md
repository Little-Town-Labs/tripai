# Tasks: F11 Post-purchase and Mid-trip Revisions

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/revision-service.md`

## Phase 1: Setup

- [x] T001 Add `test:revisions` script to `package.json`
- [x] T002 Confirm no new environment variables are required and document that in `.env.example`
- [x] T003 Confirm `AGENTS.md` active Spec Kit pointer is `specs/011-mid-trip-revisions/plan.md`

## Phase 2: Tests First

- [x] T004 [P] Add revision validation tests in `tests/revisions/validation.test.ts`
- [x] T005 [P] Add DB-backed revision service tests in `tests/revisions/service.test.ts` for quotas, owner denial, visited-stop preservation, preservation-required commit blocking, preservation commit behavior, and previous restore
- [x] T006 [P] Extend trip detail service tests in `tests/trip-detail/service.test.ts` for revision panel counts and checked stop state

## Phase 3: User Story 1 - Post-purchase Planning Revision

- [x] T007 [US1] Implement revision request validation in `src/lib/revisions/validation.ts`
- [x] T008 [US1] Implement revision constants and mode helpers in `src/lib/revisions/config.ts`
- [x] T009 [US1] Implement `getRevisionPanel` and planning quota derivation in `src/lib/revisions/service.ts`
- [x] T010 [US1] Implement `requestTripRevision` planning-mode draft creation in `src/lib/revisions/service.ts`
- [x] T011 [US1] Add planning revision server action in `src/app/app/trips/[tripId]/actions.ts`

## Phase 4: User Story 2 - Mid-trip Future-stop Revision

- [x] T012 [US2] Implement `markStopVisited` in `src/lib/revisions/service.ts`
- [x] T013 [US2] Implement mid-trip request guards and checked-stop retention contract in `src/lib/revisions/service.ts`
- [x] T014 [US2] Add visited stop and mid-trip revision server actions in `src/app/app/trips/[tripId]/actions.ts`
- [x] T015 [US2] Thread checked stop controls through `src/components/trip/stop-card.tsx`

## Phase 5: User Story 3 - Scrapbook Preservation on Removed Stops

- [x] T016 [US3] Implement removed contribution aggregation in `src/lib/revisions/service.ts` using existing `src/db/revisions.ts`
- [x] T017 [US3] Implement preservation-decision validation and commit blocking in `src/lib/revisions/service.ts`
- [x] T018 [US3] Implement contribution preservation and candidate commit transaction in `src/lib/revisions/service.ts`
- [x] T019 [US3] Add preservation decision fields to revision server actions in `src/app/app/trips/[tripId]/actions.ts`

## Phase 6: User Story 4 - Browse and Restore Previous Version

- [x] T020 [US4] Implement previous-version lookup in `src/lib/revisions/service.ts`
- [x] T021 [US4] Implement `restorePreviousRevision` in `src/lib/revisions/service.ts`
- [x] T022 [US4] Add restore server action in `src/app/app/trips/[tripId]/actions.ts`

## Phase 7: Trip Detail UI Integration

- [x] T023 [US1] Extend `getTripDetail` in `src/lib/trip-detail/service.ts` to include revision panel data
- [x] T024 [US1] Add `RevisionPanel` component in `src/components/trip/revision-panel.tsx`
- [x] T025 [US1] Render revision counts, request forms, candidate warnings, and restore controls in `src/components/trip/trip-detail.tsx`
- [x] T026 [US2] Ensure `src/components/trip/day-section.tsx` passes visited-stop action state into stop cards

## Phase 8: Polish & Validation

- [x] T027 Update `README.md` and `.specify/roadmap.md` for F11 behavior, limits, and validation commands
- [x] T028 Run `npm run test:revisions`
- [x] T029 Run `npm run test:trip-detail`
- [x] T030 Run `npm run test:scrapbook`
- [x] T031 Run `npm run lint`
- [x] T032 Run `npm run typecheck`
- [x] T033 Run `npm run build`

## Dependencies

- T001-T003 before tests and implementation.
- T004-T006 before implementation.
- T007-T008 before T009-T010.
- T009 before T023-T025.
- T010 before T013 and T018.
- T012 before T014-T015.
- T016-T017 before T018-T019.
- T020 before T021-T022.
- T023 before T024-T026.
- T027 after implementation and validation.

## Parallel Notes

- T004, T005, and T006 can be authored in parallel.
- T012 can proceed after T007 while planning request work continues.
- T020-T021 can proceed after core service scaffolding exists.
- UI rendering tasks can proceed after service return shapes stabilize.

## MVP First

US1, US2, and US3 together are the minimum safe F11 increment: request revisions, protect visited stops, and prevent scrapbook loss. US4 completes the constitutional restore promise.
