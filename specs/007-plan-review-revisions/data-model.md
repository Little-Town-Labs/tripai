# Data Model: Plan Review & Pre-Purchase Revisions

## Trip

Existing `trips` row owned by one authenticated owner.

- `id`: Route parameter and service lookup key.
- `owner_id`: RLS owner boundary.
- `current_revision_id`: Current committed version displayed by default.
- `title`, `summary`, `status`: Review header and progress-ready state.
- `purchased_at`: Must be null for F7 pre-purchase revision requests.
- `planning_revisions_used`, `mid_trip_revisions_used`: Display only if useful later; F7 does not decrement them.

## Trip Revision

Existing `trip_revisions` row that versions a plan.

- `kind = 'initial'`: Initial generated plan.
- `kind = 'pre_purchase'`: F7 pre-purchase revision intent or committed pre-purchase version.
- `status = 'current'`: Current committed version.
- `status = 'superseded'`: Previous committed version that remains browsable.
- `status = 'draft'`: Pending pre-purchase request waiting for generation/commit.
- `summary`: For F7 draft requests, stores the owner request text.
- `parent_revision_id`: Current committed revision at the time the request was made.

## Trip Day

Existing `trip_days` row scoped to a trip revision.

- Ordered by `day_number`.
- Displays date, label, from/to locations, total miles, drive time minutes, and AI summary when present.
- Missing route facts are displayed as unavailable, not inferred.

## Stop

Existing `stops` row scoped to a trip day and revision.

- Ordered by `order_index`.
- Displays name, type, ETA, description, tips, address, verified place id, rating, price level, website/phone, and hours summary when present.
- Venue stops require `google_place_id` by schema; drive/rest placeholders may omit it.

## Plan Review View Model

Returned by `getPlanReview`.

- `trip`: owner-safe trip header.
- `selectedRevision`: current or requested committed revision.
- `versions`: committed revisions plus pending draft request summaries.
- `days`: ordered day/stop itinerary for selected revision.
- `status`: `ready`, `progress`, or `missing`.
- `canRequestPrePurchaseRevision`: true only for unpurchased, non-deleted trips.

## Validation Rules

- Revision request text is trimmed.
- Blank or whitespace-only requests are rejected.
- Requests shorter than 10 characters are rejected.
- Requests longer than 1,000 characters are rejected.
- Purchased/deleted trips reject F7 pre-purchase revision requests.
- Loading a previous revision never mutates `trips.current_revision_id`.
