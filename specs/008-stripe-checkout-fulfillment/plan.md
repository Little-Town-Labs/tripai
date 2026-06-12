# Implementation Plan: Stripe Checkout & Fulfillment

**Branch**: `008-stripe-checkout-fulfillment` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-stripe-checkout-fulfillment/spec.md`

## Summary

Implement F8 as a feature-flagged payment slice that is disabled by default. When disabled, owner checkout routes and actions fail closed without contacting Stripe. When enabled and configured, an owner can create a hosted one-time Checkout session for a reviewed trip; fulfillment is driven only by verified `checkout.session.completed` webhooks using the raw request body and Stripe signature header. F8 records purchase state on the existing `trips` table and leaves post-purchase trip detail UX to F9.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.9 App Router

**Primary Dependencies**: Existing runtime dependencies plus a small Stripe gateway abstraction. Prefer platform `fetch` for Checkout session creation in the domain adapter; use deterministic fake providers in tests. Use Web Crypto/Node Crypto for testable signature verification unless the official Stripe SDK is introduced during implementation.

**Storage**: Existing Neon Postgres schema: `trips.price_cents`, `trips.stripe_session_id`, `trips.status`, and `trips.purchased_at`. No schema migration expected for F8.

**Testing**: Add `npm run test:checkout` with `tsx --test --test-concurrency=1 tests/checkout/**/*.test.ts`; run `npm run lint`, `npm run typecheck`, `npm run test:checkout`, `npm run test:plan-review`, and `npm run build`

**Target Platform**: Next.js owner app and route handler on self-hosted CI; future Vercel runtime

**Project Type**: Single Next.js web application

**Performance Goals**: Disabled checkout returns immediately without network calls; webhook handler performs bounded verification and one owner-safe fulfillment transaction

**Constraints**: `TRIPAI_STRIPE_ENABLED` defaults off; secrets stay server-side; Stripe Checkout mode must be `payment`; money stays integer cents; success redirects never fulfill; webhook route reads raw request body exactly once; Route Handler uses Web `Request`

**Scale/Scope**: One owner purchasing one trip at a time for MVP. No subscriptions, coupons, refunds, tax automation, invoices, revision top-ups, share-link checkout, or scrapbook behavior in F8.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: Pass. Checkout is one-time per trip and subscription mode is prohibited.
- **Article VIII: Your Trip Is Private By Default**: Pass. Checkout is owner-only and does not expose Stripe identifiers to share-link users.
- **Article X: Your Money and Your Memories Are Safe**: Pass. Integer cents, verified webhook fulfillment, no client-success fulfillment, and disabled-by-default behavior are mandatory.

## Project Structure

### Documentation (this feature)

```text
specs/008-stripe-checkout-fulfillment/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── checkout.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── stripe/
│   │       └── webhook/
│   │           └── route.ts
│   └── app/
│       └── plan/
│           └── [tripId]/
│               └── checkout/
│                   ├── actions.ts
│                   └── page.tsx
├── components/
│   └── checkout/
│       └── checkout-panel.tsx
└── lib/
    └── checkout/
        ├── config.ts
        ├── service.ts
        ├── stripe.ts
        └── webhook.ts

tests/
└── checkout/
    ├── config.test.ts
    ├── service.test.ts
    └── webhook.test.ts
```

**Structure Decision**: Keep payment domain behavior in `src/lib/checkout` so disabled mode, session creation, and webhook fulfillment are testable without Next.js. Keep route/action files thin and responsible for auth, redirects, raw request body extraction, and HTTP responses.

## Complexity Tracking

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/checkout.md](contracts/checkout.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article I** remains satisfied because only `payment` Checkout sessions are created and no subscription SKU is modeled.
- **Article VIII** remains satisfied because all checkout eligibility and session creation use owner-scoped access.
- **Article X** remains satisfied because fulfillment requires verified signatures and matching session/amount metadata before purchase state changes.
