import type { Pool, PoolClient } from "pg";

import { findRemovedStopContributions } from "@/db/revisions";
import { setAppRole, setOwnerContext } from "@/lib/access/context";

import {
  type RevisionMode,
  modeToRevisionKind,
  remainingRevisions,
} from "./config";
import {
  validatePreservationDecisions,
  validateRevisionMode,
  validateRevisionRequestText,
  type PreservationDecision,
  type RevisionRequestFieldErrors,
} from "./validation";

export type RevisionPanelResult =
  | { ok: true; panel: RevisionPanel }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type RevisionPanel = {
  tripId: string;
  planningRemaining: number;
  midTripRemaining: number;
  canRequestPlanning: boolean;
  canRequestMidTrip: boolean;
  currentRevisionId: string | null;
  previousRevision: PreviousRevision | null;
  draftCandidate: RevisionCandidateSummary | null;
};

export type PreviousRevision = {
  id: string;
  revisionNumber: number;
  summary: string | null;
};

export type RevisionCandidateSummary = {
  revisionId: string;
  revisionNumber: number;
  mode: RevisionMode;
  removedStopContributions: RemovedStopContributionSummary[];
  canCommit: boolean;
};

export type RemovedStopContributionSummary = {
  stableStopKey: string;
  stopId: string;
  counts: { notes: number; ratings: number; photos: number };
};

export type RevisionStopDraft = {
  id?: string;
  stableStopKey: string;
  orderIndex: number;
  name: string;
  type: string;
  googlePlaceId: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  eta: Date | string | null;
  description: string | null;
  tips: string | null;
  priceLevel: number | null;
  googleRating: number | null;
  hoursSummary: string | null;
  phone: string | null;
  website: string | null;
  checked: boolean;
};

export type RevisionDayDraft = {
  dayNumber: number;
  date: string;
  label: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalMiles: number | null;
  driveTimeMinutes: number | null;
  aiSummary: string | null;
  stops: RevisionStopDraft[];
};

export type RevisionGeneratorInput = {
  tripId: string;
  mode: RevisionMode;
  requestText: string;
  currentRevisionId: string;
  currentDays: CurrentRevisionDay[];
  retainedStableStopKeys: string[];
  retainedStops: RevisionStopDraft[];
};

export type RevisionGenerator = (input: RevisionGeneratorInput) => Promise<{
  summary: string;
  days: RevisionDayDraft[];
}>;

export type RequestTripRevisionResult =
  | { ok: true; candidate: RevisionCandidateSummary }
  | { ok: false; reason: "invalid"; fieldErrors: RevisionRequestFieldErrors & { mode?: string } }
  | { ok: false; reason: "not_found" | "not_purchased" | "limit_reached" | "not_ready" | "generation_failed" };

export type CommitTripRevisionResult =
  | { ok: true; currentRevisionId: string; planningRemaining: number; midTripRemaining: number }
  | {
      ok: false;
      reason: "not_found" | "not_purchased" | "limit_reached" | "candidate_not_found" | "preservation_required" | "stale_candidate";
      affectedStableStopKeys?: string[];
    };

export type MarkStopVisitedResult =
  | { ok: true; stopId: string; checked: boolean }
  | { ok: false; reason: "not_found" | "not_purchased" | "invalid_scope" };

export type RestorePreviousRevisionResult =
  | { ok: true; currentRevisionId: string }
  | { ok: false; reason: "not_found" | "not_purchased" | "previous_not_found" };

type TripRow = {
  id: string;
  status: string;
  currentRevisionId: string | null;
  planningRevisionsUsed: number;
  midTripRevisionsUsed: number;
  purchasedAt: Date | null;
  deletedAt: Date | null;
};

type RevisionRow = {
  id: string;
  revisionNumber: number;
  kind: string;
  parentRevisionId: string | null;
  status: string;
  summary: string | null;
};

type CurrentRevisionDay = {
  id: string;
  dayNumber: number;
  date: string;
  label: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalMiles: number | null;
  driveTimeMinutes: number | null;
  aiSummary: string | null;
  stops: CurrentRevisionStop[];
};

type CurrentRevisionStop = RevisionStopDraft & {
  id: string;
  dayId: string;
};

type RemovedContributionRow = {
  kind: "note" | "rating" | "photo";
  id: string;
  stopId: string;
  stableStopKey: string;
};

export async function getRevisionPanel(
  pool: Pool,
  ownerId: string,
  input: { tripId: string; today?: Date },
): Promise<RevisionPanelResult> {
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

    const currentDays = tripResult.trip.currentRevisionId
      ? await listCurrentRevisionDays(client, tripResult.trip.id, tripResult.trip.currentRevisionId)
      : [];
    const previousRevision = await getPreviousRevision(client, tripResult.trip.id);
    const draftCandidate = await getLatestDraftCandidate(client, tripResult.trip.id);

    await client.query("commit");
    return {
      ok: true,
      panel: buildPanel(tripResult.trip, currentDays, previousRevision, draftCandidate, input.today ?? new Date()),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markStopVisited(
  pool: Pool,
  ownerId: string,
  input: { tripId: string; stopId: string; checked: boolean },
): Promise<MarkStopVisitedResult> {
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
    if (!tripResult.trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "invalid_scope" };
    }

    const { rowCount } = await client.query(
      `
        update stops
        set checked = $1,
            updated_at = now()
        where trip_id = $2
          and id = $3
          and revision_id = $4
      `,
      [input.checked, input.tripId, input.stopId, tripResult.trip.currentRevisionId],
    );

    await client.query("commit");
    return rowCount === 1
      ? { ok: true, stopId: input.stopId, checked: input.checked }
      : { ok: false, reason: "invalid_scope" };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestTripRevision(
  pool: Pool,
  ownerId: string,
  input: { tripId: string; mode: unknown; requestText: unknown },
  options: { generator: RevisionGenerator; today?: Date },
): Promise<RequestTripRevisionResult> {
  const parsedMode = validateRevisionMode(input.mode);
  const parsedText = validateRevisionRequestText(input.requestText);
  if (!parsedMode.ok || !parsedText.ok) {
    return {
      ok: false,
      reason: "invalid",
      fieldErrors: {
        ...(!parsedMode.ok ? parsedMode.fieldErrors : {}),
        ...(!parsedText.ok ? parsedText.fieldErrors : {}),
      },
    };
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

    const trip = tripResult.trip;
    if (!trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "not_ready" };
    }

    const currentDays = await listCurrentRevisionDays(client, trip.id, trip.currentRevisionId);
    if (currentDays.length === 0 || !modeAllowed(parsedMode.value, trip, currentDays, options.today ?? new Date())) {
      await client.query("commit");
      return { ok: false, reason: "not_ready" };
    }
    if (remainingForMode(parsedMode.value, trip) <= 0) {
      await client.query("commit");
      return { ok: false, reason: "limit_reached" };
    }

    const retainedStops = parsedMode.value === "mid_trip"
      ? currentDays.flatMap((day) => day.stops.filter((stop) => stop.checked).map(toDraftStop))
      : [];
    const retainedStableStopKeys = retainedStops.map((stop) => stop.stableStopKey);

    let generated: Awaited<ReturnType<RevisionGenerator>>;
    try {
      generated = await options.generator({
        tripId: trip.id,
        mode: parsedMode.value,
        requestText: parsedText.value,
        currentRevisionId: trip.currentRevisionId,
        currentDays,
        retainedStableStopKeys,
        retainedStops,
      });
    } catch {
      await client.query("commit");
      return { ok: false, reason: "generation_failed" };
    }

    const revision = await insertDraftRevision(client, trip, parsedMode.value, generated.summary);
    await insertCandidateDays(client, trip.id, revision.id, generated.days);
    const candidateStableKeys = generated.days.flatMap((day) => day.stops.map((stop) => stop.stableStopKey));
    const removedStopContributions = summarizeRemovedContributions(
      await findRemovedStopContributions(client, trip.id, candidateStableKeys),
    );

    await client.query("commit");
    return {
      ok: true,
      candidate: {
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        mode: parsedMode.value,
        removedStopContributions,
        canCommit: removedStopContributions.length === 0,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function commitTripRevision(
  pool: Pool,
  ownerId: string,
  input: { tripId: string; revisionId: string; preservationDecisions: unknown },
): Promise<CommitTripRevisionResult> {
  const parsedPreservation = validatePreservationDecisions(input.preservationDecisions);
  if (!parsedPreservation.ok) {
    return { ok: false, reason: "preservation_required" };
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
    const trip = tripResult.trip;
    const candidate = await getRevision(client, trip.id, input.revisionId, "draft");
    if (!candidate) {
      await client.query("commit");
      return { ok: false, reason: "candidate_not_found" };
    }
    if (!trip.currentRevisionId || candidate.parentRevisionId !== trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "stale_candidate" };
    }

    const mode = candidate.kind === "mid_trip" ? "mid_trip" : "planning";
    if (remainingForMode(mode, trip) <= 0) {
      await client.query("commit");
      return { ok: false, reason: "limit_reached" };
    }

    const candidateStableKeys = await listStableStopKeys(client, trip.id, candidate.id);
    const removed = summarizeRemovedContributions(
      await findRemovedStopContributions(client, trip.id, candidateStableKeys),
    );
    const missing = removed
      .filter((item) => !parsedPreservation.value.some((decision) => decision.stableStopKey === item.stableStopKey))
      .map((item) => item.stableStopKey);
    if (missing.length > 0) {
      await client.query("commit");
      return { ok: false, reason: "preservation_required", affectedStableStopKeys: missing };
    }

    await preserveRemovedContributions(client, trip.id, candidate.id, parsedPreservation.value);
    await client.query(
      "update trip_revisions set status = 'superseded' where id = $1 and trip_id = $2",
      [trip.currentRevisionId, trip.id],
    );
    await client.query(
      "update trip_revisions set status = 'current', committed_at = now() where id = $1 and trip_id = $2",
      [candidate.id, trip.id],
    );
    await client.query(
      `
        update trips
        set current_revision_id = $1,
            planning_revisions_used = planning_revisions_used + $2,
            mid_trip_revisions_used = mid_trip_revisions_used + $3,
            updated_at = now()
        where id = $4
      `,
      [candidate.id, mode === "planning" ? 1 : 0, mode === "mid_trip" ? 1 : 0, trip.id],
    );

    const updatedTrip = {
      ...trip,
      planningRevisionsUsed: trip.planningRevisionsUsed + (mode === "planning" ? 1 : 0),
      midTripRevisionsUsed: trip.midTripRevisionsUsed + (mode === "mid_trip" ? 1 : 0),
    };
    await client.query("commit");
    return {
      ok: true,
      currentRevisionId: candidate.id,
      planningRemaining: remainingRevisions("planning", updatedTrip.planningRevisionsUsed),
      midTripRemaining: remainingRevisions("mid_trip", updatedTrip.midTripRevisionsUsed),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function restorePreviousRevision(
  pool: Pool,
  ownerId: string,
  input: { tripId: string },
): Promise<RestorePreviousRevisionResult> {
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
    const trip = tripResult.trip;
    const previous = await getPreviousRevision(client, trip.id);
    if (!previous || !trip.currentRevisionId) {
      await client.query("commit");
      return { ok: false, reason: "previous_not_found" };
    }

    await client.query(
      "update trip_revisions set status = 'superseded' where id = $1 and trip_id = $2",
      [trip.currentRevisionId, trip.id],
    );
    await client.query(
      "update trip_revisions set status = 'current', committed_at = now() where id = $1 and trip_id = $2",
      [previous.id, trip.id],
    );
    await client.query(
      "update trips set current_revision_id = $1, updated_at = now() where id = $2",
      [previous.id, trip.id],
    );

    await client.query("commit");
    return { ok: true, currentRevisionId: previous.id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getPurchasedTrip(client: PoolClient, tripId: string):
  Promise<{ ok: true; trip: TripRow } | { ok: false; reason: "not_found" | "not_purchased" }> {
  const { rows } = await client.query<TripRow>(
    `
      select
        id,
        status,
        current_revision_id as "currentRevisionId",
        planning_revisions_used as "planningRevisionsUsed",
        mid_trip_revisions_used as "midTripRevisionsUsed",
        purchased_at as "purchasedAt",
        deleted_at as "deletedAt"
      from trips
      where id = $1
        and deleted_at is null
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

async function listCurrentRevisionDays(client: PoolClient, tripId: string, revisionId: string) {
  const { rows: days } = await client.query<Omit<CurrentRevisionDay, "stops">>(
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
  if (days.length === 0) return [];

  const { rows: stops } = await client.query<CurrentRevisionStop>(
    `
      select
        id,
        day_id as "dayId",
        stable_stop_key as "stableStopKey",
        order_index as "orderIndex",
        name,
        type,
        google_place_id as "googlePlaceId",
        address,
        lat,
        lng,
        eta,
        description,
        tips,
        price_level as "priceLevel",
        google_rating as "googleRating",
        hours_summary as "hoursSummary",
        phone,
        website,
        checked
      from stops
      where trip_id = $1
        and revision_id = $2
      order by day_id asc, order_index asc
    `,
    [tripId, revisionId],
  );
  const byDay = new Map<string, CurrentRevisionStop[]>();
  for (const stop of stops) {
    byDay.set(stop.dayId, [...(byDay.get(stop.dayId) ?? []), stop]);
  }

  return days.map((day) => ({ ...day, stops: byDay.get(day.id) ?? [] }));
}

function buildPanel(
  trip: TripRow,
  days: CurrentRevisionDay[],
  previousRevision: PreviousRevision | null,
  draftCandidate: RevisionCandidateSummary | null,
  today: Date,
): RevisionPanel {
  return {
    tripId: trip.id,
    planningRemaining: remainingRevisions("planning", trip.planningRevisionsUsed),
    midTripRemaining: remainingRevisions("mid_trip", trip.midTripRevisionsUsed),
    canRequestPlanning: modeAllowed("planning", trip, days, today) && remainingForMode("planning", trip) > 0,
    canRequestMidTrip: modeAllowed("mid_trip", trip, days, today) && remainingForMode("mid_trip", trip) > 0,
    currentRevisionId: trip.currentRevisionId,
    previousRevision,
    draftCandidate,
  };
}

function modeAllowed(mode: RevisionMode, trip: TripRow, days: CurrentRevisionDay[], today: Date) {
  const range = tripDateRange(days);
  if (!range || trip.status === "completed") return false;
  const todayDate = toDateOnly(today);
  if (mode === "planning") {
    return todayDate < range.start;
  }
  return todayDate >= range.start && todayDate <= range.end;
}

function tripDateRange(days: CurrentRevisionDay[]) {
  const dates = days.map((day) => day.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  return start && end ? { start, end } : null;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function remainingForMode(mode: RevisionMode, trip: TripRow) {
  return mode === "planning"
    ? remainingRevisions(mode, trip.planningRevisionsUsed)
    : remainingRevisions(mode, trip.midTripRevisionsUsed);
}

function toDraftStop(stop: CurrentRevisionStop): RevisionStopDraft {
  return {
    stableStopKey: stop.stableStopKey,
    orderIndex: stop.orderIndex,
    name: stop.name,
    type: stop.type,
    googlePlaceId: stop.googlePlaceId,
    address: stop.address,
    lat: stop.lat,
    lng: stop.lng,
    eta: stop.eta,
    description: stop.description,
    tips: stop.tips,
    priceLevel: stop.priceLevel,
    googleRating: stop.googleRating,
    hoursSummary: stop.hoursSummary,
    phone: stop.phone,
    website: stop.website,
    checked: stop.checked,
  };
}

async function insertDraftRevision(
  client: PoolClient,
  trip: TripRow,
  mode: RevisionMode,
  summary: string,
) {
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
        $2,
        $3,
        'draft',
        $4
      from trip_revisions
      where trip_id = $1
      returning id, revision_number as "revisionNumber"
    `,
    [trip.id, modeToRevisionKind(mode), trip.currentRevisionId, summary],
  );
  return rows[0];
}

async function insertCandidateDays(
  client: PoolClient,
  tripId: string,
  revisionId: string,
  days: RevisionDayDraft[],
) {
  for (const day of days) {
    const { rows } = await client.query<{ id: string }>(
      `
        insert into trip_days (
          trip_id,
          revision_id,
          day_number,
          date,
          label,
          from_location,
          to_location,
          total_miles,
          drive_time_minutes,
          ai_summary
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning id
      `,
      [
        tripId,
        revisionId,
        day.dayNumber,
        day.date,
        day.label,
        day.fromLocation,
        day.toLocation,
        day.totalMiles,
        day.driveTimeMinutes,
        day.aiSummary,
      ],
    );
    const dayId = rows[0].id;
    for (const stop of day.stops) {
      await client.query(
        `
          insert into stops (
            id,
            trip_id,
            day_id,
            revision_id,
            stable_stop_key,
            order_index,
            name,
            type,
            google_place_id,
            address,
            lat,
            lng,
            eta,
            description,
            tips,
            price_level,
            google_rating,
            hours_summary,
            phone,
            website,
            checked
          )
          values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `,
        [
          stop.id ?? null,
          tripId,
          dayId,
          revisionId,
          stop.stableStopKey,
          stop.orderIndex,
          stop.name,
          stop.type,
          stop.googlePlaceId,
          stop.address,
          stop.lat,
          stop.lng,
          stop.eta,
          stop.description,
          stop.tips,
          stop.priceLevel,
          stop.googleRating,
          stop.hoursSummary,
          stop.phone,
          stop.website,
          stop.checked,
        ],
      );
    }
  }
}

function summarizeRemovedContributions(contributions: RemovedContributionRow[]) {
  const grouped = new Map<string, RemovedStopContributionSummary>();
  for (const contribution of contributions) {
    const current = grouped.get(contribution.stableStopKey) ?? {
      stableStopKey: contribution.stableStopKey,
      stopId: contribution.stopId,
      counts: { notes: 0, ratings: 0, photos: 0 },
    };
    if (contribution.kind === "note") current.counts.notes += 1;
    if (contribution.kind === "rating") current.counts.ratings += 1;
    if (contribution.kind === "photo") current.counts.photos += 1;
    grouped.set(contribution.stableStopKey, current);
  }
  return [...grouped.values()].sort((a, b) => a.stableStopKey.localeCompare(b.stableStopKey));
}

async function getRevision(
  client: PoolClient,
  tripId: string,
  revisionId: string,
  status?: string,
) {
  const clauses = ["trip_id = $1", "id = $2"];
  const params = [tripId, revisionId] as unknown[];
  if (status) {
    clauses.push("status = $3");
    params.push(status);
  }
  const { rows } = await client.query<RevisionRow>(
    `
      select
        id,
        revision_number as "revisionNumber",
        kind,
        parent_revision_id as "parentRevisionId",
        status,
        summary
      from trip_revisions
      where ${clauses.join(" and ")}
      limit 1
    `,
    params,
  );
  return rows[0] ?? null;
}

async function getPreviousRevision(client: PoolClient, tripId: string): Promise<PreviousRevision | null> {
  const { rows } = await client.query<PreviousRevision>(
    `
      select
        id,
        revision_number as "revisionNumber",
        summary
      from trip_revisions
      where trip_id = $1
        and status = 'superseded'
      order by committed_at desc nulls last, revision_number desc
      limit 1
    `,
    [tripId],
  );
  return rows[0] ?? null;
}

async function getLatestDraftCandidate(
  client: PoolClient,
  tripId: string,
): Promise<RevisionCandidateSummary | null> {
  const { rows } = await client.query<RevisionRow>(
    `
      select
        id,
        revision_number as "revisionNumber",
        kind,
        parent_revision_id as "parentRevisionId",
        status,
        summary
      from trip_revisions
      where trip_id = $1
        and status = 'draft'
        and kind in ('post_purchase', 'mid_trip')
      order by revision_number desc
      limit 1
    `,
    [tripId],
  );
  const draft = rows[0] ?? null;
  if (!draft) return null;
  const stableKeys = await listStableStopKeys(client, tripId, draft.id);
  const removedStopContributions = summarizeRemovedContributions(
    await findRemovedStopContributions(client, tripId, stableKeys),
  );
  return {
    revisionId: draft.id,
    revisionNumber: draft.revisionNumber,
    mode: draft.kind === "mid_trip" ? "mid_trip" : "planning",
    removedStopContributions,
    canCommit: removedStopContributions.length === 0,
  };
}

async function listStableStopKeys(client: PoolClient, tripId: string, revisionId: string) {
  const { rows } = await client.query<{ stableStopKey: string }>(
    `
      select stable_stop_key as "stableStopKey"
      from stops
      where trip_id = $1
        and revision_id = $2
      order by order_index asc
    `,
    [tripId, revisionId],
  );
  return rows.map((row) => row.stableStopKey);
}

async function preserveRemovedContributions(
  client: PoolClient,
  tripId: string,
  candidateRevisionId: string,
  decisions: PreservationDecision[],
) {
  for (const decision of decisions) {
    const stop = await getStopByStableKey(client, tripId, decision.stableStopKey);
    if (!stop) continue;
    const targetDayId = decision.targetScope === "day"
      ? await getCandidateDayForDayNumber(client, tripId, candidateRevisionId, stop.dayNumber)
      : null;
    const finalDayId = decision.targetScope === "day" ? targetDayId : null;

    await client.query(
      `
        update notes
        set day_id = $1,
            stop_id = null,
            content = 'Preserved from ' || $2 || ': ' || content,
            updated_at = now()
        where trip_id = $3
          and stop_id = $4
          and deleted_at is null
      `,
      [finalDayId, stop.name, tripId, stop.id],
    );
    await client.query(
      `
        update photo_metadata
        set day_id = $1,
            stop_id = null,
            updated_at = now()
        where trip_id = $2
          and stop_id = $3
          and deleted_at is null
      `,
      [finalDayId, tripId, stop.id],
    );

    const { rows: ratings } = await client.query<{
      authorOwnerId: string | null;
      authorDisplayName: string | null;
      stars: number;
      text: string | null;
    }>(
      `
        select
          author_owner_id as "authorOwnerId",
          author_display_name as "authorDisplayName",
          stars,
          text
        from ratings
        where trip_id = $1
          and stop_id = $2
          and deleted_at is null
      `,
      [tripId, stop.id],
    );
    for (const rating of ratings) {
      await client.query(
        `
          insert into notes (
            trip_id,
            day_id,
            stop_id,
            author_owner_id,
            author_display_name,
            content
          )
          values ($1, $2, null, $3, $4, $5)
        `,
        [
          tripId,
          finalDayId,
          rating.authorOwnerId,
          rating.authorDisplayName ?? "Trip owner",
          `Preserved from ${stop.name}: ${rating.stars} / 5 stars${rating.text ? ` - ${rating.text}` : ""}`,
        ],
      );
    }
  }
}

async function getStopByStableKey(client: PoolClient, tripId: string, stableStopKey: string) {
  const { rows } = await client.query<{
    id: string;
    name: string;
    dayNumber: number;
  }>(
    `
      select
        stops.id,
        stops.name,
        trip_days.day_number as "dayNumber"
      from stops
      join trip_days on trip_days.id = stops.day_id
      join trip_revisions on trip_revisions.id = stops.revision_id
      where stops.trip_id = $1
        and stops.stable_stop_key = $2
        and trip_revisions.status = 'current'
      limit 1
    `,
    [tripId, stableStopKey],
  );
  return rows[0] ?? null;
}

async function getCandidateDayForDayNumber(
  client: PoolClient,
  tripId: string,
  revisionId: string,
  dayNumber: number,
) {
  const { rows } = await client.query<{ id: string }>(
    `
      select id
      from trip_days
      where trip_id = $1
        and revision_id = $2
        and day_number = $3
      limit 1
    `,
    [tripId, revisionId, dayNumber],
  );
  return rows[0]?.id ?? null;
}
