"use client";

import { useActionState } from "react";

import {
  requestPlanRevisionAction,
  type RevisionRequestActionState,
} from "@/app/app/plan/[tripId]/actions";

const initialState: RevisionRequestActionState = {};

export function RevisionRequestForm({
  tripId,
  disabled,
}: {
  tripId: string;
  disabled: boolean;
}) {
  const action = requestPlanRevisionAction.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Ask for a revision</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Before checkout, revision requests are unlimited. The current version stays available while the next draft is
        prepared.
      </p>
      <label htmlFor="requestText" className="mt-4 block text-sm font-semibold text-stone-800">
        What would you like to adjust?
      </label>
      <textarea
        id="requestText"
        name="requestText"
        rows={6}
        minLength={10}
        maxLength={1000}
        disabled={disabled || pending}
        className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
        placeholder="Add more relaxed lunch stops, make the first day lighter, or avoid late hotel arrivals."
        aria-describedby={state.fieldErrors?.requestText ? "requestText-error" : undefined}
      />
      {state.fieldErrors?.requestText ? (
        <p id="requestText-error" className="mt-2 text-sm font-medium text-red-700">
          {state.fieldErrors.requestText}
        </p>
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
        disabled={disabled || pending}
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Saving request" : "Request revision"}
      </button>
    </form>
  );
}
