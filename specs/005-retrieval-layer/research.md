# Research: Retrieval Layer

## Decision: Use Places API Text Search (New) and Place Details (New) field masks

**Rationale**: Google documents Text Search (New) as returning places from text queries and requiring an explicit field mask. Place Details (New) also requires a field mask, and Google calls field masking a good practice to avoid unnecessary processing and billing. This matches F5's need for bounded, cost-conscious venue data.

**Alternatives considered**:
- Request all place fields with wildcard masks. Rejected because Google discourages wildcard field masks in production.
- Store only search responses without details. Rejected because later validation needs consistent place-level facts and freshness.

## Decision: Use Routes API `computeRoutes` for the route skeleton while preserving the roadmap's Directions intent

**Rationale**: The roadmap says "Google Directions" because the product requirement is verified drive time and distance. Google's current Routes API `computeRoutes` provides route duration, distance, and polyline/summary fields through explicit field masks, satisfying the same product requirement with the current Maps Platform route interface.

**Alternatives considered**:
- Legacy Directions endpoint. Deferred because the current official route interface is better aligned with field-mask cost controls.
- AI-estimated drive times. Rejected by Article III.

## Decision: Keep provider credentials server-side and use restricted, separate API keys

**Rationale**: Google Maps Platform security guidance recommends restricting API keys and using separate keys per app to reduce compromise impact. F5 will read a server-only key and will not expose it through client bundles, normal logs, snapshots, or browser payloads.

**Alternatives considered**:
- Browser-based Places calls. Rejected because F5 is a server-side grounding layer and must keep keys private.
- Shared unrestricted API key. Rejected because it increases blast radius.

## Decision: Normalize requests before caching

**Rationale**: Equivalent owner inputs can differ in whitespace, casing, and ordering. A normalized request keeps cache behavior deterministic while excluding secrets, owner identifiers, email addresses, and private free-text notes from cache keys.

**Alternatives considered**:
- Hash the raw intake. Rejected because it risks including private notes and unstable formatting.
- No caching. Rejected because the roadmap calls for caching stable venue and route results.

## Decision: Ship an injectable cache abstraction with in-process implementation first

**Rationale**: F5's immediate consumers are F6/F11 code paths that do not exist yet. A small cache abstraction proves behavior and contract now, while leaving persistent cache storage to the generation feature once query volume, TTLs, and invalidation needs are clearer.

**Alternatives considered**:
- Add a database cache table now. Deferred to avoid schema churn before F6 defines real lookup volume and retention requirements.
- Couple caching to provider adapters only. Rejected because the context builder needs to report source freshness uniformly.

## Decision: Test with fake providers and keep live smoke optional

**Rationale**: CI should not require Google credentials or network access. Fake providers can prove normalization, field mapping, closed-place filtering, route error behavior, and cache reuse deterministically. Optional live smoke instructions cover local credential validation without making CI flaky.

**Alternatives considered**:
- Live API tests in CI. Rejected due to secrets, cost, quota, and reliability concerns.
