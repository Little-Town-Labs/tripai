# Data Model: F13 Data Export and Deletion Ops

## Existing Entities Read or Deleted

### Owner

- Fields used: `id`, `email`, `display_name`, timestamps
- Export rule: included only as minimal owner metadata for the verified owner of the target trip.
- Delete rule: owner row is retained; F13 deletes the trip, not the account.

### Trip

- Fields exported: full trip row except no secrets are present in the row; Stripe session id is included only as trip purchase metadata for owner export.
- Delete rule: target trip is deleted only after owner id matches `trips.owner_id`.

### TripIntake

- Export rule: included when `trips.intake_id` is set.
- Delete rule: deleted when no other trip references the intake after target trip deletion.

### TripRevision, TripDay, Stop

- Export rule: all revisions, days, and stops for the target trip are included, including non-current revision state.
- Delete rule: removed through trip deletion cascade or explicit cleanup where required.

### ShareLink

- Export rule: include id, label, created/revoked/last-used timestamps, and created owner id. Never export raw tokens. Token hashes are internal and excluded from archive output.
- Delete rule: removed with the target trip; former tokens stop resolving.

### Note, Rating, PhotoMetadata

- Export rule: include owner-authored and share-authored records, scope ids, display names, content/rating/photo metadata, deleted state, and timestamps.
- Delete rule: removed with the target trip, including family contributions.

## New Service Models

### TripExportArchive

Fields:
- `schemaVersion`
- `exportedAt`
- `owner`
- `trip`
- `intake`
- `revisions`
- `days`
- `stops`
- `shareLinks`
- `notes`
- `ratings`
- `photoMetadata`

Rules:
- Contains exactly one trip.
- Does not include raw share tokens, token hashes, database URLs, or process environment values.
- Can include soft-deleted contribution rows so the export is complete.

### ExportTripRequest

Fields:
- `ownerId`
- `tripId`
- `outputPath`
- `overwrite`

Rules:
- `ownerId`, `tripId`, and `outputPath` are required.
- Existing output path fails unless `overwrite` is true.

### DeleteTripRequest

Fields:
- `ownerId`
- `tripId`
- `confirmTripId`

Rules:
- `confirmTripId` must exactly match `tripId`.
- Deletion runs in one transaction.
- Unrelated trip data must remain after deletion.

## State Transitions

1. Export request:
   - Validate input.
   - Verify owner/trip match.
   - Query target trip graph.
   - Write JSON archive if output path is safe.
2. Delete request:
   - Validate input and confirmation.
   - Verify owner/trip match.
   - Delete target trip in transaction.
   - Delete now-orphaned intake if the target trip was its only reference.
   - Confirm target trip/dependents are no longer queryable.
