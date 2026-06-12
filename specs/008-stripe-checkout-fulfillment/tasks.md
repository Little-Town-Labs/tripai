# Tasks: Stripe Checkout & Fulfillment

**Input**: Design documents from `/specs/008-stripe-checkout-fulfillment/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the project TDD process. Write behavior tests before implementation and confirm they fail for missing behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish checkout module, focused tests, and disabled-by-default configuration.

- [x] T001 Review current Stripe Checkout Sessions and webhook signature docs cited in `specs/008-stripe-checkout-fulfillment/research.md`
- [x] T002 Review Next.js 16 Route Handler, Server Action, redirect, and dynamic route docs cited in `specs/008-stripe-checkout-fulfillment/research.md`
- [x] T003 Add `test:checkout` script to `package.json`
- [x] T004 Create checkout module skeleton files in `src/lib/checkout/config.ts`, `src/lib/checkout/service.ts`, `src/lib/checkout/stripe.ts`, and `src/lib/checkout/webhook.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared configuration, price validation, provider contracts, and owner-scoped trip lookup.

- [x] T005 Write failing checkout configuration tests in `tests/checkout/config.test.ts`
- [x] T006 Implement disabled-by-default checkout config in `src/lib/checkout/config.ts`
- [x] T007 Write failing checkout service tests for owner-scoped eligibility in `tests/checkout/service.test.ts`
- [x] T008 Implement checkout service types, owner-scoped trip lookup, and price validation in `src/lib/checkout/service.ts`
- [x] T009 Write failing webhook parsing/verification tests in `tests/checkout/webhook.test.ts`
- [x] T010 Implement webhook event types and verification boundary in `src/lib/checkout/webhook.ts`

---

## Phase 3: User Story 1 - See Checkout Disabled Safely (Priority: P1)

**Goal**: Checkout is visible but safely disabled unless explicitly enabled.

**Independent Test**: With feature flag off, checkout status/action refuse before provider calls.

### Tests for User Story 1

- [x] T011 [US1] Add service tests proving disabled checkout does not invoke provider in `tests/checkout/service.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement disabled checkout status and refusal behavior in `src/lib/checkout/service.ts`
- [x] T013 [US1] Add `/app/plan/[tripId]/checkout/page.tsx` disabled/eligible display
- [x] T014 [US1] Verify US1 tests fail before implementation and pass after implementation with `npm run test:checkout`

---

## Phase 4: User Story 2 - Start One-Time Hosted Checkout When Enabled (Priority: P2)

**Goal**: Enabled checkout creates a one-time hosted payment session with integer cents and owner/trip metadata.

**Independent Test**: Fake provider receives a payment-mode request and returns URL/session id without live Stripe credentials.

### Tests for User Story 2

- [x] T015 [US2] Add fake-provider checkout creation tests in `tests/checkout/service.test.ts`
- [x] T016 [US2] Add Stripe adapter request mapping tests in `tests/checkout/stripe.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Implement provider-independent checkout creation in `src/lib/checkout/service.ts`
- [x] T018 [US2] Implement Stripe Checkout REST adapter in `src/lib/checkout/stripe.ts`
- [x] T019 [US2] Add Server Action and redirect flow in `src/app/app/plan/[tripId]/checkout/actions.ts`
- [x] T020 [US2] Add checkout panel component in `src/components/checkout/checkout-panel.tsx`
- [x] T021 [US2] Verify US2 tests fail before implementation and pass after implementation with `npm run test:checkout`

---

## Phase 5: User Story 3 - Fulfill Purchase From Verified Webhook (Priority: P3)

**Goal**: Verified completion webhooks mark the matching trip purchased and invalid/duplicate events are safe.

**Independent Test**: Signed fake completion event fulfills once; invalid, mismatched, and duplicate events do not corrupt state.

### Tests for User Story 3

- [x] T022 [US3] Add fulfillment tests for valid, invalid, duplicate, mismatched, and unpaid events in `tests/checkout/webhook.test.ts`

### Implementation for User Story 3

- [x] T023 [US3] Implement `fulfillCheckoutSession` in `src/lib/checkout/service.ts`
- [x] T024 [US3] Add `/api/stripe/webhook/route.ts` raw-body signature route handler
- [x] T025 [US3] Verify US3 tests fail before implementation and pass after implementation with `npm run test:checkout`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and roadmap hygiene.

- [x] T026 [P] Update `AGENTS.md` active feature plan pointer to `specs/008-stripe-checkout-fulfillment/plan.md`
- [x] T027 [P] Add disabled-by-default Stripe env placeholders to `.env.example` if missing
- [x] T028 [P] Update F8 status in `.specify/roadmap.md` only after validation passes
- [x] T029 Run validation: `npm run lint`, `npm run typecheck`, `npm run test:checkout`, `npm run test:plan-review`, and `npm run build`
- [x] T030 Review `git diff` for secrets, unrelated churn, and Spec Kit artifact consistency

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers safe disabled checkout.
- **US2 (Phase 4)**: Depends on US1/config and adds provider-backed session creation.
- **US3 (Phase 5)**: Depends on session persistence and adds webhook fulfillment.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

## Parallel Opportunities

- T005 and T009 can be written in parallel because config and webhook verification are independent.
- T016 and T018 can proceed independently from UI after the provider contract is stable.
- T019 and T020 can be implemented together after checkout creation passes service tests.

## Implementation Strategy

### MVP First

1. Complete disabled-by-default configuration and checkout status.
2. Add owner checkout page that fails closed.
3. Add fake-provider session creation and Stripe adapter request mapping.
4. Add webhook verification and idempotent fulfillment.
5. Keep live Stripe smoke manual and credential-gated.

### TDD Rule

For each story, write the listed tests first and run `npm run test:checkout` to confirm missing behavior fails before implementing the story.
