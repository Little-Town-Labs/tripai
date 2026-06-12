# Research: F11 Post-purchase and Mid-trip Revisions

## Decision: Reuse Existing Revision Tables and Counters

**Rationale**: `trips` already stores `planning_revisions_used` and `mid_trip_revisions_used`; `trip_revisions` already stores version numbers, parent revisions, kind, status, and committed timestamp. Extending services around this model keeps F11 aligned with F2 instead of adding parallel revision state.

**Alternatives considered**:
- Add a separate quota table. Rejected because F2 already modeled per-trip counters and F11 does not need per-purchase top-up ledger behavior yet.
- Store candidates in memory/session. Rejected because candidate review and commit must survive reloads and be owner/RLS scoped.

## Decision: Treat Stop `checked` as the Visited Marker

**Rationale**: The `stops.checked` column already exists and is displayed in trip detail data. Using it for owner-visited state lets mid-trip revisions protect completed stops without new schema.

**Alternatives considered**:
- Add `visited_at`. Deferred until product needs ordering/audit details beyond a boolean.
- Infer visited stops from date/time. Rejected because families may skip or visit stops out of planned order.

## Decision: Service-level Revision Generator Interface

**Rationale**: F11 must call the grounded generation/validation path in production, but DB and UI tests need deterministic behavior without OpenRouter/Google calls. A small interface can accept current itinerary, request text, mode, and preserved stop keys, then return a validated candidate shape.

**Alternatives considered**:
- Call OpenRouter directly from revision service tests. Rejected because tests would be slow, expensive, and nondeterministic.
- Clone the F6 pipeline wholesale. Rejected because it would duplicate grounding rules and drift.

## Decision: Commit is the Quota Boundary

**Rationale**: Article V promises revision rounds. Failed generation or an abandoned candidate should not cost a round. Counts are decremented only when a valid candidate becomes current in the database.

**Alternatives considered**:
- Consume quota on request. Rejected because provider failures would punish the family.
- Consume quota on candidate generation. Rejected because the owner may reject the candidate.

## Decision: Preserve Removed Contributions by Rescoping Existing Rows

**Rationale**: Notes and photo metadata already support trip/day/stop scopes, and ratings are stop-scoped. For removed-stop ratings, F11 can preserve the memory as a note-like summary or preservation record only if the data model supports it. To avoid inventing visible fake ratings, F11 will preserve notes/photos by moving scope and preserve ratings through a generated trip/day note that includes the original star value and text.

**Alternatives considered**:
- Leave ratings attached to removed stops. Rejected because removed revision stops would no longer appear in current trip detail.
- Add generic contribution archive table. Deferred until F12/F13 if family moderation/export needs richer provenance.

## Decision: Previous Version Restore Uses Existing Superseded Revision

**Rationale**: `trip_revisions` status already supports `current` and `superseded`; restoring the most recent superseded revision can be transactional by changing statuses and `trips.current_revision_id`.

**Alternatives considered**:
- Deep-copy the previous revision into a new revision number on restore. Rejected for F11 because restore should not consume a round and the spec promises the prior version itself is restore-eligible.
