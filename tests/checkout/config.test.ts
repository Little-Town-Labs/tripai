import assert from "node:assert/strict";
import { test } from "node:test";

import { loadCheckoutConfig, validateCheckoutConfig } from "../../src/lib/checkout/config";

test("US1 loads checkout disabled by default", () => {
  const config = loadCheckoutConfig({});

  assert.equal(config.enabled, false);
  assert.deepEqual(validateCheckoutConfig(config), { ok: true, config });
});

test("US2 requires all Stripe values when checkout is enabled", () => {
  const config = loadCheckoutConfig({ TRIPAI_STRIPE_ENABLED: "1" });
  const status = validateCheckoutConfig(config);

  assert.equal(status.ok, false);
  assert.equal(status.reason, "not_configured");
  assert.deepEqual(status.missing, [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "TRIPAI_APP_BASE_URL",
    "TRIPAI_TRIP_PRICE_CENTS",
  ]);
});

test("US2 accepts enabled config with positive integer cents", () => {
  const config = loadCheckoutConfig({
    TRIPAI_STRIPE_ENABLED: "1",
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_WEBHOOK_SECRET: "whsec_fake",
    TRIPAI_APP_BASE_URL: "https://tripai.example/",
    TRIPAI_TRIP_PRICE_CENTS: "4900",
  });

  assert.deepEqual(config, {
    enabled: true,
    secretKey: "sk_test_fake",
    webhookSecret: "whsec_fake",
    baseUrl: "https://tripai.example",
    defaultPriceCents: 4900,
  });
  assert.equal(validateCheckoutConfig(config).ok, true);
});
