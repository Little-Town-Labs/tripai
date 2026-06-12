# Contract: Revision Service

F11 exposes these service-level contracts from `src/lib/revisions/service.ts`. Server actions adapt form posts into these calls; tests exercise the service directly with a fake revision generator.

## `getRevisionPanel(pool, ownerId, { tripId })`

Returns revision state for the owner trip detail page.

### Success

```ts
{
  ok: true,
  panel: {
    tripId: string;
    planningRemaining: number;
    midTripRemaining: number;
    canRequestPlanning: boolean;
    canRequestMidTrip: boolean;
    currentRevisionId: string | null;
    previousRevision: { id: string; revisionNumber: number; summary: string | null } | null;
    draftCandidate: RevisionCandidateSummary | null;
  };
}
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" }
```

## `markStopVisited(pool, ownerId, { tripId, stopId, checked })`

Marks a current-revision stop visited/unvisited.

### Success

```ts
{ ok: true; stopId: string; checked: boolean }
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" | "invalid_scope" }
```

## `requestTripRevision(pool, ownerId, input, options)`

Creates a draft candidate. `options.generator` is required by tests and wraps the production grounded revision pipeline in app code.

```ts
type RequestTripRevisionInput = {
  tripId: string;
  mode: "planning" | "mid_trip";
  requestText: unknown;
};
```

### Success

```ts
{
  ok: true;
  candidate: {
    revisionId: string;
    revisionNumber: number;
    mode: "planning" | "mid_trip";
    removedStopContributions: Array<{
      stableStopKey: string;
      stopId: string;
      counts: { notes: number; ratings: number; photos: number };
    }>;
    canCommit: boolean;
  };
}
```

### Failure

```ts
{ ok: false; reason: "invalid"; fieldErrors: { requestText?: string } }
{ ok: false; reason: "not_found" | "not_purchased" | "limit_reached" | "not_ready" | "generation_failed" }
```

## `commitTripRevision(pool, ownerId, input)`

Commits a draft candidate and applies preservation decisions.

```ts
type CommitTripRevisionInput = {
  tripId: string;
  revisionId: string;
  preservationDecisions: Array<{
    stableStopKey: string;
    targetScope: "day" | "trip";
  }>;
};
```

### Success

```ts
{
  ok: true;
  currentRevisionId: string;
  planningRemaining: number;
  midTripRemaining: number;
}
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" | "limit_reached" | "candidate_not_found" | "preservation_required" | "stale_candidate" }
```

## `restorePreviousRevision(pool, ownerId, { tripId })`

Restores the immediately previous revision without consuming quota.

### Success

```ts
{ ok: true; currentRevisionId: string }
```

### Failure

```ts
{ ok: false; reason: "not_found" | "not_purchased" | "previous_not_found" }
```
