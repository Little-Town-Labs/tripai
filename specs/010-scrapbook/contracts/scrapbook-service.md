# Contract: Scrapbook Service

## `getScrapbook(pool, ownerId, { tripId })`

Loads owner-visible scrapbook contributions for a purchased trip.

```ts
type GetScrapbookInput = {
  tripId: string;
};

type ScrapbookResult =
  | { ok: true; scrapbook: ScrapbookSummary }
  | { ok: false; reason: "not_found" | "not_purchased" };
```

### Behavior

- Sets application role and owner context.
- Returns `not_found` when RLS hides the trip or it is deleted.
- Returns `not_purchased` when the trip is owner-visible but not purchased/active/completed with `purchased_at`.
- Lists active notes, ratings, and photo metadata grouped for the trip detail UI.

## `createScrapbookNote(pool, ownerId, input)`

Creates a note for a purchased trip at trip/day/stop scope.

```ts
type CreateScrapbookNoteInput = {
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  content: unknown;
};

type CreateScrapbookNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; reason: "invalid"; fieldErrors: { content?: string; scope?: string } }
  | { ok: false; reason: "not_found" | "not_purchased" };
```

### Behavior

- Validates note content and scope before insert.
- Verifies any day/stop belongs to the target trip.
- Inserts with `author_owner_id` and owner display name.
- Confirms success only after insert returns.

## `createStopRating(pool, ownerId, input)`

Creates a stop rating for a purchased trip.

```ts
type CreateStopRatingInput = {
  tripId: string;
  stopId: string;
  stars: unknown;
  text?: unknown;
};

type CreateStopRatingResult =
  | { ok: true; ratingId: string }
  | { ok: false; reason: "invalid"; fieldErrors: { stars?: string; text?: string; stopId?: string } }
  | { ok: false; reason: "not_found" | "not_purchased" };
```

### Behavior

- Validates stars and optional text before insert.
- Verifies stop belongs to the target trip.
- Inserts with `author_owner_id` and owner display name.
- Confirms success only after insert returns.

## Server Actions

- `createTripNoteAction(tripId, prevState, formData)`
- `createStopRatingAction(tripId, prevState, formData)`

Actions authenticate the current owner, call the service, return expected validation errors as values, and call `revalidatePath("/app/trips/{tripId}")` after success.
