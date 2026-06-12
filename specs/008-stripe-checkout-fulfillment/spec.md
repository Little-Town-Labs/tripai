# Feature Specification: Stripe Checkout & Fulfillment

**Feature Branch**: `008-stripe-checkout-fulfillment`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F8 Stripe checkout and fulfillment: authenticated owner can start hosted one-time Stripe Checkout for a reviewed trip, price is integer cents only, no subscriptions, success redirect is informational only, webhook verifies Stripe signature from raw request body, checkout.session.completed marks the trip purchased and unlocks owner-only purchased trip state without relying on client success redirect. Stripe can be feature-toggled off."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Checkout Disabled Safely (Priority: P1)

As the trip owner, I want the checkout surface to be present but safely disabled when Stripe is not enabled so the app can ship without accidental live payments.

**Why this priority**: The user explicitly wants Stripe feature-toggled off. The safest first F8 slice is proving the UI and server entry points fail closed unless payment configuration is intentionally enabled.

**Independent Test**: With the Stripe feature flag off, open the checkout route and submit the checkout action; verify no Stripe session is created and the owner sees clear disabled messaging.

**Acceptance Scenarios**:

1. **Given** Stripe checkout is disabled by configuration, **When** an owner opens checkout for their reviewed trip, **Then** the page explains checkout is not enabled yet and no payment button can create a live session.
2. **Given** Stripe checkout is disabled, **When** a direct form post or server action invocation attempts to create checkout, **Then** the system refuses before contacting Stripe.
3. **Given** a non-owner attempts to access checkout for a trip, **When** the route or action loads, **Then** no trip or payment details are exposed.

---

### User Story 2 - Start One-Time Hosted Checkout When Enabled (Priority: P2)

As the trip owner, I want to start a one-time hosted Checkout session for a reviewed trip so I can buy the trip without subscriptions or hidden recurring fees.

**Why this priority**: This is the F8 purchase entry point and enforces Article I and Article X before any post-purchase trip experience.

**Independent Test**: With Stripe enabled and a fake checkout provider, request checkout for an owner-visible draft trip and verify the created session uses `mode=payment`, integer cents, trip metadata, success/cancel URLs, and no subscription fields.

**Acceptance Scenarios**:

1. **Given** Stripe checkout is enabled and the owner has a reviewed draft trip, **When** they start checkout, **Then** the system creates a hosted one-time Checkout session and redirects to the hosted URL.
2. **Given** the trip already has a Stripe session id and is not purchased, **When** the owner starts checkout again, **Then** the system can create a fresh session or reuse a still-valid session without marking the trip purchased.
3. **Given** the trip is already purchased, **When** the owner attempts checkout again, **Then** the system refuses duplicate purchase.

---

### User Story 3 - Fulfill Purchase From Verified Webhook (Priority: P3)

As TripAI, I want purchase fulfillment to happen only from verified Stripe webhooks so a client redirect cannot unlock a trip without payment.

**Why this priority**: Article X makes webhook verification and webhook-driven fulfillment mandatory for money safety.

**Independent Test**: Send a signed fake `checkout.session.completed` event with matching trip metadata and verify the trip becomes purchased; send unsigned, invalid, duplicate, or mismatched events and verify they do not fulfill.

**Acceptance Scenarios**:

1. **Given** a valid signed completion event for a known unpaid trip, **When** the webhook handler processes it, **Then** the trip is marked purchased with the Stripe session id, integer price cents, and purchase timestamp.
2. **Given** the user lands on the success redirect without a webhook, **When** the plan page reloads, **Then** the trip is not marked purchased solely from that redirect.
3. **Given** a webhook has an invalid signature, missing trip metadata, wrong amount, or a duplicate session, **When** it is processed, **Then** fulfillment is rejected or ignored without changing unrelated trips.

### Edge Cases

- Stripe feature flag is missing, false, or malformed.
- Required Stripe secret, webhook secret, base URL, or price configuration is missing while the flag is enabled.
- Trip has no current reviewable revision.
- Trip has a non-integer, zero, or negative price.
- Checkout provider returns no URL.
- Owner refreshes checkout page after creating a session.
- Webhook arrives before the checkout action response reaches the browser.
- Webhook is delivered more than once.
- Webhook metadata references a trip that does not exist or is not in draft state.
- Stripe amount differs from the app's stored price cents.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST keep Stripe checkout disabled by default unless `TRIPAI_STRIPE_ENABLED=1`.
- **FR-002**: System MUST refuse checkout creation before contacting Stripe when the feature flag is off or required payment configuration is missing.
- **FR-003**: System MUST expose an authenticated owner-only checkout route for reviewed trips.
- **FR-004**: System MUST create only one-time Checkout sessions using payment mode; subscription mode is prohibited.
- **FR-005**: System MUST represent trip prices and Stripe amounts as integer cents only.
- **FR-006**: System MUST include trip and owner reconciliation metadata in Checkout sessions without exposing owner PII to other users.
- **FR-007**: System MUST redirect owners only to a trusted hosted Checkout URL returned by Stripe.
- **FR-008**: System MUST NOT mark a trip purchased from a client-side success redirect.
- **FR-009**: System MUST verify Stripe webhook signatures against the raw request body before trusting payload contents.
- **FR-010**: System MUST fulfill purchases only for verified `checkout.session.completed` events that match the stored trip, session id, and integer amount.
- **FR-011**: System MUST make webhook fulfillment idempotent so duplicate events do not corrupt trip state.
- **FR-012**: System MUST reject duplicate checkout attempts for already purchased trips.
- **FR-013**: System MUST keep Stripe secrets server-side and out of browser payloads, logs, persisted trip data, tests, and committed files.
- **FR-014**: System MUST avoid live Stripe calls in automated tests by using a fake checkout provider and fake webhook verifier.
- **FR-015**: System MUST keep share-link access, scrapbook uploads, and post-purchase trip UI outside F8 except for setting the purchased state needed by later features.

### Key Entities *(include if feature involves data)*

- **Checkout Eligibility**: Owner-visible trip state that determines whether checkout can be shown, disabled, or started.
- **Checkout Session Request**: Owner action to create a hosted one-time payment session for a trip.
- **Checkout Session Record**: Stripe session id and price cents persisted on the trip while waiting for webhook fulfillment.
- **Stripe Webhook Event**: Verified event payload used to fulfill purchase.
- **Purchase Fulfillment**: Transition from draft to purchased trip state driven by a verified webhook.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With Stripe disabled, checkout route and action refuse payment initiation in automated tests without invoking the provider.
- **SC-002**: With Stripe enabled in fake-provider tests, checkout creation uses payment mode and integer cents for 100% of generated sessions.
- **SC-003**: Automated tests prove a success redirect alone never marks a trip purchased.
- **SC-004**: Automated tests prove unsigned or invalid webhook payloads do not fulfill a trip.
- **SC-005**: Automated tests prove valid completion events are idempotent and mark only the matching trip purchased.
- **SC-006**: No automated test requires live Stripe credentials.

## Assumptions

- Stripe is disabled by default for local/dev runtime until the owner deliberately enables `TRIPAI_STRIPE_ENABLED=1`.
- MVP uses hosted Stripe Checkout instead of embedded checkout or custom Elements to minimize payment surface area.
- The initial MVP price can come from app configuration or existing trip `price_cents`; it must be persisted as integer cents before checkout starts.
- Tax, coupons, invoices, refunds, payment method customization, and top-up revision purchases are out of scope for this feature.
- F9 owns the post-purchase trip detail experience; F8 only records the purchase state that unlocks later features.
