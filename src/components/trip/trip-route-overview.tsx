import type { TripDetail } from "@/lib/trip-detail/service";

import { formatRouteFacts } from "./format";

export function TripRouteOverview({ detail }: { detail: TripDetail }) {
  const stops = detail.days.flatMap((day) =>
    day.stops.map((stop) => ({
      ...stop,
      dayNumber: day.dayNumber,
    })),
  );
  const totalMiles = sumNullable(detail.days.map((day) => day.totalMiles));
  const totalDriveTime = sumNullable(detail.days.map((day) => day.driveTimeMinutes));

  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Route overview</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        {formatRouteFacts(totalMiles, totalDriveTime)} across {detail.days.length} day
        {detail.days.length === 1 ? "" : "s"} and {stops.length} stop{stops.length === 1 ? "" : "s"}.
      </p>
      {stops.length > 0 ? (
        <ol className="mt-5 space-y-3 border-l-2 border-dashed border-emerald-800/50 pl-4">
          {stops.map((stop, index) => (
            <li key={stop.id} className="relative">
              <span className="absolute -left-[1.72rem] flex h-7 w-7 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="font-semibold text-stone-950">{stop.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Day {stop.dayNumber} / {stop.type}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-700">Stops will appear when the current itinerary is ready.</p>
      )}
      <p className="mt-5 text-xs leading-5 text-stone-600">
        Overview uses stored itinerary data. Open Google Maps or Waze from each stop for live navigation.
      </p>
    </section>
  );
}

function sumNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }
  return present.reduce((sum, value) => sum + value, 0);
}
