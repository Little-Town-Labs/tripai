# Tasks: F12 Credential-free Family Sharing

**Input**: Design documents from `/specs/012-family-sharing/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/sharing-service.md`

**Tests**: Required by the feature specification and project process. Write focused tests first and confirm they fail before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when handled by separate workers
- **[Story]**: User story covered by the task
- Include exact file paths in every task

## Phase 1: Setup

**Purpose**: Add the F12 test entry point and file structure.

- [x] T001 Add `test:sharing` script to `package.json` using `tsx --test --test-concurrency=1 tests/sharing/**/*.test.ts`
- [x] T002 Create sharing source and test directories at `src/lib/sharing/` and `tests/sharing/`

---

## Phase 2: Foundational

**Purpose**: Shared validation and service types used by all stories.

**Critical**: No user story implementation should start until validation tests and the validation module exist.

- [x] T003 [P] Add validation tests for labels, display names, note content, ratings, and token format in `tests/sharing/validation.test.ts`
- [x] T004 Implement validation helpers and public result types in `src/lib/sharing/validation.ts`
- [x] T005 Run `npm run test:sharing` and confirm validation tests pass

**Checkpoint**: Validation foundation is ready.

---

## Phase 3: User Story 1 - Owner Creates and Manages Share Links (Priority: P1)

**Goal**: Owners can create, list, and revoke credential-free share links for purchased trips without exposing raw tokens after creation.

**Independent Test**: Seed a purchased owner trip, create a link, verify hash-only storage, list without raw token/hash, revoke, and verify the token stops resolving.

### Tests for User Story 1

- [x] T006 [US1] Add DB-backed tests for create/list/revoke share links in `tests/sharing/service.test.ts`
- [x] T007 [US1] Run `npm run test:sharing` and confirm US1 tests fail before implementation

### Implementation for User Story 1

- [x] T008 [US1] Implement owner share-link service functions in `src/lib/sharing/service.ts`
- [x] T009 [US1] Add owner share-link server actions to `src/app/app/trips/[tripId]/actions.ts`
- [x] T010 [US1] Add owner sharing panel component in `src/components/trip/share-panel.tsx`
- [x] T011 [US1] Render the sharing panel from the authenticated trip detail page in `src/app/app/trips/[tripId]/page.tsx`
- [x] T012 [US1] Run `npm run test:sharing` and verify US1 passes

**Checkpoint**: Owner can manage private share links independently.

---

## Phase 4: User Story 2 - Family Opens Shared Trip Without an Account (Priority: P1)

**Goal**: A family member can open `/share/{token}` without signing in and view itinerary and scrapbook content without owner or payment fields.

**Independent Test**: Use an active token to load the shared trip through token-scoped RLS; revoked/invalid tokens return generic not found.

### Tests for User Story 2

- [x] T013 [US2] Add shared trip read/privacy tests to `tests/sharing/service.test.ts`
- [x] T014 [US2] Run `npm run test:sharing` and confirm US2 tests fail before implementation

### Implementation for User Story 2

- [x] T015 [US2] Implement `getSharedTrip` read model in `src/lib/sharing/service.ts`
- [x] T016 [US2] Add public shared trip page at `src/app/share/[token]/page.tsx`
- [x] T017 [US2] Add shared trip detail component in `src/components/trip/shared-trip-detail.tsx`
- [x] T018 [US2] Run `npm run test:sharing` and verify US2 passes

**Checkpoint**: Family can view the shared trip without credentials.

---

## Phase 5: User Story 3 - Family Adds Notes and Ratings With a Display Name (Priority: P1)

**Goal**: Family members can add trip/day/stop notes and stop ratings through the share link with display-name attribution.

**Independent Test**: Active token writes notes/ratings with share-link attribution; invalid scopes, display names, ratings, or revoked tokens do not write rows.

### Tests for User Story 3

- [x] T019 [US3] Add share contribution validation and persistence tests to `tests/sharing/service.test.ts`
- [x] T020 [US3] Run `npm run test:sharing` and confirm US3 tests fail before implementation

### Implementation for User Story 3

- [x] T021 [US3] Implement `createSharedNote` and `createSharedRating` in `src/lib/sharing/service.ts`
- [x] T022 [US3] Add public share server actions in `src/app/share/[token]/actions.ts`
- [x] T023 [US3] Add shared note form in `src/components/trip/shared-note-form.tsx`
- [x] T024 [US3] Add shared rating form in `src/components/trip/shared-rating-form.tsx`
- [x] T025 [US3] Wire contribution forms into `src/components/trip/shared-trip-detail.tsx`
- [x] T026 [US3] Run `npm run test:sharing` and verify US3 passes

**Checkpoint**: Family can contribute notes and ratings without accounts.

---

## Phase 6: User Story 4 - Owner Moderates Family Contributions (Priority: P2)

**Goal**: The owner can remove share-link notes and ratings from owner and shared views.

**Independent Test**: Seed share-link notes/ratings, remove them as owner, verify they disappear from owner/shared read models, and verify non-owners cannot moderate.

### Tests for User Story 4

- [x] T027 [US4] Add owner moderation tests to `tests/sharing/service.test.ts`
- [x] T028 [US4] Run `npm run test:sharing` and confirm US4 tests fail before implementation

### Implementation for User Story 4

- [x] T029 [US4] Implement `removeContribution` in `src/lib/sharing/service.ts`
- [x] T030 [US4] Add moderation server action to `src/app/app/trips/[tripId]/actions.ts`
- [x] T031 [US4] Add owner moderation controls for share-link notes/ratings in existing owner trip detail components
- [x] T032 [US4] Run `npm run test:sharing` and verify US4 passes

**Checkpoint**: Owner retains moderation authority over family contributions.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Documentation, roadmap, and full validation.

- [x] T033 Update `README.md` with F12 family sharing behavior and deferred photo-upload note
- [x] T034 Update `.specify/roadmap.md` to mark F12 complete only after validation passes
- [x] T035 Run sequential DB-backed validation: `npm run test:sharing`, `npm run test:db`, `npm run test:trip-detail`, `npm run test:scrapbook`
- [x] T036 Run static and production validation: `npm run lint`, `npm run typecheck`, `npm run build`
- [x] T037 Review `git diff` for raw token logging/exposure and unintended owner/payment field leaks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on setup and blocks all stories
- **US1 (Phase 3)**: Depends on validation foundation
- **US2 (Phase 4)**: Depends on US1 service foundation and share-token helpers
- **US3 (Phase 5)**: Depends on US2 shared read model and token resolution
- **US4 (Phase 6)**: Depends on US3 contribution rows
- **Polish (Phase 7)**: Depends on all implemented stories

### User Story Dependencies

- **US1**: Owner sharing management can be validated independently after validation foundation.
- **US2**: Requires active share links from US1 and can then be validated independently.
- **US3**: Requires token access from US2 and can be validated independently with seeded stops/days.
- **US4**: Requires share-created notes/ratings from US3.

### TDD Order

1. Write the relevant tests.
2. Run `npm run test:sharing` and confirm the new story tests fail for the expected reason.
3. Implement the minimum code for the story.
4. Re-run `npm run test:sharing` until the story passes.
5. Move to the next story.

### Parallel Opportunities

- T003 can run in parallel with documentation review.
- UI components in T010, T017, T023, and T024 can be built in parallel after service contracts stabilize.
- Polish tasks T033 and T037 can run in parallel after implementation is complete.
