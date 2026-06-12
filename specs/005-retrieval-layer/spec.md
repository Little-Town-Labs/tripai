# Feature Specification: Retrieval Layer

**Feature Branch**: `005-retrieval-layer`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F5 retrieval layer: server-side wrappers for Google Places Text Search and Details plus route skeletons, keeping keys server-side, caching stable venue and route results, and returning structured verified retrieval context for F6 generation and F11 revisions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build Verified Destination Candidates (Priority: P1)

As the trip planning pipeline, I need a structured set of verified destination candidates from the owner's intake so the planner can choose real restaurants, attractions, hotels, and other useful stops without inventing places.

**Why this priority**: This is the minimum valuable F5 slice because Article III requires every future recommendation to be grounded in verified place data before the AI planner sees it.

**Independent Test**: Provide a valid Florida road-trip intake and controlled place-search responses, then verify the retrieval context contains only structured candidates with verified place identifiers and no fabricated venue facts.

**Acceptance Scenarios**:

1. **Given** a valid intake with destination, dates, interests, party details, budget, and constraints, **When** destination retrieval runs, **Then** it returns grouped candidate places for trip planning with place identifiers, names, addresses, coordinates, source freshness, and available rating/price/opening metadata.
2. **Given** a search result without a verified place identifier, **When** retrieval normalizes the candidates, **Then** that result is excluded from planner-ready context.
3. **Given** the source does not provide optional facts such as rating, price, website, phone, or hours, **When** retrieval builds the candidate, **Then** those facts are omitted or marked unavailable rather than guessed.

---

### User Story 2 - Build A Route Skeleton And Along-Route Stops (Priority: P2)

As the trip planning pipeline, I need a route skeleton from the origin to the destination plus useful along-route stop candidates so the generated plan can respect real drive times, distances, and rest/fuel needs.

**Why this priority**: The family road-trip promise depends on realistic drive segments. Route and along-route context becomes essential before F6 can create a plausible itinerary.

**Independent Test**: Provide a valid origin, destination, and controlled routing responses, then verify the route skeleton includes distance, duration, route legs or segments, and candidate search anchors for rest/fuel stops without relying on AI estimates.

**Acceptance Scenarios**:

1. **Given** a valid road-trip intake, **When** route retrieval runs, **Then** it returns total distance, total duration, route geometry or summary, and ordered route anchors suitable for later day planning.
2. **Given** a long route, **When** along-route retrieval runs, **Then** it returns rest/fuel candidate groups at practical intervals using verified place identifiers.
3. **Given** route data is unavailable, **When** retrieval completes, **Then** it returns an explicit route retrieval error and does not provide estimated distances or durations as confirmed data.

---

### User Story 3 - Reuse Cached Retrieval Safely (Priority: P3)

As the trip planning pipeline, I need stable venue and route lookups to be cached with clear freshness metadata so repeated generation and revision attempts are faster and cheaper without hiding stale or failed source data.

**Why this priority**: Caching protects cost and responsiveness, but it must not weaken Article III's verification promise or leak private trip details.

**Independent Test**: Run retrieval twice with the same normalized lookup request and controlled cache state, then verify the second run reuses fresh cached source data while stale or failed entries trigger a new lookup or an explicit unavailable result.

**Acceptance Scenarios**:

1. **Given** fresh cached place details for a repeated lookup, **When** retrieval runs again, **Then** it reuses the cached data and includes the cache source and freshness timestamp in the context.
2. **Given** a stale cached route or place entry, **When** retrieval runs, **Then** it refreshes the entry or marks the data unavailable instead of silently serving stale confirmed facts.
3. **Given** a lookup request containing owner-specific notes or constraints, **When** a cache key is generated, **Then** the key excludes secrets, owner PII, and free-text private details.

### Edge Cases

- The Google provider is temporarily unavailable, rate-limited, or returns malformed data.
- The requested destination is ambiguous, outside the MVP Florida focus, or has too few candidate results.
- A place is permanently closed or lacks opening-hours data for the requested travel dates.
- The API key is missing in local development or CI.
- Two equivalent lookup requests differ only by whitespace, case, or ordering of interests.
- Cached data is fresh enough for planning but lacks optional fields needed by a later generation pass.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a normalized trip intake and produce a planner-ready retrieval context for destination candidates.
- **FR-002**: System MUST group destination candidates by planning use, including restaurants, attractions, lodging, rest, fuel, and family-relevant activities when enough source data exists.
- **FR-003**: System MUST include a verified place identifier for every planner-ready venue candidate.
- **FR-004**: System MUST include source-provided venue attributes only when available, including display name, formatted address, coordinates, business status, rating, rating count, price level, website, phone, opening-hours summary, types, and source timestamp.
- **FR-005**: System MUST exclude or mark unavailable any candidate facts that cannot be verified from source data.
- **FR-006**: System MUST identify permanently closed venues and prevent them from appearing as planner-ready candidates.
- **FR-007**: System MUST produce a route skeleton with confirmed distance and duration for origin-to-destination planning when source routing data is available.
- **FR-008**: System MUST provide ordered route anchors or segments that downstream planning can use to request rest and fuel stops along the trip.
- **FR-009**: System MUST return explicit, typed retrieval errors when place, route, or details data cannot be retrieved or normalized.
- **FR-010**: System MUST NOT fabricate or estimate venue facts, drive times, distances, or route details when source data is missing.
- **FR-011**: System MUST keep external provider credentials server-side and prevent credentials from appearing in browser payloads, committed files, test snapshots, or normal logs.
- **FR-012**: System MUST cache stable place details, search results, and route skeletons with freshness metadata.
- **FR-013**: System MUST generate deterministic cache keys from normalized non-secret lookup inputs and exclude owner PII, secrets, and private free-text notes from those keys.
- **FR-014**: System MUST make cached context distinguishable from freshly retrieved context.
- **FR-015**: System MUST expose retrieval context in a stable internal contract that F6 initial generation and F11 revisions can consume.
- **FR-016**: System MUST support deterministic tests using controlled provider responses without requiring live external API credentials.
- **FR-017**: System MUST document how an optional live smoke check can be run when provider credentials are available.

### Key Entities *(include if feature involves data)*

- **Retrieval Request**: A normalized planning request derived from intake, including origin, destination area, dates, party profile, budget level, interests, dietary needs, mobility notes category, and travel style.
- **Place Candidate**: A verified venue option with source identifiers, display attributes, availability metadata, planning category, and freshness details.
- **Route Skeleton**: Confirmed origin-to-destination route summary with distance, duration, geometry or route summary, and ordered anchors/segments for later planning.
- **Retrieval Context**: Planner-ready bundle containing the normalized request, candidate groups, route skeleton, retrieval warnings/errors, and source/freshness metadata.
- **Retrieval Cache Entry**: Stored source response or normalized retrieval result with deterministic cache key, data type, fetched timestamp, freshness policy, and source status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid Orlando-area intake produces at least one planner-ready candidate group and a route skeleton when controlled source data provides valid places and routes.
- **SC-002**: 100% of planner-ready venue candidates in tests include a verified place identifier.
- **SC-003**: 100% of controlled closed-place responses are excluded from planner-ready candidates or marked unavailable for selection.
- **SC-004**: Missing provider credentials in CI produce deterministic skipped live checks or typed configuration errors, not accidental network calls or leaked secrets.
- **SC-005**: Repeating the same normalized retrieval request within the freshness window uses cached data and reports cache freshness.
- **SC-006**: Provider failures return typed retrieval errors within the context and never produce confirmed venue, distance, or duration facts from fallback guesses.

## Assumptions

- F5 builds the server-side retrieval layer and internal contracts only; it does not build the AI planner, public plan UI, checkout, scrapbook, or revision UI.
- Google Places and routing data are the primary source for venue and route facts; seasonal park/event context may remain hardcoded or deferred unless already available.
- CI and most local tests do not have live Google credentials, so core validation uses fake provider adapters and optional smoke tests are credential-gated.
- The roadmap names Google Directions, while current planning may use Google's current Routes interface for route skeletons if it satisfies the same product requirement for verified drive time and distance.
- Cache persistence can start with the existing database when needed, but the spec does not mandate a particular storage implementation.
