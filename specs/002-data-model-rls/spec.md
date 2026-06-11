# Feature Specification: Data Model & Access Policies

**Feature Branch**: `002-data-model-rls`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F2 Data model and RLS policies: define the TripAI production data model in Neon Postgres with Drizzle migrations, owner-auth and share-token access paths, dedicated tests for every RLS allow and deny policy, revision-safe scrapbook relationships, and a Neon testing branch for TDD validation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Data Is Private By Default (Priority: P1)

As a trip owner, I need every trip, itinerary, stop, and contribution to be visible only to me unless I explicitly share it, so my family travel plans and memories stay private by default.

**Why this priority**: Privacy by default is a constitutional requirement and the foundation for owner authentication, trip planning, and all future itinerary surfaces.

**Independent Test**: Can be fully tested by creating two owners with separate trips and proving each owner can read and change only their own records while all cross-owner reads and writes are denied.

**Acceptance Scenarios**:

1. **Given** two owners each have trip data, **When** one owner requests their own trip with days, stops, notes, ratings, and photo metadata, **Then** the full owned record set is available.
2. **Given** two owners each have trip data, **When** one owner attempts to read, change, or delete the other owner's trip data, **Then** the request is denied.
3. **Given** a trip is created without any share link, **When** a non-owner attempts to access any trip row or related row, **Then** no trip data is exposed.

---

### User Story 2 - Family Share Links Can View And Contribute Without Accounts (Priority: P2)

As a family member with a share link, I need to view the shared trip and add notes, ratings, and photo metadata using a display name without creating an account.

**Why this priority**: Credential-free family participation is a launch commitment and must be represented in the access model before user interfaces are built.

**Independent Test**: Can be fully tested by creating an active share link for one trip, accessing trip data through that link, adding a contribution with a display name, and proving the same token cannot access unrelated trips.

**Acceptance Scenarios**:

1. **Given** an owner creates an active share link for a purchased trip, **When** a family member uses that link, **Then** they can view the trip, days, stops, and existing contributions for that trip.
2. **Given** a family member is using an active share link, **When** they add a note, rating, or photo metadata with a display name, **Then** the contribution is attached to the shared trip and attributed to that display name.
3. **Given** a family member has a share link for one trip, **When** they attempt to access another trip, **Then** access is denied.
4. **Given** an owner revokes a share link, **When** that token is used again, **Then** all view and contribution access through that token is denied.

---

### User Story 3 - Revisions Preserve Scrapbook Contributions (Priority: P3)

As a trip owner, I need itinerary revisions to preserve notes, ratings, and photo metadata when stops remain, and to identify contributions at risk when stops are removed.

**Why this priority**: Future revision features depend on a data model that does not destroy memories when the itinerary changes.

**Independent Test**: Can be fully tested by creating a trip version with contributed notes, ratings, and photo metadata, recording a revision, and proving contributions remain linked to retained stops while removed-stop contributions remain discoverable for preservation.

**Acceptance Scenarios**:

1. **Given** a trip has notes, ratings, and photo metadata attached to stops, **When** a revision keeps those stops, **Then** the contributions remain attached and visible.
2. **Given** a revision would remove a stop with contributions, **When** the revision is prepared, **Then** the affected contributions can be identified before the revision is committed.
3. **Given** a trip has multiple revisions, **When** the owner reviews revision history, **Then** the current version and prior version metadata are distinguishable.

---

### User Story 4 - Planning Data Supports Verified Trip Generation (Priority: P4)

As the trip planner pipeline, I need structured intake, trip day, and stop records that preserve verified venue and route facts so future generation work can reject ungrounded recommendations.

**Why this priority**: The generation pipeline is not part of this feature, but the data model must make grounding enforceable before pipeline work begins.

**Independent Test**: Can be fully tested by attempting to store itinerary stops with and without required verification anchors and proving only valid planning data is accepted.

**Acceptance Scenarios**:

1. **Given** a generated itinerary stop references a verified venue, **When** it is saved, **Then** the stop stores the venue identity, address/location facts, ordering, and route context needed by later trip views.
2. **Given** a non-drive itinerary stop lacks a verified venue identity, **When** it is saved, **Then** the record is rejected.
3. **Given** trip intake contains dates, party details, interests, budget, and constraints, **When** it is saved, **Then** the intake remains linked to the generated trip.

### Edge Cases

- A revoked share link must deny access immediately, including contribution writes.
- A share token must not grant access to owner identity, email, payment identifiers, or unrelated trips.
- Family contributions must support display-name attribution without an authenticated user.
- Owner deletion must be representable as a future operation that removes a trip and all related family contributions.
- Photo binary storage is deferred, but photo metadata must be modeled so future object storage can attach to trip, day, or stop scope.
- Ratings must enforce valid star values and allow optional text.
- Trip revisions must preserve enough version metadata to support rollback and contribution-preservation warnings in later features.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent owners, trip intake, trips, trip days, stops, notes, ratings, photo metadata, share links, and trip revisions as first-class data entities.
- **FR-002**: The system MUST keep each trip owner-only by default until the owner explicitly creates an active share link.
- **FR-003**: The system MUST enforce owner-scoped access for every trip-related entity, including itinerary rows and contribution rows.
- **FR-004**: The system MUST enforce share-link-scoped access for family recipients, limited to the single trip attached to an active, unrevoked share link.
- **FR-005**: The system MUST allow share-link recipients to add notes, ratings, and photo metadata with a self-chosen display name and without an account.
- **FR-006**: The system MUST prevent share-link recipients from seeing owner email, authentication identity, payment identifiers, or unrelated trips.
- **FR-007**: The system MUST support immediate share-link revocation that blocks both reads and writes through the revoked token.
- **FR-008**: The system MUST store share-link secret material in a form that does not expose raw tokens through normal trip or contribution reads.
- **FR-009**: The system MUST represent trip revisions so the current version and prior version metadata are distinguishable.
- **FR-010**: The system MUST preserve contribution relationships for itinerary stops that remain across revisions.
- **FR-011**: The system MUST allow later revision workflows to identify notes, ratings, and photo metadata attached to stops that would be removed.
- **FR-012**: The system MUST require verified venue identity for all itinerary stops that represent real-world places.
- **FR-013**: The system MUST store money-related trip ownership fields, when present, as integer cents.
- **FR-014**: The system MUST allow a future full trip deletion operation to remove the trip, itinerary, share links, and all owner and family contributions.
- **FR-015**: The system MUST provide automated tests for every owner and share-link access rule, covering both allowed and denied paths.
- **FR-016**: The system MUST provide automated tests for core data constraints, including required verification anchors, rating range, share-link revocation, and revision-safe contribution relationships.
- **FR-017**: The system MUST support test execution in an isolated database environment so schema and access policy validation cannot damage shared development data.

### Key Entities *(include if feature involves data)*

- **Owner**: The authenticated trip purchaser or planner who owns trips and controls sharing, moderation, export, and deletion authority.
- **TripIntake**: The family's planning inputs, including origin, destination area, dates, party composition, interests, budget, dietary needs, mobility notes, and travel style.
- **Trip**: The owner-controlled itinerary container, including title, summary, status, ownership state, purchase metadata, revision counts, and current revision.
- **TripDay**: A day within a trip, including day number, date, label, start/end locations, route totals, and narrative summary.
- **Stop**: A planned itinerary item within a day, including order, type, verified venue identity where required, location details, route context, descriptive copy, and visited state.
- **Note**: A textual contribution attached to a trip, day, or stop, attributed either to the owner or a share-link display name.
- **Rating**: A 1-5 star contribution with optional text and tags, attached to a stop and attributed either to the owner or a share-link display name.
- **PhotoMetadata**: A durable reference record for future photo uploads, attachable to trip, day, or stop scope, with caption and attribution. Binary photo storage is outside this feature.
- **ShareLink**: An owner-created trip access grant with secret token material, active/revoked state, creation metadata, and moderation context.
- **TripRevision**: A version record for itinerary changes, used to distinguish current and prior versions and to preserve or flag contributions during revisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of trip-related data entities have automated owner access tests that prove both same-owner access and cross-owner denial.
- **SC-002**: 100% of share-link-accessible entities have automated tests that prove active-token access, unrelated-trip denial, and revoked-token denial.
- **SC-003**: A test trip can be created with intake, at least two days, at least five stops, notes, ratings, photo metadata, a share link, and a revision record without violating data constraints.
- **SC-004**: Attempts to store invalid planning data, including an out-of-range rating or a real-world stop without required venue verification, are rejected by automated tests.
- **SC-005**: Revision tests prove contributions attached to retained stops remain accessible after a revision and contributions attached to removed stops can be identified before commit.
- **SC-006**: All schema and access policy validation can run against an isolated test database environment without using production or shared development data.

## Assumptions

- F1 platform bootstrap is complete and provides local Neon credentials and Neon Auth status.
- F3 owner authentication will consume the owner identity model created here; this feature does not build login UI.
- F10 photo upload will provide object storage; this feature models photo metadata only.
- F11 revisions will implement the revision workflow; this feature stores the version and contribution relationships needed by that workflow.
- F12 family sharing will implement the user interface for share links; this feature creates the access model that makes sharing safe.
- Stripe fulfillment is deferred to F8, but ownership and purchase-related fields must be compatible with one-time purchase semantics.
- Database validation should use a dedicated testing branch or equivalent isolated environment.
