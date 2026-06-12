import type { TripDetailDay } from "@/lib/trip-detail/service";

import {
  formatDate,
  formatRouteFacts,
} from "./format";
import { StopCard } from "./stop-card";

export function DaySection({ day }: { day: TripDetailDay }) {
  return (
    <section
      className={
        day.isActive
          ? "rounded-md border-2 border-emerald-900 bg-white p-4 shadow-sm sm:p-5"
          : "rounded-md border border-stone-300 bg-white p-4 shadow-sm sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Day {day.dayNumber}</p>
          <h2 className="mt-1 text-2xl font-semibold">{day.label}</h2>
          <p className="mt-1 text-sm text-stone-600">{formatDate(day.date)}</p>
        </div>
        <span className="rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-800">
          {formatRouteFacts(day.totalMiles, day.driveTimeMinutes)}
        </span>
      </div>
      {(day.fromLocation || day.toLocation) ? (
        <p className="mt-3 text-sm leading-6 text-stone-700">
          {[day.fromLocation, day.toLocation].filter(Boolean).join(" to ")}
        </p>
      ) : null}
      {day.aiSummary ? <p className="mt-4 leading-7 text-stone-700">{day.aiSummary}</p> : null}
      {day.stops.length > 0 ? (
        <ol className="mt-5 space-y-4">
          {day.stops.map((stop) => (
            <li key={stop.id}>
              <StopCard stop={stop} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
          No stops are attached to this day yet.
        </p>
      )}
    </section>
  );
}
