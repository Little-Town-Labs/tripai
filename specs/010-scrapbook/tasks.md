# Tasks: F10 Scrapbook Notes and Ratings

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/scrapbook-service.md`

## Phase 1: Setup

- [x] T001 Add `test:scrapbook` script to `package.json`
- [x] T002 Update `AGENTS.md` active Spec Kit pointer to `specs/010-scrapbook/plan.md`
- [x] T003 Add disabled-by-default scrapbook feature toggle config in `src/lib/scrapbook/config.ts`

## Phase 2: Tests First

- [x] T004 [P] Add validation tests in `tests/scrapbook/validation.test.ts`
- [x] T005 [P] Add DB-backed service tests in `tests/scrapbook/service.test.ts` for note scopes, rating validation, purchased gate, owner denial, photo metadata status, and contribution preservation compatibility

## Phase 3: User Story 1 - Add Scrapbook Notes

- [x] T006 [US1] Implement note/rating validators in `src/lib/scrapbook/validation.ts`
- [x] T007 [US1] Implement `createScrapbookNote` and shared purchased-trip/scope guards in `src/lib/scrapbook/service.ts`
- [x] T008 [US1] Add `createTripNoteAction` server action in `src/app/app/trips/[tripId]/actions.ts`
- [x] T009 [US1] Add reusable note form component in `src/components/trip/note-form.tsx`

## Phase 4: User Story 2 - Rate Stops

- [x] T010 [US2] Implement `createStopRating` in `src/lib/scrapbook/service.ts`
- [x] T011 [US2] Add `createStopRatingAction` server action in `src/app/app/trips/[tripId]/actions.ts`
- [x] T012 [US2] Add reusable rating form component in `src/components/trip/rating-form.tsx`

## Phase 5: User Story 3 - First-class Scrapbook UI

- [x] T013 [US3] Implement `getScrapbook` read model in `src/lib/scrapbook/service.ts`
- [x] T014 [US3] Extend `getTripDetail` in `src/lib/trip-detail/service.ts` to include scrapbook summary
- [x] T015 [US3] Add scrapbook panel component in `src/components/trip/scrapbook-panel.tsx`
- [x] T016 [US3] Render trip/day/stop notes, stop ratings, photo deferred state, and disabled-toggle state in existing trip components

## Phase 6: User Story 4 - Revision Preservation Compatibility

- [x] T017 [US4] Verify F10-created notes/ratings are visible to `src/db/revisions.ts` contribution detection in service tests
- [x] T018 [US4] Document the deferred photo-storage exception and feature toggle in F10 docs and roadmap status text

## Phase 7: Polish & Validation

- [x] T019 Update `README.md`, `.env.example`, current state, routes, boundaries, and validation commands for F10
- [x] T020 Mark F10 done in `.specify/roadmap.md` after validation passes
- [x] T021 Run `npm run test:scrapbook`
- [x] T022 Run `npm run test:trip-detail`
- [x] T023 Run `npm run lint`
- [x] T024 Run `npm run typecheck`
- [x] T025 Run `npm run build`

## Dependencies

- T003-T004 before implementation.
- T005 before T006 and T009.
- T006 before T007-T008.
- T009 before T010-T011.
- T012 before T013-T015.
- T016 after T006 and T009.
- T018-T019 after validation.

## Parallel Notes

- T003 and T004 can be authored in parallel.
- T008 and T011 can be implemented independently after actions exist.
- T014 and T015 can proceed once the read model shape is stable.

## MVP First

US1 and US2 together provide the minimum useful durable scrapbook. US3 makes it first-class in the trip detail UI. US4 protects the F11 revision dependency.
