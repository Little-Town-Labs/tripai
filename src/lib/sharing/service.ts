import type { Pool, PoolClient } from "pg";

import { setAppRole, setOwnerContext, setShareTokenContext } from "@/lib/access/context";
import { createShareToken, hashShareToken } from "@/lib/access/share-token";
import {
  listScrapbookForTrip,
  type ScrapbookSummary,
} from "@/lib/scrapbook/service";
import {
  buildNavigationLinks,
  getOfficialParkUrl,
  type NavigationLinks,
} from "@/lib/trip-detail/navigation";
import {
  validateCreateShareLinkInput,
  validateSharedNoteInput,
  validateSharedRatingInput,
  type ShareLinkFieldErrors,
  type SharedNoteFieldErrors,
  type SharedRatingFieldErrors,
} from "./validation";

export type CreateShareLinkInput = {
  tripId: string;
  label?: unknown;
  appBaseUrl?: string;
};

export type CreatedShareLink = {
  id: string;
  tripId: string;
  label: string | null;
  token: string;
  url: string;
  createdAt: Date;
};

export type CreateShareLinkResult =
  | { ok: true; link: CreatedShareLink }
  | { ok: false; reason: "invalid"; fieldErrors: ShareLinkFieldErrors }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type ShareLinkSummary = {
  id: string;
  tripId: string;
  label: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
};

export type ListShareLinksResult =
  | { ok: true; links: ShareLinkSummary[] }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type RevokeShareLinkResult =
  | { ok: true; shareLinkId: string }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type SharedTripResult =
  | { ok: true; detail: SharedTripDetail }
  | { ok: false; reason: "not_found" };

export type SharedTripDetail = {
  trip: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
  };
  selectedRevision: SharedTripRevision | null;
  days: SharedTripDay[];
  activeDayId: string | null;
  currentStopId: string | null;
  nextStopId: string | null;
  status: "ready" | "not_ready";
  scrapbook: ScrapbookSummary;
};

export type SharedTripRevision = {
  id: string;
  revisionNumber: number;
  kind: string;
  status: string;
  summary: string | null;
  committedAt: Date | null;
};

export type SharedTripDay = {
  id: string;
  dayNumber: number;
  date: string;
  label: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalMiles: number | null;
  driveTimeMinutes: number | null;
  aiSummary: string | null;
  isActive: boolean;
  stops: SharedTripStop[];
};

export type SharedTripStop = {
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
  googleRating: number | null;
  hoursSummary: string | null;
  phone: string | null;
  website: string | null;
  checked: boolean;
  isCurrent: boolean;
  isNext: boolean;
  nextStopName: string | null;
  navigation: NavigationLinks;
  officialParkUrl: string | null;
};

export type CreateSharedNoteInput = {
  token: string;
  tripId: string;
  dayId?: string | null;
  stopId?: string | null;
  displayName: unknown;
  content: unknown;
};

export type CreateSharedNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; reason: "invalid"; fieldErrors: SharedNoteFieldErrors }
  | { ok: false; reason: "not_found" };

export type CreateSharedRatingInput = {
  token: string;
  tripId: string;
  stopId: string;
  displayName: unknown;
  stars: unknown;
  text?: unknown;
};

export type CreateSharedRatingResult =
  | { ok: true; ratingId: string }
  | { ok: false; reason: "invalid"; fieldErrors: SharedRatingFieldErrors }
  | { ok: false; reason: "not_found" };

export type RemoveContributionInput = {
  tripId: string;
  contributionType: "note" | "rating";
  contributionId: string;
};

export type RemoveContributionResult =
  | { ok: true; contributionId: string }
  | { ok: false; reason: "not_found" | "not_purchased" };

type TripRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  currentRevisionId: string | null;
  purchasedAt: Date | null;
};

type DayRow = Omit<SharedTripDay, "isActive" | "stops">;

type StopRow = Omit<
  SharedTripStop,
  "isCurrent" | "isNext" | "nextStopName" | "navigation" | "officialParkUrl"
> & {
  dayId: string;
};

export async function createShareLink(
  pool: Pool,
  ownerId: string,
  input: CreateShareLinkInput,
): Promise<CreateShareLinkResult> {
  const parsed = validateCreateShareLinkInput(input);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getOwnerPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const token = createShareToken();
    const { rows } = await client.query<{
      id: string;
      tripId: string;
      label: string | null;
      createdAt: Date;
    }>(
      `
        insert into share_links (trip_id, token_hash, label, created_by_owner_id)
        values ($1, $2, $3, $4)
        returning id, trip_id as "tripId", label, created_at as "createdAt"
      `,
      [input.tripId, hashShareToken(token), parsed.value.label, ownerId],
    );

    await client.query("commit");

    return {
      ok: true,
      link: {
        ...rows[0],
        token,
        url: shareUrl(input.appBaseUrl, token),
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listShareLinks(
  pool: Pool,
  ownerId: string,
  input: { tripId: string },
): Promise<ListShareLinksResult> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getOwnerPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const { rows } = await client.query<ShareLinkSummary>(
      `
        select
          id,
          trip_id as "tripId",
          label,
          created_at as "createdAt",
          revoked_at as "revokedAt",
          last_used_at as "lastUsedAt"
        from share_links
        where trip_id = $1
        order by created_at desc, id desc
      `,
      [input.tripId],
    );

    await client.query("commit");
    return { ok: true, links: rows };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeShareLink(
  pool: Pool,
  ownerId: string,
  input: { tripId: string; shareLinkId: string },
): Promise<RevokeShareLinkResult> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getOwnerPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const { rows } = await client.query<{ id: string }>(
      `
        update share_links
        set revoked_at = coalesce(revoked_at, now()),
            updated_at = now()
        where id = $1
          and trip_id = $2
        returning id
      `,
      [input.shareLinkId, input.tripId],
    );

    await client.query("commit");
    return rows[0]
      ? { ok: true, shareLinkId: rows[0].id }
      : { ok: false, reason: "not_found" };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSharedTrip(
  pool: Pool,
  input: { token: string; today?: Date },
): Promise<SharedTripResult> {
  if (!input.token.trim()) {
    return { ok: false, reason: "not_found" };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await touchShareLink(client, input.token);
    await setShareTokenContext(client, input.token);
    await setAppRole(client);

    const trip = await getSingleVisibleTrip(client);
    if (!trip || !isPurchasedTrip(trip)) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }

    const selectedRevision = trip.currentRevisionId
      ? await getCurrentRevision(client, trip.id, trip.currentRevisionId)
      : null;
    const rawDays = selectedRevision
      ? await listDaysWithStops(client, trip.id, selectedRevision.id)
      : [];
    const shaped = shapeDays(rawDays, input.today ?? new Date());
    const scrapbook = await listScrapbookForTrip(client, trip.id);

    await client.query("commit");
    return {
      ok: true,
      detail: {
        trip: {
          id: trip.id,
          title: trip.title,
          summary: trip.summary,
          status: trip.status,
        },
        selectedRevision,
        days: shaped.days,
        activeDayId: shaped.activeDayId,
        currentStopId: shaped.currentStopId,
        nextStopId: shaped.nextStopId,
        status: selectedRevision && shaped.days.length > 0 ? "ready" : "not_ready",
        scrapbook,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSharedNote(
  pool: Pool,
  input: CreateSharedNoteInput,
): Promise<CreateSharedNoteResult> {
  const parsed = validateSharedNoteInput(input);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setShareTokenContext(client, input.token);
    await setAppRole(client);

    const trip = await getVisibleTripById(client, input.tripId);
    if (!trip || !isPurchasedTrip(trip)) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
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

    const shareLinkId = await getCurrentShareLinkId(client, input.tripId);
    if (!shareLinkId) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }

    const { rows } = await client.query<{ id: string }>(
      `
        insert into notes (
          trip_id,
          day_id,
          stop_id,
          author_share_link_id,
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
        shareLinkId,
        parsed.value.displayName,
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

export async function createSharedRating(
  pool: Pool,
  input: CreateSharedRatingInput,
): Promise<CreateSharedRatingResult> {
  const parsed = validateSharedRatingInput(input);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await setShareTokenContext(client, input.token);
    await setAppRole(client);

    const trip = await getVisibleTripById(client, input.tripId);
    if (!trip || !isPurchasedTrip(trip)) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
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

    const shareLinkId = await getCurrentShareLinkId(client, input.tripId);
    if (!shareLinkId) {
      await client.query("commit");
      return { ok: false, reason: "not_found" };
    }

    const { rows } = await client.query<{ id: string }>(
      `
        insert into ratings (
          trip_id,
          stop_id,
          author_share_link_id,
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
        shareLinkId,
        parsed.value.displayName,
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

export async function removeContribution(
  pool: Pool,
  ownerId: string,
  input: RemoveContributionInput,
): Promise<RemoveContributionResult> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const tripResult = await getOwnerPurchasedTrip(client, input.tripId);
    if (!tripResult.ok) {
      await client.query("commit");
      return tripResult;
    }

    const table = input.contributionType === "note" ? "notes" : "ratings";
    const { rows } = await client.query<{ id: string }>(
      `
        update ${table}
        set deleted_at = coalesce(deleted_at, now()),
            updated_at = now()
        where id = $1
          and trip_id = $2
          and author_share_link_id is not null
        returning id
      `,
      [input.contributionId, input.tripId],
    );

    await client.query("commit");
    return rows[0]
      ? { ok: true, contributionId: rows[0].id }
      : { ok: false, reason: "not_found" };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getOwnerPurchasedTrip(client: PoolClient, tripId: string):
  Promise<{ ok: true; trip: TripRow } | { ok: false; reason: "not_found" | "not_purchased" }> {
  const trip = await getVisibleTripById(client, tripId);
  if (!trip) {
    return { ok: false, reason: "not_found" };
  }
  if (!isPurchasedTrip(trip)) {
    return { ok: false, reason: "not_purchased" };
  }
  return { ok: true, trip };
}

async function getVisibleTripById(client: PoolClient, tripId: string) {
  const { rows } = await client.query<TripRow>(
    `
      select
        id,
        title,
        summary,
        status,
        current_revision_id as "currentRevisionId",
        purchased_at as "purchasedAt"
      from trips
      where id = $1
        and deleted_at is null
      limit 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

async function getSingleVisibleTrip(client: PoolClient) {
  const { rows } = await client.query<TripRow>(
    `
      select
        id,
        title,
        summary,
        status,
        current_revision_id as "currentRevisionId",
        purchased_at as "purchasedAt"
      from trips
      where deleted_at is null
      order by created_at desc, id desc
      limit 1
    `,
  );

  return rows[0] ?? null;
}

async function touchShareLink(client: PoolClient, token: string) {
  await client.query(
    `
      update share_links
      set last_used_at = now(),
          updated_at = now()
      where token_hash = $1
        and revoked_at is null
    `,
    [hashShareToken(token)],
  );
}

async function getCurrentShareLinkId(client: PoolClient, tripId: string) {
  const { rows } = await client.query<{ id: string }>(
    `select tripai.current_share_link_id($1) as id`,
    [tripId],
  );
  return rows[0]?.id ?? null;
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

async function getCurrentRevision(
  client: PoolClient,
  tripId: string,
  revisionId: string,
) {
  const { rows } = await client.query<SharedTripRevision>(
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
        and id = $2
        and status = 'current'
      limit 1
    `,
    [tripId, revisionId],
  );

  return rows[0] ?? null;
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

  const stopsByDay = new Map<string, StopRow[]>();
  for (const stop of stops) {
    const dayStops = stopsByDay.get(stop.dayId) ?? [];
    dayStops.push(stop);
    stopsByDay.set(stop.dayId, dayStops);
  }

  return days.map((day) => ({
    ...day,
    stops: stopsByDay.get(day.id) ?? [],
  }));
}

function shapeDays(
  rawDays: Array<DayRow & { stops: StopRow[] }>,
  today: Date,
) {
  if (rawDays.length === 0) {
    return {
      days: [],
      activeDayId: null,
      currentStopId: null,
      nextStopId: null,
    };
  }

  const activeDay = chooseActiveDay(rawDays, today);
  let currentStopId: string | null = null;
  let nextStopId: string | null = null;

  const days = rawDays.map((day) => {
    const isActive = day.id === activeDay.id;
    const currentIndex = isActive ? findCurrentStopIndex(day.stops) : -1;
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : -1;

    if (isActive && currentIndex >= 0) {
      currentStopId = day.stops[currentIndex].id;
      nextStopId = day.stops[nextIndex]?.id ?? null;
    }

    return {
      ...day,
      isActive,
      stops: day.stops.map((row, index) => {
        const { dayId, ...stop } = row;
        void dayId;
        return {
          ...stop,
          isCurrent: isActive && index === currentIndex,
          isNext: isActive && index === nextIndex,
          nextStopName: day.stops[index + 1]?.name ?? null,
          navigation: buildNavigationLinks(stop),
          officialParkUrl: getOfficialParkUrl(stop),
        };
      }),
    };
  });

  return {
    days,
    activeDayId: activeDay.id,
    currentStopId,
    nextStopId,
  };
}

function chooseActiveDay<T extends Pick<SharedTripDay, "date">>(days: T[], today: Date) {
  const todayKey = today.toISOString().slice(0, 10);
  const firstFutureOrToday = days.find((day) => day.date >= todayKey);
  return firstFutureOrToday ?? days[days.length - 1];
}

function findCurrentStopIndex(stops: Array<Pick<SharedTripStop, "checked">>) {
  if (stops.length === 0) {
    return -1;
  }

  const uncheckedIndex = stops.findIndex((stop) => !stop.checked);
  return uncheckedIndex === -1 ? stops.length - 1 : uncheckedIndex;
}

function isPurchasedTrip(trip: TripRow): trip is TripRow & { purchasedAt: Date } {
  return (
    trip.purchasedAt !== null &&
    (trip.status === "purchased" || trip.status === "active" || trip.status === "completed")
  );
}

function shareUrl(appBaseUrl: string | undefined, token: string) {
  const path = `/share/${token}`;
  if (!appBaseUrl) {
    return path;
  }
  return `${appBaseUrl.replace(/\/$/, "")}${path}`;
}
