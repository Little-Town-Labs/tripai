"use client";

import { useActionState } from "react";

import {
  createShareLinkAction,
  revokeShareLinkAction,
  type ShareLinkActionState,
} from "@/app/app/trips/[tripId]/actions";
import type { ShareLinkSummary } from "@/lib/sharing/service";

const initialState: ShareLinkActionState = {};

export function SharePanel({
  tripId,
  links,
}: {
  tripId: string;
  links: ShareLinkSummary[];
}) {
  const action = createShareLinkAction.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const activeCount = links.filter((link) => !link.revokedAt).length;

  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Family sharing</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Create a private link for family members. They can view the trip and add notes or ratings without an account.
      </p>

      <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
        <label htmlFor="share-label" className="block text-sm font-semibold text-stone-900">
          Link label
        </label>
        <input
          id="share-label"
          name="label"
          maxLength={80}
          placeholder="Grandparents, cousins, group text"
          disabled={pending}
          className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
        />
        {state.fieldErrors?.label ? (
          <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.label}</p>
        ) : null}
        {state.createdUrl ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-950">Copy this link now</p>
            <p className="mt-2 break-all text-sm text-emerald-900">{state.createdUrl}</p>
          </div>
        ) : null}
        {state.message ? (
          <p
            className={`mt-3 text-sm font-medium ${state.status === "success" ? "text-emerald-800" : "text-red-700"}`}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {pending ? "Creating link" : "Create family link"}
        </button>
      </form>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-900">Links</h3>
          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
            {activeCount} active
          </span>
        </div>
        {links.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {links.map((link) => (
              <li key={link.id} className="rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{link.label ?? "Family link"}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      Created {formatDateTime(link.createdAt)}
                      {link.lastUsedAt ? ` / Last used ${formatDateTime(link.lastUsedAt)}` : ""}
                    </p>
                    {link.revokedAt ? (
                      <p className="mt-1 text-xs font-semibold text-red-700">
                        Revoked {formatDateTime(link.revokedAt)}
                      </p>
                    ) : null}
                  </div>
                  {!link.revokedAt ? (
                    <form action={revokeShareLinkAction.bind(null, tripId)}>
                      <input type="hidden" name="shareLinkId" value={link.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center rounded-md border border-red-700 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-700">
            No share links yet.
          </p>
        )}
      </div>
    </section>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
