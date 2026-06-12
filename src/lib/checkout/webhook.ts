import { createHmac, timingSafeEqual } from "node:crypto";

export type CheckoutCompletedSession = {
  id: string;
  amountTotal: number;
  paymentStatus: string | null;
  metadata: {
    tripId?: string;
    ownerId?: string;
  };
};

export type VerifiedStripeEvent =
  | {
      type: "checkout.session.completed";
      session: CheckoutCompletedSession;
    }
  | {
      type: string;
      session?: never;
    };

export type VerifyStripeWebhookResult =
  | { ok: true; event: VerifiedStripeEvent }
  | { ok: false; reason: "missing_signature" | "invalid_signature" | "invalid_payload" };

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): VerifyStripeWebhookResult {
  if (!signatureHeader) {
    return { ok: false, reason: "missing_signature" };
  }

  const parsedHeader = parseSignatureHeader(signatureHeader);
  if (!parsedHeader.timestamp || parsedHeader.signatures.length === 0) {
    return { ok: false, reason: "invalid_signature" };
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${parsedHeader.timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const matches = parsedHeader.signatures.some((signature) =>
    constantTimeEqual(signature, expected),
  );

  if (!matches) {
    return { ok: false, reason: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const eventType = typeof payload.type === "string" ? payload.type : "";
    if (eventType !== "checkout.session.completed") {
      return { ok: true, event: { type: eventType || "unknown" } };
    }

    const session = payload.data?.object;
    if (!session) {
      return { ok: false, reason: "invalid_payload" };
    }

    return {
      ok: true,
      event: {
        type: "checkout.session.completed",
        session: {
          id: stringField(session.id),
          amountTotal: numberField(session.amount_total),
          paymentStatus: nullableStringField(session.payment_status),
          metadata: metadataField(session.metadata),
        },
      },
    };
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }
}

export function createStripeTestSignature(rawBody: string, webhookSecret: string, timestamp = 1) {
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function parseSignatureHeader(header: string) {
  const pairs = header.split(",").map((part) => part.split("="));
  return {
    timestamp: pairs.find(([key]) => key === "t")?.[1],
    signatures: pairs.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean),
  };
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function stringField(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new Error("Expected string field.");
  }
  return value;
}

function numberField(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("Expected integer field.");
  }
  return value;
}

function nullableStringField(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Expected nullable string field.");
  }
  return value;
}

function metadataField(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }
  const metadata = value as Record<string, unknown>;
  return {
    tripId: typeof metadata.tripId === "string" ? metadata.tripId : undefined,
    ownerId: typeof metadata.ownerId === "string" ? metadata.ownerId : undefined,
  };
}
