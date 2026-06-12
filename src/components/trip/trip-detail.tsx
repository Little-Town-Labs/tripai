import Link from "next/link";

import type { TripDetail as TripDetailModel } from "@/lib/trip-detail/service";

import { DaySection } from "./day-section";
import {
  formatDate,
  formatRouteFacts,
  formatTime,
} from "./format";
import { TripRouteOverview } from "./trip-route-overview";

export function TripDetail({ detail }: { detail: TripDetailModel | null }) {
  if (!detail) {
    return <UnavailableTrip />;
  }

  const activeDay = detail.days.find((day) => day.id === detail.activeDayId) ?? null;
  const currentStop = activeDay?.stops.find((stop) => stop.id === detail.currentStopId) ?? null;
  const nextStop = activeDay?.stops.find((stop) => stop.id === detail.nextStopId) ?? null;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-5 text-stone-950 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-stone-300 pb-5">
          <Link href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800">
            Back to workspace
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Trip co-pilot</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{detail.trip.title}</h1>
              {detail.trip.summary ? (
                <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700 sm:text-lg">
                  {detail.trip.summary}
                </p>
              ) : null}
            </div>
            <span className="inline-flex min-h-11 items-center rounded-md bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950">
              Purchased
            </span>
          </div>
        </header>

        {detail.status === "ready" ? (
          <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-5">
              <CurrentContext
                activeDay={activeDay}
                currentStop={currentStop}
                nextStop={nextStop}
              />
              {detail.days.map((day) => (
                <DaySection key={day.id} day={day} />
              ))}
            </div>
            <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
              <TripRouteOverview detail={detail} />
            </aside>
          </div>
        ) : (
          <NotReadyTrip detail={detail} />
        )}
      </section>
    </main>
  );
}

function CurrentContext({
  activeDay,
  currentStop,
  nextStop,
}: {
  activeDay: TripDetailModel["days"][number] | null;
  currentStop: TripDetailModel["days"][number]["stops"][number] | null;
  nextStop: TripDetailModel["days"][number]["stops"][number] | null;
}) {
  return (
    <section className="rounded-md border border-emerald-900 bg-emerald-950 p-4 text-white shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
            {activeDay ? `Day ${activeDay.dayNumber}` : "Trip day"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{activeDay?.label ?? "Route ready"}</h2>
          {activeDay ? <p className="mt-1 text-sm text-emerald-100">{formatDate(activeDay.date)}</p> : null}
        </div>
        {activeDay ? (
          <span className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-950">
            {formatRouteFacts(activeDay.totalMiles, activeDay.driveTimeMinutes)}
          </span>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ContextStop label="Current stop" name={currentStop?.name ?? "No current stop"} eta={currentStop?.eta ?? null} />
        <ContextStop label="Next stop" name={nextStop?.name ?? "End of active day"} eta={nextStop?.eta ?? null} />
      </div>
    </section>
  );
}

function ContextStop({
  label,
  name,
  eta,
}: {
  label: string;
  name: string;
  eta: Date | null;
}) {
  return (
    <div className="rounded-md border border-emerald-700 bg-emerald-900 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">{label}</p>
      <p className="mt-1 text-xl font-semibold">{name}</p>
      {eta ? <p className="mt-2 text-sm text-emerald-100">ETA {formatTime(eta)}</p> : null}
    </div>
  );
}

function NotReadyTrip({ detail }: { detail: TripDetailModel }) {
  return (
    <div className="py-8">
      <section className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">Trip route is not ready yet</h2>
        <p className="mt-3 max-w-2xl leading-7 text-stone-700">
          This trip is purchased, but it does not have a committed itinerary ready for the co-pilot view. The route will
          appear here after the current itinerary version is available.
        </p>
        <Link
          href={`/app/plan/${detail.trip.id}`}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          Back to plan review
        </Link>
      </section>
    </div>
  );
}

function UnavailableTrip() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto max-w-3xl rounded-md border border-stone-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Trip detail is not available</h1>
        <p className="mt-3 leading-7 text-stone-700">
          This co-pilot view opens after purchase fulfillment. Review the plan first, then return here once the trip is
          unlocked.
        </p>
        <Link
          href="/app"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          Back to workspace
        </Link>
      </section>
    </main>
  );
}
