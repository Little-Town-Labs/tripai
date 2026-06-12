import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { after, before, beforeEach, test } from "node:test";
import type { Pool } from "pg";

import {
  deleteTripData,
  exportTripData,
  parseTripDataOpsArgs,
  validateDeleteTripRequest,
  validateExportTripRequest,
} from "@/lib/ops/trip-data";
import { getSharedTrip } from "@/lib/sharing/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  activeShareLinkId,
  activeShareToken,
  dayAId,
  ownerAId,
  ownerBId,
  seedOwnerPrivacyScenario,
  stopAId,
  tripAId,
  tripBId,
} from "../db/helpers/seed";

let pool: Pool;
let tempRoot: string;

before(async () => {
  pool = createTestPool();
  tempRoot = await mkdtemp(join(tmpdir(), "tripai-ops-"));
});

beforeEach(async () => {
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await addExportFixtureRows();
});

after(async () => {
  await pool.end();
  await rm(tempRoot, { recursive: true, force: true });
});

test("foundational validation rejects malformed or incomplete requests", () => {
  assert.deepEqual(validateExportTripRequest({
    ownerId: "not-a-uuid",
    tripId: tripAId,
    outputPath: "archive.json",
  }), {
    ok: false,
    reason: "invalid_input",
    message: "ownerId must be a UUID.",
  });

  assert.deepEqual(validateDeleteTripRequest({
    ownerId: ownerAId,
    tripId: tripAId,
    confirmTripId: tripBId,
  }), {
    ok: false,
    reason: "confirmation_required",
    message: "Deletion requires --confirm to match the trip id.",
  });
});

test("US1 exports one owner-verified trip without secrets or unrelated rows", async () => {
  const outputPath = join(tempRoot, "trip-a-export.json");
  const result = await exportTripData(pool, {
    ownerId: ownerAId,
    tripId: tripAId,
    outputPath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.outputPath, outputPath);
  assert.equal(result.counts.trips, 1);
  assert.equal(result.counts.shareLinks, 2);

  const raw = await readFile(outputPath, "utf8");
  const archive = JSON.parse(raw);

  assert.equal(archive.schemaVersion, 1);
  assert.equal(archive.trip.id, tripAId);
  assert.equal(archive.owner.id, ownerAId);
  assert.equal(archive.intake.id, "11000000-0000-4000-8000-0000000000a1");
  assert.deepEqual(archive.revisions.map((row: { id: string }) => row.id).sort(), [
    "12000000-0000-4000-8000-0000000000a1",
    "12000000-0000-4000-8000-0000000000a2",
  ]);
  assert.ok(archive.days.some((row: { id: string }) => row.id === dayAId));
  assert.ok(archive.stops.some((row: { id: string }) => row.id === stopAId));
  assert.ok(archive.notes.some((row: { authorShareLinkId: string | null }) => row.authorShareLinkId === activeShareLinkId));
  assert.ok(archive.ratings.some((row: { authorShareLinkId: string | null }) => row.authorShareLinkId === activeShareLinkId));
  assert.ok(archive.photoMetadata.some((row: { storageKey: string | null }) => row.storageKey === "photos/seed-a.jpg"));
  assert.ok(archive.shareLinks.every((row: Record<string, unknown>) => !("tokenHash" in row)));
  assert.ok(!raw.includes(activeShareToken));
  assert.ok(!raw.includes(tripBId));
  assert.ok(!raw.includes("postgres://"));
});

test("US1 refuses ownership mismatch and existing output without overwrite", async () => {
  const outputPath = join(tempRoot, "existing-export.json");
  await writeFile(outputPath, "already here", "utf8");

  assert.deepEqual(await exportTripData(pool, {
    ownerId: ownerBId,
    tripId: tripAId,
    outputPath: join(tempRoot, "wrong-owner.json"),
  }), {
    ok: false,
    reason: "not_found",
    message: "Trip was not found for the supplied owner.",
  });

  assert.deepEqual(await exportTripData(pool, {
    ownerId: ownerAId,
    tripId: tripAId,
    outputPath,
  }), {
    ok: false,
    reason: "output_exists",
    message: "Output path already exists. Pass overwrite to replace it.",
  });
});

test("US2 refuses deletion without matching confirmation and preserves rows", async () => {
  const result = await deleteTripData(pool, {
    ownerId: ownerAId,
    tripId: tripAId,
    confirmTripId: "",
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "confirmation_required",
    message: "Deletion requires --confirm to match the trip id.",
  });
  assert.equal(await countRows("trips", tripAId), 1);
  assert.equal(await countRows("share_links", tripAId), 2);
});

test("US2 deletes target trip graph and leaves unrelated data intact", async () => {
  const result = await deleteTripData(pool, {
    ownerId: ownerAId,
    tripId: tripAId,
    confirmTripId: tripAId,
  });

  assert.equal(result.ok, true);
  assert.equal(result.deletedTripId, tripAId);
  assert.equal(result.counts.trips, 1);
  assert.equal(await countRows("trips", tripAId), 0);
  assert.equal(await countRows("trip_revisions", tripAId), 0);
  assert.equal(await countRows("trip_days", tripAId), 0);
  assert.equal(await countRows("stops", tripAId), 0);
  assert.equal(await countRows("notes", tripAId), 0);
  assert.equal(await countRows("ratings", tripAId), 0);
  assert.equal(await countRows("photo_metadata", tripAId), 0);
  assert.equal(await countRows("share_links", tripAId), 0);
  assert.equal(await countRows("trips", tripBId), 1);

  const shared = await getSharedTrip(pool, { token: activeShareToken });
  assert.deepEqual(shared, { ok: false, reason: "not_found" });
});

test("US2 refuses deletion for another owner and keeps target data", async () => {
  const result = await deleteTripData(pool, {
    ownerId: ownerBId,
    tripId: tripAId,
    confirmTripId: tripAId,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "not_found",
    message: "Trip was not found for the supplied owner.",
  });
  assert.equal(await countRows("trips", tripAId), 1);
});

test("US3 parses CLI arguments for export and delete", () => {
  assert.deepEqual(parseTripDataOpsArgs([
    "export",
    "--database-url",
    "postgres://example",
    "--owner-id",
    ownerAId,
    "--trip-id",
    tripAId,
    "--output",
    "/tmp/archive.json",
    "--overwrite",
  ]), {
    ok: true,
    command: "export",
    databaseUrl: "postgres://example",
    ownerId: ownerAId,
    tripId: tripAId,
    outputPath: "/tmp/archive.json",
    overwrite: true,
  });

  assert.deepEqual(parseTripDataOpsArgs([
    "delete",
    "--database-url",
    "postgres://example",
    "--owner-id",
    ownerAId,
    "--trip-id",
    tripAId,
    "--confirm",
    tripAId,
  ]), {
    ok: true,
    command: "delete",
    databaseUrl: "postgres://example",
    ownerId: ownerAId,
    tripId: tripAId,
    confirmTripId: tripAId,
  });
});

test("US3 rejects CLI arguments without printing secret values", () => {
  assert.deepEqual(parseTripDataOpsArgs([
    "export",
    "--database-url",
    "postgres://secret",
    "--owner-id",
    ownerAId,
    "--trip-id",
    tripAId,
  ]), {
    ok: false,
    reason: "invalid_input",
    message: "Missing required option: --output.",
  });
});

async function addExportFixtureRows() {
  await pool.query(
    `
      update trips
      set purchased_at = now(),
          status = 'purchased'
      where id = $1
    `,
    [tripAId],
  );
  await pool.query(
    `
      insert into notes (trip_id, day_id, author_share_link_id, author_display_name, content)
      values ($1, $2, $3, 'Grandma', 'Shared day note')
    `,
    [tripAId, dayAId, activeShareLinkId],
  );
  await pool.query(
    `
      insert into ratings (trip_id, stop_id, author_share_link_id, author_display_name, stars, text)
      values ($1, $2, $3, 'Grandma', 4, 'Shared rating')
    `,
    [tripAId, stopAId, activeShareLinkId],
  );
  await pool.query(
    `
      update photo_metadata
      set storage_key = 'photos/seed-a.jpg',
          status = 'uploaded'
      where trip_id = $1
    `,
    [tripAId],
  );
}

async function countRows(tableName: string, tripId: string) {
  const allowed = new Set([
    "trips",
    "trip_revisions",
    "trip_days",
    "stops",
    "notes",
    "ratings",
    "photo_metadata",
    "share_links",
  ]);
  assert.ok(allowed.has(tableName));
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from ${tableName} where ${tableName === "trips" ? "id" : "trip_id"} = $1`,
    [tripId],
  );
  return Number(rows[0].count);
}
