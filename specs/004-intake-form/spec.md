# Feature Specification: Intake Form

**Feature Branch**: `004-intake-form`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F4 intake form responsive wizard for authenticated trip owners to capture origin, dates, party, interests, budget, and constraints, saving draft intake data for trip generation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Completes A Trip Intake Draft (Priority: P1)

As the signed-in trip owner, I need a simple step-by-step intake flow so I can describe the family road trip without facing one long form.

**Why this priority**: F4 is the first product workflow after authentication. It creates the trip planning input required by retrieval and AI generation while keeping the experience approachable for a busy parent.

**Independent Test**: Can be fully tested by signing in, opening the intake flow, completing all required steps with a family road-trip request, submitting it, and proving a draft intake is saved for the owner.

**Acceptance Scenarios**:

1. **Given** a signed-in owner is on the app home surface, **When** they start a new trip plan, **Then** they see a multi-step intake flow with clear progress through the required planning questions.
2. **Given** a signed-in owner provides valid origin, destination area, dates, party composition, interests, budget, and constraints, **When** they submit the intake, **Then** the draft intake is saved and associated with that owner.
3. **Given** a signed-in owner submits the final step, **When** saving succeeds, **Then** the owner sees a clear next state that the intake is ready for trip generation.

---

### User Story 2 - Owner Can Correct Inputs Before Submission (Priority: P2)

As the trip owner, I need field-level validation and easy backtracking so mistakes such as impossible dates or missing party details do not turn into bad trip plans.

**Why this priority**: The generation pipeline depends on usable intake data. Catching mistakes before submission prevents expensive generation failures and improves trust.

**Independent Test**: Can be fully tested by entering invalid or incomplete values across steps and proving the flow blocks submission, explains the issue, and preserves valid answers while the owner corrects mistakes.

**Acceptance Scenarios**:

1. **Given** an owner enters an end date before the start date, **When** they try to continue or submit, **Then** the flow explains the date issue and keeps the owner on the relevant step.
2. **Given** an owner omits a required value, **When** they try to continue, **Then** the flow identifies the missing value without discarding other answers.
3. **Given** an owner moves backward to edit an earlier step, **When** they return to later steps, **Then** previously entered values remain available unless they conflict with the edit.

---

### User Story 3 - Intake Works On Mobile And Desktop (Priority: P3)

As a parent planning from either a phone or laptop, I need the intake flow to be readable, tappable, and complete on common mobile and desktop viewports.

**Why this priority**: The constitution requires the planning flow to work on both desktop and mobile, and intake is the first planning surface a family will judge.

**Independent Test**: Can be fully tested by completing the intake flow on mobile and desktop viewport sizes and proving all controls are reachable, readable, and usable without layout overlap.

**Acceptance Scenarios**:

1. **Given** an owner uses a phone-sized viewport, **When** they complete the intake flow, **Then** every required control is reachable with large tappable targets and no text overlap.
2. **Given** an owner uses a desktop viewport, **When** they complete the intake flow, **Then** the layout remains efficient and does not require excessive scrolling for each step.
3. **Given** an owner changes viewport size mid-flow, **When** the layout adapts, **Then** entered answers remain intact and controls remain usable.

### Edge Cases

- The trip date range cannot be empty, reversed, or unreasonably long for an MVP road-trip plan.
- Party composition must allow adults and children to be represented clearly, including children's ages when children are included.
- Interest selections must allow common family road-trip priorities while still accepting free-form constraints.
- Budget must be captured as a planning preference, not a payment or checkout commitment.
- Dietary, mobility, pacing, and other constraints may be optional but must not be lost when entered.
- A signed-out visitor who reaches the owner intake route must be sent to sign in without losing the intent to start planning.
- Saving failure must not claim the intake is ready or discard entered answers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a multi-step intake flow for creating a new trip planning draft.
- **FR-002**: The intake flow MUST capture origin, destination area, travel start date, travel end date, adult count, child count, child ages when applicable, interests, budget preference, dietary needs, mobility notes, travel style, and additional constraints.
- **FR-003**: The intake flow MUST show the owner their progress through the steps and the current step's purpose.
- **FR-004**: The system MUST validate required fields before allowing final submission.
- **FR-005**: The system MUST validate that the travel date range is chronological and within a reasonable MVP trip length.
- **FR-006**: The system MUST validate that party counts and child ages are internally consistent.
- **FR-007**: The system MUST preserve entered values as the owner moves forward and backward through the intake steps.
- **FR-008**: The system MUST allow the owner to correct validation errors without re-entering unrelated answers.
- **FR-009**: The system MUST save a completed intake as a draft associated with the signed-in owner.
- **FR-010**: The system MUST make saved draft intake data available for the later trip generation pipeline.
- **FR-011**: The system MUST communicate save success, validation failures, and save failures in plain language.
- **FR-012**: The intake flow MUST work on both mobile and desktop viewports.
- **FR-013**: The intake flow MUST preserve TripAI's advisory posture and avoid presenting planning preferences as commands or obligations.
- **FR-014**: The system MUST avoid exposing one owner's saved intake data to another owner or to signed-out visitors.
- **FR-015**: The feature MUST include automated tests for successful owner draft creation, validation failures, owner-route protection, and mobile/desktop intake usability.

### Key Entities *(include if feature involves data)*

- **Trip Intake Draft**: The planning answers supplied by an owner before trip generation, including route, dates, family composition, preferences, and constraints.
- **Trip Owner**: The authenticated person who owns and controls the intake draft.
- **Party Profile**: The adult/child composition and child ages used to tailor the future itinerary.
- **Planning Preference**: Interests, budget preference, pacing, dietary needs, mobility notes, and other constraints that shape future generation.
- **Validation State**: The current set of missing or inconsistent answers that must be resolved before saving.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in owner can complete and save a valid intake draft in under 5 minutes during manual or automated acceptance testing.
- **SC-002**: Automated tests prove a valid intake is persisted for the correct owner and is not accessible through another owner's context.
- **SC-003**: Automated tests prove invalid date ranges, missing required fields, and inconsistent child details are blocked before final submission.
- **SC-004**: Mobile and desktop acceptance tests can complete the full intake flow without overlapping controls, unreachable inputs, or unreadable text.
- **SC-005**: At least 90% of required intake fields are represented in the saved draft exactly as entered or selected by the owner.
- **SC-006**: Save failure handling preserves entered answers and does not show a false success state.

## Assumptions

- F2 data model and RLS policies already include an owner-scoped Trip Intake table or equivalent draft storage.
- F3 owner authentication is complete and the primary MVP intake path is a signed-in owner.
- Anonymous intake before purchase remains architecturally compatible, but this family-only MVP slice prioritizes authenticated-owner draft persistence.
- Stripe checkout remains deferred and does not participate in F4.
- Trip generation begins in a later feature; F4 only needs to save intake data and show a ready-for-generation next state.
- Photo storage remains deferred and is unrelated to intake.
