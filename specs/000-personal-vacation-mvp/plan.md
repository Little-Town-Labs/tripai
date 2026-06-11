# Implementation Plan: Personal Vacation MVP

## Architecture

Use the existing Next.js 16 App Router app as a single-page client application at `src/app/page.tsx`.

State lives in browser localStorage for this slice:

- `tripai_session`
- `tripai_family_passcode`
- `tripai_trip`
- `tripai_stop_state`

The first implementation may keep data generation and UI in one client component to ship quickly. Extract modules only if the file becomes hard to verify.

## Data Shapes

- `FamilyProfile`: id, display name, role color.
- `TripIntake`: origin, destination, start/end date, adults, children, interests, budget, travel style, must-do notes.
- `TripPlan`: title, summary, generatedAt, days.
- `TripDay`: date, label, theme, route note, stops.
- `TripStop`: id, time, name, category, location query, description, tip, map query.
- `StopState`: visited, rating, note.

## Generation Strategy

Use deterministic template-based generation:

- Destination selection maps broad destination text to a Florida itinerary profile.
- Interests bias stop labels and tips.
- Travel style controls density.
- Dates determine day count.
- Drive/rest guidance is advisory and not live-routed.

All output must be phrased as draft suggestions and contain verification warnings.

## UX

- Login gate first.
- After login, show planner if no trip exists.
- After plan generation, show active trip dashboard.
- Dashboard sections:
  - current day / next stop summary
  - day tabs
  - stops with Maps handoff, check-off, rating, notes
  - export/copy panel
  - regenerate / clear controls

## Verification

- `npm run lint`
- `npm exec tsc -- --noEmit`
- `npm run build`
- Start dev server and provide local URL.

## Risks

- LocalStorage is not secure or backed up. UI must say this is a personal local copy.
- Template-generated plans can be wrong. UI must say to verify live details.
- Browser-only login is a convenience gate, not production authentication.
