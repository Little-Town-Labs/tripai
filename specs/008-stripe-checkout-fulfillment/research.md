# Research: Stripe Checkout & Fulfillment

## Decisions

### Default Stripe checkout off behind a feature flag

**Decision**: `TRIPAI_STRIPE_ENABLED=1` is required before checkout can create sessions or fulfill webhooks. Missing or false values fail closed.

**Rationale**: The user explicitly requested Stripe as a feature toggle off. This protects the vacation-MVP flow from accidental live payment behavior while allowing F8 code and tests to land.

**Alternatives considered**: Hide all checkout code until a later feature. Rejected because F8 is the roadmap slice and can be safely built behind a disabled flag.

### Hosted one-time Checkout Sessions

**Decision**: Use hosted Stripe Checkout with `mode=payment` for one-time trip purchases.

**Rationale**: Stripe's current docs describe Checkout Sessions as the prebuilt hosted payment path for one-time payments. It minimizes PCI and UI surface area, and Article I prohibits recurring charges.

**Alternatives considered**: Embedded Checkout or custom Elements. Rejected for MVP because hosted Checkout has lower integration complexity and fewer app-side payment UI concerns.

### Webhook fulfillment only

**Decision**: Mark trips purchased only from verified `checkout.session.completed` webhook processing, never from success redirects.

**Rationale**: Constitution Article X requires verified webhook-driven fulfillment. Stripe docs also emphasize verifying webhook signatures using the raw request body, signature header, and endpoint secret before trusting payloads.

**Alternatives considered**: Mark purchased in the checkout success page. Rejected because users can visit success URLs without payment completion.

### Existing trips table fields

**Decision**: Use existing `trips.price_cents`, `trips.stripe_session_id`, `trips.status`, and `trips.purchased_at` for F8.

**Rationale**: F2 already reserved these fields for checkout. No additional payment ledger is needed for the first one-time trip purchase flow.

**Alternatives considered**: Add a separate purchases table. Deferred until refunds, receipts, top-ups, or richer payment audit requirements exist.

### Next.js route/action shape

**Decision**: Use a Server Action for owner-initiated checkout and a Route Handler at `/api/stripe/webhook` for webhook processing.

**Rationale**: Next.js 16 docs confirm Server Actions are mutation endpoints that must re-check auth and Route Handlers use Web `Request`/`Response`. A route handler can read `request.text()` for raw webhook body.

**Alternatives considered**: Pages API routes. Rejected because the project uses the App Router.
