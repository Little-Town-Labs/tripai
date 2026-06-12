import { access, writeFile } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OpsFailureReason =
  | "invalid_input"
  | "output_exists"
  | "not_found"
  | "write_failed"
  | "confirmation_required"
  | "delete_failed";

export type OpsFailure = {
  ok: false;
  reason: OpsFailureReason;
  message: string;
};

export type ExportTripRequest = {
  ownerId: string;
  tripId: string;
  outputPath: string;
  overwrite?: boolean;
};

export type DeleteTripRequest = {
  ownerId: string;
  tripId: string;
  confirmTripId: string;
};

export type ExportTripResult =
  | { ok: true; outputPath: string; counts: Record<string, number> }
  | OpsFailure;

export type DeleteTripResult =
  | { ok: true; deletedTripId: string; counts: Record<string, number> }
  | OpsFailure;

export type ParsedTripDataOpsArgs =
  | ({
      ok: true;
      command: "export";
      databaseUrl: string;
      ownerId: string;
      tripId: string;
      outputPath: string;
      overwrite: boolean;
    })
  | ({
      ok: true;
      command: "delete";
      databaseUrl: string;
      ownerId: string;
      tripId: string;
      confirmTripId: string;
    })
  | OpsFailure;

type VerifiedTrip = {
  id: string;
  ownerId: string;
  intakeId: string | null;
};

export function validateExportTripRequest(input: ExportTripRequest): { ok: true } | OpsFailure {
  const ownerError = validateUuid("ownerId", input.ownerId);
  if (ownerError) return ownerError;
  const tripError = validateUuid("tripId", input.tripId);
  if (tripError) return tripError;
  if (!input.outputPath.trim()) {
    return { ok: false, reason: "invalid_input", message: "outputPath is required." };
  }
  return { ok: true };
}

export function validateDeleteTripRequest(input: DeleteTripRequest): { ok: true } | OpsFailure {
  const ownerError = validateUuid("ownerId", input.ownerId);
  if (ownerError) return ownerError;
  const tripError = validateUuid("tripId", input.tripId);
  if (tripError) return tripError;
  if (input.confirmTripId !== input.tripId) {
    return {
      ok: false,
      reason: "confirmation_required",
      message: "Deletion requires --confirm to match the trip id.",
    };
  }
  return { ok: true };
}

export async function exportTripData(
  pool: Pool,
  input: ExportTripRequest,
): Promise<ExportTripResult> {
  const valid = validateExportTripRequest(input);
  if (!valid.ok) return valid;

  if (!input.overwrite && await pathExists(input.outputPath)) {
    return {
      ok: false,
      reason: "output_exists",
      message: "Output path already exists. Pass overwrite to replace it.",
    };
  }

  const client = await pool.connect();
  try {
    const trip = await getVerifiedTrip(client, input.ownerId, input.tripId);
    if (!trip) {
      return {
        ok: false,
        reason: "not_found",
        message: "Trip was not found for the supplied owner.",
      };
    }

    const archive = await buildTripArchive(client, input.ownerId, trip);
    const contents = `${JSON.stringify(archive, null, 2)}\n`;
    await writeFile(input.outputPath, contents, {
      encoding: "utf8",
      flag: input.overwrite ? "w" : "wx",
    });

    return {
      ok: true,
      outputPath: input.outputPath,
      counts: archiveCounts(archive),
    };
  } catch (error) {
    if (isFileExistsError(error)) {
      return {
        ok: false,
        reason: "output_exists",
        message: "Output path already exists. Pass overwrite to replace it.",
      };
    }
    if (isWriteError(error)) {
      return {
        ok: false,
        reason: "write_failed",
        message: "Archive could not be written.",
      };
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTripData(
  pool: Pool,
  input: DeleteTripRequest,
): Promise<DeleteTripResult> {
  const valid = validateDeleteTripRequest(input);
  if (!valid.ok) return valid;

  const client = await pool.connect();
  try {
    await client.query("begin");
    const trip = await getVerifiedTrip(client, input.ownerId, input.tripId);
    if (!trip) {
      await client.query("commit");
      return {
        ok: false,
        reason: "not_found",
        message: "Trip was not found for the supplied owner.",
      };
    }

    const counts = await countTripGraph(client, input.tripId);
    await client.query(
      "update trips set current_revision_id = null where id = $1",
      [input.tripId],
    );
    await client.query("delete from trips where id = $1 and owner_id = $2", [
      input.tripId,
      input.ownerId,
    ]);

    if (trip.intakeId) {
      await client.query(
        `
          delete from trip_intakes
          where id = $1
            and owner_id = $2
            and not exists (
              select 1 from trips where intake_id = $1
            )
        `,
        [trip.intakeId, input.ownerId],
      );
    }

    await client.query("commit");
    return {
      ok: true,
      deletedTripId: input.tripId,
      counts,
    };
  } catch {
    await client.query("rollback");
    return {
      ok: false,
      reason: "delete_failed",
      message: "Deletion transaction failed.",
    };
  } finally {
    client.release();
  }
}

export function parseTripDataOpsArgs(args: string[]): ParsedTripDataOpsArgs {
  const [command, ...rest] = args;
  if (command !== "export" && command !== "delete") {
    return {
      ok: false,
      reason: "invalid_input",
      message: "First argument must be export or delete.",
    };
  }

  const options = parseOptions(rest);
  const databaseUrl = options.get("database-url");
  const ownerId = options.get("owner-id");
  const tripId = options.get("trip-id");

  const required = [
    ["database-url", databaseUrl],
    ["owner-id", ownerId],
    ["trip-id", tripId],
  ] as const;
  for (const [name, value] of required) {
    if (!value) {
      return missingOption(name);
    }
  }

  if (command === "export") {
    const outputPath = options.get("output");
    if (!outputPath) {
      return missingOption("output");
    }
    return {
      ok: true,
      command,
      databaseUrl: databaseUrl as string,
      ownerId: ownerId as string,
      tripId: tripId as string,
      outputPath,
      overwrite: options.has("overwrite"),
    };
  }

  const confirmTripId = options.get("confirm");
  if (!confirmTripId) {
    return missingOption("confirm");
  }
  return {
    ok: true,
    command,
    databaseUrl: databaseUrl as string,
    ownerId: ownerId as string,
    tripId: tripId as string,
    confirmTripId,
  };
}

async function buildTripArchive(
  client: PoolClient,
  ownerId: string,
  trip: VerifiedTrip,
) {
  const owner = await one(client, `
      select id, email, display_name as "displayName", created_at as "createdAt", updated_at as "updatedAt"
      from owners
      where id = $1
    `, [ownerId]);
  const tripRows = await one(client, `
      select
        id,
        owner_id as "ownerId",
        intake_id as "intakeId",
        current_revision_id as "currentRevisionId",
        title,
        summary,
        status,
        stripe_session_id as "stripeSessionId",
        price_cents as "priceCents",
        planning_revisions_used as "planningRevisionsUsed",
        mid_trip_revisions_used as "midTripRevisionsUsed",
        purchased_at as "purchasedAt",
        deleted_at as "deletedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from trips
      where id = $1
    `, [trip.id]);
  const intake = trip.intakeId
      ? await one(client, `
          select
            id,
            owner_id as "ownerId",
            origin_address as "originAddress",
            destination_area as "destinationArea",
            start_date::text as "startDate",
            end_date::text as "endDate",
            party_adults as "partyAdults",
            party_children as "partyChildren",
            children_ages as "childrenAges",
            interests,
            budget_level as "budgetLevel",
            dietary_needs as "dietaryNeeds",
            mobility_notes as "mobilityNotes",
            travel_style as "travelStyle",
            created_at as "createdAt",
            updated_at as "updatedAt"
          from trip_intakes
          where id = $1
        `, [trip.intakeId])
      : null;
  const revisions = await many(client, `
      select
        id,
        trip_id as "tripId",
        revision_number as "revisionNumber",
        kind,
        parent_revision_id as "parentRevisionId",
        status,
        summary,
        created_at as "createdAt",
        committed_at as "committedAt"
      from trip_revisions
      where trip_id = $1
      order by revision_number asc, id asc
    `, [trip.id]);
  const days = await many(client, `
      select
        id,
        trip_id as "tripId",
        revision_id as "revisionId",
        day_number as "dayNumber",
        date::text,
        label,
        from_location as "fromLocation",
        to_location as "toLocation",
        total_miles as "totalMiles",
        drive_time_minutes as "driveTimeMinutes",
        ai_summary as "aiSummary",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from trip_days
      where trip_id = $1
      order by date asc, day_number asc, id asc
    `, [trip.id]);
  const stops = await many(client, `
      select
        id,
        trip_id as "tripId",
        day_id as "dayId",
        revision_id as "revisionId",
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
        checked,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from stops
      where trip_id = $1
      order by revision_id asc, day_id asc, order_index asc, id asc
    `, [trip.id]);
  const shareLinks = await many(client, `
      select
        id,
        trip_id as "tripId",
        label,
        created_by_owner_id as "createdByOwnerId",
        revoked_at as "revokedAt",
        last_used_at as "lastUsedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from share_links
      where trip_id = $1
      order by created_at asc, id asc
    `, [trip.id]);
  const notes = await many(client, `
      select
        id,
        trip_id as "tripId",
        day_id as "dayId",
        stop_id as "stopId",
        author_owner_id as "authorOwnerId",
        author_share_link_id as "authorShareLinkId",
        author_display_name as "authorDisplayName",
        content,
        deleted_at as "deletedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from notes
      where trip_id = $1
      order by created_at asc, id asc
    `, [trip.id]);
  const ratings = await many(client, `
      select
        id,
        trip_id as "tripId",
        stop_id as "stopId",
        author_owner_id as "authorOwnerId",
        author_share_link_id as "authorShareLinkId",
        author_display_name as "authorDisplayName",
        stars,
        text,
        tags,
        deleted_at as "deletedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from ratings
      where trip_id = $1
      order by created_at asc, id asc
    `, [trip.id]);
  const photoMetadata = await many(client, `
      select
        id,
        trip_id as "tripId",
        day_id as "dayId",
        stop_id as "stopId",
        author_owner_id as "authorOwnerId",
        author_share_link_id as "authorShareLinkId",
        author_display_name as "authorDisplayName",
        storage_key as "storageKey",
        caption,
        status,
        deleted_at as "deletedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from photo_metadata
      where trip_id = $1
      order by created_at asc, id asc
    `, [trip.id]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    owner,
    trip: tripRows,
    intake,
    revisions,
    days,
    stops,
    shareLinks,
    notes,
    ratings,
    photoMetadata,
  };
}

async function getVerifiedTrip(
  client: PoolClient,
  ownerId: string,
  tripId: string,
): Promise<VerifiedTrip | null> {
  const { rows } = await client.query<VerifiedTrip>(
    `
      select id, owner_id as "ownerId", intake_id as "intakeId"
      from trips
      where id = $1
        and owner_id = $2
      limit 1
    `,
    [tripId, ownerId],
  );
  return rows[0] ?? null;
}

async function countTripGraph(client: PoolClient, tripId: string) {
  const trips = await countBy(client, "trips", "id", tripId);
  const revisions = await countBy(client, "trip_revisions", "trip_id", tripId);
  const days = await countBy(client, "trip_days", "trip_id", tripId);
  const stops = await countBy(client, "stops", "trip_id", tripId);
  const notes = await countBy(client, "notes", "trip_id", tripId);
  const ratings = await countBy(client, "ratings", "trip_id", tripId);
  const photoMetadata = await countBy(client, "photo_metadata", "trip_id", tripId);
  const shareLinks = await countBy(client, "share_links", "trip_id", tripId);
  return {
    trips,
    revisions,
    days,
    stops,
    notes,
    ratings,
    photoMetadata,
    shareLinks,
  };
}

async function one<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<T | null> {
  const { rows } = await client.query<T>(sql, values);
  return rows[0] ?? null;
}

async function many<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<T[]> {
  const { rows } = await client.query<T>(sql, values);
  return rows;
}

async function countBy(
  client: PoolClient,
  table: string,
  column: string,
  value: string,
) {
  const allowed = new Set([
    "trips:id",
    "trip_revisions:trip_id",
    "trip_days:trip_id",
    "stops:trip_id",
    "notes:trip_id",
    "ratings:trip_id",
    "photo_metadata:trip_id",
    "share_links:trip_id",
  ]);
  if (!allowed.has(`${table}:${column}`)) {
    throw new Error("Unsupported count target.");
  }
  const { rows } = await client.query<{ count: string }>(
    `select count(*) from ${table} where ${column} = $1`,
    [value],
  );
  return Number(rows[0].count);
}

function archiveCounts(archive: Awaited<ReturnType<typeof buildTripArchive>>) {
  return {
    trips: archive.trip ? 1 : 0,
    revisions: archive.revisions.length,
    days: archive.days.length,
    stops: archive.stops.length,
    shareLinks: archive.shareLinks.length,
    notes: archive.notes.length,
    ratings: archive.ratings.length,
    photoMetadata: archive.photoMetadata.length,
  };
}

function validateUuid(field: string, value: string) {
  if (!UUID_PATTERN.test(value)) {
    return {
      ok: false as const,
      reason: "invalid_input" as const,
      message: `${field} must be a UUID.`,
    };
  }
  return null;
}

function parseOptions(args: string[]) {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const name = token.slice(2);
    if (name === "overwrite") {
      options.set(name, "true");
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }
    options.set(name, value);
    index += 1;
  }
  return options;
}

function missingOption(name: string): OpsFailure {
  return {
    ok: false,
    reason: "invalid_input",
    message: `Missing required option: --${name}.`,
  };
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isFileExistsError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST");
}

function isWriteError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error);
}
