# Feature Specification: F11 Post-purchase and Mid-trip Revisions

**Feature Branch**: `011-mid-trip-revisions`

**Created**: 2026-06-12

**Status**: Draft

**Roadmap Item**: F11 Post-purchase & mid-trip revisions

**Input**: Roadmap F11 requires two owner revision modes after purchase: two planning revision rounds before travel and three mid-trip rounds while traveling. Revisions must reuse the grounded generation/validation pipeline, preserve visited stops during mid-trip changes, warn when future removed stops have scrapbook contributions, offer preservation at the day or trip level, expose remaining revision counts, and keep prior versions browsable/restorable until the next revision commits.

## User Scenarios & Testing

### User Story 1 - Request a Post-purchase Planning Revision (Priority: P1)

As the trip owner, I can request a natural-language revision after purchase but before travel so the family can adjust the itinerary while still planning.

**Why this priority**: This fulfills the Article V promise that purchased plans remain flexible before the trip starts and reuses the existing review/revision mental model from F7.

**Independent Test**: Seed a purchased owner trip before its start date with two planning revisions remaining, submit a revision request, verify a new draft revision is produced through the grounded revision service, the count decreases by one only after commit, and other owners cannot revise the trip.

**Acceptance Scenarios**:

1. **Given** the owner has a purchased trip that has not started and has planning revisions remaining, **When** they request a revision, **Then** the app creates a new revised itinerary candidate and shows it before replacing the current trip.
2. **Given** a revised candidate is available, **When** the owner commits it, **Then** the new version becomes current and the planning revision count decreases by one.
3. **Given** a planning revision request fails validation, **When** the app shows the result, **Then** the current trip remains unchanged and no revision count is consumed.
4. **Given** another owner attempts the same request, **When** the service checks ownership, **Then** the request is denied without exposing trip details.

---

### User Story 2 - Request a Mid-trip Future-stop Revision (Priority: P1)

As the trip owner during travel, I can revise only the remaining itinerary so places the family already visited are preserved.

**Why this priority**: Mid-trip adaptation is the core differentiator in Article V and must be safe for use from the car.

**Independent Test**: Seed a purchased trip with visited and future stops, request a mid-trip revision, verify visited days/stops remain untouched, only future stops change, the mid-trip count decreases only after commit, and the current/next stop context remains coherent.

**Acceptance Scenarios**:

1. **Given** the owner has a purchased trip currently underway and has mid-trip revisions remaining, **When** they request a revision, **Then** already visited stops remain fixed and only future stops are eligible to change.
2. **Given** the owner marks a stop as visited, **When** they request a mid-trip revision later, **Then** that stop is preserved in the revised candidate.
3. **Given** the revision candidate would reorder future stops, **When** it is committed, **Then** current trip detail and navigation handoff data reflect the new future itinerary.
4. **Given** a mid-trip revision request reaches the limit, **When** the owner opens the revision UI, **Then** it clearly says no free mid-trip revisions remain.

---

### User Story 3 - Preserve Scrapbook Contributions When Stops Are Removed (Priority: P1)

As the trip owner, I must be warned before committing a revision that removes a stop with notes, ratings, or photos, and I can preserve those contributions at the day or trip level.

**Why this priority**: Article IX and Article X require revisions not to destroy memories; this is the highest-risk F11 behavior because removals can silently detach user-generated content.

**Independent Test**: Seed future stops with notes, ratings, and photo metadata, generate a revision candidate that removes those stops, verify the commit is blocked until the owner selects a preservation target, and verify preserved contributions remain visible after commit.

**Acceptance Scenarios**:

1. **Given** a revision candidate removes a stop with active scrapbook contributions, **When** the owner reviews the candidate, **Then** the app shows a warning with the affected stop and contribution counts.
2. **Given** the owner chooses day-level preservation, **When** they commit, **Then** active contributions remain associated with the relevant day scrapbook.
3. **Given** the owner chooses trip-level preservation, **When** they commit, **Then** active contributions remain associated with the trip scrapbook.
4. **Given** the owner does not choose a preservation target for affected contributions, **When** they try to commit, **Then** the commit is rejected and the current trip remains unchanged.

---

### User Story 4 - Browse and Restore the Previous Version (Priority: P2)

As the trip owner, I can view the previous itinerary version after a revision and restore it before starting another revision so changes are reversible.

**Why this priority**: Article V says revisions must not destroy prior state and the owner can change their mind after reviewing the new version.

**Independent Test**: Commit a revision, load previous/current version metadata, restore the previous version, and verify current trip detail returns to the old itinerary while scrapbook contributions remain intact.

**Acceptance Scenarios**:

1. **Given** the owner committed a revision, **When** they open revision history, **Then** the immediately previous version is browsable beside the current version.
2. **Given** the owner restores the previous version before starting another revision, **When** restore completes, **Then** the previous version becomes current without consuming another free revision round.
3. **Given** the owner starts a new revision after a commit, **When** they inspect previous-version restore, **Then** only the latest previous version remains restore-eligible.

### Edge Cases

- A purchased trip has no generated itinerary revision yet.
- A trip start date is today, but no stops have been marked visited.
- A mid-trip revision is requested after every stop has been visited.
- A revision request is blank or too long.
- The grounded revision pipeline returns a candidate with an unverified stop.
- The candidate removes a future stop with notes, ratings, and pending photo metadata.
- The owner opens the commit screen in two tabs and submits twice.
- A revision candidate expires or is superseded by a newer candidate.
- Existing Stripe top-up support is disabled; the UI must not imply a purchasable top-up works yet.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose owner-only revision controls for purchased trips.
- **FR-002**: The system MUST allow exactly two free post-purchase planning revision commits before the trip begins.
- **FR-003**: The system MUST allow exactly three free mid-trip revision commits while the trip is underway.
- **FR-004**: The system MUST display the correct remaining revision count for the active mode before the owner submits a request.
- **FR-005**: The system MUST reject blank revision requests and requests longer than the accepted content limit before starting revision work.
- **FR-006**: The system MUST route every revision candidate through the same grounded generation and validation constraints as initial trip generation.
- **FR-007**: The system MUST NOT consume a revision count when generation, validation, or candidate creation fails.
- **FR-008**: The system MUST consume one revision count only after the owner commits a valid candidate.
- **FR-009**: The system MUST preserve already visited stops during mid-trip revisions.
- **FR-010**: The system MUST allow the owner to mark stops as visited from the trip detail flow.
- **FR-011**: The system MUST restrict revision requests, visited-stop writes, commits, and restores to the authenticated trip owner.
- **FR-012**: The system MUST detect active notes, ratings, and photo metadata attached to stops that a candidate would remove.
- **FR-013**: The system MUST block committing a candidate that removes contributed stops until the owner selects day-level or trip-level preservation for the affected contributions.
- **FR-014**: The system MUST preserve active notes, ratings, and photo metadata selected for preservation so they remain visible after the revision commits.
- **FR-015**: The system MUST keep deleted scrapbook contributions out of preservation warnings and preserved contribution lists.
- **FR-016**: The system MUST keep the current itinerary unchanged until the owner explicitly commits a candidate.
- **FR-017**: The system MUST allow the owner to browse the current and immediately previous itinerary version after a commit.
- **FR-018**: The system MUST allow the owner to restore the immediately previous itinerary version until a newer revision begins.
- **FR-019**: The system MUST provide clear limit messaging when no free revisions remain and MUST NOT show a working paid top-up path while Stripe top-ups are out of scope.
- **FR-020**: The system MUST update the trip detail page so current/next stop context, route overview, scrapbook surface, and navigation handoffs reflect the committed current version.

### Key Entities

- **Revision Request**: Owner-authored natural-language instruction with a mode, remaining-count context, and validation status.
- **Revision Candidate**: Non-current itinerary version produced by the revision pipeline and awaiting owner commit.
- **Revision Quota**: Per-trip count of committed planning and mid-trip revision rounds.
- **Visited Stop Marker**: Owner-created state that marks a stop as already completed and protected from mid-trip changes.
- **Preservation Decision**: Owner choice to preserve contributions from removed stops at the day or trip scope before candidate commit.
- **Previous Version Snapshot**: The latest prior itinerary version available for browse/restore until superseded.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Owner tests prove planning revision commits decrement the two-round planning quota only after a successful commit.
- **SC-002**: Owner tests prove mid-trip revision commits preserve visited stops and decrement the three-round mid-trip quota only after a successful commit.
- **SC-003**: Preservation tests prove commits are blocked for removed contributed stops until a day-level or trip-level preservation decision is provided.
- **SC-004**: Restore tests prove the owner can browse and restore the immediately previous version without losing active scrapbook contributions.
- **SC-005**: Access tests prove non-owners cannot request, commit, restore, or mark visited stops for another owner's trip.
- **SC-006**: The trip detail page renders revision controls and limit messaging with mobile-friendly controls and no paid top-up claim.
- **SC-007**: Validation passes with focused revision tests, trip-detail tests, scrapbook tests, lint, typecheck, and build.

## Assumptions

- F11 remains authenticated-owner-only; credential-free family revision participation and share-link contribution moderation remain F12 scope.
- Existing generation/retrieval/validation services can be reused with a revision context instead of creating a separate planner.
- The existing `trip_revisions` model remains the source of truth for itinerary versions.
- Existing scrapbook tables are sufficient for contribution detection and preservation metadata in this slice.
- Stripe top-up sales are deferred; limit messaging can explain that additional rounds are not yet available.
