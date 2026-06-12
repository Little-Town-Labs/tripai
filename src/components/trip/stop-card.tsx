import type {
  PhotoMetadataSummary,
  ScrapbookNote,
  StopRating,
  StopRatingSummary,
} from "@/lib/scrapbook/service";
import type { TripDetailStop } from "@/lib/trip-detail/service";

import { formatTime } from "./format";
import { NoteForm } from "./note-form";
import { RatingForm } from "./rating-form";
import {
  NoteList,
  PhotoStatus,
} from "./scrapbook-panel";

export function StopCard({
  tripId,
  stop,
  notes,
  ratings,
  ratingSummary,
  photos,
  scrapbookEnabled,
}: {
  tripId: string;
  stop: TripDetailStop;
  notes: ScrapbookNote[];
  ratings: StopRating[];
  ratingSummary: StopRatingSummary | null;
  photos: PhotoMetadataSummary[];
  scrapbookEnabled: boolean;
}) {
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
        {ratingSummary ? (
          <Fact label="Family rating" value={`${ratingSummary.average.toFixed(1)} / 5 from ${ratingSummary.count}`} />
        ) : null}
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
      {scrapbookEnabled ? (
        <section className="mt-4 border-t border-stone-200 pt-4">
          <h4 className="text-base font-semibold text-stone-950">Stop scrapbook</h4>
          <NoteList title="Stop notes" notes={notes} />
          {ratings.length > 0 ? (
            <ol className="mt-3 space-y-2">
              {ratings.map((rating) => (
                <li key={rating.id} className="rounded-md border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-900">{rating.stars} / 5 stars</p>
                  {rating.text ? <p className="mt-1 text-sm leading-6 text-stone-700">{rating.text}</p> : null}
                </li>
              ))}
            </ol>
          ) : null}
          <NoteForm
            tripId={tripId}
            stopId={stop.id}
            label="Add a stop note"
            placeholder="Capture what happened at this stop."
            disabled={!scrapbookEnabled}
          />
          <RatingForm tripId={tripId} stopId={stop.id} disabled={!scrapbookEnabled} />
          {photos.length > 0 ? <PhotoStatus photos={photos} enabled={scrapbookEnabled} /> : null}
        </section>
      ) : null}
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
