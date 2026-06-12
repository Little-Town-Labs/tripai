import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createStripeTestSignature,
  verifyStripeWebhook,
} from "../../src/lib/checkout/webhook";

test("US3 verifies signed checkout.session.completed webhook payloads", () => {
  const rawBody = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_paid",
        amount_total: 4900,
        payment_status: "paid",
        metadata: {
          tripId: "trip-1",
          ownerId: "owner-1",
        },
      },
    },
  });
  const signature = createStripeTestSignature(rawBody, "whsec_test");

  assert.deepEqual(verifyStripeWebhook(rawBody, signature, "whsec_test"), {
    ok: true,
    event: {
      type: "checkout.session.completed",
      session: {
        id: "cs_test_paid",
        amountTotal: 4900,
        paymentStatus: "paid",
        metadata: {
          tripId: "trip-1",
          ownerId: "owner-1",
        },
      },
    },
  });
});

test("US3 rejects missing or invalid Stripe signatures", () => {
  const rawBody = JSON.stringify({ type: "checkout.session.completed" });

  assert.deepEqual(verifyStripeWebhook(rawBody, null, "whsec_test"), {
    ok: false,
    reason: "missing_signature",
  });
  assert.deepEqual(verifyStripeWebhook(rawBody, "t=1,v1=bad", "whsec_test"), {
    ok: false,
    reason: "invalid_signature",
  });
});

test("US3 ignores verified non-checkout events", () => {
  const rawBody = JSON.stringify({ type: "payment_intent.succeeded", data: { object: {} } });
  const signature = createStripeTestSignature(rawBody, "whsec_test");

  assert.deepEqual(verifyStripeWebhook(rawBody, signature, "whsec_test"), {
    ok: true,
    event: { type: "payment_intent.succeeded" },
  });
});
