import type { Pool, PoolClient } from "pg";

import { setAppRole, setOwnerContext } from "@/lib/access/context";

import type { CheckoutConfig } from "./config";
import type { CheckoutProvider } from "./stripe";
import type { VerifiedStripeEvent } from "./webhook";

export type CheckoutTrip = {
  id: string;
  ownerId: string;
  title: string;
  summary: string | null;
  status: string;
  currentRevisionId: string | null;
  priceCents: number | null;
  stripeSessionId: string | null;
  purchasedAt: Date | null;
  deletedAt: Date | null;
};

export type CheckoutStatusResult =
  | { ok: true; status: "disabled"; trip: CheckoutTrip; message: string }
  | { ok: true; status: "eligible"; trip: CheckoutTrip; priceCents: number }
  | { ok: true; status: "purchased"; trip: CheckoutTrip }
  | { ok: false; reason: "not_found" | "not_ready" | "invalid_price" };

export type CreateCheckoutSessionResult =
  | { ok: true; url: string; sessionId: string }
  | {
      ok: false;
      reason:
        | "disabled"
        | "not_configured"
        | "not_found"
        | "not_ready"
        | "already_purchased"
        | "invalid_price"
        | "provider_error";
    };

export type FulfillCheckoutResult =
  | { ok: true; status: "fulfilled" | "already_fulfilled" | "ignored" }
  | { ok: false; reason: "not_found" | "session_mismatch" | "amount_mismatch" | "not_paid" };

export async function getCheckoutStatus(
  pool: Pool,
  ownerId: string,
  tripId: string,
  config: CheckoutConfig,
): Promise<CheckoutStatusResult> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);
    const trip = await getVisibleCheckoutTrip(client, tripId);
    await client.query("commit");

    if (!trip || trip.deletedAt) {
      return { ok: false, reason: "not_found" };
    }
    if (trip.status === "purchased" || trip.purchasedAt) {
      return { ok: true, status: "purchased", trip };
    }
    if (!trip.currentRevisionId) {
      return { ok: false, reason: "not_ready" };
    }
    if (!config.enabled) {
      return {
        ok: true,
        status: "disabled",
        trip,
        message: "Checkout is not enabled yet.",
      };
    }

    const priceCents = resolvePriceCents(trip, config);
    if (!priceCents) {
      return { ok: false, reason: "invalid_price" };
    }

    return { ok: true, status: "eligible", trip, priceCents };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createCheckoutSession(
  pool: Pool,
  ownerId: string,
  tripId: string,
  config: CheckoutConfig,
  provider: CheckoutProvider,
): Promise<CreateCheckoutSessionResult> {
  if (!config.enabled) {
    return { ok: false, reason: "disabled" };
  }
  if (!config.secretKey || !config.baseUrl) {
    return { ok: false, reason: "not_configured" };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);
    const trip = await getVisibleCheckoutTrip(client, tripId);

    if (!trip || trip.deletedAt) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }
    if (trip.status === "purchased" || trip.purchasedAt) {
      await client.query("commit");
      return { ok: false, reason: "already_purchased" };
    }
    if (!trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "not_ready" };
    }

    const priceCents = resolvePriceCents(trip, config);
    if (!priceCents) {
      await client.query("commit");
      return { ok: false, reason: "invalid_price" };
    }

    const checkoutSession = await provider.createCheckoutSession({
      tripId: trip.id,
      ownerId: trip.ownerId,
      title: trip.title,
      priceCents,
      successUrl: `${config.baseUrl}/app/plan/${trip.id}?checkout=success`,
      cancelUrl: `${config.baseUrl}/app/plan/${trip.id}/checkout?checkout=cancelled`,
    });

    await client.query(
      `
        update trips
        set stripe_session_id = $1,
            price_cents = $2,
            updated_at = now()
        where id = $3
      `,
      [checkoutSession.id, priceCents, trip.id],
    );
    await client.query("commit");

    return {
      ok: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    };
  } catch {
    await client.query("rollback");
    return { ok: false, reason: "provider_error" };
  } finally {
    client.release();
  }
}

export async function fulfillCheckoutSession(
  pool: Pool,
  event: VerifiedStripeEvent,
): Promise<FulfillCheckoutResult> {
  if (event.type !== "checkout.session.completed") {
    return { ok: true, status: "ignored" };
  }

  const session = event.session;
  if (!session) {
    return { ok: true, status: "ignored" };
  }
  if (session.paymentStatus !== "paid") {
    return { ok: false, reason: "not_paid" };
  }
  if (!session.metadata.tripId) {
    return { ok: false, reason: "not_found" };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<CheckoutTrip>(
      `
        select
          id,
          owner_id as "ownerId",
          title,
          summary,
          status,
          current_revision_id as "currentRevisionId",
          price_cents as "priceCents",
          stripe_session_id as "stripeSessionId",
          purchased_at as "purchasedAt",
          deleted_at as "deletedAt"
        from trips
        where id = $1
        limit 1
      `,
      [session.metadata.tripId],
    );
    const trip = rows[0];
    if (!trip || trip.deletedAt) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }
    if (trip.purchasedAt || trip.status === "purchased") {
      await client.query("commit");
      return { ok: true, status: "already_fulfilled" };
    }
    if (trip.stripeSessionId !== session.id) {
      await client.query("commit");
      return { ok: false, reason: "session_mismatch" };
    }
    if (trip.priceCents !== session.amountTotal) {
      await client.query("commit");
      return { ok: false, reason: "amount_mismatch" };
    }

    await client.query(
      `
        update trips
        set status = 'purchased',
            purchased_at = now(),
            updated_at = now()
        where id = $1
          and purchased_at is null
          and status = 'draft'
      `,
      [trip.id],
    );
    await client.query("commit");
    return { ok: true, status: "fulfilled" };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function resolvePriceCents(trip: CheckoutTrip, config: CheckoutConfig) {
  const priceCents = trip.priceCents ?? config.defaultPriceCents;
  return Number.isInteger(priceCents) && (priceCents ?? 0) > 0 ? priceCents : null;
}

async function getVisibleCheckoutTrip(client: PoolClient, tripId: string) {
  const { rows } = await client.query<CheckoutTrip>(
    `
      select
        id,
        owner_id as "ownerId",
        title,
        summary,
        status,
        current_revision_id as "currentRevisionId",
        price_cents as "priceCents",
        stripe_session_id as "stripeSessionId",
        purchased_at as "purchasedAt",
        deleted_at as "deletedAt"
      from trips
      where id = $1
      limit 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}
