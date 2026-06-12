# Tasks: Retrieval Layer

**Input**: Design documents from `/specs/005-retrieval-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by FR-016 and the project TDD process. Write story tests before implementation and confirm they fail for the missing behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the retrieval module and focused test command.

- [x] T001 Review Google Places Text Search, Place Details, Routes field-mask, and Maps API key security docs cited in `specs/005-retrieval-layer/research.md`
- [x] T002 Create retrieval module skeleton files in `src/lib/retrieval/types.ts`, `src/lib/retrieval/errors.ts`, `src/lib/retrieval/normalizers.ts`, `src/lib/retrieval/cache.ts`, `src/lib/retrieval/google.ts`, and `src/lib/retrieval/context.ts`
- [x] T003 Add `test:retrieval` script to `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, errors, normalization, and cache behavior used by every story.

- [x] T004 Define retrieval request, candidate, route, context, provider, and cache types in `src/lib/retrieval/types.ts`
- [x] T005 Define typed retrieval error helpers in `src/lib/retrieval/errors.ts`
- [x] T006 Write failing normalization and cache-key tests in `tests/retrieval/cache.test.ts`
- [x] T007 Implement request normalization and deterministic cache keys in `src/lib/retrieval/normalizers.ts`
- [x] T008 Implement in-process retrieval cache with freshness handling in `src/lib/retrieval/cache.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Build Verified Destination Candidates (Priority: P1)

**Goal**: Valid intake produces grouped, verified place candidates for planner context.

**Independent Test**: Fake place providers return valid, closed, missing-id, and missing-optional-field responses; context includes only planner-ready verified candidates and typed warnings/errors.

### Tests for User Story 1

- [x] T009 [P] [US1] Write failing destination candidate context tests in `tests/retrieval/context.test.ts`
- [x] T010 [P] [US1] Write failing Google Places mapping tests in `tests/retrieval/google.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] Implement Google Places Text Search and Details adapter mapping in `src/lib/retrieval/google.ts`
- [x] T012 [US1] Implement destination candidate grouping and closed-place filtering in `src/lib/retrieval/context.ts`
- [x] T013 [US1] Verify US1 tests fail before implementation and pass after implementation with `npm run test:retrieval`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Build A Route Skeleton And Along-Route Stops (Priority: P2)

**Goal**: Valid intake produces confirmed route distance/duration and route anchors for later rest/fuel retrieval.

**Independent Test**: Fake route providers return success and failure responses; context reports real route facts or typed errors without estimates.

### Tests for User Story 2

- [x] T014 [P] [US2] Write failing route skeleton tests in `tests/retrieval/context.test.ts`
- [x] T015 [P] [US2] Write failing Google Routes mapping tests in `tests/retrieval/google.test.ts`

### Implementation for User Story 2

- [x] T016 [US2] Implement Google route adapter mapping in `src/lib/retrieval/google.ts`
- [x] T017 [US2] Implement route skeleton assembly and route failure handling in `src/lib/retrieval/context.ts`
- [x] T018 [US2] Verify US2 tests fail before implementation and pass after implementation with `npm run test:retrieval`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Reuse Cached Retrieval Safely (Priority: P3)

**Goal**: Repeated equivalent retrieval requests reuse fresh cached provider results and avoid secret/PII cache keys.

**Independent Test**: Run equivalent requests twice with fake providers and assert provider call counts, cached freshness metadata, and redacted deterministic keys.

### Tests for User Story 3

- [x] T019 [P] [US3] Write failing context-level cache reuse tests in `tests/retrieval/context.test.ts`
- [x] T020 [P] [US3] Write failing stale cache refresh tests in `tests/retrieval/cache.test.ts`

### Implementation for User Story 3

- [x] T021 [US3] Wire cache reads/writes into place and route retrieval in `src/lib/retrieval/context.ts`
- [x] T022 [US3] Verify US3 tests fail before implementation and pass after implementation with `npm run test:retrieval`

**Checkpoint**: All F5 user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and roadmap hygiene.

- [x] T023 [P] Update `specs/005-retrieval-layer/quickstart.md` if implemented commands differ
- [x] T024 [P] Update F5 status in `.specify/roadmap.md` only after validation passes
- [x] T025 Run validation: `npm run lint`, `npm run typecheck`, `npm run test:retrieval`, and `npm run build`
- [x] T026 Review `git diff` for secrets, unrelated churn, and Spec Kit artifact consistency

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers the minimum viable retrieval context.
- **US2 (Phase 4)**: Depends on shared context types and can build after Foundational, but route context is most useful after US1 context assembly.
- **US3 (Phase 5)**: Depends on US1/US2 retrieval paths.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

## Parallel Opportunities

- T009 and T010 can be written in parallel because they target context vs provider mapping.
- T014 and T015 can be written in parallel.
- T019 and T020 can be written in parallel.
- T023 and T024 can be done in parallel after validation passes.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete US1 tests and implementation.
3. Validate planner-ready place candidates.
4. Add route skeleton behavior.
5. Add cache reuse and freshness reporting.

### TDD Rule

For each story, write the listed tests first and run `npm run test:retrieval` to confirm the missing behavior fails before implementing the story.
