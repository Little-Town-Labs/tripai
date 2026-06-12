import { createPool } from "@/db/client";
import { loadCheckoutConfig, validateCheckoutConfig } from "@/lib/checkout/config";
import { fulfillCheckoutSession } from "@/lib/checkout/service";
import { verifyStripeWebhook } from "@/lib/checkout/webhook";

export const dynamic = "force-dynamic";

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for Stripe webhook fulfillment.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export async function POST(request: Request) {
  const config = loadCheckoutConfig();
  const configStatus = validateCheckoutConfig(config);

  if (!config.enabled) {
    return Response.json({ received: true, ignored: true });
  }
  if (!configStatus.ok || !configStatus.config.webhookSecret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verification = verifyStripeWebhook(rawBody, signature, configStatus.config.webhookSecret);

  if (!verification.ok) {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const fulfillment = await fulfillCheckoutSession(getAppPool(), verification.event);
  if (!fulfillment.ok) {
    return Response.json({ error: fulfillment.reason }, { status: 400 });
  }

  return Response.json({ received: true, status: fulfillment.status });
}
