"use client";

import { useActionState } from "react";

import {
  createTripNoteAction,
  type NoteActionState,
} from "@/app/app/trips/[tripId]/actions";

const initialState: NoteActionState = {};

export function NoteForm({
  tripId,
  dayId,
  stopId,
  label,
  placeholder,
  disabled,
}: {
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  label: string;
  placeholder: string;
  disabled: boolean;
}) {
  const action = createTripNoteAction.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const contentId = `note-${dayId ?? stopId ?? "trip"}`;

  return (
    <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="dayId" value={dayId ?? ""} />
      <input type="hidden" name="stopId" value={stopId ?? ""} />
      <label htmlFor={contentId} className="block text-sm font-semibold text-stone-900">
        {label}
      </label>
      <textarea
        id={contentId}
        name="content"
        rows={3}
        maxLength={1000}
        disabled={disabled || pending}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
        aria-describedby={state.fieldErrors?.content ? `${contentId}-error` : undefined}
      />
      {state.fieldErrors?.content ? (
        <p id={`${contentId}-error`} className="mt-2 text-sm font-medium text-red-700">
          {state.fieldErrors.content}
        </p>
      ) : null}
      {state.fieldErrors?.scope ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.scope}</p>
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
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Saving note" : "Save note"}
      </button>
    </form>
  );
}
