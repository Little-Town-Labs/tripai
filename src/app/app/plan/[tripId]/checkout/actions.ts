"use server";

import { redirect } from "next/navigation";

import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { loadCheckoutConfig, validateCheckoutConfig } from "@/lib/checkout/config";
import { createCheckoutSession } from "@/lib/checkout/service";
import { StripeCheckoutProvider } from "@/lib/checkout/stripe";

export type CheckoutActionState = {
  status?: "error";
  message?: string;
};

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to start checkout.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export async function startCheckoutAction(
  tripId: string,
  previousState: CheckoutActionState,
): Promise<CheckoutActionState> {
  void previousState;
  let redirectUrl: string | undefined;

  try {
    const owner = await requireCurrentOwner();
    const config = loadCheckoutConfig();
    const configStatus = validateCheckoutConfig(config);

    if (!config.enabled) {
      return {
        status: "error",
        message: "Checkout is not enabled yet.",
      };
    }
    if (!configStatus.ok) {
      return {
        status: "error",
        message: "Checkout is not configured yet.",
      };
    }

    const result = await createCheckoutSession(
      getAppPool(),
      owner.id,
      tripId,
      configStatus.config,
      new StripeCheckoutProvider({ secretKey: configStatus.config.secretKey ?? "" }),
    );

    if (result.ok) {
      redirectUrl = result.url;
    } else {
      return {
        status: "error",
        message: messageForCheckoutFailure(result.reason),
      };
    }
  } catch {
    return {
      status: "error",
      message: "We could not start checkout right now.",
    };
  }

  redirect(redirectUrl);
}

function messageForCheckoutFailure(reason: Exclude<Awaited<ReturnType<typeof createCheckoutSession>>, { ok: true }>["reason"]) {
  const messages = {
    already_purchased: "This trip has already been purchased.",
    disabled: "Checkout is not enabled yet.",
    invalid_price: "This trip does not have a valid checkout price yet.",
    not_configured: "Checkout is not configured yet.",
    not_found: "We could not find that trip for your account.",
    not_ready: "The reviewed plan must be ready before checkout.",
    provider_error: "Stripe could not create a checkout session right now.",
  } satisfies Record<typeof reason, string>;

  return messages[reason];
}
