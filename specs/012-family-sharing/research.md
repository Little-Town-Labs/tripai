# Research: F12 Credential-free Family Sharing

## Decision: Use Existing `share_links` and Token Hash Helpers

**Rationale**: The schema already has `share_links.token_hash`, revocation metadata, owner references, and RLS helper functions. `createShareToken()` returns 32 random bytes encoded as base64url, providing 256 bits of entropy, which exceeds the constitutional 128-bit minimum.

**Alternatives considered**:
- Add a second public-link table. Rejected because it would duplicate RLS and privacy policy work already completed in F2.
- Store raw tokens for convenience. Rejected because Article VIII treats share tokens as secrets.

## Decision: Raw Token Returned Only on Creation

**Rationale**: The owner needs a copyable URL immediately, but link lists should never reveal raw tokens again. This matches common secret handling patterns and reduces accidental disclosure risk.

**Alternatives considered**:
- Regenerate a visible URL from stored hash. Not possible without raw token and undesirable.
- Store encrypted tokens. Rejected for MVP because hash-only storage is safer and sufficient.

## Decision: Shared Reads Use Share-token RLS Context

**Rationale**: The database policies already enforce active-token access for trips, days, stops, notes, ratings, and photo metadata. Service code should set `tripai.share_token_hash`, switch to `tripai_app`, and query through the same tables the UI needs.

**Alternatives considered**:
- Resolve token to trip as owner/superuser and bypass RLS. Rejected because the roadmap explicitly requires token-scoped RLS.

## Decision: Shared View Gets a Separate Safe Read Model

**Rationale**: Owner trip detail includes revision controls, purchased status, and other owner-only affordances. A separate shared read model prevents accidental owner PII/payment leakage and keeps share UI focused.

**Alternatives considered**:
- Reuse `TripDetail` directly and hide pieces in the component. Rejected because it is too easy to leak owner-only fields or actions.

## Decision: Family Contributions Reuse Notes and Ratings Tables

**Rationale**: Notes and ratings already support `author_share_link_id`, display name, RLS insert policies, and deleted timestamps. F12 can add validation/service/UI without a schema change.

**Alternatives considered**:
- Add a generic `family_contributions` table. Rejected because it would duplicate the scrapbook tables and complicate F13 export/deletion.

## Decision: Owner Moderation Soft-deletes Rows

**Rationale**: Existing note/rating reads filter `deleted_at is null`, and revision preservation checks also ignore deleted rows. Soft delete preserves operational auditability while removing content from user-visible surfaces.

**Alternatives considered**:
- Hard delete rows. Rejected because it gives less operational traceability and is unnecessary before owner-requested trip deletion.

## Decision: Photo Upload Remains Deferred

**Rationale**: F10 intentionally deferred object storage and F12 should not create a fake upload path. Shared users can see photo metadata/status and the same truthful storage placeholder.

**Alternatives considered**:
- Implement shared photo metadata without binary upload. Rejected for this slice because it could imply photo upload works when object storage is still deferred.
