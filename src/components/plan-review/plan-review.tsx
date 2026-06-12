import Link from "next/link";

import type { PlanReview as PlanReviewModel } from "@/lib/plan-review/service";

import { RevisionRequestForm } from "./revision-request-form";

export function PlanReview({ review }: { review: PlanReviewModel }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-stone-300 pb-5">
          <Link href="/app" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">
            Back to workspace
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">Plan review</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{review.trip.title}</h1>
              {review.trip.summary ? (
                <p className="mt-3 max-w-3xl text-lg leading-8 text-stone-700">{review.trip.summary}</p>
              ) : null}
            </div>
            <StatusPill status={review.status} />
          </div>
        </header>

        <div className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            {review.status === "ready" ? <Itinerary review={review} /> : <ProgressReadyState review={review} />}
          </div>
          <aside className="space-y-5">
            <RouteMapPreview review={review} />
            <CheckoutEntry review={review} />
            <RevisionRequestForm tripId={review.trip.id} disabled={!review.canRequestPrePurchaseRevision} />
            <VersionList review={review} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: PlanReviewModel["status"] }) {
  const label = status === "ready" ? "Ready to review" : status === "progress" ? "Generating" : "Needs attention";
  return (
    <span className="inline-flex min-h-9 items-center rounded-md border border-emerald-800/30 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
      {label}
    </span>
  );
}

function ProgressReadyState({ review }: { review: PlanReviewModel }) {
  return (
    <section className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Your draft is being prepared</h2>
      <p className="mt-3 leading-7 text-stone-700">
        TripAI has a trip record for this plan, but there is not a committed itinerary version to review yet. Keep this
        page handy; the review surface is ready for the first generated version.
      </p>
      {review.selectedRevision ? (
        <p className="mt-3 text-sm text-stone-600">Selected revision #{review.selectedRevision.revisionNumber}</p>
      ) : null}
    </section>
  );
}

function CheckoutEntry({ review }: { review: PlanReviewModel }) {
  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Ready to buy?</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Checkout is feature-toggled off until payment settings are enabled, but the purchase path is ready for this
        reviewed plan.
      </p>
      <Link
        href={`/app/plan/${review.trip.id}/checkout`}
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
      >
        Review checkout
      </Link>
    </section>
  );
}

function Itinerary({ review }: { review: PlanReviewModel }) {
  return (
    <>
      {review.days.map((day) => (
        <section key={day.id} className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Day {day.dayNumber}</p>
              <h2 className="mt-1 text-2xl font-semibold">{day.label}</h2>
              <p className="mt-1 text-sm text-stone-600">{formatDate(day.date)}</p>
            </div>
            <RouteFacts totalMiles={day.totalMiles} driveTimeMinutes={day.driveTimeMinutes} />
          </div>
          {day.aiSummary ? <p className="mt-4 leading-7 text-stone-700">{day.aiSummary}</p> : null}
          <ol className="mt-5 space-y-4">
            {day.stops.map((stop) => (
              <li key={stop.id} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{stop.type}</p>
                    <h3 className="mt-1 text-lg font-semibold">{stop.name}</h3>
                  </div>
                  {stop.googlePlaceId ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                      Verified place
                    </span>
                  ) : (
                    <span className="rounded-md bg-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">
                      Route placeholder
                    </span>
                  )}
                </div>
                {stop.description ? <p className="mt-3 leading-7 text-stone-700">{stop.description}</p> : null}
                {stop.tips ? <p className="mt-2 text-sm leading-6 text-stone-600">{stop.tips}</p> : null}
                <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                  {stop.address ? <Fact label="Address" value={stop.address} /> : null}
                  {stop.hoursSummary ? <Fact label="Hours" value={stop.hoursSummary} /> : null}
                  {stop.googleRating ? <Fact label="Google rating" value={`${stop.googleRating.toFixed(1)} / 5`} /> : null}
                  {stop.priceLevel ? <Fact label="Price level" value={"$".repeat(stop.priceLevel)} /> : null}
                  {stop.googlePlaceId ? <Fact label="Source" value={stop.googlePlaceId} /> : null}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

function RouteMapPreview({ review }: { review: PlanReviewModel }) {
  const stops = review.days.flatMap((day) =>
    day.stops.map((stop) => ({
      ...stop,
      dayNumber: day.dayNumber,
    })),
  );

  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Route map preview</h2>
      {stops.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-stone-700">Map points will appear after a draft itinerary is ready.</p>
      ) : (
        <>
          <div className="mt-4 aspect-[4/3] overflow-hidden rounded-md border border-stone-200 bg-[#e7efe8] p-4">
            <ol className="relative flex h-full flex-col justify-between border-l-2 border-dashed border-emerald-800/50 pl-4">
              {stops.slice(0, 6).map((stop, index) => (
                <li key={stop.id} className="relative">
                  <span className="absolute -left-[1.58rem] flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-semibold text-stone-900">{stop.name}</p>
                  <p className="text-xs text-stone-600">Day {stop.dayNumber}</p>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-600">
            Preview uses verified itinerary stops. Turn-by-turn handoffs are part of the trip detail feature.
          </p>
        </>
      )}
    </section>
  );
}

function RouteFacts({
  totalMiles,
  driveTimeMinutes,
}: {
  totalMiles: number | null;
  driveTimeMinutes: number | null;
}) {
  const facts = [
    totalMiles === null ? null : `${totalMiles} mi`,
    driveTimeMinutes === null ? null : `${Math.round(driveTimeMinutes / 60)} hr ${driveTimeMinutes % 60} min`,
  ].filter(Boolean);

  return (
    <span className="rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-700">
      {facts.length > 0 ? facts.join(" / ") : "Route facts pending"}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-stone-900">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function VersionList({ review }: { review: PlanReviewModel }) {
  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Versions</h2>
      <div className="mt-3 space-y-3">
        {review.versions.length === 0 ? (
          <p className="text-sm leading-6 text-stone-700">No committed versions yet.</p>
        ) : (
          review.versions.map((version) => {
            const isSelectable = version.status === "current" || version.status === "superseded";
            const isSelected = review.selectedRevision?.id === version.id;
            return (
              <div key={version.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Version {version.revisionNumber}</p>
                  <span className="text-xs font-semibold uppercase text-stone-500">{version.status}</span>
                </div>
                {version.summary ? <p className="mt-2 text-sm leading-6 text-stone-700">{version.summary}</p> : null}
                {isSelected ? (
                  <span className="mt-2 inline-flex min-h-9 items-center rounded-md bg-stone-200 px-3 py-1 text-sm font-semibold text-stone-800">
                    Viewing
                  </span>
                ) : isSelectable ? (
                  <Link
                    href={`/app/plan/${review.trip.id}?revisionId=${version.id}`}
                    className="mt-2 inline-flex min-h-9 items-center rounded-md border border-stone-300 px-3 py-1 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                  >
                    View version
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-stone-600">Pending revision request</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}
