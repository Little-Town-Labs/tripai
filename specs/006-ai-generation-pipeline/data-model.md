# Data Model: AI Generation Pipeline

## Entity Overview

| Entity | Purpose | Persistence |
|---|---|---|
| Generation Request | Owner-scoped command to generate a draft trip. | Function input |
| Progress Event | Ordered human-readable pipeline status. | Streamed/transient |
| Planner Draft | Structured itinerary proposal from model. | Transient until validated |
| Validation Report | Deterministic grounding and structure result. | Transient; failure returned safely |
| Narrated Draft | Validated itinerary with advisory copy. | Persisted as draft trip rows |
| Generation Failure | Safe typed failure for owner/retry handling. | Function output |

## Entities

### Generation Request

- `ownerId`
- `intakeId`
- `intake`: normalized intake values
- `retrievalContext`: F5 retrieval context
- `maxPlannerRetries`: default 2

Validation:
- Owner id and intake id are required.
- Retrieval context must include at least one candidate group and route data for route-derived claims.
- Request must not include provider credentials.

### Progress Event

- `sequence`
- `stage`: `retrieval`, `planning`, `validating`, `retrying`, `narrating`, `persisting`, `succeeded`, or `failed`
- `message`
- `createdAt`

Validation:
- Messages are human-readable and safe for owner display.
- Messages must not contain provider secrets or raw provider payloads.

### Planner Draft

- `title`
- `summary`
- `days`: ordered day drafts
- `stops`: ordered stop drafts per day
- `sourcePlaceIds`: references to F5 place ids
- `routeFacts`: references to route duration/distance values when used

Validation:
- Venue stops must reference retrieval context place ids.
- Drive facts must match route context, not model estimates.
- Required stop types must be present where applicable.

### Validation Report

- `ok`
- `errors`
- `warnings`
- `retryFeedback`

Validation:
- Errors must be deterministic and safe to include in a model retry prompt.
- `ok=true` is required before narration and persistence.

### Narrated Draft

- `title`
- `summary`
- `days` with `aiSummary`
- `stops` with advisory `description` and `tips`

Validation:
- Copy must avoid imperative/compulsory phrases.
- Copy must not invent source facts absent from retrieval context.

### Generation Failure

- `code`
- `message`
- `stage`
- `retryable`

Validation:
- Message is safe for owner display.
- Internal provider details are not exposed.

## Persistence Mapping

- `Trip`: one draft trip for the owner and intake.
- `TripRevision`: initial current revision for the generated draft.
- `TripDay`: one row per generated day.
- `Stop`: one row per generated stop, with verified `googlePlaceId` for real venues.

F6 does not create notes, ratings, photos, share links, checkout state, or purchased trip state.
