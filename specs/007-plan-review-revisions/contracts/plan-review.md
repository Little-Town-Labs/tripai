# Contract: Plan Review

## `getPlanReview(pool, ownerId, input)`

Loads an owner-safe review model for a trip.

```ts
type GetPlanReviewInput = {
  tripId: string;
  revisionId?: string;
};

type PlanReviewResult =
  | { ok: true; review: PlanReview }
  | { ok: false; reason: "not_found" | "forbidden" };
```

Behavior:

- Sets `tripai_app` role and owner context before reading data.
- Returns `not_found` when RLS hides the trip or the selected revision does not belong to the trip.
- Defaults to `trips.current_revision_id` when no `revisionId` is provided.
- Lists committed revisions (`current`, `superseded`) and pending `draft` requests.
- Does not call AI, Google, Stripe, or share-token services.

## `requestPrePurchaseRevision(pool, ownerId, input)`

Captures a natural-language pre-purchase revision request.

```ts
type RequestPrePurchaseRevisionInput = {
  tripId: string;
  requestText: unknown;
};

type RequestPrePurchaseRevisionResult =
  | { ok: true; revisionId: string; revisionNumber: number }
  | { ok: false; reason: "invalid"; fieldErrors: { requestText?: string } }
  | { ok: false; reason: "not_found" | "already_purchased" | "not_ready" };
```

Behavior:

- Validates and trims request text before persistence.
- Requires an owner-visible, unpurchased trip with a current revision.
- Inserts a `pre_purchase` `draft` revision with the next revision number.
- Does not update `trips.current_revision_id`.
- Does not decrement `planning_revisions_used`.
- Uses the current revision id as `parent_revision_id`.

## `/app/plan/[tripId]`

Authenticated owner page.

- Reads `params` as a Promise per Next.js 16 dynamic route docs.
- Optional query string `revisionId` selects a previous committed revision for browsing.
- Renders progress-ready state when the trip has no ready current revision.
- Provides a Server Action-backed request form that rechecks the current owner.
