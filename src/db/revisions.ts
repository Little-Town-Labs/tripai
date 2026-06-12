import type { Pool, PoolClient } from "pg";

export type TripRevisionSummary = {
  id: string;
  tripId: string;
  revisionNumber: number;
  status: string;
};

export type StopContribution = {
  kind: "note" | "rating" | "photo";
  id: string;
  stopId: string;
  stableStopKey: string;
};

type Queryable = Pool | PoolClient;

export async function getCurrentRevision(pool: Queryable, tripId: string) {
  const { rows } = await pool.query<TripRevisionSummary>(
    `
      select
        id,
        trip_id as "tripId",
        revision_number as "revisionNumber",
        status
      from trip_revisions
      where trip_id = $1
        and status = 'current'
      limit 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

export async function listRetainedStopContributions(
  pool: Queryable,
  tripId: string,
  retainedStableStopKeys: string[],
) {
  return listStopContributions(pool, tripId, retainedStableStopKeys, true);
}

export async function findRemovedStopContributions(
  pool: Queryable,
  tripId: string,
  retainedStableStopKeys: string[],
) {
  return listStopContributions(pool, tripId, retainedStableStopKeys, false);
}

async function listStopContributions(
  pool: Queryable,
  tripId: string,
  stableStopKeys: string[],
  includeMatching: boolean,
) {
  const stableKeyPredicate = includeMatching
    ? "stops.stable_stop_key = any($2::text[])"
    : "not (stops.stable_stop_key = any($2::text[]))";
  const { rows } = await pool.query<StopContribution>(
    `
      select 'note' as kind, notes.id::text, stops.id::text as "stopId", stops.stable_stop_key as "stableStopKey"
      from notes
      join stops on stops.id = notes.stop_id
      where notes.trip_id = $1
        and ${stableKeyPredicate}
        and notes.deleted_at is null
      union all
      select 'rating' as kind, ratings.id::text, stops.id::text as "stopId", stops.stable_stop_key as "stableStopKey"
      from ratings
      join stops on stops.id = ratings.stop_id
      where ratings.trip_id = $1
        and ${stableKeyPredicate}
        and ratings.deleted_at is null
      union all
      select 'photo' as kind, photo_metadata.id::text, stops.id::text as "stopId", stops.stable_stop_key as "stableStopKey"
      from photo_metadata
      join stops on stops.id = photo_metadata.stop_id
      where photo_metadata.trip_id = $1
        and ${stableKeyPredicate}
        and photo_metadata.deleted_at is null
      order by kind
    `,
    [tripId, stableStopKeys],
  );

  return rows;
}
