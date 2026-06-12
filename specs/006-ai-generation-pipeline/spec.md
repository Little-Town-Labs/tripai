# Feature Specification: AI Generation Pipeline

**Feature Branch**: `006-ai-generation-pipeline`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F6 AI generation pipeline: planner, validator, narrator, streaming progress events, strict retrieval grounding, retry loop max 2, advisory voice, structured draft trip output consumed by F7 review and later F11 revisions. Runtime should be driven by OpenRouter using `google/gemma-4-26b-a4b-it` as the MVP model, not hard-coded to the old Anthropic-only roadmap assumption."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate A Grounded Draft Trip (Priority: P1)

As the authenticated trip owner, I want my saved intake to produce a draft itinerary grounded in verified retrieval data so I can review a real trip plan instead of a generic AI answer.

**Why this priority**: This is the minimum useful F6 outcome and unlocks F7 plan review. Article III requires every generated stop to be tied to verified source data.

**Independent Test**: Provide a valid intake and controlled retrieval context, run the generation pipeline with fake model responses, and verify a structured draft trip with days and stops is produced only from verified retrieval candidates.

**Acceptance Scenarios**:

1. **Given** a saved intake and retrieval context containing verified places and route data, **When** the owner starts generation, **Then** the pipeline returns a structured draft trip with title, summary, days, and ordered stops.
2. **Given** the planner proposes a stop not present in retrieval context, **When** validation runs, **Then** the pipeline rejects the draft and retries with validation feedback.
3. **Given** the planner fails validation more than two times, **When** generation completes, **Then** the owner receives an actionable generation failure without any ungrounded draft being saved as confirmed.

---

### User Story 2 - Stream Human-Readable Progress (Priority: P2)

As the trip owner waiting for a plan, I want visible progress updates within two seconds so I know TripAI is actively building the trip.

**Why this priority**: Streaming progress is a constitutional promise in Article VI and makes a slow generation workflow feel trustworthy.

**Independent Test**: Run generation with fake slow planner/narrator providers and verify the pipeline emits ordered, human-readable progress events before and during planning, validation, and narration.

**Acceptance Scenarios**:

1. **Given** generation has started, **When** retrieval begins, **Then** the first progress event is emitted within two seconds.
2. **Given** planner, validator, and narrator stages run, **When** each stage changes state, **Then** the owner receives a human-readable event such as searching, planning, validating, retrying, or writing summaries.
3. **Given** generation fails, **When** the failure is surfaced, **Then** the owner sees a plain-language failure event and no raw provider payload or secret value.

---

### User Story 3 - Narrate With Advisory Voice (Priority: P3)

As the trip owner, I want the generated title, summaries, descriptions, and tips to sound like helpful suggestions so my family keeps agency over the plan.

**Why this priority**: Article IV requires advisory language and forbids imperative or compulsory itinerary copy.

**Independent Test**: Provide a validated planner draft and fake narrator response, then verify generated copy passes advisory-language checks and is rejected if it uses prohibited commanding language.

**Acceptance Scenarios**:

1. **Given** a validated draft, **When** narration runs, **Then** every day and stop receives advisory copy that references verified facts without inventing hours, prices, or addresses.
2. **Given** narrator output includes phrases such as "you must" or "required stop", **When** narrative validation runs, **Then** the output is rejected and retried or surfaced as a generation failure.
3. **Given** optional source facts are missing, **When** narration writes copy, **Then** it omits those facts rather than presenting them as confirmed.

### Edge Cases

- Runtime provider credentials are missing or invalid.
- The selected model does not support structured output, streaming, or the requested response format.
- Retrieval context has too few verified places for a complete plan.
- The planner returns malformed JSON or a structurally valid plan with unverified stops.
- The provider times out, rate-limits, or returns a safety refusal.
- Narration includes imperative language or fabricated source facts.
- A route skeleton is unavailable, so drive-time claims must not be generated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a saved trip intake and retrieval context as the only factual inputs to generation.
- **FR-002**: System MUST emit ordered progress events for retrieval, planning, validation, retry, narration, persistence, success, and failure states.
- **FR-003**: System MUST produce structured planner output that can be mapped to `Trip`, `TripDay`, `Stop`, and `TripRevision` data.
- **FR-004**: System MUST reject any generated stop that lacks a verified place identifier from the retrieval context, except pure drive placeholders that make no venue claim.
- **FR-005**: System MUST reject planner output that invents drive times or distances not present in route context.
- **FR-006**: System MUST retry invalid planner output no more than two times before returning a typed generation failure.
- **FR-007**: System MUST run a non-AI validator before any generated draft is marked ready for owner review.
- **FR-008**: System MUST run narration only after planner output passes validation.
- **FR-009**: System MUST enforce advisory voice and reject imperative or compulsory generated copy.
- **FR-010**: System MUST keep model provider credentials server-side and prevent provider secrets from appearing in browser payloads, logs, test snapshots, or persisted trip data.
- **FR-011**: System MUST support a runtime provider abstraction so OpenRouter can drive the MVP without coupling the domain pipeline to one vendor SDK.
- **FR-012**: System MUST support deterministic tests with fake model providers and fake retrieval context without live AI credentials.
- **FR-013**: System MUST persist only validated draft trip data, version metadata, and owner-scoped generation state.
- **FR-014**: System MUST expose a stable internal generation contract that F7 review and F11 revisions can consume.
- **FR-015**: System MUST return typed, owner-safe failure messages for provider errors, malformed model output, validation failures, and missing retrieval data.

### Key Entities *(include if feature involves data)*

- **Generation Request**: Owner-scoped request to transform a saved intake and retrieval context into a draft trip.
- **Progress Event**: Human-readable generation status update with ordered stage metadata.
- **Planner Draft**: Structured itinerary proposal before validation and narration.
- **Validation Report**: Deterministic pass/fail result describing grounding, route, structure, and required-stop checks.
- **Narrated Draft**: Validated itinerary with advisory title, summaries, descriptions, and tips.
- **Generation Failure**: Typed, safe error returned when generation cannot produce a grounded draft.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Controlled valid retrieval context produces a structured draft trip in automated tests.
- **SC-002**: 100% of generated venue stops in tests reference a verified retrieval place identifier.
- **SC-003**: Invalid planner output is retried at most two times and then fails safely.
- **SC-004**: Progress events include a first visible event within two seconds in fake-timer tests.
- **SC-005**: Advisory-language validation rejects prohibited imperative phrases in automated tests.
- **SC-006**: Missing provider credentials do not trigger live calls during normal tests and produce typed configuration failures.

## Assumptions

- F6 delivers the backend generation pipeline and internal contracts, not the full review UI; F7 owns the customer-facing review page.
- OpenRouter is the preferred runtime provider for MVP using `google/gemma-4-26b-a4b-it`, while OpenAI direct can be added behind the same provider contract if needed.
- Codex remains a development and workflow agent for building TripAI, not the production runtime that generates customer vacation plans.
- Model names, provider routing, and token budgets are configuration values, not hard-coded product rules.
- Live provider smoke tests are optional and credential-gated; core CI relies on fake providers.
