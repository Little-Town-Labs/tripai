"use client";

import { useActionState } from "react";

import {
  createStopRatingAction,
  type RatingActionState,
} from "@/app/app/trips/[tripId]/actions";

const initialState: RatingActionState = {};

export function RatingForm({
  tripId,
  stopId,
  disabled,
}: {
  tripId: string;
  stopId: string;
  disabled: boolean;
}) {
  const action = createStopRatingAction.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const textId = `rating-text-${stopId}`;

  return (
    <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="stopId" value={stopId} />
      <fieldset disabled={disabled || pending}>
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
      <label htmlFor={textId} className="mt-3 block text-sm font-semibold text-stone-900">
        Memory note
      </label>
      <textarea
        id={textId}
        name="text"
        rows={2}
        maxLength={1000}
        disabled={disabled || pending}
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
        disabled={disabled || pending}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Saving rating" : "Save rating"}
      </button>
    </form>
  );
}
