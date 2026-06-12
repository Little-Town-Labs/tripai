# Contract: Trip Detail Service

## `getTripDetail(pool, ownerId, input)`

Loads the owner-only purchased-trip co-pilot read model.

```ts
type GetTripDetailInput = {
  tripId: string;
  today?: Date;
};

type TripDetailResult =
  | { ok: true; detail: TripDetail }
  | { ok: false; reason: "not_found" | "not_purchased" };
```

### Behavior

- Opens a database transaction.
- Sets the application role and owner context with existing access helpers.
- Reads the trip by id through RLS.
- Returns `not_found` when the trip is absent, deleted, or hidden by RLS.
- Returns `not_purchased` when the owner-visible trip is not purchased/active/completed or has no `purchased_at`.
- Reads only the current revision.
- Returns `detail.status = "not_ready"` when a purchased trip lacks a current revision or current-revision days.
- Returns `detail.status = "ready"` with ordered days/stops when data exists.
- Computes active day/current stop/next stop from persisted dates and checked state.
- Generates navigation and official park links without live provider calls.

### Non-goals

- Does not mutate stop checked state.
- Does not create or revise trips.
- Does not call Google, OpenRouter, Stripe, Disney, or storage providers.
- Does not expose share-link access; F12 owns shareable family views.
