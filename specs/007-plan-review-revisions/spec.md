# Feature Specification: Plan Review & Pre-Purchase Revisions

**Feature Branch**: `007-plan-review-revisions`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F7 plan review and pre-purchase revisions: authenticated owner review page for generated draft trips, progress-ready review surface, full day and stop itinerary display, natural-language pre-purchase revision request entry point, unlimited revisions before purchase, and previous versions browsable until the next revision commits."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review A Generated Draft Plan (Priority: P1)

As the authenticated trip owner, I want to open a generated draft trip and see the full itinerary by day and stop so I can decide whether it is ready to buy.

**Why this priority**: F7 is the handoff from AI generation to customer review. The owner must be able to inspect the grounded plan before any checkout or trip ownership flow exists.

**Independent Test**: Seed an owner, trip, current revision, days, and stops; load the owner review model and verify it returns the current draft plan with ordered days and stops while denying another owner.

**Acceptance Scenarios**:

1. **Given** a generated draft trip owned by the signed-in user, **When** the owner opens the review page, **Then** the page shows the trip title, summary, trip status, day sections, ordered stops, source badges, and route facts available for review.
2. **Given** the trip is still generating or failed generation, **When** the owner opens the review page, **Then** the page shows a progress-ready status panel instead of pretending the plan is ready.
3. **Given** another authenticated user attempts to open the review page, **When** the trip is not owned by them, **Then** the plan data is not returned.

---

### User Story 2 - Request Unlimited Pre-Purchase Revisions (Priority: P2)

As the trip owner, I want to ask for changes in natural language before purchase so I can keep refining the plan without consuming paid or post-purchase revision limits.

**Why this priority**: Article V promises that the family can change their mind before purchase. F7 must capture that intent and keep it distinct from the limited post-purchase revision rounds in F11.

**Independent Test**: Submit multiple valid pre-purchase revision requests for an unpurchased trip and verify each request is accepted, versioned, owner-scoped, and does not decrement any revision allowance.

**Acceptance Scenarios**:

1. **Given** an unpurchased draft trip, **When** the owner submits a natural-language revision request, **Then** the request is saved as a pending pre-purchase revision for that trip.
2. **Given** the owner has already requested several pre-purchase revisions, **When** they submit another request before purchase, **Then** the request is accepted without a quota warning.
3. **Given** a trip has already been purchased, **When** the owner uses the F7 pre-purchase revision form, **Then** the system refuses the request and directs later work to the post-purchase revision rules.

---

### User Story 3 - Browse Previous Draft Versions (Priority: P3)

As the trip owner, I want to browse a previous draft version while the next revision request is pending so I can compare changes without losing the plan I already liked.

**Why this priority**: Article V requires prior versions to remain browsable until the next revision commits, and F11 will build on the same versioning behavior.

**Independent Test**: Seed a trip with multiple revisions and verify the review model can load either the current revision or a specific previous revision owned by the same user.

**Acceptance Scenarios**:

1. **Given** a trip has multiple draft revisions, **When** the owner opens the review page, **Then** they see the current revision and a list of previous browsable versions.
2. **Given** the owner selects a previous revision, **When** it belongs to the same trip, **Then** the page displays that previous version without changing the current revision.
3. **Given** a revision request is pending, **When** the owner views the current plan, **Then** the previous committed version remains available until the pending revision commits.

### Edge Cases

- The generated trip has no current revision yet.
- The current revision has no days or stops because generation is still in progress.
- A stop has verified place metadata but no route fact.
- A route fact has distance but no duration, or duration but no distance.
- A revision request is blank, too short, too long, or contains only whitespace.
- A stale browser submits a pre-purchase revision request after the trip has been purchased.
- A previous revision id belongs to another trip or another owner.
- The owner signs out while viewing the review page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an authenticated owner-only review page for `/app/plan/[tripId]`.
- **FR-002**: System MUST load review data through owner-scoped access controls and deny trips not owned by the authenticated owner.
- **FR-003**: System MUST display the current draft revision title, summary, generation/review status, ordered days, and ordered stops when a draft is ready.
- **FR-004**: System MUST display a progress-ready status surface for trips that are generating, queued, failed, or missing a current ready revision.
- **FR-005**: System MUST show verified source information for venue stops when available, including the verified place identifier or a human-readable verified badge.
- **FR-006**: System MUST show route facts when available without inventing missing drive time or distance.
- **FR-007**: System MUST allow owners to submit natural-language revision requests only before purchase.
- **FR-008**: System MUST treat pre-purchase revision requests as unlimited and separate from post-purchase or mid-trip revision allowances.
- **FR-009**: System MUST validate revision request text before persistence and return field-safe errors for invalid text.
- **FR-010**: System MUST save accepted pre-purchase revision requests as owner-scoped pending revision records that preserve the currently browsable committed version.
- **FR-011**: System MUST list committed previous revisions for the trip and allow the owner to load a specific previous revision without changing the current revision.
- **FR-012**: System MUST prevent one owner from loading, listing, or mutating another owner's plan review or revision records.
- **FR-013**: System MUST avoid live AI or Google provider calls during review-page tests; F7 consumes persisted/generated data and queues revision intent only.
- **FR-014**: System MUST avoid Stripe checkout, share-link family access, scrapbook uploads, and post-purchase revision-limit behavior in this feature.

### Key Entities *(include if feature involves data)*

- **Plan Review**: Owner-safe view of a trip's current or selected draft revision with days, stops, route facts, and generation status.
- **Review Version**: A committed trip revision that can be browsed without changing the current revision pointer.
- **Pre-Purchase Revision Request**: Natural-language owner request captured before purchase and stored as a pending revision intent.
- **Plan Stop**: Ordered stop in a day, including verified place metadata, advisory description, and available route facts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Owner-scoped review tests prove the owner can load their current draft plan and another owner cannot.
- **SC-002**: Review model tests prove ordered days and stops are returned with no fabricated route facts.
- **SC-003**: Revision tests prove at least three pre-purchase revision requests can be accepted for one unpurchased trip without quota rejection.
- **SC-004**: Revision tests prove purchased trips reject F7 pre-purchase revision requests.
- **SC-005**: Version tests prove loading a previous revision does not update the trip's current revision.
- **SC-006**: UI or route tests prove `/app/plan/[tripId]` renders ready and progress-ready states for authenticated owners.

## Assumptions

- F6 provides generation contracts and provider-agnostic draft structures, but full intake-to-persisted-draft orchestration may still be incomplete; F7 consumes persisted trip/revision/day/stop data when present.
- The first F7 slice captures revision intent and version browsing. Executing the AI-backed revision job can be wired through the shared F6/F11 pipeline later.
- Pre-purchase revision requests have no numeric quota. Post-purchase planning and mid-trip revision limits belong to F11.
- Checkout and purchase fulfillment remain deferred to F8, so F7 only checks whether the trip is already purchased before accepting pre-purchase revision requests.
