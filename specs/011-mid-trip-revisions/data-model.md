# Data Model: F11 Post-purchase and Mid-trip Revisions

## Existing Entities

### Trip

- Fields used: `id`, `owner_id`, `status`, `current_revision_id`, `planning_revisions_used`, `mid_trip_revisions_used`, `purchased_at`, `deleted_at`
- Validation:
  - Must be purchased, active, or completed for F11 actions.
  - Must belong to the authenticated owner through RLS context.
  - Planning revisions allowed when trip has not started.
  - Mid-trip revisions allowed when the trip has started and is not completed.

### TripRevision

- Fields used: `id`, `trip_id`, `revision_number`, `kind`, `parent_revision_id`, `status`, `summary`, `created_at`, `committed_at`
- States:
  - `draft`: candidate not yet committed.
  - `current`: active itinerary.
  - `superseded`: prior itinerary that can be browsed, and latest prior version can be restored until a newer revision begins.
  - `discarded`: candidate no longer eligible.
- Validation:
  - Only one `current` revision per trip.
  - Candidate `parent_revision_id` must match the current revision at request time.

### TripDay

- Fields used: `id`, `trip_id`, `revision_id`, `day_number`, `date`, route summary fields
- Validation:
  - Candidate days are isolated by `revision_id`.
  - Current trip detail reads only days for `trips.current_revision_id`.

### Stop

- Fields used: `id`, `trip_id`, `day_id`, `revision_id`, `stable_stop_key`, `order_index`, place/route fields, `checked`
- Validation:
  - Mid-trip revision generator receives all checked stable stop keys and must retain them.
  - Owner can mark/unmark checked only on the current revision.

### Note

- Fields used: `trip_id`, `day_id`, `stop_id`, `content`, `deleted_at`
- Preservation:
  - Active stop notes on removed candidate stops must be moved to day or trip scope before commit.

### Rating

- Fields used: `trip_id`, `stop_id`, `stars`, `text`, `deleted_at`
- Preservation:
  - Active stop ratings on removed candidate stops are converted into preserved day/trip note content for visibility because ratings do not have a day/trip scope.

### PhotoMetadata

- Fields used: `trip_id`, `day_id`, `stop_id`, `caption`, `status`, `deleted_at`
- Preservation:
  - Active stop photo metadata on removed candidate stops must be moved to day or trip scope before commit.

## New Service Models

### RevisionMode

- Values: `planning`, `mid_trip`
- Mapping:
  - `planning` creates `trip_revisions.kind = 'post_purchase'`.
  - `mid_trip` creates `trip_revisions.kind = 'mid_trip'`.

### RevisionQuota

- Fields: `planningLimit = 2`, `midTripLimit = 3`, `planningUsed`, `midTripUsed`
- Derived fields: `planningRemaining`, `midTripRemaining`
- Rule: used count changes only when candidate commit succeeds.

### RevisionCandidateSummary

- Fields: `revisionId`, `revisionNumber`, `mode`, `summary`, `parentRevisionId`, `removedStopContributions`, `canCommit`
- Rule: candidate is commit-ready only if every removed contributed stop has a preservation decision.

### PreservationDecision

- Fields: `stableStopKey`, `targetScope`
- Values: `targetScope = 'day' | 'trip'`
- Rule: decisions are evaluated at commit time against active contribution rows to avoid stale warnings.

## State Transitions

1. Request planning revision:
   - Current revision remains `current`.
   - New `post_purchase` revision is inserted as `draft`.
   - Quota unchanged.
2. Request mid-trip revision:
   - Current revision remains `current`.
   - Checked current stops are retained in the draft.
   - New `mid_trip` revision is inserted as `draft`.
   - Quota unchanged.
3. Commit candidate:
   - Validate owner, purchase, quota, parent current revision, and preservation requirements.
   - Move preserved contribution rows or create preservation notes in the same transaction.
   - Current revision becomes `superseded`.
   - Candidate becomes `current`.
   - `trips.current_revision_id` points at candidate.
   - Correct quota counter increments by one.
4. Restore previous:
   - Latest `superseded` revision becomes `current`.
   - Prior current revision becomes `discarded` or `superseded` according to service rules.
   - Quota unchanged.
