# Quickstart: Stripe Checkout & Fulfillment

## Run Focused Tests

```bash
npm run test:checkout
```

## Run Relevant Validation

```bash
npm run lint
npm run typecheck
npm run test:checkout
npm run test:plan-review
npm run build
```

DB-backed tests reset the Neon testing branch. Run them sequentially with other DB/auth suites.

## Runtime Configuration

Stripe is disabled by default.

```bash
TRIPAI_STRIPE_ENABLED=0
```

To enable checkout in a controlled environment, set server-side values only:

```bash
TRIPAI_STRIPE_ENABLED=1
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TRIPAI_APP_BASE_URL=
TRIPAI_TRIP_PRICE_CENTS=
```

Do not commit real values.

## Manual Smoke When Enabled

1. Start the app with Stripe test credentials and `TRIPAI_STRIPE_ENABLED=1`.
2. Open `/app/plan/<tripId>/checkout` as the trip owner.
3. Start hosted Checkout and complete payment with Stripe test cards.
4. Forward Stripe webhooks to `/api/stripe/webhook`.
5. Confirm the trip is not marked purchased until the verified webhook is processed.
