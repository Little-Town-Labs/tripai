import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import type { CheckoutProvider } from "../../src/lib/checkout/stripe";
import {
  createCheckoutSession,
  fulfillCheckoutSession,
  getCheckoutStatus,
} from "../../src/lib/checkout/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  ownerAId,
  ownerBId,
  seedOwnerPrivacyScenario,
  tripAId,
} from "../db/helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await resetTripAToDraft();
});

after(async () => {
  await pool.end();
});

test("US1 returns disabled checkout without provider contact", async () => {
  const provider = new CountingProvider();
  const status = await getCheckoutStatus(pool, ownerAId, tripAId, { enabled: false });
  const result = await createCheckoutSession(pool, ownerAId, tripAId, { enabled: false }, provider);

  assert.equal(status.ok, true);
  assert.equal(status.status, "disabled");
  assert.deepEqual(result, { ok: false, reason: "disabled" });
  assert.equal(provider.calls, 0);
});

test("US1 denies checkout state for another owner", async () => {
  const status = await getCheckoutStatus(pool, ownerBId, tripAId, { enabled: false });

  assert.deepEqual(status, { ok: false, reason: "not_found" });
});

test("US2 creates one-time checkout session and persists session id without purchase", async () => {
  await resetTripAToDraft();
  const provider = new CountingProvider();
  const result = await createCheckoutSession(
    pool,
    ownerAId,
    tripAId,
    {
      enabled: true,
      secretKey: "sk_test_fake",
      webhookSecret: "whsec_fake",
      baseUrl: "https://tripai.example",
      defaultPriceCents: 4900,
    },
    provider,
  );

  assert.equal(result.ok, true);
  assert.equal(provider.calls, 1);
  assert.equal(provider.requests[0].priceCents, 4900);
  assert.equal(provider.requests[0].successUrl, `https://tripai.example/app/plan/${tripAId}?checkout=success`);

  const trip = await pool.query<{
    stripe_session_id: string | null;
    price_cents: number | null;
    status: string;
    purchased_at: Date | null;
  }>("select stripe_session_id, price_cents, status, purchased_at from trips where id = $1", [
    tripAId,
  ]);
  assert.equal(trip.rows[0].stripe_session_id, "cs_test_created_1");
  assert.equal(trip.rows[0].price_cents, 4900);
  assert.equal(trip.rows[0].status, "draft");
  assert.equal(trip.rows[0].purchased_at, null);
});

test("US2 refuses duplicate checkout for purchased trips", async () => {
  await pool.query("update trips set status = 'purchased', purchased_at = now() where id = $1", [
    tripAId,
  ]);

  const result = await createCheckoutSession(
    pool,
    ownerAId,
    tripAId,
    {
      enabled: true,
      secretKey: "sk_test_fake",
      webhookSecret: "whsec_fake",
      baseUrl: "https://tripai.example",
      defaultPriceCents: 4900,
    },
    new CountingProvider(),
  );

  assert.deepEqual(result, { ok: false, reason: "already_purchased" });
  await resetTripAToDraft();
});

test("US3 fulfills a matching paid session idempotently", async () => {
  await resetTripAToDraft();
  await pool.query("update trips set stripe_session_id = $1, price_cents = 4900 where id = $2", [
    "cs_test_paid",
    tripAId,
  ]);

  const event = {
    type: "checkout.session.completed" as const,
    session: {
      id: "cs_test_paid",
      amountTotal: 4900,
      paymentStatus: "paid",
      metadata: { tripId: tripAId, ownerId: ownerAId },
    },
  };

  assert.deepEqual(await fulfillCheckoutSession(pool, event), {
    ok: true,
    status: "fulfilled",
  });
  assert.deepEqual(await fulfillCheckoutSession(pool, event), {
    ok: true,
    status: "already_fulfilled",
  });

  const trip = await pool.query<{ status: string; purchased_at: Date | null }>(
    "select status, purchased_at from trips where id = $1",
    [tripAId],
  );
  assert.equal(trip.rows[0].status, "purchased");
  assert.ok(trip.rows[0].purchased_at);
});

test("US3 rejects mismatched amount, session, and unpaid events", async () => {
  await resetTripAToDraft();
  await pool.query("update trips set stripe_session_id = $1, price_cents = 4900 where id = $2", [
    "cs_test_expected",
    tripAId,
  ]);

  assert.deepEqual(
    await fulfillCheckoutSession(pool, {
      type: "checkout.session.completed",
      session: {
        id: "cs_test_other",
        amountTotal: 4900,
        paymentStatus: "paid",
        metadata: { tripId: tripAId },
      },
    }),
    { ok: false, reason: "session_mismatch" },
  );
  assert.deepEqual(
    await fulfillCheckoutSession(pool, {
      type: "checkout.session.completed",
      session: {
        id: "cs_test_expected",
        amountTotal: 4800,
        paymentStatus: "paid",
        metadata: { tripId: tripAId },
      },
    }),
    { ok: false, reason: "amount_mismatch" },
  );
  assert.deepEqual(
    await fulfillCheckoutSession(pool, {
      type: "checkout.session.completed",
      session: {
        id: "cs_test_expected",
        amountTotal: 4900,
        paymentStatus: "unpaid",
        metadata: { tripId: tripAId },
      },
    }),
    { ok: false, reason: "not_paid" },
  );
});

class CountingProvider implements CheckoutProvider {
  calls = 0;
  requests: Parameters<CheckoutProvider["createCheckoutSession"]>[0][] = [];

  async createCheckoutSession(request: Parameters<CheckoutProvider["createCheckoutSession"]>[0]) {
    this.calls += 1;
    this.requests.push(request);
    return {
      id: `cs_test_created_${this.calls}`,
      url: `https://checkout.stripe.test/${this.calls}`,
    };
  }
}

async function resetTripAToDraft() {
  await pool.query(
    `
      update trips
      set status = 'draft',
          purchased_at = null,
          price_cents = null,
          stripe_session_id = null
      where id = $1
    `,
    [tripAId],
  );
}
