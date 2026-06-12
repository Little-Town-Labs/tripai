import type {
  PhotoMetadataSummary,
  ScrapbookNote,
  StopRating,
  StopRatingSummary,
} from "@/lib/scrapbook/service";
import type { SharedTripDetail as SharedTripDetailModel } from "@/lib/sharing/service";

import {
  formatDate,
  formatRouteFacts,
  formatTime,
} from "./format";
import { SharedNoteForm } from "./shared-note-form";
import { SharedRatingForm } from "./shared-rating-form";

export function SharedTripDetail({
  detail,
  token,
}: {
  detail: SharedTripDetailModel;
  token: string;
}) {
  const activeDay = detail.days.find((day) => day.id === detail.activeDayId) ?? null;
  const currentStop = activeDay?.stops.find((stop) => stop.id === detail.currentStopId) ?? null;
  const nextStop = activeDay?.stops.find((stop) => stop.id === detail.nextStopId) ?? null;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-5 text-stone-950 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-stone-300 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Shared family trip</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{detail.trip.title}</h1>
          {detail.trip.summary ? (
            <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700 sm:text-lg">
              {detail.trip.summary}
            </p>
          ) : null}
        </header>

        {detail.status === "ready" ? (
          <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-5">
              <SharedCurrentContext
                activeDay={activeDay}
                currentStop={currentStop}
                nextStop={nextStop}
              />
              {detail.days.map((day) => (
                <SharedDaySection
                  key={day.id}
                  token={token}
                  tripId={detail.trip.id}
                  day={day}
                  scrapbook={detail.scrapbook}
                />
              ))}
            </div>
            <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
              <SharedScrapbookPanel detail={detail} token={token} />
            </aside>
          </div>
        ) : (
          <section className="mt-6 rounded-md border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Trip route is not ready yet</h2>
            <p className="mt-3 leading-7 text-stone-700">
              This shared trip is available, but the route is still being prepared.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

function SharedCurrentContext({
  activeDay,
  currentStop,
  nextStop,
}: {
  activeDay: SharedTripDetailModel["days"][number] | null;
  currentStop: SharedTripDetailModel["days"][number]["stops"][number] | null;
  nextStop: SharedTripDetailModel["days"][number]["stops"][number] | null;
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

function SharedDaySection({
  token,
  tripId,
  day,
  scrapbook,
}: {
  token: string;
  tripId: string;
  day: SharedTripDetailModel["days"][number];
  scrapbook: SharedTripDetailModel["scrapbook"];
}) {
  const dayNotes = scrapbook.notesByDayId[day.id] ?? [];
  const dayPhotos = scrapbook.photosByDayId[day.id] ?? [];

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
      <SharedNoteList title="Day notes" notes={dayNotes} />
      <SharedNoteForm
        token={token}
        tripId={tripId}
        dayId={day.id}
        label="Add a day note"
        placeholder="What should your family remember about this day?"
      />
      {dayPhotos.length > 0 ? <SharedPhotoStatus photos={dayPhotos} /> : null}
      {day.stops.length > 0 ? (
        <ol className="mt-5 space-y-4">
          {day.stops.map((stop) => (
            <li key={stop.id}>
              <SharedStopCard
                token={token}
                tripId={tripId}
                stop={stop}
                notes={scrapbook.notesByStopId[stop.id] ?? []}
                ratings={scrapbook.ratingsByStopId[stop.id] ?? []}
                ratingSummary={scrapbook.ratingSummariesByStopId[stop.id] ?? null}
                photos={scrapbook.photosByStopId[stop.id] ?? []}
              />
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

function SharedStopCard({
  token,
  tripId,
  stop,
  notes,
  ratings,
  ratingSummary,
  photos,
}: {
  token: string;
  tripId: string;
  stop: SharedTripDetailModel["days"][number]["stops"][number];
  notes: ScrapbookNote[];
  ratings: StopRating[];
  ratingSummary: StopRatingSummary | null;
  photos: PhotoMetadataSummary[];
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
          {stop.checked ? "Visited" : "Upcoming"}
        </span>
      </div>
      {stop.description ? <p className="mt-3 leading-7 text-stone-700">{stop.description}</p> : null}
      {stop.tips ? <p className="mt-2 text-sm leading-6 text-stone-700">{stop.tips}</p> : null}

      <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        {stop.address ? <Fact label="Address" value={stop.address} /> : null}
        {stop.hoursSummary ? <Fact label="Hours" value={stop.hoursSummary} /> : null}
        {stop.googleRating ? <Fact label="Google rating" value={`${stop.googleRating.toFixed(1)} / 5`} /> : null}
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
      <section className="mt-4 border-t border-stone-200 pt-4">
        <h4 className="text-base font-semibold text-stone-950">Stop memories</h4>
        <SharedNoteList title="Stop notes" notes={notes} />
        <SharedRatingList ratings={ratings} />
        <SharedNoteForm
          token={token}
          tripId={tripId}
          stopId={stop.id}
          label="Add a stop note"
          placeholder="Capture what happened at this stop."
        />
        <SharedRatingForm token={token} tripId={tripId} stopId={stop.id} />
        {photos.length > 0 ? <SharedPhotoStatus photos={photos} /> : null}
      </section>
    </article>
  );
}

function SharedScrapbookPanel({
  detail,
  token,
}: {
  detail: SharedTripDetailModel;
  token: string;
}) {
  const totalNotes = countGrouped(detail.scrapbook.notesByDayId) +
    countGrouped(detail.scrapbook.notesByStopId) +
    detail.scrapbook.tripNotes.length;
  const totalRatings = Object.values(detail.scrapbook.ratingsByStopId).reduce(
    (sum, ratings) => sum + ratings.length,
    0,
  );
  const totalPhotos = detail.scrapbook.photosByTrip.length +
    countGrouped(detail.scrapbook.photosByDayId) +
    countGrouped(detail.scrapbook.photosByStopId);

  return (
    <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Family memories</h2>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <SummaryStat label="Notes" value={totalNotes} />
        <SummaryStat label="Ratings" value={totalRatings} />
        <SummaryStat label="Photos" value={totalPhotos} />
      </dl>
      <SharedNoteList title="Trip notes" notes={detail.scrapbook.tripNotes} />
      <SharedNoteForm
        token={token}
        tripId={detail.trip.id}
        label="Add a trip note"
        placeholder="Favorite moments, logistics to remember, or family quotes."
      />
      <SharedPhotoStatus photos={detail.scrapbook.photosByTrip} />
    </section>
  );
}

function SharedNoteList({
  title,
  notes,
}: {
  title: string;
  notes: ScrapbookNote[];
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <ol className="mt-2 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md border border-stone-200 bg-white p-3">
            <p className="text-sm leading-6 text-stone-800">{note.content}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {note.authorDisplayName} / {formatDate(note.createdAt.toISOString().slice(0, 10))}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SharedRatingList({ ratings }: { ratings: StopRating[] }) {
  if (ratings.length === 0) {
    return null;
  }

  return (
    <ol className="mt-3 space-y-2">
      {ratings.map((rating) => (
        <li key={rating.id} className="rounded-md border border-stone-200 bg-white p-3">
          <p className="text-sm font-semibold text-stone-900">{rating.stars} / 5 stars</p>
          {rating.text ? <p className="mt-1 text-sm leading-6 text-stone-700">{rating.text}</p> : null}
          {rating.authorDisplayName ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {rating.authorDisplayName}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function SharedPhotoStatus({ photos }: { photos: PhotoMetadataSummary[] }) {
  return (
    <section className="mt-4 border-t border-stone-200 pt-4">
      <h3 className="text-sm font-semibold text-stone-900">Photos</h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Photo upload is waiting on durable object storage. TripAI will not show a photo as uploaded until storage
        confirms it.
      </p>
      {photos.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {photos.map((photo) => (
            <li key={photo.id} className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
              {photo.caption || "Photo metadata"}: {photo.status}
              {photo.status === "uploaded" && photo.storageKey ? " stored" : " pending storage"}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-stone-600">No photo metadata yet.</p>
      )}
    </section>
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

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-stone-100 px-2 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function countGrouped<T>(groups: Record<string, T[]>) {
  return Object.values(groups).reduce((sum, items) => sum + items.length, 0);
}
