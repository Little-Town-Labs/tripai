# Local Vacation MVP

This is the short-term build path for using TripAI during an upcoming family trip before the full Neon/Auth/AI/Stripe platform exists.

## Goal

Ship a usable local-first planner in the current Next.js app:

- Local family login gate with profiles and a browser-local passcode.
- Intake form for origin, destination, dates, party, interests, budget, and travel style.
- Deterministic day-by-day Florida itinerary generated in the browser from the intake.
- Mobile-first trip view with current day, next stop, drive notes, and one-tap Google Maps handoffs.
- Local notes, ratings, and visited check-offs stored in browser storage.
- Export/share text so the plan can be copied into messages or documents.

## Non-Goals

This slice does not implement:

- Neon Postgres persistence.
- Neon Auth.
- Google Places or Directions API grounding.
- Claude generation.
- Stripe checkout.
- Credential-free family sharing.
- Photo uploads.
- Stripe checkout or any payment flow.

Those remain roadmap items. This MVP deliberately avoids pretending that generated venues are live-verified. UI copy must tell users to verify hours, closures, reservations, and routing before acting on the plan.

## Acceptance

- The app works locally with `npm run dev`.
- No external credentials are required.
- The app requires local family login before showing trip data.
- The generated plan survives reloads in the same browser.
- Lint, typecheck, and production build pass.
