"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  startCheckoutAction,
  type CheckoutActionState,
} from "@/app/app/plan/[tripId]/checkout/actions";
import type { CheckoutStatusResult } from "@/lib/checkout/service";

const initialState: CheckoutActionState = {};

export function CheckoutPanel({
  checkout,
}: {
  checkout: Extract<CheckoutStatusResult, { ok: true }>;
}) {
  const [state, formAction, pending] = useActionState(
    startCheckoutAction.bind(null, checkout.trip.id),
    initialState,
  );
  const disabled = checkout.status !== "eligible" || pending;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto max-w-3xl">
        <Link href={`/app/plan/${checkout.trip.id}`} className="text-sm font-semibold text-emerald-800">
          Back to plan review
        </Link>
        <div className="mt-5 rounded-md border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">Checkout</p>
          <h1 className="mt-2 text-3xl font-semibold">{checkout.trip.title}</h1>
          {checkout.trip.summary ? (
            <p className="mt-3 leading-7 text-stone-700">{checkout.trip.summary}</p>
          ) : null}

          <div className="mt-6 rounded-md border border-stone-200 bg-stone-50 p-4">
            <CheckoutStatus checkout={checkout} />
          </div>

          <form action={formAction} className="mt-6">
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {pending ? "Starting checkout" : "Continue to Stripe Checkout"}
            </button>
          </form>

          {state.message ? (
            <p className="mt-4 text-sm font-medium text-red-700" aria-live="polite">
              {state.message}
            </p>
          ) : null}

          <p className="mt-5 text-xs leading-5 text-stone-600">
            TripAI only unlocks purchased state after Stripe sends a verified payment webhook. The success redirect
            alone does not complete fulfillment.
          </p>
        </div>
      </section>
    </main>
  );
}

function CheckoutStatus({
  checkout,
}: {
  checkout: Extract<CheckoutStatusResult, { ok: true }>;
}) {
  if (checkout.status === "disabled") {
    return (
      <>
        <h2 className="text-lg font-semibold">Checkout is feature-toggled off</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">{checkout.message}</p>
      </>
    );
  }

  if (checkout.status === "purchased") {
    return (
      <>
        <h2 className="text-lg font-semibold">Trip already purchased</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">This trip is already owned by your family.</p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-lg font-semibold">One-time trip purchase</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Total due today: <span className="font-semibold">{formatCents(checkout.priceCents)}</span>. No subscription.
      </p>
    </>
  );
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
