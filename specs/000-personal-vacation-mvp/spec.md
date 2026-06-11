# Feature Spec: Personal Vacation MVP

**Status:** Implemented
**Scope owner:** Family-only pre-production TripAI slice
**Related roadmap:** Temporary short-term slice before F1-F12 production roadmap

## User Need

The family is going on vacation this week and needs a usable trip-planning tool before the full production platform is ready.

The app should help one family plan, carry, adjust, and remember a Florida road trip. It should work locally without waiting for Neon setup, Google API keys, Claude API keys, Stripe, or object storage.

## Scope

### In Scope

- A login gate so the trip is not immediately visible on page load.
- A small set of local family profiles.
- A family passcode stored and checked in browser-local state.
- Intake fields for origin, destination area, dates, children, interests, budget, and travel style.
- Browser-generated day-by-day itinerary.
- Single active trip focus.
- Mobile-first trip view.
- One-tap Google Maps search/directions handoffs for stops.
- Visited check-offs.
- Per-stop notes.
- Per-stop 1-5 ratings.
- Export/copy trip summary for sharing outside the app.
- Persistence in browser localStorage.

### Out of Scope

- Stripe checkout and payment.
- Neon Postgres persistence.
- Neon Auth production login.
- Google Places API and Google Directions API grounding.
- Claude-based generation.
- Credential-free share links.
- Photo uploads.
- Multi-trip dashboard.

## Constitutional Alignment

This feature is a personal-use exception slice, not the production MVP.

- Article I: No payment or ownership workflow is implemented. The app must not imply a purchased trip.
- Article II: Family account-free sharing is deferred. Export/copy text is allowed for manual sharing.
- Article III: Generated stops are not web-verified. The UI must label the plan as an unverified draft and prompt users to verify hours, closures, reservations, and routing.
- Article IV: Copy must remain advisory.
- Article V: The user can regenerate and edit notes/check-offs locally.
- Article VI: Single-trip, mobile-first, glanceable layout is required.
- Article VII: The app must hand off to Google Maps and must not implement turn-by-turn navigation.
- Article VIII: Local passcode gate is a convenience privacy measure only, not production security.
- Article IX: Notes and ratings are first-class; photos are deferred.
- Article X: LocalStorage durability is best-effort and must not be represented as cloud backup.

## Functional Requirements

- FR-001: The app SHALL show a login screen before showing the planner or trip data.
- FR-002: The login screen SHALL allow choosing a family profile and entering a family passcode.
- FR-003: The passcode SHALL be initialized locally if none exists.
- FR-004: The app SHALL persist session, profile, trip intake, generated itinerary, notes, ratings, and visited state in localStorage.
- FR-005: The app SHALL let the user clear local trip data intentionally.
- FR-006: The planner SHALL generate an itinerary for each calendar day from start date through end date.
- FR-007: The itinerary SHALL include morning, midday, afternoon, and evening guidance where practical.
- FR-008: Each stop SHALL include a Google Maps handoff link.
- FR-009: Every generated plan SHALL show an unverified-plan warning.
- FR-010: The trip view SHALL prioritize current day, next stop, ETA/drive guidance, and large tap targets on mobile.
- FR-011: The app SHALL support per-stop check-offs, ratings, and notes.
- FR-012: The app SHALL produce copyable plain-text trip output.
- FR-013: The app SHALL not include Stripe, checkout, paid ownership, or production auth language in this slice.

## Success Criteria

- A family member can open the app locally, log in, enter trip details, and generate a plan in under 5 minutes.
- The generated plan remains available after reload in the same browser.
- A passenger can open the current day and tap a Maps handoff without hunting through the page.
- The app passes lint, typecheck, production build, and the mobile Playwright smoke test.

## Open Decisions

- Production object storage remains TBD.
- Production Neon Auth remains the roadmap path after the personal MVP.
- Live venue verification remains deferred until Google API setup.
