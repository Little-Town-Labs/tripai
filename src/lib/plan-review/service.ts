import type { Pool, PoolClient } from "pg";

import { setAppRole, setOwnerContext } from "@/lib/access/context";

import { validateRevisionRequestText } from "./validation";

export type GetPlanReviewInput = {
  tripId: string;
  revisionId?: string;
};

export type PlanReviewResult =
  | { ok: true; review: PlanReview }
  | { ok: false; reason: "not_found" | "forbidden" };

export type PlanReview = {
  trip: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    purchasedAt: Date | null;
  };
  selectedRevision: PlanReviewVersion | null;
  versions: PlanReviewVersion[];
  days: PlanReviewDay[];
  status: "ready" | "progress" | "missing";
  canRequestPrePurchaseRevision: boolean;
};

export type PlanReviewVersion = {
  id: string;
  revisionNumber: number;
  kind: string;
  status: string;
  summary: string | null;
  committedAt: Date | null;
};

export type PlanReviewDay = {
  id: string;
  dayNumber: number;
  date: string;
  label: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalMiles: number | null;
  driveTimeMinutes: number | null;
  aiSummary: string | null;
  stops: PlanReviewStop[];
};

export type PlanReviewStop = {
  id: string;
  stableStopKey: string;
  orderIndex: number;
  name: string;
  type: string;
  googlePlaceId: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  eta: Date | null;
  description: string | null;
  tips: string | null;
  priceLevel: number | null;
  googleRating: number | null;
  hoursSummary: string | null;
  phone: string | null;
  website: string | null;
};

export type RequestPrePurchaseRevisionInput = {
  tripId: string;
  requestText: unknown;
};

export type RequestPrePurchaseRevisionResult =
  | { ok: true; revisionId: string; revisionNumber: number }
  | { ok: false; reason: "invalid"; fieldErrors: { requestText: string } }
  | { ok: false; reason: "not_found" | "already_purchased" | "not_ready" };

type TripRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  currentRevisionId: string | null;
  purchasedAt: Date | null;
  deletedAt: Date | null;
};

type RevisionRow = PlanReviewVersion;

type DayRow = Omit<PlanReviewDay, "stops">;

type StopRow = PlanReviewStop & {
  dayId: string;
};

export async function getPlanReview(
  pool: Pool,
  ownerId: string,
  input: GetPlanReviewInput,
): Promise<PlanReviewResult> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const trip = await getVisibleTrip(client, input.tripId);
    if (!trip) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }

    const versions = await listVersions(client, trip.id);
    const selectedRevisionId = input.revisionId ?? trip.currentRevisionId;
    const selectedRevision = selectedRevisionId
      ? versions.find(
          (version) =>
            version.id === selectedRevisionId &&
            (version.status === "current" || version.status === "superseded"),
        ) ?? null
      : null;

    if (input.revisionId && !selectedRevision) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }

    const days = selectedRevision ? await listDaysWithStops(client, trip.id, selectedRevision.id) : [];
    await client.query("commit");

    return {
      ok: true,
      review: {
        trip: {
          id: trip.id,
          title: trip.title,
          summary: trip.summary,
          status: trip.status,
          purchasedAt: trip.purchasedAt,
        },
        selectedRevision,
        versions,
        days,
        status: selectedRevision && days.length > 0 ? "ready" : "progress",
        canRequestPrePurchaseRevision: !trip.purchasedAt && trip.status === "draft" && !trip.deletedAt,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestPrePurchaseRevision(
  pool: Pool,
  ownerId: string,
  input: RequestPrePurchaseRevisionInput,
): Promise<RequestPrePurchaseRevisionResult> {
  const parsed = validateRevisionRequestText(input.requestText);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const trip = await getVisibleTrip(client, input.tripId);
    if (!trip || trip.deletedAt) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }
    if (trip.purchasedAt || trip.status !== "draft") {
      await client.query("commit");
      return { ok: false, reason: "already_purchased" };
    }
    if (!trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "not_ready" };
    }

    const { rows } = await client.query<{ id: string; revisionNumber: number }>(
      `
        insert into trip_revisions (
          trip_id,
          revision_number,
          kind,
          parent_revision_id,
          status,
          summary
        )
        select
          $1,
          coalesce(max(revision_number), 0) + 1,
          'pre_purchase',
          $2,
          'draft',
          $3
        from trip_revisions
        where trip_id = $1
        returning id, revision_number as "revisionNumber"
      `,
      [trip.id, trip.currentRevisionId, parsed.value],
    );

    await client.query("commit");
    return {
      ok: true,
      revisionId: rows[0].id,
      revisionNumber: rows[0].revisionNumber,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getVisibleTrip(client: PoolClient, tripId: string) {
  const { rows } = await client.query<TripRow>(
    `
      select
        id,
        title,
        summary,
        status,
        current_revision_id as "currentRevisionId",
        purchased_at as "purchasedAt",
        deleted_at as "deletedAt"
      from trips
      where id = $1
      limit 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

async function listVersions(client: PoolClient, tripId: string) {
  const { rows } = await client.query<RevisionRow>(
    `
      select
        id,
        revision_number as "revisionNumber",
        kind,
        status,
        summary,
        committed_at as "committedAt"
      from trip_revisions
      where trip_id = $1
        and status in ('current', 'superseded', 'draft')
      order by revision_number desc
    `,
    [tripId],
  );

  return rows;
}

async function listDaysWithStops(
  client: PoolClient,
  tripId: string,
  revisionId: string,
) {
  const { rows: days } = await client.query<DayRow>(
    `
      select
        id,
        day_number as "dayNumber",
        date::text,
        label,
        from_location as "fromLocation",
        to_location as "toLocation",
        total_miles as "totalMiles",
        drive_time_minutes as "driveTimeMinutes",
        ai_summary as "aiSummary"
      from trip_days
      where trip_id = $1
        and revision_id = $2
      order by day_number asc
    `,
    [tripId, revisionId],
  );

  if (days.length === 0) {
    return [];
  }

  const { rows: stops } = await client.query<StopRow>(
    `
      select
        id,
        day_id as "dayId",
        stable_stop_key as "stableStopKey",
        order_index as "orderIndex",
        name,
        type,
        google_place_id as "googlePlaceId",
        lat,
        lng,
        address,
        eta,
        description,
        tips,
        price_level as "priceLevel",
        google_rating as "googleRating",
        hours_summary as "hoursSummary",
        phone,
        website
      from stops
      where trip_id = $1
        and revision_id = $2
      order by day_id asc, order_index asc
    `,
    [tripId, revisionId],
  );

  const stopsByDay = new Map<string, PlanReviewStop[]>();
  for (const stop of stops) {
    const { dayId, ...viewStop } = stop;
    const dayStops = stopsByDay.get(dayId) ?? [];
    dayStops.push(viewStop);
    stopsByDay.set(dayId, dayStops);
  }

  return days.map((day) => ({
    ...day,
    stops: stopsByDay.get(day.id) ?? [],
  }));
}
