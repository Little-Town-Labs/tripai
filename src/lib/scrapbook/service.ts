import type { Pool, PoolClient } from "pg";

import { setAppRole, setOwnerContext } from "@/lib/access/context";

import {
  validateNoteInput,
  validateRatingInput,
  type NoteFieldErrors,
  type RatingFieldErrors,
} from "./validation";

export type ScrapbookResult =
  | { ok: true; scrapbook: ScrapbookSummary }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type CreateScrapbookNoteInput = {
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  content: unknown;
};

export type CreateScrapbookNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; reason: "invalid"; fieldErrors: NoteFieldErrors }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type CreateStopRatingInput = {
  tripId: string;
  stopId: string;
  stars: unknown;
  text?: unknown;
};

export type CreateStopRatingResult =
  | { ok: true; ratingId: string }
  | { ok: false; reason: "invalid"; fieldErrors: RatingFieldErrors }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type ScrapbookSummary = {
  tripNotes: ScrapbookNote[];
  notesByDayId: Record<string, ScrapbookNote[]>;
  notesByStopId: Record<string, ScrapbookNote[]>;
  ratingsByStopId: Record<string, StopRating[]>;
  ratingSummariesByStopId: Record<string, StopRatingSummary>;
  photosByTrip: PhotoMetadataSummary[];
  photosByDayId: Record<string, PhotoMetadataSummary[]>;
  photosByStopId: Record<string, PhotoMetadataSummary[]>;
};

export type ScrapbookNote = {
  id: string;
  tripId: string;
  dayId: string | null;
  stopId: string | null;
  authorDisplayName: string;
  content: string;
  createdAt: Date;
};

export type StopRating = {
  id: string;
  tripId: string;
  stopId: string;
  authorDisplayName: string | null;
  stars: number;
  text: string | null;
  tags: string[];
  createdAt: Date;
};

export type StopRatingSummary = {
  count: number;
  average: number;
};

export type PhotoMetadataSummary = {
  id: string;
  tripId: string;
  dayId: string | null;
  stopId: string | null;
  authorDisplayName: string;
  storageKey: string | null;
  caption: string | null;
  status: string;
  createdAt: Date;
};

type TripRow = {
  id: string;
  title: string;
  status: string;
  purchasedAt: Date | null;
  ownerDisplayName: string | null;
  ownerEmail: string;
};

type NoteRow = ScrapbookNote;
type RatingRow = StopRating;
type PhotoRow = PhotoMetadataSummary;

export async function getScrapbook(
  pool: Pool,
  ownerId: string,
  input: { tripId: string },
): Promise<ScrapbookResult> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const scrapbook = await listScrapbookForTrip(client, input.tripId);
    await client.query("commit");

    return { ok: true, scrapbook };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createScrapbookNote(
  pool: Pool,
  ownerId: string,
  input: CreateScrapbookNoteInput,
): Promise<CreateScrapbookNoteResult> {
  const parsed = validateNoteInput(input);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const scopeOk = await validateContributionScope(client, input.tripId, parsed.value);
    if (!scopeOk) {
      await client.query("commit");
      return {
        ok: false,
        reason: "invalid",
        fieldErrors: { scope: "Choose a valid day or stop for this trip." },
      };
    }

    const { rows } = await client.query<{ id: string }>(
      `
        insert into notes (
          trip_id,
          day_id,
          stop_id,
          author_owner_id,
          author_display_name,
          content
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id
      `,
      [
        input.tripId,
        parsed.value.dayId,
        parsed.value.stopId,
        ownerId,
        displayNameForOwner(tripResult.trip),
        parsed.value.content,
      ],
    );

    await client.query("commit");
    return { ok: true, noteId: rows[0].id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createStopRating(
  pool: Pool,
  ownerId: string,
  input: CreateStopRatingInput,
): Promise<CreateStopRatingResult> {
  const parsed = validateRatingInput(input);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const stopOk = await stopBelongsToTrip(client, input.tripId, parsed.value.stopId);
    if (!stopOk) {
      await client.query("commit");
      return {
        ok: false,
        reason: "invalid",
        fieldErrors: { stopId: "Choose a valid stop for this trip." },
      };
    }

    const { rows } = await client.query<{ id: string }>(
      `
        insert into ratings (
          trip_id,
          stop_id,
          author_owner_id,
          author_display_name,
          stars,
          text
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id
      `,
      [
        input.tripId,
        parsed.value.stopId,
        ownerId,
        displayNameForOwner(tripResult.trip),
        parsed.value.stars,
        parsed.value.text,
      ],
    );

    await client.query("commit");
    return { ok: true, ratingId: rows[0].id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listScrapbookForTrip(
  client: PoolClient,
  tripId: string,
): Promise<ScrapbookSummary> {
  const notes = await listNotes(client, tripId);
  const ratings = await listRatings(client, tripId);
  const photos = await listPhotos(client, tripId);

  return buildScrapbookSummary(notes, ratings, photos);
}

async function getPurchasedTrip(client: PoolClient, tripId: string):
  Promise<{ ok: true; trip: TripRow } | { ok: false; reason: "not_found" | "not_purchased" }> {
  const { rows } = await client.query<TripRow>(
    `
      select
        trips.id,
        trips.title,
        trips.status,
        trips.purchased_at as "purchasedAt",
        owners.display_name as "ownerDisplayName",
        owners.email as "ownerEmail"
      from trips
      join owners on owners.id = trips.owner_id
      where trips.id = $1
        and trips.deleted_at is null
      limit 1
    `,
    [tripId],
  );
  const trip = rows[0] ?? null;
  if (!trip) {
    return { ok: false, reason: "not_found" };
  }
  if (!isPurchasedTrip(trip)) {
    return { ok: false, reason: "not_purchased" };
  }

  return { ok: true, trip };
}

function isPurchasedTrip(trip: TripRow): trip is TripRow & { purchasedAt: Date } {
  return (
    trip.purchasedAt !== null &&
    (trip.status === "purchased" || trip.status === "active" || trip.status === "completed")
  );
}

async function validateContributionScope(
  client: PoolClient,
  tripId: string,
  input: { dayId: string | null; stopId: string | null },
) {
  if (input.dayId) {
    return dayBelongsToTrip(client, tripId, input.dayId);
  }
  if (input.stopId) {
    return stopBelongsToTrip(client, tripId, input.stopId);
  }

  return true;
}

async function dayBelongsToTrip(client: PoolClient, tripId: string, dayId: string) {
  const { rowCount } = await client.query(
    "select 1 from trip_days where trip_id = $1 and id = $2 limit 1",
    [tripId, dayId],
  );
  return rowCount === 1;
}

async function stopBelongsToTrip(client: PoolClient, tripId: string, stopId: string) {
  const { rowCount } = await client.query(
    "select 1 from stops where trip_id = $1 and id = $2 limit 1",
    [tripId, stopId],
  );
  return rowCount === 1;
}

async function listNotes(client: PoolClient, tripId: string) {
  const { rows } = await client.query<NoteRow>(
    `
      select
        id,
        trip_id as "tripId",
        day_id as "dayId",
        stop_id as "stopId",
        author_display_name as "authorDisplayName",
        content,
        created_at as "createdAt"
      from notes
      where trip_id = $1
        and deleted_at is null
      order by created_at asc, id asc
    `,
    [tripId],
  );

  return rows;
}

async function listRatings(client: PoolClient, tripId: string) {
  const { rows } = await client.query<RatingRow>(
    `
      select
        id,
        trip_id as "tripId",
        stop_id as "stopId",
        author_display_name as "authorDisplayName",
        stars,
        text,
        tags,
        created_at as "createdAt"
      from ratings
      where trip_id = $1
        and deleted_at is null
      order by created_at asc, id asc
    `,
    [tripId],
  );

  return rows;
}

async function listPhotos(client: PoolClient, tripId: string) {
  const { rows } = await client.query<PhotoRow>(
    `
      select
        id,
        trip_id as "tripId",
        day_id as "dayId",
        stop_id as "stopId",
        author_display_name as "authorDisplayName",
        storage_key as "storageKey",
        caption,
        status,
        created_at as "createdAt"
      from photo_metadata
      where trip_id = $1
        and deleted_at is null
      order by created_at asc, id asc
    `,
    [tripId],
  );

  return rows;
}

function buildScrapbookSummary(
  notes: ScrapbookNote[],
  ratings: StopRating[],
  photos: PhotoMetadataSummary[],
): ScrapbookSummary {
  const ratingsByStopId = groupByKey(ratings, "stopId");

  return {
    tripNotes: notes.filter((note) => !note.dayId && !note.stopId),
    notesByDayId: groupByNullableKey(notes.filter((note) => note.dayId), "dayId"),
    notesByStopId: groupByNullableKey(notes.filter((note) => note.stopId), "stopId"),
    ratingsByStopId,
    ratingSummariesByStopId: summarizeRatings(ratingsByStopId),
    photosByTrip: photos.filter((photo) => !photo.dayId && !photo.stopId),
    photosByDayId: groupByNullableKey(photos.filter((photo) => photo.dayId), "dayId"),
    photosByStopId: groupByNullableKey(photos.filter((photo) => photo.stopId), "stopId"),
  };
}

function summarizeRatings(ratingsByStopId: Record<string, StopRating[]>) {
  const summaries: Record<string, StopRatingSummary> = {};
  for (const [stopId, ratings] of Object.entries(ratingsByStopId)) {
    const total = ratings.reduce((sum, rating) => sum + rating.stars, 0);
    summaries[stopId] = {
      count: ratings.length,
      average: Math.round((total / ratings.length) * 10) / 10,
    };
  }

  return summaries;
}

function groupByKey<T extends Record<K, string>, K extends keyof T>(
  items: T[],
  key: K,
) {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const group = grouped[item[key]] ?? [];
    group.push(item);
    grouped[item[key]] = group;
  }
  return grouped;
}

function groupByNullableKey<T extends Record<K, string | null>, K extends keyof T>(
  items: T[],
  key: K,
) {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const value = item[key];
    if (!value) {
      continue;
    }
    const group = grouped[value] ?? [];
    group.push(item);
    grouped[value] = group;
  }
  return grouped;
}

function displayNameForOwner(trip: Pick<TripRow, "ownerDisplayName" | "ownerEmail">) {
  return trip.ownerDisplayName || trip.ownerEmail;
}
