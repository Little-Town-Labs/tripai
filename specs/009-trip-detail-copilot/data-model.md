# Data Model: F9 Trip Detail View / Co-pilot UX

F9 does not add database tables or migrations. It introduces a read model over existing persisted tables.

## TripDetail

| Field | Type | Source | Notes |
|---|---|---|---|
| `trip.id` | string | `trips.id` | Owner-visible through RLS |
| `trip.title` | string | `trips.title` | Required display title |
| `trip.summary` | string \| null | `trips.summary` | Optional trip-level summary |
| `trip.status` | string | `trips.status` | Must be purchased/active/completed |
| `trip.purchasedAt` | Date | `trips.purchased_at` | Must be non-null |
| `selectedRevision` | object | `trip_revisions` | Current revision only |
| `days` | TripDetailDay[] | `trip_days` | Ordered by `day_number` |
| `activeDayId` | string \| null | computed | Based on `today` and day dates |
| `currentStopId` | string \| null | computed | First unchecked stop on active day, or final active-day stop |
| `nextStopId` | string \| null | computed | Stop after current stop on the active day |
| `status` | `ready` \| `not_ready` | computed | Ready only when current revision and days exist |

## TripDetailDay

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | `trip_days.id` | Stable day id |
| `dayNumber` | number | `trip_days.day_number` | Ordered display number |
| `date` | string | `trip_days.date` | ISO date text |
| `label` | string | `trip_days.label` | User-facing day label |
| `fromLocation` | string \| null | `trip_days.from_location` | Optional route start |
| `toLocation` | string \| null | `trip_days.to_location` | Optional route end |
| `totalMiles` | number \| null | `trip_days.total_miles` | Verified route distance when available |
| `driveTimeMinutes` | number \| null | `trip_days.drive_time_minutes` | Verified drive time when available |
| `aiSummary` | string \| null | `trip_days.ai_summary` | Existing generated summary |
| `isActive` | boolean | computed | Active-day marker |
| `stops` | TripDetailStop[] | `stops` | Ordered by `order_index` |

## TripDetailStop

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | `stops.id` | Stable stop row id |
| `stableStopKey` | string | `stops.stable_stop_key` | Revision-stable stop identity |
| `orderIndex` | number | `stops.order_index` | Day ordering |
| `name` | string | `stops.name` | Display name |
| `type` | string | `stops.type` | Includes `park` for official links |
| `googlePlaceId` | string \| null | `stops.google_place_id` | Existing verified place id when required |
| `lat` / `lng` | number \| null | `stops.lat` / `stops.lng` | Prefer for nav handoffs |
| `address` | string \| null | `stops.address` | Text fallback |
| `eta` | Date \| null | `stops.eta` | Display if present |
| `description` | string \| null | `stops.description` | Existing persisted copy |
| `tips` | string \| null | `stops.tips` | Existing persisted copy |
| `hoursSummary` | string \| null | `stops.hours_summary` | Static persisted summary |
| `website` | string \| null | `stops.website` | Park official link source |
| `checked` | boolean | `stops.checked` | Current-stop computation |
| `isCurrent` | boolean | computed | Active-day current stop |
| `isNext` | boolean | computed | Active-day next stop |
| `nextStopName` | string \| null | computed | Immediate next stop on same day |
| `navigation.googleMapsUrl` | string | computed | Coordinate or text search handoff |
| `navigation.wazeUrl` | string | computed | Coordinate or text search handoff |
| `officialParkUrl` | string \| null | computed | Only for park stops |

## State Rules

- Draft trips and deleted trips do not return a ready co-pilot model.
- Purchased access requires `status in ('purchased', 'active', 'completed')` and `purchased_at is not null`.
- Missing days or current revision returns `not_ready` for the owner, not fabricated route data.
- F9 does not write to `checked`; it only reads current checked state.
