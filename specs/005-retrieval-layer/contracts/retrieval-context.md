# Contract: Retrieval Context

## Purpose

F6 initial generation and F11 revisions call the F5 retrieval layer to get verified facts before asking an AI model to plan or revise a trip.

## Inputs

### Retrieval Context Request

```ts
type RetrievalContextInput = {
  originAddress: string;
  destinationArea: string;
  startDate: string;
  endDate: string;
  partyAdults: number;
  partyChildren: number;
  childrenAges: number[];
  interests: string[];
  budgetLevel: "budget" | "moderate" | "premium";
  dietaryNeeds: string[];
  mobilityNotes?: string | null;
  travelStyle: "packed" | "relaxed" | "balanced";
};
```

## Outputs

### Retrieval Context

```ts
type RetrievalContext = {
  request: NormalizedRetrievalRequest;
  candidateGroups: Record<PlanningCategory, PlaceCandidate[]>;
  route: RouteSkeleton | null;
  warnings: RetrievalWarning[];
  errors: RetrievalError[];
  generatedAt: string;
};
```

## Required Guarantees

- Every `PlaceCandidate` exposed to planner code has a non-empty source place id.
- Closed places are excluded from candidate groups.
- Missing optional facts are represented as `null` or omitted values.
- Missing required provider configuration returns a typed configuration error.
- Provider failures return typed retrieval errors and do not fabricate route or place facts.
- Cache hits expose `cacheStatus: "cached"` and a `fetchedAt` timestamp.
- Normal tests can inject fake providers and fake clocks without live credentials.

## Provider Adapter Contract

```ts
type PlaceProvider = {
  searchText(request: PlaceSearchRequest): Promise<ProviderPlaceSearchResult[]>;
  getDetails(placeId: string): Promise<ProviderPlaceDetails | null>;
};

type RouteProvider = {
  computeRoute(request: RouteRequest): Promise<ProviderRoute | null>;
};
```

## Live Credential Contract

- Server reads `GOOGLE_MAPS_API_KEY`.
- The key is only used by server-side provider adapters.
- The key is never returned in context objects, thrown error messages, logs, or snapshots.

## Optional Live Smoke

When `GOOGLE_MAPS_API_KEY` is present, a future manual smoke can retrieve one short route and one place lookup. This is not part of default CI.
