import { removeShareContributionAction } from "@/app/app/trips/[tripId]/actions";
import type {
  PhotoMetadataSummary,
  ScrapbookNote,
} from "@/lib/scrapbook/service";
import type { TripDetail } from "@/lib/trip-detail/service";

import { formatDate } from "./format";
import { NoteForm } from "./note-form";

export function ScrapbookPanel({
  detail,
  enabled,
}: {
  detail: TripDetail;
  enabled: boolean;
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
      <h2 className="text-xl font-semibold">Scrapbook</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        {enabled
          ? "Save memories directly alongside the trip."
          : "Scrapbook notes and ratings are built but toggled off for this environment."}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <SummaryStat label="Notes" value={totalNotes} />
        <SummaryStat label="Ratings" value={totalRatings} />
        <SummaryStat label="Photos" value={totalPhotos} />
      </dl>

      {enabled ? (
        <>
          <NoteList title="Trip notes" notes={detail.scrapbook.tripNotes} tripId={detail.trip.id} />
          <NoteForm
            tripId={detail.trip.id}
            label="Add a trip note"
            placeholder="Favorite moments, logistics to remember, or family quotes."
            disabled={!enabled}
          />
        </>
      ) : (
        <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700">
          Set `TRIPAI_SCRAPBOOK_ENABLED=1` to enable owner note and rating forms.
        </p>
      )}

      <PhotoStatus photos={detail.scrapbook.photosByTrip} enabled={enabled} />
    </section>
  );
}

export function NoteList({
  title,
  notes,
  tripId,
}: {
  title: string;
  notes: ScrapbookNote[];
  tripId?: string;
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <ol className="mt-2 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm leading-6 text-stone-800">{note.content}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {note.authorDisplayName} / {formatDate(note.createdAt.toISOString().slice(0, 10))}
            </p>
            {tripId && note.authorShareLinkId ? (
              <form action={removeShareContributionAction.bind(null, tripId)} className="mt-3">
                <input type="hidden" name="contributionType" value="note" />
                <input type="hidden" name="contributionId" value={note.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-md border border-red-700 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PhotoStatus({
  photos,
  enabled,
}: {
  photos: PhotoMetadataSummary[];
  enabled: boolean;
}) {
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
        <p className="mt-3 text-sm text-stone-600">
          {enabled ? "No photo metadata yet." : "Photo upload remains disabled with the scrapbook toggle."}
        </p>
      )}
    </section>
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
