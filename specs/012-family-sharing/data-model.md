# Data Model: F12 Credential-free Family Sharing

## Existing Entities

### ShareLink

- Fields used: `id`, `trip_id`, `token_hash`, `label`, `created_by_owner_id`, `revoked_at`, `last_used_at`, `created_at`, `updated_at`
- Rules:
  - Created only by the trip owner for purchased, non-deleted trips.
  - `token_hash` stores SHA-256 hash, never raw token.
  - Active when `revoked_at is null`.
  - Revocation sets `revoked_at` and blocks future RLS reads/writes.

### Trip

- Fields exposed to share users: `id`, `title`, `summary`, `status`, current revision pointer.
- Fields not exposed to share users: `owner_id`, owner email, Stripe session ID, price, auth identity.
- Rules:
  - Shared access only for purchased/active/completed non-deleted trips with active share token.

### TripRevision, TripDay, Stop

- Read through token-scoped RLS.
- Shared view reads the current revision only.
- Stop cards expose itinerary facts, navigation handoffs, and official park links.
- Revision controls are not exposed to share users.

### Note

- Share-created note fields: `trip_id`, optional `day_id`, optional `stop_id`, `author_share_link_id`, `author_display_name`, `content`, `deleted_at`.
- Rules:
  - `author_owner_id` must be null for share-created notes.
  - Display name is required.
  - Scope must belong to the shared trip.

### Rating

- Share-created rating fields: `trip_id`, `stop_id`, `author_share_link_id`, `author_display_name`, `stars`, `text`, `deleted_at`.
- Rules:
  - `author_owner_id` must be null for share-created ratings.
  - Stars must be 1-5.
  - Stop must belong to the shared trip.

### PhotoMetadata

- Shared route reads active metadata rows.
- Shared route does not create photo rows in F12.

## New Service Models

### CreatedShareLink

- Fields: `id`, `tripId`, `label`, `url`, `token`, `createdAt`
- Rule: returned only from create-link service response; list-link responses omit `token` and `url` unless URL can be rebuilt with a one-time token, which F12 does not do.

### ShareLinkSummary

- Fields: `id`, `label`, `createdAt`, `revokedAt`, `lastUsedAt`
- Rule: safe for owner link list; no raw token and no token hash.

### SharedTripDetail

- Fields: `trip`, `selectedRevision`, `days`, `activeDayId`, `currentStopId`, `nextStopId`, `scrapbook`
- Rule: same itinerary/scrapbook shape as owner view where useful, but no owner PII, payment, revision panel, or owner actions.

### ShareContributionInput

- Fields: `token`, `displayName`, `content` or `stars/text`, optional scope IDs
- Rules:
  - Display name required and bounded.
  - Token must resolve through RLS to active share link.
  - Writes return success only after commit.

## State Transitions

1. Owner creates share link:
   - Generate token.
   - Store hash and label.
   - Return raw token/URL once.
2. Family opens share URL:
   - Hash token into database session context.
   - Query shared trip through RLS.
   - Update `last_used_at` for the matching active link.
3. Family contributes:
   - Validate display name and contribution.
   - Set share-token context.
   - Insert note/rating with `author_share_link_id = current_share_link_id(trip_id)`.
4. Owner revokes link:
   - Set `revoked_at`.
   - Later reads/writes with that token return unavailable/denied.
5. Owner moderates contribution:
   - Set contribution `deleted_at`.
   - Content disappears from owner/shared views and revision preservation reports.
