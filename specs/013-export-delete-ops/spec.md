# Feature Specification: F13 Data Export and Deletion Ops

**Feature Branch**: `013-export-delete-ops`

**Created**: 2026-06-12

**Status**: Draft

**Roadmap Item**: F13 Data export & deletion ops

**Input**: Roadmap F13 requires manual support-ticket-driven workflows to honor Article I: owners can request a full portable export of a purchased trip, and owners can request full deletion of that trip including itinerary, notes, ratings, photo metadata, share links, and family contributions reachable through share links. MVP may implement this as documented internal operator commands instead of self-serve UI.

## User Scenarios & Testing

### User Story 1 - Support Exports a Trip Archive (Priority: P1)

As support staff, I can run an owner-verified export for one trip so the family can receive a portable archive of everything TripAI stores for that trip.

**Why this priority**: Article I explicitly requires export capability before launch, and export is the lower-risk operation because it is read-only.

**Independent Test**: Seed a purchased trip with current and historical revisions, days, stops, share links, owner notes, share-link notes, ratings, and photo metadata; run the export command; verify the archive contains the expected trip-owned records and excludes unrelated trips and raw share tokens.

**Acceptance Scenarios**:

1. **Given** support has verified the requester owns the trip, **When** the export command runs with the owner id and trip id, **Then** it writes a portable JSON archive containing the trip, intake, revisions, days, stops, notes, ratings, photo metadata, and share-link summaries for that trip.
2. **Given** the trip has family share-link contributions, **When** the export is produced, **Then** share-authored notes and ratings are included with display-name attribution.
3. **Given** the trip has share links, **When** the export is produced, **Then** share-link metadata is included without raw share tokens.
4. **Given** the owner id does not own the trip, **When** the export command runs, **Then** no archive is written and the command reports a not-found/ownership failure.

---

### User Story 2 - Support Permanently Deletes a Trip (Priority: P1)

As support staff, I can run an owner-verified deletion for one trip so the family’s deletion request removes the itinerary and all attached family contributions.

**Why this priority**: Article I requires full deletion. This is a constitutional launch requirement even if the interface remains internal.

**Independent Test**: Seed a purchased trip with all dependent records and an unrelated trip; run the deletion command with explicit confirmation; verify the target trip and all dependent records are gone, share-token access no longer works, and unrelated trip data remains.

**Acceptance Scenarios**:

1. **Given** support has verified the requester owns the trip, **When** the delete command runs with owner id, trip id, and explicit confirmation, **Then** the target trip and all dependent itinerary, scrapbook, photo metadata, share-link, revision, and intake-owned rows are removed or made unreachable according to database constraints.
2. **Given** a family member still has a share URL, **When** deletion completes, **Then** that URL can no longer read or write any part of the deleted trip.
3. **Given** the command is missing explicit confirmation, **When** support attempts deletion, **Then** the command refuses to delete anything.
4. **Given** another owner id is supplied for the trip, **When** deletion is attempted, **Then** the command refuses to delete anything.

---

### User Story 3 - Support Has a Safe Runbook (Priority: P2)

As support staff, I have a concise runbook for verifying requests, running export/delete commands, and recording the result so operations can be performed consistently without exposing secrets.

**Why this priority**: Manual MVP operations are only acceptable if the process is explicit, auditable, and hard to run accidentally.

**Independent Test**: A developer can follow the runbook in a test environment to export and delete a seeded trip without needing undocumented steps or printing secrets.

**Acceptance Scenarios**:

1. **Given** support receives an export request, **When** they follow the runbook, **Then** they can identify the required owner id, trip id, command, expected output path, and validation checks.
2. **Given** support receives a deletion request, **When** they follow the runbook, **Then** they must complete owner verification and pass an explicit confirmation flag before data is removed.
3. **Given** the runbook references environment variables, **When** a new operator reads it, **Then** it describes variable names and safety rules without including real secrets.

### Edge Cases

- The trip id is malformed.
- The owner id is malformed.
- The owner exists but does not own the trip.
- The trip is draft or not purchased.
- The trip has no intake, no current revision, or no scrapbook records.
- The trip has revoked share links and deleted notes/ratings.
- The trip has photo metadata without binary object storage.
- The archive output path already exists.
- The deletion command is run without explicit confirmation.
- The deletion command is interrupted or fails midway.
- An unrelated owner/trip exists in the same database.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide an internal export command that accepts owner id, trip id, database URL, and output path.
- **FR-002**: The export command MUST verify that the supplied owner id owns the supplied trip before reading export data.
- **FR-003**: The export command MUST produce a portable JSON archive for the target trip including trip, intake, revisions, days, stops, notes, ratings, photo metadata, and share-link metadata.
- **FR-004**: The export archive MUST include owner-authored and share-link-authored notes and ratings, including display-name attribution and deleted/revoked state where stored.
- **FR-005**: The export archive MUST NOT include raw share tokens, database connection strings, auth secrets, Stripe secret keys, or unrelated owners/trips.
- **FR-006**: The export command MUST fail without overwriting an existing archive unless an explicit overwrite option is supplied.
- **FR-007**: The system MUST provide an internal deletion command that accepts owner id, trip id, database URL, and an explicit confirmation value.
- **FR-008**: The deletion command MUST verify that the supplied owner id owns the supplied trip before deleting data.
- **FR-009**: The deletion command MUST refuse to run unless the explicit confirmation value matches the target trip id.
- **FR-010**: Deletion MUST remove the target trip and all dependent itinerary, scrapbook, photo metadata, share-link, revision, and contribution records reachable through that trip.
- **FR-011**: Deletion MUST leave unrelated owners, trips, and contributions untouched.
- **FR-012**: After deletion, former share-link tokens MUST NOT grant read or write access to the deleted trip.
- **FR-013**: Export and deletion commands MUST avoid printing secrets or raw share tokens to stdout/stderr.
- **FR-014**: The runbook MUST document owner verification, environment requirements, dry-run/test-environment expectations, export retention handling, deletion confirmation, and post-command validation.
- **FR-015**: The implementation MUST include automated tests for successful export, ownership-denied export, deletion without confirmation, successful deletion, and unrelated-data preservation.

### Key Entities

- **Trip Export Archive**: Portable JSON document containing a single trip’s owned records and metadata needed for support delivery.
- **Export Command Request**: Operator input containing owner id, trip id, output path, and overwrite behavior.
- **Deletion Command Request**: Operator input containing owner id, trip id, and explicit confirmation value.
- **Support Runbook**: Internal documentation describing the manual support-ticket workflow and validation checks.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A seeded purchased trip with itinerary, scrapbook, share links, and photo metadata can be exported into one JSON archive with zero unrelated trip rows.
- **SC-002**: Export tests prove raw share tokens and connection secrets are absent from the archive and command output.
- **SC-003**: Deletion tests prove the target trip and dependent rows are removed while an unrelated trip remains queryable.
- **SC-004**: Deletion tests prove missing confirmation or mismatched owner id leaves all target rows intact.
- **SC-005**: The runbook allows a developer to perform export and deletion against the Neon testing branch using documented commands only.

## Assumptions

- F13 is an internal operator workflow, not a self-serve user interface.
- Support staff verify the requester’s identity and ownership before running commands; the commands still re-check owner id and trip id in the database.
- Exported archives are written to a local operator-selected path and are not automatically uploaded or emailed by the app.
- Photo binary/object storage remains deferred; F13 exports photo metadata and storage keys/status only.
- Deletion is permanent in the application database. Database provider backups/PITR may still exist according to infrastructure retention policies.
