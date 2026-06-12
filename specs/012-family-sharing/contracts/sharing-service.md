# Contract: Sharing Service

F12 exposes these service-level contracts from `src/lib/sharing/service.ts`.

## `createShareLink(pool, ownerId, input)`

```ts
type CreateShareLinkInput = {
  tripId: string;
  label?: unknown;
  appBaseUrl?: string;
};
```

### Success

```ts
{
  ok: true;
  link: {
    id: string;
    tripId: string;
    label: string | null;
    token: string;
    url: string;
    createdAt: Date;
  };
}
```

### Failure

```ts
{ ok: false; reason: "invalid"; fieldErrors: { label?: string } }
{ ok: false; reason: "not_found" | "not_purchased" }
```

## `listShareLinks(pool, ownerId, { tripId })`

### Success

```ts
{
  ok: true;
  links: Array<{
    id: string;
    tripId: string;
    label: string | null;
    createdAt: Date;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
  }>;
}
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" }
```

## `revokeShareLink(pool, ownerId, { tripId, shareLinkId })`

### Success

```ts
{ ok: true; shareLinkId: string }
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" }
```

## `getSharedTrip(pool, { token, today })`

Returns a shared trip read model with no owner PII or payment fields.

### Success

```ts
{
  ok: true;
  detail: SharedTripDetail;
}
```

### Failure

```ts
{ ok: false; reason: "not_found" }
```

## `createSharedNote(pool, input)`

```ts
type CreateSharedNoteInput = {
  token: string;
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  displayName: unknown;
  content: unknown;
};
```

### Success

```ts
{ ok: true; noteId: string }
```

### Failure

```ts
{ ok: false; reason: "invalid"; fieldErrors: { displayName?: string; content?: string; scope?: string } }
{ ok: false; reason: "not_found" }
```

## `createSharedRating(pool, input)`

```ts
type CreateSharedRatingInput = {
  token: string;
  tripId: string;
  stopId: string;
  displayName: unknown;
  stars: unknown;
  text?: unknown;
};
```

### Success

```ts
{ ok: true; ratingId: string }
```

### Failure

```ts
{ ok: false; reason: "invalid"; fieldErrors: { displayName?: string; stars?: string; stopId?: string; text?: string } }
{ ok: false; reason: "not_found" }
```

## `removeContribution(pool, ownerId, input)`

```ts
type RemoveContributionInput = {
  tripId: string;
  contributionType: "note" | "rating";
  contributionId: string;
};
```

### Success

```ts
{ ok: true; contributionId: string }
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" }
```
