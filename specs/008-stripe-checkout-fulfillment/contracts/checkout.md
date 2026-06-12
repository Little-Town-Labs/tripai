# Contract: Checkout

## `getCheckoutStatus(pool, ownerId, tripId, config)`

Returns owner-safe checkout page state.

```ts
type CheckoutStatus =
  | { ok: true; status: "disabled"; trip: CheckoutTrip; message: string }
  | { ok: true; status: "eligible"; trip: CheckoutTrip; priceCents: number }
  | { ok: true; status: "purchased"; trip: CheckoutTrip }
  | { ok: false; reason: "not_found" | "not_ready" };
```

Behavior:

- Uses `tripai_app` role and owner context.
- Returns disabled state when the feature flag is off.
- Does not contact Stripe.

## `createCheckoutSession(pool, ownerId, tripId, config, provider)`

Creates a hosted one-time Checkout session when enabled.

```ts
type CreateCheckoutSessionResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; reason: "disabled" | "not_configured" | "not_found" | "not_ready" | "already_purchased" | "invalid_price" | "provider_error" };
```

Provider request must include:

- `mode: "payment"`
- one line item amount in integer cents
- `success_url`
- `cancel_url`
- `metadata.tripId`
- `metadata.ownerId`

Behavior:

- Refuses before provider call when disabled or unconfigured.
- Persists `price_cents` and `stripe_session_id` after session creation.
- Does not set `purchased_at`.

## `fulfillCheckoutSession(pool, event)`

Applies verified checkout completion.

```ts
type FulfillCheckoutResult =
  | { ok: true; status: "fulfilled" | "already_fulfilled" | "ignored" }
  | { ok: false; reason: "not_found" | "session_mismatch" | "amount_mismatch" | "not_paid" };
```

Behavior:

- Acts only on `checkout.session.completed`.
- Requires matching `tripId`, session id, and amount.
- Sets `status = 'purchased'`, `purchased_at = now()`, and keeps `price_cents`.
- Is idempotent for duplicate events.

## `POST /api/stripe/webhook`

Route Handler for Stripe webhooks.

- Reads raw body via `request.text()`.
- Reads signature from `Stripe-Signature`.
- Verifies signature before parsing/trusting event.
- Returns 400 for invalid signatures.
- Returns 200 for ignored duplicate/irrelevant verified events.
