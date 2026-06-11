# Data Model: Data Model & Access Policies

## Entity Overview

| Entity | Purpose | Primary Access Rules |
|---|---|---|
| Owner | Authenticated person who owns trips. | Owner can read self; share links never expose owner PII. |
| TripIntake | Planning input that feeds trip generation. | Owner only; no share-link writes. |
| Trip | Owned itinerary container and lifecycle root. | Owner full access; active share links read purchased/active trip data. |
| TripDay | One day in a trip. | Inherits trip access. |
| Stop | Ordered itinerary item within a day. | Inherits trip access; real-world stops require verified venue identity. |
| Note | Text contribution attached to trip, day, or stop. | Owner and active share links can read/write within trip scope. |
| Rating | Star contribution attached to a stop. | Owner and active share links can read/write within trip scope. |
| PhotoMetadata | Metadata for future photo uploads. | Owner and active share links can read/write within trip scope; binary storage deferred. |
| ShareLink | Token-scoped family access grant. | Owner manages; active token can authorize trip-scoped reads/writes. |
| TripRevision | Version metadata for itinerary changes. | Owner manages; share links can read current trip state only unless later UI allows history. |

## Entities

### Owner

- `id`: stable auth identity
- `email`: private owner contact
- `displayName`: optional owner display name
- `createdAt`, `updatedAt`

Validation:
- `email` must not be exposed to share-link users.
- Owner row deletion must either be blocked while trips exist or cascade through an explicit owner-requested deletion workflow.

### TripIntake

- `id`
- `ownerId`: nullable until anonymous-to-owner flow is implemented
- `originAddress`
- `destinationArea`
- `startDate`, `endDate`
- `partyAdults`, `partyChildren`, `childrenAges`
- `interests`
- `budgetLevel`: `budget`, `moderate`, or `premium`
- `dietaryNeeds`
- `mobilityNotes`
- `travelStyle`: `packed`, `relaxed`, or `balanced`
- `createdAt`, `updatedAt`

Validation:
- `endDate` must be on or after `startDate`.
- party counts must be non-negative, with at least one traveler overall.
- Arrays should default to empty arrays rather than null where practical.

### Trip

- `id`
- `ownerId`
- `intakeId`
- `currentRevisionId`
- `title`
- `summary`
- `status`: `draft`, `purchased`, `active`, `completed`, `deleted`
- `stripeSessionId`: nullable until F8
- `priceCents`: nullable integer until F8
- `planningRevisionsUsed`
- `midTripRevisionsUsed`
- `createdAt`, `updatedAt`, `purchasedAt`, `deletedAt`

Validation:
- `priceCents` must be an integer and non-negative when present.
- `status=deleted` rows must not be visible through normal owner/share reads.
- Share links only authorize non-deleted trips.

### TripDay

- `id`
- `tripId`
- `revisionId`
- `dayNumber`
- `date`
- `label`
- `fromLocation`
- `toLocation`
- `totalMiles`
- `driveTimeMinutes`
- `aiSummary`
- `createdAt`, `updatedAt`

Validation:
- `dayNumber` must be positive and unique per trip revision.
- `totalMiles` and `driveTimeMinutes` must be non-negative when present.

### Stop

- `id`
- `tripId`
- `dayId`
- `revisionId`
- `stableStopKey`: persistent identity for matching retained stops across revisions
- `orderIndex`
- `name`
- `type`: `drive`, `fuel`, `restaurant`, `attraction`, `hotel`, `rest`, `park`, `other`
- `googlePlaceId`: required for real-world non-drive stops
- `lat`, `lng`
- `address`
- `eta`
- `description`
- `tips`
- `priceLevel`
- `googleRating`
- `hoursSummary`
- `phone`
- `website`
- `checked`
- `createdAt`, `updatedAt`

Validation:
- `orderIndex` must be unique within a day revision.
- `googlePlaceId` is required for all stop types except pure drive/rest placeholders.
- `googleRating`, when present, must be between 0 and 5.
- `priceLevel`, when present, must be between 1 and 4.

### Note

- `id`
- `tripId`
- `dayId`: nullable
- `stopId`: nullable
- `authorOwnerId`: nullable
- `authorShareLinkId`: nullable
- `authorDisplayName`
- `content`
- `createdAt`, `updatedAt`, `deletedAt`

Validation:
- Must attach to exactly one valid scope: trip, day, or stop.
- Must have either owner attribution or share-link attribution.
- Share-link note writes must be scoped to the share link's trip.

### Rating

- `id`
- `tripId`
- `stopId`
- `authorOwnerId`: nullable
- `authorShareLinkId`: nullable
- `authorDisplayName`
- `stars`
- `text`
- `tags`
- `createdAt`, `updatedAt`, `deletedAt`

Validation:
- `stars` must be an integer between 1 and 5.
- Ratings attach to stops only for MVP.
- Must have either owner attribution or share-link attribution.

### PhotoMetadata

- `id`
- `tripId`
- `dayId`: nullable
- `stopId`: nullable
- `authorOwnerId`: nullable
- `authorShareLinkId`: nullable
- `authorDisplayName`
- `storageKey`: nullable until F10 upload confirmation
- `caption`
- `status`: `pending_upload`, `uploaded`, `removed`
- `createdAt`, `updatedAt`, `deletedAt`

Validation:
- Must attach to exactly one valid scope: trip, day, or stop.
- `uploaded` status requires `storageKey`.
- Binary upload/storage behavior is out of scope until F10.

### ShareLink

- `id`
- `tripId`
- `tokenHash`
- `label`
- `createdByOwnerId`
- `revokedAt`
- `createdAt`, `updatedAt`
- `lastUsedAt`

Validation:
- `tokenHash` must be unique.
- Raw tokens must not be stored.
- Revoked links must deny reads and writes.
- Share links are opt-in per trip.

### TripRevision

- `id`
- `tripId`
- `revisionNumber`
- `kind`: `initial`, `pre_purchase`, `post_purchase`, `mid_trip`
- `parentRevisionId`
- `status`: `draft`, `current`, `superseded`, `discarded`
- `summary`
- `createdAt`, `committedAt`

Validation:
- One current revision per trip.
- `revisionNumber` is unique per trip.
- Contributions remain attached through `stableStopKey` where stops are retained.

## Access Policy Matrix

| Entity | Owner | Active Share Link | Revoked/No Share Link | Other Owner |
|---|---|---|---|---|
| Owner | Read own profile | No PII access | Denied | Denied |
| TripIntake | Full access | Denied | Denied | Denied |
| Trip | Full access | Read shared trip | Denied | Denied |
| TripDay | Full access | Read shared trip days | Denied | Denied |
| Stop | Full access | Read shared trip stops; update contribution-safe visited state only if later allowed | Denied | Denied |
| Note | Full access and moderation | Read/write own share contribution in shared trip | Denied | Denied |
| Rating | Full access and moderation | Read/write own share contribution in shared trip | Denied | Denied |
| PhotoMetadata | Full access and moderation | Read/write own share contribution in shared trip | Denied | Denied |
| ShareLink | Create/read/revoke for owned trip | Token lookup only through policy helper | Denied | Denied |
| TripRevision | Full access | Current trip state only | Denied | Denied |

## State Transitions

### Trip

`draft` -> `purchased` -> `active` -> `completed`

Any non-deleted state -> `deleted` through future owner deletion workflow.

### ShareLink

`active` -> `revoked`

Revocation is terminal for the token.

### TripRevision

`draft` -> `current`

Existing `current` -> `superseded` when a new current revision commits.

`draft` -> `discarded` if a proposed revision is abandoned.

### PhotoMetadata

`pending_upload` -> `uploaded` -> `removed`

F2 only prepares metadata states; F10 implements upload confirmation.
