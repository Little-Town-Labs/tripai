# Feature Specification: F9 Trip Detail View / Co-pilot UX

**Feature Branch**: `009-trip-detail-copilot`
**Created**: 2026-06-12
**Status**: Draft
**Roadmap Item**: F9 Trip detail view (co-pilot UX)
**Input**: Roadmap F9: owner-only in-trip experience at `trips/[tripId]` with day-by-day itinerary, route overview, stop cards, ETA/distance/next-stop context, one-tap Waze/Google Maps handoffs, park official links, large tappable targets, high-contrast mobile-first layout.

## User Scenarios & Testing

### User Story 1 - Open the Purchased Trip Co-pilot View (Priority: P1)

As the trip owner, I can open a purchased trip from the owner app and immediately see the trip title, current day, current stop, next stop, and the full day-by-day itinerary so the passenger-seat co-pilot can guide the family without digging through the plan review screen.

**Why this priority**: This is the core in-trip experience promised by the roadmap and depends on F8 purchase fulfillment.

**Independent Test**: Seed a purchased owner trip with a current revision, days, and ordered stops. Load the trip detail service/page as that owner and verify it returns a ready co-pilot model with ordered days, current stop, next stop, trip status, and revision-derived route facts.

**Acceptance Scenarios**:

1. **Given** an authenticated owner has a purchased trip with a current revision, **When** they open `/app/trips/{tripId}`, **Then** the page displays the trip title, current day summary, current stop, next stop, and all days in order.
2. **Given** the same trip has checked stops, **When** the co-pilot model is built, **Then** the current stop is the first unchecked stop on the active day and the next stop is the following stop.
3. **Given** a trip has no current revision or no days, **When** the owner opens the route, **Then** the page shows a not-ready state instead of fabricating route content.

---

### User Story 2 - Navigate to Stops From the Car (Priority: P1)

As the trip owner or passenger-seat co-pilot, I can tap large Google Maps and Waze actions for each stop so I can hand off navigation to dedicated map apps quickly.

**Why this priority**: Navigation handoff is essential for travel-day usefulness and avoids TripAI pretending to be turn-by-turn navigation.

**Independent Test**: Build a trip detail stop with coordinates, address, and Google place id. Verify Google Maps and Waze handoff URLs are generated from persisted stop data, remain usable when coordinates are missing, and never require a live provider call.

**Acceptance Scenarios**:

1. **Given** a stop has latitude and longitude, **When** its card renders, **Then** Google Maps and Waze actions target that coordinate.
2. **Given** a stop lacks coordinates but has a name/address, **When** its card renders, **Then** navigation actions fall back to a text search URL.
3. **Given** the driver needs directions, **When** they tap a handoff, **Then** TripAI opens the external map app/site and does not present its own turn-by-turn instructions.

---

### User Story 3 - Use Park Stop Official Links Without Live Park Data (Priority: P2)

As a family visiting a park, I can tap an official park app/web link from park stops so I can check live park information in the official source while TripAI stays focused on the planned itinerary.

**Why this priority**: The roadmap asked to decide whether F9 includes Disney live data. For this family MVP, official links are enough and avoid brittle/live integrations.

**Independent Test**: Seed a park stop with and without a website. Verify the co-pilot model exposes an official link for park stops and no official link for non-park stops.

**Acceptance Scenarios**:

1. **Given** a stop has type `park` and a website, **When** its card renders, **Then** it includes an official park link using the stored website.
2. **Given** a stop has type `park` and no website, **When** its card renders, **Then** it includes the configured official Disney web fallback.
3. **Given** a park stop renders, **When** the page loads, **Then** it does not call or depend on a live Disney API.

---

### User Story 4 - Stay Owner-only (Priority: P1)

As the trip owner, only I can access my purchased trip co-pilot view until family sharing is implemented later.

**Why this priority**: The owner-only privacy boundary is a constitutional data-access requirement and RLS behavior already exists.

**Independent Test**: Seed owner A and owner B. Verify owner B receives `not_found` for owner A's purchased trip detail.

**Acceptance Scenarios**:

1. **Given** owner B is authenticated, **When** they request owner A's trip detail, **Then** the service returns `not_found` and the route renders 404.
2. **Given** an unauthenticated visitor requests the page, **When** auth is required, **Then** the existing owner auth guard handles sign-in.

### Edge Cases

- A purchased trip has no current revision.
- A current revision has days but no stops.
- A stop has no coordinates but does have an address or name.
- A day has no total miles or drive time.
- The current date is before the first itinerary day or after the last itinerary day.
- A non-purchased draft trip exists for the owner.
- A park stop lacks a stored website.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide an owner-authenticated trip detail route at `/app/trips/[tripId]`.
- **FR-002**: The route MUST only display trips visible to the authenticated owner through the existing owner/RLS context.
- **FR-003**: The route MUST only expose the co-pilot experience for trips with status `purchased`, `active`, or `completed` and a non-null `purchased_at`.
- **FR-004**: The co-pilot model MUST use the trip's current revision and ordered day/stop records; it MUST NOT invent missing itinerary data.
- **FR-005**: The page MUST show the trip title, trip summary when present, active day, current stop, next stop, and full day-by-day itinerary.
- **FR-006**: The service MUST compute the active day from today's date when it falls within the itinerary; otherwise it MUST select the first itinerary day for pre-trip use and the last itinerary day for post-trip use.
- **FR-007**: The service MUST compute the current stop as the first unchecked stop on the active day; if all active-day stops are checked, it MUST use the final stop on that day.
- **FR-008**: Stop cards MUST include ETA when stored, day route distance/time when stored, next-stop context when available, and available place details already persisted by F5/F6.
- **FR-009**: Stop cards MUST include Google Maps and Waze handoff links generated from stored coordinates or stored name/address fallback.
- **FR-010**: Park stop cards MUST include an official park app/web link using the stored website when available or an official Disney web fallback when no website is stored.
- **FR-011**: The page MUST be mobile-first with tappable controls at least 44px tall and high-contrast typography suitable for passenger-seat use.
- **FR-012**: The route overview MUST use persisted route/day/stop data and MUST NOT introduce a live map provider dependency in this feature.
- **FR-013**: The feature MUST NOT implement photo storage/upload or scrapbook contributions; those remain deferred to F10.
- **FR-014**: The feature MUST NOT implement live Disney wait-time/park data; official outbound links are the F9 scope.
- **FR-015**: The plan review page SHOULD link purchased trips to the co-pilot trip detail route so owners can find the in-trip view after fulfillment.

### Key Entities

- **Trip Detail**: Owner-visible purchased trip, title, summary, status, purchase timestamp, current revision, route totals, active day, current stop, next stop.
- **Trip Detail Day**: Current-revision itinerary day with date, label, route distance/time, summary, ordered stops, and active-day marker.
- **Trip Detail Stop**: Ordered stop with persisted place metadata, coordinates/address, ETA, checked state, next-stop preview, navigation handoff links, and optional official park link.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Owner A can load a purchased seeded trip detail model and receive ordered day/stop data in automated tests.
- **SC-002**: Owner B cannot load Owner A's trip detail model in automated tests.
- **SC-003**: Navigation link generation is covered for coordinate and text-search fallback stops.
- **SC-004**: The route builds successfully under Next.js 16 with async `params` and owner auth.
- **SC-005**: The roadmap marks F9 complete only after lint, typecheck, focused tests, and build pass.
