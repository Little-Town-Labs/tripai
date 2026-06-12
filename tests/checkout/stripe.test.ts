import assert from "node:assert/strict";
import { test } from "node:test";

import { StripeCheckoutProvider } from "../../src/lib/checkout/stripe";

test("US2 maps Checkout Session request to Stripe payment-mode form data", async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const provider = new StripeCheckoutProvider({
    secretKey: "sk_test_fake",
    fetchImpl: async (url, init) => {
      captured = { url: String(url), init: init ?? {} };
      return Response.json({ id: "cs_test_123", url: "https://checkout.stripe.test/session" });
    },
  });

  const result = await provider.createCheckoutSession({
    tripId: "trip-1",
    ownerId: "owner-1",
    title: "Family Florida Trip",
    priceCents: 4900,
    successUrl: "https://tripai.example/success",
    cancelUrl: "https://tripai.example/cancel",
  });

  assert.deepEqual(result, {
    id: "cs_test_123",
    url: "https://checkout.stripe.test/session",
  });
  assert.equal(captured?.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(captured?.init.method, "POST");
  assert.equal((captured?.init.headers as Record<string, string>).Authorization, "Bearer sk_test_fake");

  const body = captured?.init.body as URLSearchParams;
  assert.equal(body.get("mode"), "payment");
  assert.equal(body.get("line_items[0][price_data][unit_amount]"), "4900");
  assert.equal(body.get("metadata[tripId]"), "trip-1");
  assert.equal(body.get("metadata[ownerId]"), "owner-1");
  assert.equal(body.get("success_url"), "https://tripai.example/success");
  assert.equal(body.get("cancel_url"), "https://tripai.example/cancel");
  assert.equal(body.get("subscription"), null);
});
