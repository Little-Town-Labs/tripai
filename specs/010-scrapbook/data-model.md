# Data Model: F10 Scrapbook Notes and Ratings

F10 does not add tables or migrations. It introduces an application read/write model over existing tables.

## ScrapbookNote

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | `notes.id` | Created by DB |
| `tripId` | string | `notes.trip_id` | Required |
| `dayId` | string \| null | `notes.day_id` | Mutually exclusive with `stopId` |
| `stopId` | string \| null | `notes.stop_id` | Mutually exclusive with `dayId` |
| `authorDisplayName` | string | `notes.author_display_name` | Owner display name/email fallback |
| `content` | string | `notes.content` | Trimmed, non-blank, length-limited |
| `createdAt` | Date | `notes.created_at` | Display ordering |

## StopRating

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | `ratings.id` | Created by DB |
| `tripId` | string | `ratings.trip_id` | Required |
| `stopId` | string | `ratings.stop_id` | Required |
| `authorDisplayName` | string \| null | `ratings.author_display_name` | Owner display name/email fallback |
| `stars` | number | `ratings.stars` | 1-5 |
| `text` | string \| null | `ratings.text` | Optional trimmed text |
| `tags` | string[] | `ratings.tags` | Existing field; F10 UI can leave empty |
| `createdAt` | Date | `ratings.created_at` | Display ordering |

## PhotoMetadataSummary

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | `photo_metadata.id` | Existing/future metadata |
| `tripId` | string | `photo_metadata.trip_id` | Required |
| `dayId` | string \| null | `photo_metadata.day_id` | Optional scope |
| `stopId` | string \| null | `photo_metadata.stop_id` | Optional scope |
| `caption` | string \| null | `photo_metadata.caption` | Display only |
| `status` | string | `photo_metadata.status` | Pending/uploaded/removed |
| `storageKey` | string \| null | `photo_metadata.storage_key` | Required before uploaded display |

## ScrapbookSummary

| Field | Type | Notes |
|---|---|---|
| `tripNotes` | ScrapbookNote[] | Notes with no day/stop |
| `notesByDayId` | Record<string, ScrapbookNote[]> | Day-level notes |
| `notesByStopId` | Record<string, ScrapbookNote[]> | Stop-level notes |
| `ratingsByStopId` | Record<string, StopRating[]> | Stop ratings |
| `ratingSummariesByStopId` | Record<string, { count; average }> | Derived stop summary |
| `photosByTripDayStop` | grouped PhotoMetadataSummary | Status display only |

## Validation Rules

- Notes must trim to 1-1000 characters.
- Ratings must use integer stars between 1 and 5.
- Rating text may be blank/null but must not exceed 1000 characters when present.
- A note may target trip, day, or stop scope; day and stop cannot both be set.
- A rating must target a stop.
- Day/stop targets must belong to the purchased owner-visible trip.
- Soft-deleted notes/ratings/photos are excluded from active displays.
