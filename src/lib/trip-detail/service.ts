import type { Pool, PoolClient } from "pg";

import { setAppRole, setOwnerContext } from "@/lib/access/context";

import {
  buildNavigationLinks,
  getOfficialParkUrl,
  type NavigationLinks,
} from "./navigation";

export type GetTripDetailInput = {
  tripId: string;
  today?: Date;
};

export type TripDetailResult =
  | { ok: true; detail: TripDetail }
  | { ok: false; reason: "not_found" | "not_purchased" };

export type TripDetail = {
  trip: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    purchasedAt: Date;
  };
  selectedRevision: TripDetailRevision | null;
  days: TripDetailDay[];
  activeDayId: string | null;
  currentStopId: string | null;
  nextStopId: string | null;
  status: "ready" | "not_ready";
};

export type TripDetailRevision = {
  id: string;
  revisionNumber: number;
  kind: string;
  status: string;
  summary: string | null;
  committedAt: Date | null;
};

export type TripDetailDay = {
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
  stops: TripDetailStop[];
};

export type TripDetailStop = {
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
  checked: boolean;
  isCurrent: boolean;
  isNext: boolean;
  nextStopName: string | null;
  navigation: NavigationLinks;
  officialParkUrl: string | null;
};

type TripRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  currentRevisionId: string | null;
  purchasedAt: Date | null;
};

type DayRow = Omit<TripDetailDay, "isActive" | "stops">;

type StopRow = Omit<
  TripDetailStop,
  "isCurrent" | "isNext" | "nextStopName" | "navigation" | "officialParkUrl"
> & {
  dayId: string;
};

export async function getTripDetail(
  pool: Pool,
  ownerId: string,
  input: GetTripDetailInput,
): Promise<TripDetailResult> {
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

    if (!isPurchasedTrip(trip)) {
      await client.query("commit");
      return { ok: false, reason: "not_purchased" };
    }

    const selectedRevision = trip.currentRevisionId
      ? await getCurrentRevision(client, trip.id, trip.currentRevisionId)
      : null;
    const rawDays = selectedRevision
      ? await listDaysWithStops(client, trip.id, selectedRevision.id)
      : [];
    const shaped = shapeDays(rawDays, input.today ?? new Date());

    await client.query("commit");

    return {
      ok: true,
      detail: {
        trip: {
          id: trip.id,
          title: trip.title,
          summary: trip.summary,
          status: trip.status,
          purchasedAt: trip.purchasedAt,
        },
        selectedRevision,
        days: shaped.days,
        activeDayId: shaped.activeDayId,
        currentStopId: shaped.currentStopId,
        nextStopId: shaped.nextStopId,
        status: selectedRevision && shaped.days.length > 0 ? "ready" : "not_ready",
      },
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

function isPurchasedTrip(trip: TripRow): trip is TripRow & { purchasedAt: Date } {
  return (
    trip.purchasedAt !== null &&
    (trip.status === "purchased" || trip.status === "active" || trip.status === "completed")
  );
}

async function getCurrentRevision(
  client: PoolClient,
  tripId: string,
  revisionId: string,
) {
  const { rows } = await client.query<TripDetailRevision>(
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

function chooseActiveDay<T extends Pick<TripDetailDay, "date">>(days: T[], today: Date) {
  const todayKey = toDateKey(today);
  const firstFutureOrToday = days.find((day) => day.date >= todayKey);
  return firstFutureOrToday ?? days[days.length - 1];
}

function findCurrentStopIndex(stops: Array<Pick<TripDetailStop, "checked">>) {
  if (stops.length === 0) {
    return -1;
  }

  const uncheckedIndex = stops.findIndex((stop) => !stop.checked);
  return uncheckedIndex === -1 ? stops.length - 1 : uncheckedIndex;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
