export type CheckoutConfig = {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
  defaultPriceCents?: number;
};

export type CheckoutConfigStatus =
  | { ok: true; config: CheckoutConfig }
  | { ok: false; reason: "not_configured"; missing: string[]; config: CheckoutConfig };

export function loadCheckoutConfig(
  env: Record<string, string | undefined> = process.env,
): CheckoutConfig {
  return {
    enabled: env.TRIPAI_STRIPE_ENABLED === "1",
    secretKey: valueOrUndefined(env.STRIPE_SECRET_KEY),
    webhookSecret: valueOrUndefined(env.STRIPE_WEBHOOK_SECRET),
    baseUrl: trimTrailingSlash(valueOrUndefined(env.TRIPAI_APP_BASE_URL)),
    defaultPriceCents: parsePriceCents(env.TRIPAI_TRIP_PRICE_CENTS),
  };
}

export function validateCheckoutConfig(config: CheckoutConfig): CheckoutConfigStatus {
  if (!config.enabled) {
    return { ok: true, config };
  }

  const missing: string[] = [];
  if (!config.secretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!config.webhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }
  if (!config.baseUrl) {
    missing.push("TRIPAI_APP_BASE_URL");
  }
  if (!Number.isInteger(config.defaultPriceCents) || (config.defaultPriceCents ?? 0) <= 0) {
    missing.push("TRIPAI_TRIP_PRICE_CENTS");
  }

  if (missing.length > 0) {
    return { ok: false, reason: "not_configured", missing, config };
  }

  return { ok: true, config };
}

function valueOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function trimTrailingSlash(value: string | undefined) {
  return value?.replace(/\/+$/, "");
}

function parsePriceCents(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}
