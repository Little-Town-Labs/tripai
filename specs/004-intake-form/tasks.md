# Tasks: Intake Form

**Input**: Design documents from `/specs/004-intake-form/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by FR-015 and the project TDD process. Write story tests before implementation and confirm they fail for the missing behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm F4 starts from the current owner-authenticated app baseline.

- [x] T001 Review Next.js 16 form, Server Action, Server/Client Component, and App Router docs already identified in `node_modules/next/dist/docs/01-app/`
- [x] T002 [P] Review existing intake schema and RLS constraints in `src/db/schema.ts` and `drizzle/0000_melted_dragon_man.sql`
- [x] T003 [P] Review existing owner auth and app route protection in `src/lib/auth/owner.ts`, `proxy.ts`, and `src/app/app/page.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared validation, persistence, and route scaffolding that all stories use.

**CRITICAL**: No user story implementation should begin until this foundation exists.

- [x] T004 Create intake type definitions and option constants in `src/lib/intake/validation.ts`
- [x] T005 Create owner-scoped intake persistence skeleton in `src/lib/intake/service.ts`
- [x] T006 Create save action skeleton in `src/app/app/intake/actions.ts`
- [x] T007 Create initial protected intake page shell in `src/app/app/intake/page.tsx`
- [x] T008 Add a "Start planning" navigation entry from `src/app/app/page.tsx` to `/app/intake`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Owner Completes A Trip Intake Draft (Priority: P1)

**Goal**: A signed-in owner can complete all required intake steps and persist a draft tied to their owner record.

**Independent Test**: Sign in, visit `/app/intake`, enter a valid family road-trip request, submit, and verify a saved draft/ready state.

### Tests for User Story 1

- [x] T009 [P] [US1] Write failing validation success tests for valid intake normalization in `tests/intake/validation.test.ts`
- [x] T010 [P] [US1] Write failing service persistence test for owner-scoped draft creation in `tests/intake/service.test.ts`
- [x] T011 [P] [US1] Write failing Playwright happy-path intake completion test in `tests/e2e/intake.spec.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement valid intake normalization in `src/lib/intake/validation.ts`
- [x] T013 [US1] Implement owner-scoped insert with app role and owner RLS context in `src/lib/intake/service.ts`
- [x] T014 [US1] Implement `saveTripIntakeAction` success path in `src/app/app/intake/actions.ts`
- [x] T015 [US1] Implement multi-step wizard component in `src/components/intake/intake-wizard.tsx`
- [x] T016 [US1] Implement reusable intake field controls in `src/components/intake/intake-fields.tsx`
- [x] T017 [US1] Render the wizard and saved-draft ready state in `src/app/app/intake/page.tsx`
- [x] T018 [US1] Verify US1 tests fail before implementation and pass after implementation with `npm run test:e2e` and the focused intake tests

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Owner Can Correct Inputs Before Submission (Priority: P2)

**Goal**: Invalid or incomplete input is blocked with plain-language field errors while preserving unrelated answers.

**Independent Test**: Enter invalid dates, missing required values, and inconsistent child details; verify the flow blocks submission and preserves entered values.

### Tests for User Story 2

- [x] T019 [P] [US2] Write failing validation tests for invalid dates, party counts, child ages, and enum values in `tests/intake/validation.test.ts`
- [x] T020 [P] [US2] Write failing Playwright validation-error preservation test in `tests/e2e/intake.spec.ts`

### Implementation for User Story 2

- [x] T021 [US2] Implement field-specific validation failures in `src/lib/intake/validation.ts`
- [x] T022 [US2] Return validation failure state from `src/app/app/intake/actions.ts` without attempting persistence
- [x] T023 [US2] Display validation errors and preserve wizard values in `src/components/intake/intake-wizard.tsx`
- [x] T024 [US2] Verify US2 tests fail before implementation and pass after implementation with `npm run test:e2e` and focused intake tests

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Intake Works On Mobile And Desktop (Priority: P3)

**Goal**: The intake flow is usable and complete on common mobile and desktop viewports.

**Independent Test**: Complete the wizard on mobile and desktop viewport sizes without layout overlap, unreachable inputs, or unreadable text.

### Tests for User Story 3

- [x] T025 [P] [US3] Write failing Playwright mobile viewport completion test in `tests/e2e/intake.spec.ts`
- [x] T026 [P] [US3] Write failing Playwright desktop layout/completion test in `tests/e2e/intake.spec.ts`

### Implementation for User Story 3

- [x] T027 [US3] Polish responsive layout, stable step dimensions, and 44px tap targets in `src/components/intake/intake-wizard.tsx`
- [x] T028 [US3] Polish field layout and text wrapping in `src/components/intake/intake-fields.tsx`
- [x] T029 [US3] Verify US3 tests fail before implementation and pass after implementation with `npm run test:e2e`

**Checkpoint**: All F4 user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and roadmap hygiene.

- [x] T030 [P] Update F4 quickstart notes if implementation behavior differs in `specs/004-intake-form/quickstart.md`
- [x] T031 [P] Update roadmap F4 status in `.specify/roadmap.md` only after validation passes
- [x] T032 Run full validation: `npm run lint`, `npm run typecheck`, focused intake tests, `npm run test:auth`, `npm run test:db`, `npm run build`, and `npm run test:e2e`
- [x] T033 Review `git diff` for secrets, unrelated churn, and Spec Kit artifact consistency

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; delivers the minimum viable F4 slice.
- **US2 (Phase 4)**: Depends on US1 validation/action structure.
- **US3 (Phase 5)**: Depends on US1 wizard structure and US2 error states.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: Required first because it creates the draft persistence path.
- **US2**: Builds on US1 validation/action flow but remains independently testable through invalid input scenarios.
- **US3**: Builds on the wizard UI and remains independently testable through viewport-specific completion.

### Parallel Opportunities

- T002 and T003 can run in parallel during setup.
- T009, T010, and T011 can be written in parallel because they target different test concerns.
- T019 and T020 can be written in parallel.
- T025 and T026 can be written in parallel.
- T030 and T031 can be done in parallel after validation passes.

## Parallel Example: User Story 1

```bash
# Test tasks can be prepared together:
Task: "Write validation success tests in tests/intake/validation.test.ts"
Task: "Write service persistence test in tests/intake/service.test.ts"
Task: "Write Playwright happy-path test in tests/e2e/intake.spec.ts"
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete US1 tests and implementation.
3. Validate a signed-in owner can save a draft intake.
4. Continue to US2 and US3 before marking F4 complete.

### TDD Rule

For each story, write the listed tests first and run the focused command to confirm the missing behavior fails before implementing the story.
