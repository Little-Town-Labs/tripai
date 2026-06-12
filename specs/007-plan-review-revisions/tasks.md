# Tasks: Plan Review & Pre-Purchase Revisions

**Input**: Design documents from `/specs/007-plan-review-revisions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the project TDD process. Write behavior tests before implementation and confirm they fail for missing behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the plan review module and focused test command.

- [x] T001 Review Next.js 16 docs cited in `specs/007-plan-review-revisions/research.md`
- [x] T002 Add `test:plan-review` script to `package.json`
- [x] T003 Create plan-review module skeleton files in `src/lib/plan-review/service.ts` and `src/lib/plan-review/validation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared validation and owner-scoped data access needed by every story.

- [x] T004 Write failing revision request validation tests in `tests/plan-review/validation.test.ts`
- [x] T005 Implement revision request validation in `src/lib/plan-review/validation.ts`
- [x] T006 Write failing owner-scoped review loading tests in `tests/plan-review/service.test.ts`
- [x] T007 Implement owner-scoped plan review types and `getPlanReview` in `src/lib/plan-review/service.ts`

---

## Phase 3: User Story 1 - Review A Generated Draft Plan (Priority: P1)

**Goal**: Owner can load a ready draft plan with ordered days/stops and another owner cannot.

**Independent Test**: Seed draft plan data and call `getPlanReview` as owner A and owner B.

### Tests for User Story 1

- [x] T008 [US1] Extend service tests for ready, progress-ready, and forbidden review states

### Implementation for User Story 1

- [x] T009 [US1] Implement ready/progress view model mapping in `src/lib/plan-review/service.ts`
- [x] T010 [US1] Add `/app/plan/[tripId]/loading.tsx` and `/app/plan/[tripId]/page.tsx`
- [x] T011 [US1] Add itinerary display component in `src/components/plan-review/plan-review.tsx`
- [x] T012 [US1] Verify US1 tests fail before implementation and pass after implementation with `npm run test:plan-review`

---

## Phase 4: User Story 2 - Request Unlimited Pre-Purchase Revisions (Priority: P2)

**Goal**: Owner can submit unlimited pre-purchase revision requests for unpurchased draft trips.

**Independent Test**: Submit three requests for one unpurchased trip and verify each creates a draft revision without quota use.

### Tests for User Story 2

- [x] T013 [US2] Add service tests for unlimited pre-purchase requests, purchased-trip rejection, and no quota decrement

### Implementation for User Story 2

- [x] T014 [US2] Implement `requestPrePurchaseRevision` in `src/lib/plan-review/service.ts`
- [x] T015 [US2] Add Server Action in `src/app/app/plan/[tripId]/actions.ts`
- [x] T016 [US2] Add revision request form component in `src/components/plan-review/revision-request-form.tsx`
- [x] T017 [US2] Verify US2 tests fail before implementation and pass after implementation with `npm run test:plan-review`

---

## Phase 5: User Story 3 - Browse Previous Draft Versions (Priority: P3)

**Goal**: Owner can view previous committed versions and pending draft request summaries without changing the current revision.

**Independent Test**: Seed multiple revisions and verify loading a previous revision leaves `trips.current_revision_id` unchanged.

### Tests for User Story 3

- [x] T018 [US3] Add service tests for previous revision loading and current pointer preservation

### Implementation for User Story 3

- [x] T019 [US3] Implement version list and selected revision loading in `src/lib/plan-review/service.ts`
- [x] T020 [US3] Render version navigation in `src/components/plan-review/plan-review.tsx`
- [x] T021 [US3] Verify US3 tests fail before implementation and pass after implementation with `npm run test:plan-review`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and roadmap hygiene.

- [x] T022 [P] Update `AGENTS.md` active feature plan pointer to `specs/007-plan-review-revisions/plan.md`
- [x] T023 [P] Update F7 status in `.specify/roadmap.md` only after validation passes
- [x] T024 Run validation: `npm run lint`, `npm run typecheck`, `npm run test:plan-review`, `npm run test:generation`, and `npm run build`
- [x] T025 Review `git diff` for secrets, unrelated churn, and Spec Kit artifact consistency

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers the review page.
- **US2 (Phase 4)**: Depends on Foundational and adds mutation behavior.
- **US3 (Phase 5)**: Depends on version list data from Foundational and US1 display.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

## Parallel Opportunities

- T004 and T006 can be written in parallel because validation and service loading are independent.
- T010 and T011 can be implemented together after the service view model is stable.
- T015 and T016 can be implemented together after `requestPrePurchaseRevision` passes service tests.

## Implementation Strategy

### MVP First

1. Complete setup and validation.
2. Complete owner-scoped ready/progress review loading.
3. Render `/app/plan/[tripId]`.
4. Capture pre-purchase revision requests.
5. Add previous-version browsing.

### TDD Rule

For each story, write the listed tests first and run `npm run test:plan-review` to confirm the missing behavior fails before implementing the story.
