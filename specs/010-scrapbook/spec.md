# Feature Specification: F10 Scrapbook Notes and Ratings

**Feature Branch**: `010-scrapbook`

**Created**: 2026-06-12

**Status**: Draft

**Roadmap Item**: F10 Scrapbook (notes, ratings, photos)

**Input**: Roadmap F10 asks for per-stop, per-day, and per-trip notes; per-stop ratings; and photo upload. Prior project constraint keeps object/bucket storage deferred, so this F10 slice implements durable owner notes and ratings in the first-class trip detail surface and reserves the photo section without accepting uploads until storage is selected. The user also requested the scrapbook feature be toggleable off to start.

## User Scenarios & Testing

### User Story 1 - Add Scrapbook Notes While Viewing the Trip (Priority: P1)

As the trip owner, I can add notes from the trip detail page at the trip, day, or stop level so memories and practical context are saved where they happened.

**Why this priority**: Notes are the lowest-friction scrapbook contribution and prove the "living trip" promise without waiting for object storage.

**Independent Test**: Seed a purchased owner trip, create trip/day/stop notes as that owner, reload the scrapbook model, and verify notes are listed in the correct scopes and denied to other owners.

**Acceptance Scenarios**:

1. **Given** an owner is viewing a purchased trip, **When** they add a trip-level note, **Then** the note appears in the trip scrapbook section after the durable database write succeeds.
2. **Given** an owner is viewing a day section, **When** they add a day-level note, **Then** the note appears under that day without being attached to any stop.
3. **Given** an owner is viewing a stop card, **When** they add a stop-level note, **Then** the note appears on that stop and remains attached to the stop record.
4. **Given** another owner tries to load or write notes for the trip, **When** the service runs under owner RLS, **Then** the trip is hidden and no note is created.

---

### User Story 2 - Rate Stops After Visiting Them (Priority: P1)

As the trip owner, I can rate a stop from one to five stars with optional text so the family can remember what was worth repeating later.

**Why this priority**: Ratings are a core scrapbook object in the constitution and already have database/RLS support.

**Independent Test**: Seed a purchased owner trip and stop, submit valid and invalid ratings, verify valid ratings persist under the stop, invalid ratings are rejected before insert, and other owners cannot write ratings.

**Acceptance Scenarios**:

1. **Given** an owner is viewing a stop, **When** they submit a 1-5 star rating with optional text, **Then** the rating appears on that stop after the durable write succeeds.
2. **Given** an owner submits 0, 6, or non-numeric stars, **When** validation runs, **Then** the service rejects the rating and does not write a database row.
3. **Given** a stop has existing ratings, **When** the stop card renders, **Then** the rating count and family average are visible.

---

### User Story 3 - See the Scrapbook as a First-class Part of the Trip (Priority: P2)

As the trip owner, I can see notes, ratings, and photo status directly in the trip detail experience so the scrapbook is not hidden behind a separate or secondary workflow.

**Why this priority**: Article IX requires the scrapbook experience to be first-class in the UI.

**Independent Test**: Load a purchased trip detail model with seeded notes, ratings, and photo metadata; verify the page model includes the contribution counts and renders scrapbook sections beside the trip/day/stop itinerary.

**Acceptance Scenarios**:

1. **Given** a trip has notes and ratings, **When** the owner opens `/app/trips/{tripId}`, **Then** the page displays scrapbook content in the trip detail flow.
2. **Given** object storage is not configured, **When** the owner views the photo section, **Then** the page explains that photo upload is not enabled yet and does not offer a fake upload confirmation.
3. **Given** a seeded `photo_metadata` row exists, **When** the owner loads the trip, **Then** the row appears as pending or unavailable metadata and is not displayed as an uploaded photo unless it has durable storage.

---

### User Story 4 - Preserve Contributions Through Future Revisions (Priority: P2)

As the trip owner, I need scrapbook contributions to stay attached to stable trip/day/stop records so later revision work can detect and preserve them.

**Why this priority**: F11 depends on correctly identifying contributions before a revision removes or changes stops.

**Independent Test**: Use existing revision-preservation helpers against notes, ratings, and photo metadata and verify F10-created contributions are discoverable for preservation.

**Acceptance Scenarios**:

1. **Given** a note or rating is attached to a stop, **When** revision preservation checks run, **Then** the contribution is reported with the stop's stable stop key.
2. **Given** a contribution is deleted, **When** preservation checks run, **Then** deleted content is excluded from active contribution reports.

### Edge Cases

- A note is blank or whitespace-only.
- A note is too long for the mobile UI.
- A rating has stars outside 1-5.
- A rating text is blank but stars are valid.
- A contribution references a day or stop that does not belong to the trip.
- A trip is owner-visible but not purchased.
- A purchased trip has no current route data yet.
- Object storage is not configured for photos.
- A seeded photo metadata row has `pending_upload` or `removed` status.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose owner-only scrapbook data for purchased trips through the existing trip detail route.
- **FR-002**: The system MUST allow the owner to create trip-level, day-level, and stop-level notes after purchase.
- **FR-003**: The system MUST reject blank notes and notes longer than the accepted content limit.
- **FR-004**: The system MUST allow the owner to create per-stop ratings with 1-5 stars and optional text after purchase.
- **FR-005**: The system MUST reject ratings outside the 1-5 range before writing to the database.
- **FR-006**: The system MUST confirm a note or rating only after the database write succeeds.
- **FR-007**: The system MUST scope all reads and writes through existing owner authentication and RLS context.
- **FR-008**: The system MUST prevent note/rating writes to trips that are not purchased, deleted, or owned by another owner.
- **FR-009**: The system MUST prevent day-level and stop-level notes from referencing days or stops outside the selected trip.
- **FR-010**: The system MUST list active notes and ratings in the trip detail experience at the relevant trip, day, or stop scope.
- **FR-011**: The system MUST show rating count and average at each stop when ratings exist.
- **FR-012**: The system MUST include a first-class photo scrapbook section that accurately states photo upload is unavailable until object storage is selected.
- **FR-013**: The system MUST NOT accept binary photo uploads, store fake photo URLs, or show "uploaded" confirmation without durable object storage.
- **FR-014**: The system MUST continue to expose existing `photo_metadata` rows without treating `pending_upload` records as successfully uploaded photos.
- **FR-015**: The system MUST keep F10-created notes and ratings compatible with the existing revision-preservation contribution detector.
- **FR-016**: The system MUST remain owner-only in F10; share-link contribution UI is deferred to F12.
- **FR-017**: The system MUST support a disabled-by-default feature toggle that hides scrapbook write UI and blocks server-action writes while preserving existing read/service tests.

### Key Entities

- **Scrapbook Note**: Owner-authored text contribution scoped to a trip, day, or stop.
- **Stop Rating**: Owner-authored star rating from 1 to 5 with optional text and tags, scoped to a stop.
- **Photo Metadata**: Existing metadata row for future photo support; F10 can list status but does not upload binary objects.
- **Scrapbook Summary**: Read model that groups notes, ratings, rating averages, and photo metadata by trip/day/stop for display in the trip detail route.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Owner-scoped tests prove notes can be created and listed at trip, day, and stop scopes.
- **SC-002**: Owner-scoped tests prove valid ratings persist and invalid ratings are rejected without database writes.
- **SC-003**: Access tests prove another owner cannot read or create scrapbook contributions for a trip they do not own.
- **SC-004**: The trip detail page renders notes, ratings, rating summaries, and the deferred photo section without adding object storage configuration.
- **SC-005**: Validation passes with focused scrapbook tests, existing trip-detail tests, lint, typecheck, and build.

## Assumptions

- The existing `notes`, `ratings`, and `photo_metadata` tables and RLS policies remain the source of truth.
- F10 is scoped to authenticated owners only; credential-free family contribution comes in F12.
- Object storage selection, binary upload, resize/compress, signed URLs, and durable uploaded-photo rendering are deferred to a later photo-storage slice.
- F10 may show pending photo metadata but must not claim photo storage is complete.
- The scrapbook feature toggle defaults off in local/deployed environments unless explicitly enabled.
