"use client";

import { useActionState } from "react";

import {
  createSharedNoteAction,
  type SharedNoteActionState,
} from "@/app/share/[token]/actions";

const initialState: SharedNoteActionState = {};

export function SharedNoteForm({
  token,
  tripId,
  dayId,
  stopId,
  label,
  placeholder,
}: {
  token: string;
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  label: string;
  placeholder: string;
}) {
  const action = createSharedNoteAction.bind(null, token, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const id = `shared-note-${dayId ?? stopId ?? "trip"}`;

  return (
    <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="dayId" value={dayId ?? ""} />
      <input type="hidden" name="stopId" value={stopId ?? ""} />
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
      <label htmlFor={`${id}-content`} className="mt-3 block text-sm font-semibold text-stone-900">
        {label}
      </label>
      <textarea
        id={`${id}-content`}
        name="content"
        rows={3}
        maxLength={1000}
        disabled={pending}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
      />
      {state.fieldErrors?.content ? (
        <p className="mt-2 text-sm font-medium text-red-700">{state.fieldErrors.content}</p>
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
        disabled={pending}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Saving note" : "Save note"}
      </button>
    </form>
  );
}
