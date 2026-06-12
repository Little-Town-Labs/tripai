export type CheckoutSessionRequest = {
  tripId: string;
  ownerId: string;
  title: string;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSessionResponse = {
  id: string;
  url: string;
};

export interface CheckoutProvider {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse>;
}

export class StripeCheckoutProvider implements CheckoutProvider {
  constructor(
    private readonly options: {
      secretKey: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", request.successUrl);
    params.set("cancel_url", request.cancelUrl);
    params.set("client_reference_id", request.tripId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(request.priceCents));
    params.set("line_items[0][price_data][product_data][name]", request.title);
    params.set("metadata[tripId]", request.tripId);
    params.set("metadata[ownerId]", request.ownerId);

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error("Stripe Checkout session creation failed.");
    }

    const payload = (await response.json()) as Partial<CheckoutSessionResponse>;
    if (!payload.id || !payload.url) {
      throw new Error("Stripe Checkout response did not include a hosted URL.");
    }

    return { id: payload.id, url: payload.url };
  }
}
