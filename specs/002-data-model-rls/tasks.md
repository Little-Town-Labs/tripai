# Tasks: Data Model & Access Policies

**Input**: Design documents from `specs/002-data-model-rls/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. This feature follows TDD. Write DB/RLS tests first and confirm they fail before implementing schema, migrations, and policies.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add database dependencies, scripts, and test-branch setup without changing application behavior.

- [x] T001 Install database dependencies `drizzle-orm` and `pg`, and dev dependencies `drizzle-kit` and `@types/pg` in `package.json` and `package-lock.json`
- [x] T002 Add DB scripts `db:generate`, `db:migrate`, `db:studio`, and `test:db` in `package.json`
- [x] T003 Add `DATABASE_TEST_URL=` to `.env.example` with a comment that it must point to a Neon testing branch
- [x] T004 Create Drizzle config in `drizzle.config.ts` using `DATABASE_URL`
- [x] T005 Create database directory structure `src/db/`, `src/lib/access/`, `tests/db/`, and `drizzle/`
- [x] T006 Document Neon testing branch setup details in `docs/NEON.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared DB client, seed helpers, schema shell, and test harness required before any user-story policy tests can run.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create DB client factory in `src/db/client.ts`
- [x] T008 Create initial schema export file in `src/db/schema.ts`
- [x] T009 Create access-context helper contract in `src/lib/access/context.ts`
- [x] T010 Create DB test environment loader in `tests/db/env.ts`
- [x] T011 Create DB reset and migration helper in `tests/db/helpers/database.ts`
- [x] T012 Create shared seed fixture builder in `tests/db/helpers/seed.ts`
- [x] T013 Create test runner entrypoint in `tests/db/index.test.ts`

**Checkpoint**: Foundation ready; user-story tests can now be written and expected to fail.

---

## Phase 3: User Story 1 - Owner Data Is Private By Default (Priority: P1) MVP

**Goal**: Owners can access their own trips and related rows, while cross-owner and anonymous access is denied.

**Independent Test**: Create two owners with separate trips and prove each owner can access only their own trip data.

### Tests for User Story 1

> Write these tests FIRST and confirm they fail before implementation.

- [x] T014 [P] [US1] Write owner schema constraint tests in `tests/db/schema.test.ts`
- [x] T015 [P] [US1] Write owner RLS allow/deny tests in `tests/db/rls-owner.test.ts`
- [x] T016 [P] [US1] Write default-deny anonymous access tests in `tests/db/rls-default-deny.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement owner, trip intake, trip, trip day, stop, note, rating, photo metadata, share link, and trip revision tables in `src/db/schema.ts`
- [x] T018 [US1] Implement required schema constraints in `src/db/schema.ts`
- [x] T019 [US1] Generate initial SQL migration in `drizzle/`
- [x] T020 [US1] Add owner access context helpers in `src/lib/access/context.ts`
- [x] T021 [US1] Add owner RLS policies for trip-scoped tables in `src/db/schema.ts` and migration SQL in `drizzle/`
- [x] T022 [US1] Implement seed fixture rows for two-owner scenarios in `tests/db/helpers/seed.ts`
- [x] T023 [US1] Run `npm run test:db` against `DATABASE_TEST_URL` and keep iterating until US1 tests pass

**Checkpoint**: Owner privacy is independently testable and passing.

---

## Phase 4: User Story 2 - Family Share Links Can View And Contribute Without Accounts (Priority: P2)

**Goal**: Active share links can view one shared trip and contribute notes, ratings, and photo metadata without account credentials.

**Independent Test**: Use an active share link for Trip A to read Trip A and write contributions, while denying Trip B and revoked-token access.

### Tests for User Story 2

> Write these tests FIRST and confirm they fail before implementation.

- [x] T024 [P] [US2] Write active share-link read allow/deny tests in `tests/db/rls-share-link.test.ts`
- [x] T025 [P] [US2] Write share-link contribution write tests in `tests/db/rls-share-contributions.test.ts`
- [x] T026 [P] [US2] Write share-link revocation tests in `tests/db/rls-share-revocation.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Add share-token hash helpers in `src/lib/access/share-token.ts`
- [x] T028 [US2] Add share-token database context helpers in `src/lib/access/context.ts`
- [x] T029 [US2] Add share-link read/write RLS policies in `src/db/schema.ts` and migration SQL in `drizzle/`
- [x] T030 [US2] Extend seed fixtures with active and revoked share links in `tests/db/helpers/seed.ts`
- [x] T031 [US2] Run `npm run test:db` against `DATABASE_TEST_URL` and keep iterating until US2 tests pass

**Checkpoint**: Credential-free family share access is independently testable and passing.

---

## Phase 5: User Story 3 - Revisions Preserve Scrapbook Contributions (Priority: P3)

**Goal**: Revision records can distinguish current/prior versions and preserve or identify contributions attached to retained or removed stops.

**Independent Test**: Create a trip with contributions, prepare a revision, and prove retained-stop contributions remain linked while removed-stop contributions are identifiable.

### Tests for User Story 3

> Write these tests FIRST and confirm they fail before implementation.

- [x] T032 [P] [US3] Write revision state transition tests in `tests/db/revision-preservation.test.ts`
- [x] T033 [P] [US3] Write retained-stop contribution preservation tests in `tests/db/revision-preservation.test.ts`
- [x] T034 [P] [US3] Write removed-stop contribution detection tests in `tests/db/revision-preservation.test.ts`

### Implementation for User Story 3

- [x] T035 [US3] Add revision helper queries in `src/db/revisions.ts`
- [x] T036 [US3] Add stable stop key and revision relationship indexes in `src/db/schema.ts` and migration SQL in `drizzle/`
- [x] T037 [US3] Extend seed fixtures with initial and proposed revisions in `tests/db/helpers/seed.ts`
- [x] T038 [US3] Run `npm run test:db` against `DATABASE_TEST_URL` and keep iterating until US3 tests pass

**Checkpoint**: Revision-safe contribution relationships are independently testable and passing.

---

## Phase 6: User Story 4 - Planning Data Supports Verified Trip Generation (Priority: P4)

**Goal**: The schema rejects ungrounded real-world stops and preserves intake/route facts needed by future generation work.

**Independent Test**: Save valid intake and stop data, then prove invalid venue/rating/route data is rejected.

### Tests for User Story 4

> Write these tests FIRST and confirm they fail before implementation.

- [x] T039 [P] [US4] Write verified stop constraint tests in `tests/db/planning-data.test.ts`
- [x] T040 [P] [US4] Write intake validation tests in `tests/db/planning-data.test.ts`
- [x] T041 [P] [US4] Write route and rating boundary tests in `tests/db/planning-data.test.ts`

### Implementation for User Story 4

- [x] T042 [US4] Add planning data constraints and indexes in `src/db/schema.ts` and migration SQL in `drizzle/`
- [x] T043 [US4] Extend seed fixtures with valid and invalid planning data cases in `tests/db/helpers/seed.ts`
- [x] T044 [US4] Run `npm run test:db` against `DATABASE_TEST_URL` and keep iterating until US4 tests pass

**Checkpoint**: Planning data constraints are independently testable and passing.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full validation, docs, and roadmap alignment.

- [x] T045 Run `npm run lint` and fix any issues
- [x] T046 Run `npm run typecheck` and fix any issues
- [x] T047 Run `npm run build` and fix any issues
- [x] T048 Run `npm run test:e2e` and fix any issues
- [x] T049 Run full F2 quickstart from `specs/002-data-model-rls/quickstart.md`
- [x] T050 Update `.specify/roadmap.md` to mark F2 complete only after all F2 acceptance checks pass
- [x] T051 Update `docs/ARCHITECTURE.md` if the final schema differs from the architecture diagram

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user-story tasks.
- Phase 3 US1 depends on Phase 2.
- Phase 4 US2 depends on Phase 2 and can start after schema foundations exist, but final policy validation depends on US1 base policies.
- Phase 5 US3 depends on Phase 2 and can be developed after base schema exists.
- Phase 6 US4 depends on Phase 2 and can be developed after base schema exists.
- Phase 7 Polish depends on all selected story phases.

### User Story Dependencies

- US1 is MVP and should complete first.
- US2 builds on the same trip-scoped tables and should follow US1.
- US3 depends on TripRevision and Stop relationships from US1.
- US4 depends on Stop and TripIntake constraints from US1.

### Within Each User Story

- Tests MUST be written and fail before implementation.
- Schema/policy implementation follows failing tests.
- Migration generation follows schema changes.
- Story checkpoint validation must pass before moving to the next priority story.

## Parallel Opportunities

- T014, T015, and T016 can be written in parallel after Phase 2.
- T024, T025, and T026 can be written in parallel after US1 base schema exists.
- T032, T033, and T034 can be written in parallel after US1 base schema exists.
- T039, T040, and T041 can be written in parallel after US1 base schema exists.
- Polish validations T045-T048 are independent command checks but should be interpreted together.

## Parallel Example: User Story 1

```bash
# Write US1 failing tests in parallel:
Task: "Write owner schema constraint tests in tests/db/schema.test.ts"
Task: "Write owner RLS allow/deny tests in tests/db/rls-owner.test.ts"
Task: "Write default-deny anonymous access tests in tests/db/rls-default-deny.test.ts"
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational.
3. Write failing US1 tests.
4. Implement base schema, migration, owner RLS policies, and seed fixtures.
5. Validate US1 independently with `npm run test:db`.

### Incremental Delivery

1. US1: owner privacy and default-deny.
2. US2: credential-free share-link read/write policies.
3. US3: revision-safe contribution relationships.
4. US4: verified planning data constraints.
5. Polish: full validation and roadmap update.
