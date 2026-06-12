# Research: F9 Trip Detail View / Co-pilot UX

## Decision 1: Implement route as `/app/trips/[tripId]`

**Decision**: Use `/app/trips/[tripId]` for the owner route while documenting it as the roadmap's `trips/[tripId]` surface.

**Rationale**: Existing authenticated owner functionality lives under `/app` (`/app/intake`, `/app/plan/[tripId]`, `/app/plan/[tripId]/checkout`). Keeping F9 there reuses owner auth assumptions and avoids adding a public route before share links ship in F12.

**Alternatives considered**:

- `/trips/[tripId]`: Rejected for F9 because it looks public/shareable and could confuse the owner-only privacy model.

## Decision 2: No live map provider dependency in F9

**Decision**: Render a route overview from persisted day/stop facts instead of adding Leaflet or a tile provider now.

**Rationale**: The F9 user value is co-pilot clarity and one-tap handoff. A live embedded map adds dependency, performance, API-key, and layout risk while duplicating Google Maps/Waze. The roadmap's route-overview need can be met by a glanceable summary and coordinate-aware stop sequence.

**Alternatives considered**:

- Add Leaflet immediately: Deferred. It can be a later focused decision if embedded map inspection becomes more important than fast passenger-seat navigation.

## Decision 3: Park stops link out, no live Disney data

**Decision**: Park stops show an official link. Stored website wins; otherwise use an official Disney web fallback.

**Rationale**: Article VII forbids TripAI from becoming a park-ops clone. Official links satisfy the family MVP need without brittle live data integrations.

**Alternatives considered**:

- Live Disney wait times/hours widget: Rejected for F9. It requires a separate official/public data decision and is not needed for basic vacation use.

## Decision 4: Build service model with one owner-scoped transaction

**Decision**: Create `getTripDetail(pool, ownerId, { tripId, today? })` that sets app role and owner context, then queries the visible purchased trip, current revision days, and stops in one transaction.

**Rationale**: This matches the existing plan review service pattern, lets RLS enforce owner access, and makes active-day tests deterministic through a `today` option.

**Alternatives considered**:

- Reuse `getPlanReview`: Rejected because F9 has stricter purchase gating, checked/current-stop semantics, and navigation link shaping that should not leak into pre-purchase review.

## Decision 5: Navigation links generated from persisted data only

**Decision**: Generate Google Maps and Waze links from coordinates when present, falling back to encoded name/address text.

**Rationale**: Handoffs are useful even when a stop lacks coordinates, and link generation should be deterministic with no live provider call.

**Alternatives considered**:

- Fetch place details during render: Rejected. It would slow the route, add failure modes, and violate the persisted-data-only F9 scope.
