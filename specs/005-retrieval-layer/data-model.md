# Data Model: Retrieval Layer

## Entity Overview

| Entity | Purpose | Persistence |
|---|---|---|
| Retrieval Request | Normalized planning inputs used to retrieve route and place facts. | In memory / function input |
| Place Candidate | Planner-ready verified venue option. | In retrieval context; cacheable |
| Route Skeleton | Confirmed drive route summary and anchors. | In retrieval context; cacheable |
| Retrieval Context | Bundle consumed by F6 and F11. | In memory / function output |
| Retrieval Cache Entry | Cached result for normalized lookup keys. | Cache interface; in-process implementation in F5 |

## Entities

### Retrieval Request

- `originAddress`: normalized origin text
- `destinationArea`: normalized destination text
- `startDate`, `endDate`: ISO date strings
- `partyAdults`, `partyChildren`
- `childrenAges`: sorted numeric ages
- `interests`: normalized, deduplicated list
- `budgetLevel`: `budget`, `moderate`, or `premium`
- `dietaryNeeds`: normalized list
- `mobilityCategory`: coarse category derived without preserving free text
- `travelStyle`: `packed`, `relaxed`, or `balanced`

Validation:
- Origin and destination are required.
- Dates are required and ordered.
- Cache-key material must not include owner id, email, raw mobility notes, or additional free-text constraints.

### Place Candidate

- `id`: provider place id
- `source`: `google_places`
- `name`
- `address`
- `location`: latitude and longitude when available
- `planningCategory`: `restaurant`, `attraction`, `hotel`, `fuel`, `rest`, `park`, or `other`
- `businessStatus`: source-provided status
- `rating`, `ratingCount`
- `priceLevel`
- `types`
- `website`, `phone`
- `hoursSummary`
- `fetchedAt`
- `cacheStatus`: `fresh`, `cached`, or `unavailable`

Validation:
- `id` is required for planner-ready candidates.
- Permanently closed places are not planner-ready.
- Optional source facts are nullable and must not be guessed.

### Route Skeleton

- `source`: `google_routes`
- `origin`
- `destination`
- `distanceMeters`
- `durationSeconds`
- `polyline`
- `segments`: ordered route anchors or leg summaries
- `fetchedAt`
- `cacheStatus`: `fresh`, `cached`, or `unavailable`

Validation:
- Distance and duration are required when route status is available.
- Missing route data produces a typed retrieval error, not estimated numbers.

### Retrieval Context

- `request`: normalized retrieval request
- `candidateGroups`: record of planning category to place candidates
- `route`: route skeleton or unavailable marker
- `warnings`: non-fatal retrieval issues
- `errors`: typed errors for unavailable required data
- `generatedAt`

Validation:
- Planner-ready candidates must all have place ids.
- Context must preserve enough metadata for F6/F11 to distinguish retrieved, cached, unavailable, and failed data.

### Retrieval Cache Entry

- `key`: deterministic hash of normalized non-secret lookup material
- `kind`: `place_search`, `place_details`, `route`
- `value`
- `fetchedAt`
- `expiresAt`
- `source`

Validation:
- Cache entries are fresh only before `expiresAt`.
- Keys must be deterministic for equivalent normalized requests.
- Keys must not contain raw query text when the query may include private owner notes.
