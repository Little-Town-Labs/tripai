# Data Model: Stripe Checkout & Fulfillment

## Trip

Existing owner-scoped trip purchase target.

- `id`: Checkout target and webhook metadata reference.
- `owner_id`: Owner boundary for checkout initiation.
- `current_revision_id`: Must be present for checkout eligibility.
- `status`: `draft` before purchase, `purchased` after fulfillment.
- `price_cents`: Integer cents amount for Checkout and fulfillment verification.
- `stripe_session_id`: Latest Checkout session id for matching webhook fulfillment.
- `purchased_at`: Set only by verified webhook fulfillment.
- `deleted_at`: Deleted trips are not eligible for checkout.

## Checkout Configuration

Runtime-only configuration.

- `enabled`: True only when `TRIPAI_STRIPE_ENABLED=1`.
- `secretKey`: Server-side Stripe API key, required only when enabled.
- `webhookSecret`: Server-side webhook endpoint secret, required only when enabled for webhook verification.
- `baseUrl`: Absolute app URL used for success and cancel URLs.
- `defaultPriceCents`: Optional integer cents fallback when a draft trip has no price yet.

## Checkout Session

Provider-created hosted payment session.

- `id`: Persisted to `trips.stripe_session_id`.
- `url`: Trusted hosted Checkout URL used for owner redirect.
- `mode`: Must be `payment`.
- `amountTotal`: Integer cents expected to match `trips.price_cents`.
- `metadata.tripId`: Trip reference for webhook fulfillment.
- `metadata.ownerId`: Owner reference for reconciliation.

## Webhook Event

Verified Stripe event.

- `type`: F8 acts only on `checkout.session.completed`.
- `session.id`: Must match `trips.stripe_session_id`.
- `session.metadata.tripId`: Must identify the trip.
- `session.amount_total`: Must match stored integer cents.
- `session.payment_status`: Must indicate paid completion.

## State Transitions

```text
draft trip with current revision
  -> checkout session created: status remains draft, price_cents and stripe_session_id stored
  -> verified checkout.session.completed: status = purchased, purchased_at set
  -> duplicate verified event: no further mutation
```

## Validation Rules

- Price cents must be a positive integer.
- Checkout cannot start when feature flag is disabled.
- Checkout cannot start for deleted, purchased, or revisionless trips.
- Webhooks cannot fulfill when signature verification fails.
- Webhooks cannot fulfill when session id or amount mismatches the stored trip.
