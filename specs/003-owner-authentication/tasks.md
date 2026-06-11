# Tasks: Owner Authentication

**Input**: Design documents from `/specs/003-owner-authentication/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-contract.md, quickstart.md

**Tests**: Required. User requested TDD for Spec Kit development, and FR-013 requires automated tests for signup, login, logout, route protection, and safe auth error handling.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install auth dependency and create shared auth structure.

- [x] T001 Install `@neondatabase/auth` in `package.json` and `package-lock.json`
- [x] T002 Create auth source directories `src/lib/auth/`, `src/components/auth/`, `src/app/auth/`, and `tests/auth/`
- [x] T003 Add auth environment documentation to `.env.example` and `docs/NEON.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth integration that MUST be complete before user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create Neon Auth server instance in `src/lib/auth/server.ts`
- [x] T005 Create Neon Auth client instance in `src/lib/auth/client.ts`
- [x] T006 Create auth API route handler in `src/app/api/auth/[...path]/route.ts`
- [x] T007 Create shared auth validation contracts in `src/lib/auth/validation.ts`
- [x] T008 Create owner session and reconciliation helper skeleton in `src/lib/auth/owner.ts`

**Checkpoint**: Auth provider plumbing exists and user story implementation can begin.

---

## Phase 3: User Story 1 - Owner Can Create An Account And Sign In (Priority: P1) MVP

**Goal**: Owners can sign up, sign in with email/password or Google, and resolve to one TripAI owner identity.

**Independent Test**: Sign up with email/password, sign out, sign back in, and prove the owner reaches `/app` with the same owner identity. Google sign-in initiation is tested without completing a live provider flow.

### Tests for User Story 1

> Write these tests FIRST and ensure they fail before implementation.

- [x] T009 [P] [US1] Add signup/login validation tests in `tests/auth/validation.test.ts`
- [x] T010 [P] [US1] Add owner reconciliation tests in `tests/auth/owner-reconciliation.test.ts`
- [x] T011 [P] [US1] Add email signup/login page smoke tests in `tests/e2e/auth.spec.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement signup, login, Google sign-in, and sign-out server actions in `src/lib/auth/actions.ts`
- [x] T013 [US1] Implement owner reconciliation in `src/lib/auth/owner.ts`
- [x] T014 [P] [US1] Create reusable auth card and field UI in `src/components/auth/auth-card.tsx`
- [x] T015 [P] [US1] Create Google sign-in button in `src/components/auth/google-sign-in-button.tsx`
- [x] T016 [US1] Create sign-up form in `src/components/auth/sign-up-form.tsx`
- [x] T017 [US1] Create sign-in form in `src/components/auth/sign-in-form.tsx`
- [x] T018 [US1] Create owner signup page in `src/app/auth/sign-up/page.tsx`
- [x] T019 [US1] Create owner signin page in `src/app/auth/sign-in/page.tsx`
- [x] T020 [US1] Create sign-out page in `src/app/auth/sign-out/page.tsx`
- [x] T021 [US1] Create authenticated owner landing shell in `src/app/app/page.tsx`

**Checkpoint**: US1 is functional and testable independently.

---

## Phase 4: User Story 2 - Owner Session Protects Private App Surfaces (Priority: P2)

**Goal**: Signed-out users cannot access owner-only pages; signed-in users can.

**Independent Test**: Visit `/app` while signed out and verify redirect to `/auth/sign-in`, then use a mocked/signed-in path to prove access when a session is present.

### Tests for User Story 2

- [x] T022 [P] [US2] Add protected-route redirect coverage in `tests/e2e/auth.spec.ts`
- [x] T023 [P] [US2] Add owner session helper tests in `tests/auth/owner-reconciliation.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] Implement Next.js 16 route protection in `proxy.ts`
- [x] T025 [US2] Wire protected owner app page to require reconciled owner context in `src/app/app/page.tsx`
- [x] T026 [US2] Update root landing links for owner login/signup and app entry in `src/app/page.tsx`

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Authentication Errors Are Clear And Safe (Priority: P3)

**Goal**: Invalid credentials, malformed input, duplicate signup, and provider failures show safe, actionable messages without leaking private data.

**Independent Test**: Submit invalid signup/login inputs and verify generic errors with no account-existence disclosure.

### Tests for User Story 3

- [x] T027 [P] [US3] Add safe error mapping tests in `tests/auth/validation.test.ts`
- [x] T028 [P] [US3] Add auth error UI coverage in `tests/e2e/auth.spec.ts`

### Implementation for User Story 3

- [x] T029 [US3] Implement safe error mapping in `src/lib/auth/validation.ts`
- [x] T030 [US3] Wire safe errors into signin and signup forms in `src/components/auth/sign-in-form.tsx` and `src/components/auth/sign-up-form.tsx`
- [x] T031 [US3] Ensure provider failure copy is generic in `src/components/auth/google-sign-in-button.tsx`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, roadmap, and cleanup.

- [x] T032 Run `npm run lint` and fix any issues
- [x] T033 Run `npm run typecheck` and fix any issues
- [x] T034 Run `npm run test:db` and fix any issues
- [x] T035 Run `npm run build` and fix any issues
- [x] T036 Run `npm run test:e2e` and fix any issues
- [x] T037 Run F3 quickstart from `specs/003-owner-authentication/quickstart.md`
- [x] T038 Update `.specify/roadmap.md` to mark F3 complete only after all F3 acceptance checks pass
- [x] T039 Review `docs/ARCHITECTURE.md` and `docs/NEON.md` for final auth implementation drift

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on Foundational; integrates with the `/app` shell from US1 for final behavior.
- **US3 (Phase 5)**: Depends on Foundational; can be developed alongside US1/US2 but should be validated after forms exist.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: No dependency on other stories after Foundational.
- **US2**: Uses the owner app shell from US1 but route protection can be tested independently.
- **US3**: Uses forms/actions from US1 but error mapping is independently testable.

### Within Each User Story

- Tests must be written before implementation.
- Validation before server actions.
- Owner reconciliation before owner-scoped page access.
- Route protection before final protected-page validation.

## Parallel Opportunities

- T009, T010, and T011 can be written in parallel.
- T014 and T015 can be implemented in parallel after T012/T013 contracts are understood.
- T022 and T023 can be written in parallel.
- T027 and T028 can be written in parallel.

## Parallel Example: User Story 1

```bash
Task: "Add signup/login validation tests in tests/auth/validation.test.ts"
Task: "Add owner reconciliation tests in tests/auth/owner-reconciliation.test.ts"
Task: "Add email signup/login page smoke tests in tests/e2e/auth.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational auth plumbing.
3. Write US1 tests and confirm they fail.
4. Implement US1.
5. Validate signup/signin owner identity flow.

### Incremental Delivery

1. US1: owner account/session.
2. US2: owner route protection.
3. US3: safe auth error handling.
4. Polish: full validation, roadmap update, docs drift check.

## Notes

- Keep raw auth provider errors out of user-facing copy.
- Do not add account requirements to future family share-link routes.
- Use the Neon testing branch for database-backed owner reconciliation tests.
