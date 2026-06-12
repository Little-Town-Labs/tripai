"use client";

import { useActionState } from "react";

import {
  createSharedRatingAction,
  type SharedRatingActionState,
} from "@/app/share/[token]/actions";

const initialState: SharedRatingActionState = {};

export function SharedRatingForm({
  token,
  tripId,
  stopId,
}: {
  token: string;
  tripId: string;
  stopId: string;
}) {
  const action = createSharedRatingAction.bind(null, token, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const id = `shared-rating-${stopId}`;

  return (
    <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="stopId" value={stopId} />
      <label htmlFor={`${id}-name`} className="block text-sm font-semibold text-stone-900">
        Display name
      </label>
      <input
        id={`${id}-name`}
        name="displayName"
        maxLength={80}
        disabled={pending}
        placeholder="Grandma"
        className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
      />
      {state.fieldErrors?.displayName ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.displayName}</p>
      ) : null}
      <fieldset disabled={pending} className="mt-3">
        <legend className="text-sm font-semibold text-stone-900">Rate this stop</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((stars) => (
            <label
              key={stars}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white text-sm font-semibold text-stone-900 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50"
            >
              <input className="sr-only" type="radio" name="stars" value={stars} />
              {stars}
            </label>
          ))}
        </div>
      </fieldset>
      {state.fieldErrors?.stars ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.stars}</p>
      ) : null}
      {state.fieldErrors?.stopId ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.stopId}</p>
      ) : null}
      <label htmlFor={`${id}-text`} className="mt-3 block text-sm font-semibold text-stone-900">
        Memory note
      </label>
      <textarea
        id={`${id}-text`}
        name="text"
        rows={2}
        maxLength={1000}
        disabled={pending}
        placeholder="What should your family remember about this stop?"
        className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
      />
      {state.fieldErrors?.text ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.text}</p>
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
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Saving rating" : "Save rating"}
      </button>
    </form>
  );
}
