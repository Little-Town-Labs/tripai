# Tasks: F13 Data Export and Deletion Ops

**Input**: Design documents from `/specs/013-export-delete-ops/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ops-cli.md`

**Tests**: Required by the feature specification and project TDD process. Write tests first and confirm they fail before implementation.

**Organization**: Tasks are grouped by user story so export, deletion, and runbook behavior remain independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when handled by separate workers
- **[Story]**: User story covered by the task
- Include exact file paths in every task

## Phase 1: Setup

**Purpose**: Add ops test command and file structure.

- [x] T001 Add `test:ops` and `ops:trip-data` scripts to `package.json`
- [x] T002 Create directories `src/lib/ops/`, `scripts/`, and `tests/ops/`

---

## Phase 2: Foundational

**Purpose**: Shared command contracts and helpers used by export and deletion.

- [x] T003 [P] Add input validation and redaction tests in `tests/ops/trip-data.test.ts`
- [x] T004 Implement shared request validation, UUID checks, and redacted result types in `src/lib/ops/trip-data.ts`
- [x] T005 Run `npm run test:ops` and confirm foundational tests pass

**Checkpoint**: Ops service contract can safely validate requests.

---

## Phase 3: User Story 1 - Support Exports a Trip Archive (Priority: P1)

**Goal**: Support can export one owner-verified trip into a portable JSON archive without raw share tokens or unrelated data.

**Independent Test**: Seed a purchased trip with itinerary, scrapbook, share links, and photo metadata; export it; inspect the file contents.

### Tests for User Story 1

- [x] T006 [US1] Add DB-backed export success, ownership-denied, existing-output, and secret-redaction tests in `tests/ops/trip-data.test.ts`
- [x] T007 [US1] Run `npm run test:ops` and confirm US1 tests fail before implementation

### Implementation for User Story 1

- [x] T008 [US1] Implement `exportTripData` in `src/lib/ops/trip-data.ts`
- [x] T009 [US1] Implement archive file write and overwrite protection in `src/lib/ops/trip-data.ts`
- [x] T010 [US1] Run `npm run test:ops` and verify US1 passes

**Checkpoint**: Export works independently.

---

## Phase 4: User Story 2 - Support Permanently Deletes a Trip (Priority: P1)

**Goal**: Support can permanently delete one owner-verified trip with explicit confirmation while preserving unrelated data.

**Independent Test**: Seed two trips, delete one with matching owner/confirm value, and verify target/dependent rows are gone while unrelated rows remain.

### Tests for User Story 2

- [x] T011 [US2] Add deletion confirmation, ownership-denied, successful deletion, dependent-row removal, and unrelated-data preservation tests in `tests/ops/trip-data.test.ts`
- [x] T012 [US2] Run `npm run test:ops` and confirm US2 tests fail before implementation

### Implementation for User Story 2

- [x] T013 [US2] Implement `deleteTripData` transaction in `src/lib/ops/trip-data.ts`
- [x] T014 [US2] Add post-delete counts and orphaned intake cleanup in `src/lib/ops/trip-data.ts`
- [x] T015 [US2] Run `npm run test:ops` and verify US2 passes

**Checkpoint**: Deletion works independently.

---

## Phase 5: User Story 3 - Support Has a Safe Runbook (Priority: P2)

**Goal**: Support can follow documented commands and safety checks without undocumented knowledge or secret exposure.

**Independent Test**: Read the runbook and CLI contract; run CLI parser tests against export/delete command shapes.

### Tests for User Story 3

- [x] T016 [US3] Add CLI argument parsing tests for export/delete success and failure cases in `tests/ops/trip-data.test.ts`
- [x] T017 [US3] Run `npm run test:ops` and confirm US3 parser tests fail before implementation

### Implementation for User Story 3

- [x] T018 [US3] Implement CLI wrapper in `scripts/trip-data-ops.ts`
- [x] T019 [US3] Add support runbook in `docs/SUPPORT_DATA_OPS.md`
- [x] T020 [US3] Update `README.md` with F13 status, scripts, and validation command
- [x] T021 [US3] Run `npm run test:ops` and verify US3 passes

**Checkpoint**: Operator workflow is documented and executable.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Roadmap updates and full validation.

- [x] T022 Update `.specify/roadmap.md` to mark F13 complete only after validation passes
- [x] T023 Run sequential DB-backed validation: `npm run test:ops`, `npm run test:db`
- [x] T024 Run static and production validation: `npm run lint`, `npm run typecheck`, `npm run build`
- [x] T025 Review `git diff` for accidental secret/raw token output and destructive command safety

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on setup and blocks all stories
- **US1 Export (Phase 3)**: Depends on validation helpers
- **US2 Delete (Phase 4)**: Depends on validation helpers and can share test seed data with export
- **US3 Runbook/CLI (Phase 5)**: Depends on service functions from US1 and US2
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1**: Can be delivered independently as read-only export capability.
- **US2**: Can be delivered independently after shared validation, but should be validated after export so support has an export-before-delete path.
- **US3**: Depends on the command/service contracts from US1 and US2.

### TDD Order

1. Write the relevant tests.
2. Run `npm run test:ops` and confirm new tests fail for the expected reason.
3. Implement the minimum service/CLI/runbook behavior.
4. Re-run `npm run test:ops` until the story passes.
5. Move to the next story.

### Parallel Opportunities

- T003 can run in parallel with documentation review.
- T019 can be drafted while T018 is implemented after service contract names stabilize.
- T024 checks can run in parallel after implementation, except DB-backed suites must remain sequential.
