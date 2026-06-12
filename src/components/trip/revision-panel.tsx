"use client";

import { useActionState } from "react";

import {
  commitRevisionAction,
  requestMidTripRevisionAction,
  requestPlanningRevisionAction,
  restorePreviousRevisionAction,
  type RevisionActionState,
} from "@/app/app/trips/[tripId]/actions";
import type { RevisionPanel as RevisionPanelModel } from "@/lib/revisions/service";

const initialState: RevisionActionState = {};

export function RevisionPanel({
  tripId,
  panel,
}: {
  tripId: string;
  panel: RevisionPanelModel;
}) {
  const planningAction = requestPlanningRevisionAction.bind(null, tripId);
  const midTripAction = requestMidTripRevisionAction.bind(null, tripId);
  const commitAction = commitRevisionAction.bind(null, tripId);
  const restoreAction = restorePreviousRevisionAction.bind(null, tripId);
  const [planningState, planningFormAction, planningPending] = useActionState(planningAction, initialState);
  const [midTripState, midTripFormAction, midTripPending] = useActionState(midTripAction, initialState);
  const [commitState, commitFormAction, commitPending] = useActionState(commitAction, initialState);
  const [restoreState, restoreFormAction, restorePending] = useActionState(restoreAction, initialState);
  const candidate = panel.draftCandidate;

  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Revisions</p>
        <h2 className="mt-1 text-xl font-semibold text-stone-950">Adjust this trip</h2>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <RevisionCount label="Planning" remaining={panel.planningRemaining} limit={2} />
        <RevisionCount label="Mid-trip" remaining={panel.midTripRemaining} limit={3} />
      </div>

      <RevisionRequestForm
        title="Planning revision"
        action={planningFormAction}
        pending={planningPending}
        disabled={!panel.canRequestPlanning}
        state={planningState}
        unavailableMessage={panel.planningRemaining === 0 ? "No planning rounds remain." : "Planning revisions are available before the trip starts."}
      />
      <RevisionRequestForm
        title="Mid-trip revision"
        action={midTripFormAction}
        pending={midTripPending}
        disabled={!panel.canRequestMidTrip}
        state={midTripState}
        unavailableMessage={panel.midTripRemaining === 0 ? "No mid-trip rounds remain." : "Mid-trip revisions are available during travel."}
      />

      {candidate ? (
        <form action={commitFormAction} className="mt-5 border-t border-stone-200 pt-4">
          <input type="hidden" name="revisionId" value={candidate.revisionId} />
          <h3 className="text-base font-semibold text-stone-950">Draft revision #{candidate.revisionNumber}</h3>
          {candidate.removedStopContributions.length > 0 ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-6 text-stone-700">
                Some removed stops have scrapbook content. Choose where to keep those memories before committing.
              </p>
              {candidate.removedStopContributions.map((item) => (
                <label key={item.stableStopKey} className="block rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                  <input type="hidden" name="stableStopKey" value={item.stableStopKey} />
                  <span className="block font-semibold text-stone-950">{item.stableStopKey}</span>
                  <span className="mt-1 block text-stone-700">
                    {item.counts.notes} notes, {item.counts.ratings} ratings, {item.counts.photos} photos
                  </span>
                  <select
                    name={`targetScope:${item.stableStopKey}`}
                    className="mt-2 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2"
                    defaultValue="trip"
                  >
                    <option value="trip">Keep at trip level</option>
                    <option value="day">Keep at day level</option>
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              This draft keeps scrapbook content attached to retained stops.
            </p>
          )}
          <ActionMessage state={commitState} />
          <button
            type="submit"
            disabled={commitPending}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {commitPending ? "Committing" : "Commit revision"}
          </button>
        </form>
      ) : null}

      {panel.previousRevision ? (
        <form action={restoreFormAction} className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-sm leading-6 text-stone-700">
            Previous version #{panel.previousRevision.revisionNumber} can be restored until another revision starts.
          </p>
          <ActionMessage state={restoreState} />
          <button
            type="submit"
            disabled={restorePending}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-500"
          >
            {restorePending ? "Restoring" : "Restore previous version"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function RevisionCount({
  label,
  remaining,
  limit,
}: {
  label: string;
  remaining: number;
  limit: number;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="font-semibold text-stone-950">{label}</p>
      <p className="mt-1 text-stone-700">
        {remaining} of {limit} free rounds left
      </p>
    </div>
  );
}

function RevisionRequestForm({
  title,
  action,
  pending,
  disabled,
  state,
  unavailableMessage,
}: {
  title: string;
  action: (formData: FormData) => void;
  pending: boolean;
  disabled: boolean;
  state: RevisionActionState;
  unavailableMessage: string;
}) {
  const id = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <form action={action} className="mt-5 border-t border-stone-200 pt-4">
      <label htmlFor={id} className="block text-sm font-semibold text-stone-950">
        {title}
      </label>
      <textarea
        id={id}
        name="requestText"
        rows={3}
        maxLength={1200}
        disabled={disabled || pending}
        placeholder="Describe what you would like to adjust."
        className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20 disabled:bg-stone-100"
        aria-describedby={state.fieldErrors?.requestText ? `${id}-error` : undefined}
      />
      {state.fieldErrors?.requestText ? (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700">
          {state.fieldErrors.requestText}
        </p>
      ) : null}
      {disabled ? <p className="mt-2 text-sm leading-6 text-stone-600">{unavailableMessage}</p> : null}
      <ActionMessage state={state} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Requesting" : "Request revision"}
      </button>
    </form>
  );
}

function ActionMessage({ state }: { state: RevisionActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={`mt-3 text-sm font-medium ${state.status === "success" ? "text-emerald-800" : "text-red-700"}`}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}
