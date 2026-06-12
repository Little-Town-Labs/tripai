# Tasks: AI Generation Pipeline

**Input**: Design documents from `/specs/006-ai-generation-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by FR-012 and the project TDD process. Write story tests before implementation and confirm they fail for missing behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the generation module and focused test command.

- [x] T001 Review OpenRouter quickstart, chat completion, streaming, structured output docs, OpenAI structured-output docs, and Codex manual lines cited in `specs/006-ai-generation-pipeline/research.md`
- [x] T002 Create generation module skeleton files in `src/lib/generation/types.ts`, `src/lib/generation/errors.ts`, `src/lib/generation/prompts.ts`, `src/lib/generation/validator.ts`, `src/lib/generation/openrouter.ts`, `src/lib/generation/pipeline.ts`, `src/lib/generation/persistence.ts`, and `src/lib/generation/context.ts`
- [x] T003 Add `test:generation` script to `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, prompts, errors, and validation needed by every story.

- [x] T004 Define generation request, draft, progress, provider, validation, and result types in `src/lib/generation/types.ts`
- [x] T005 Define safe generation failure helpers in `src/lib/generation/errors.ts`
- [x] T006 Write failing prompt contract tests in `tests/generation/prompts.test.ts`
- [x] T007 Implement planner and narrator prompt builders in `src/lib/generation/prompts.ts`
- [x] T008 Write failing validator tests for grounding, route facts, required stops, and retry feedback in `tests/generation/validator.test.ts`
- [x] T009 Implement deterministic generation validator in `src/lib/generation/validator.ts`

---

## Phase 3: User Story 1 - Generate A Grounded Draft Trip (Priority: P1)

**Goal**: A valid intake and retrieval context produces a validated structured draft trip, with invalid planner output retried at most twice.

**Independent Test**: Fake providers return invalid then valid planner drafts; pipeline retries once, validates grounding, and returns success without live AI credentials.

### Tests for User Story 1

- [x] T010 [P] [US1] Write failing pipeline success and retry tests in `tests/generation/pipeline.test.ts`
- [x] T011 [P] [US1] Write failing OpenRouter structured-output request tests in `tests/generation/openrouter.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement provider-independent planner/narrator orchestration in `src/lib/generation/pipeline.ts`
- [x] T013 [US1] Implement OpenRouter adapter request mapping and safe error handling in `src/lib/generation/openrouter.ts`
- [x] T014 [US1] Implement validated draft persistence in `src/lib/generation/persistence.ts`
- [x] T015 [US1] Verify US1 tests fail before implementation and pass after implementation with `npm run test:generation`

---

## Phase 4: User Story 2 - Stream Human-Readable Progress (Priority: P2)

**Goal**: Generation emits ordered, safe, human-readable progress events with the first event before two seconds.

**Independent Test**: Fake slow providers produce progress events for planning, validation, retry, narration, persistence, and failure paths.

### Tests for User Story 2

- [x] T016 [P] [US2] Write failing progress-event tests in `tests/generation/pipeline.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Implement progress event collection/emission in `src/lib/generation/pipeline.ts`
- [x] T018 [US2] Verify US2 tests fail before implementation and pass after implementation with `npm run test:generation`

---

## Phase 5: User Story 3 - Narrate With Advisory Voice (Priority: P3)

**Goal**: Validated drafts receive advisory title, summaries, descriptions, and tips, and imperative copy is rejected.

**Independent Test**: Fake narrator returns acceptable and prohibited language; narrative validation accepts advisory copy and rejects compulsory phrases.

### Tests for User Story 3

- [x] T019 [P] [US3] Write failing narrative advisory validation tests in `tests/generation/validator.test.ts`
- [x] T020 [P] [US3] Write failing narrator pipeline tests in `tests/generation/pipeline.test.ts`

### Implementation for User Story 3

- [x] T021 [US3] Implement narration stage and advisory copy checks in `src/lib/generation/pipeline.ts` and `src/lib/generation/validator.ts`
- [x] T022 [US3] Verify US3 tests fail before implementation and pass after implementation with `npm run test:generation`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and roadmap hygiene.

- [x] T023 [P] Update `specs/006-ai-generation-pipeline/quickstart.md` if implemented commands differ
- [x] T024 [P] Update F6 status in `.specify/roadmap.md` only after validation passes
- [x] T025 Run validation: `npm run lint`, `npm run typecheck`, `npm run test:generation`, `npm run test:retrieval`, and `npm run build`
- [x] T026 Review `git diff` for secrets, unrelated churn, and Spec Kit artifact consistency

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers the minimum viable generation pipeline.
- **US2 (Phase 4)**: Depends on pipeline orchestration from US1.
- **US3 (Phase 5)**: Depends on validator and narrator plumbing.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

## Parallel Opportunities

- T010 and T011 can be written in parallel because they target pipeline behavior vs provider request mapping.
- T019 and T020 can be written in parallel.
- T023 and T024 can be done in parallel after validation passes.

## Implementation Strategy

### MVP First

1. Complete setup and foundational prompts/validator.
2. Complete US1 tests and implementation with fake providers.
3. Add progress events.
4. Add advisory narration checks.
5. Persist only after the full validated/narrated draft passes.

### TDD Rule

For each story, write the listed tests first and run `npm run test:generation` to confirm the missing behavior fails before implementing the story.
