import type { TripDetailStop } from "@/lib/trip-detail/service";

import { formatTime } from "./format";

export function StopCard({ stop }: { stop: TripDetailStop }) {
  return (
    <article
      className={
        stop.isCurrent
          ? "rounded-md border-2 border-emerald-900 bg-emerald-50 p-4"
          : stop.isNext
            ? "rounded-md border border-emerald-700 bg-white p-4"
            : "rounded-md border border-stone-200 bg-stone-50 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
            {stop.isCurrent ? "Current stop" : stop.isNext ? "Next stop" : stop.type}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-stone-950">{stop.name}</h3>
          {stop.eta ? <p className="mt-2 text-sm font-semibold text-emerald-900">ETA {formatTime(stop.eta)}</p> : null}
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
          {stop.checked ? "Checked" : "Upcoming"}
        </span>
      </div>

      {stop.description ? <p className="mt-3 leading-7 text-stone-700">{stop.description}</p> : null}
      {stop.tips ? <p className="mt-2 text-sm leading-6 text-stone-700">{stop.tips}</p> : null}

      <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        {stop.address ? <Fact label="Address" value={stop.address} /> : null}
        {stop.hoursSummary ? <Fact label="Hours" value={stop.hoursSummary} /> : null}
        {stop.googleRating ? <Fact label="Google rating" value={`${stop.googleRating.toFixed(1)} / 5`} /> : null}
        {stop.priceLevel ? <Fact label="Price level" value={"$".repeat(stop.priceLevel)} /> : null}
        {stop.nextStopName ? <Fact label="Next" value={stop.nextStopName} /> : null}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={stop.navigation.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          Google Maps
        </a>
        <a
          href={stop.navigation.wazeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          Waze
        </a>
        {stop.officialParkUrl ? (
          <a
            href={stop.officialParkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 sm:col-span-2"
          >
            Official park info
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-stone-950">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
