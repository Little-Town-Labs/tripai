import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { setAppRole } from "@/lib/access/context";
import { createTestPool, resetAndMigrate } from "./helpers/database";
import { seedOwnerPrivacyScenario, tripAId } from "./helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
});

after(async () => {
  await pool.end();
});

test("US1 trip-scoped tables have row-level security enabled", async () => {
  const { rows } = await pool.query<{ relname: string; relrowsecurity: boolean }>(
    `
      select relname, relrowsecurity
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = any($1::text[])
      order by relname
    `,
    [
      [
        "trip_intakes",
        "trips",
        "trip_revisions",
        "trip_days",
        "stops",
        "notes",
        "ratings",
        "photo_metadata",
        "share_links",
      ],
    ],
  );

  assert.equal(rows.length, 9);
  assert.ok(rows.every((row) => row.relrowsecurity));
});

test("US1 anonymous context cannot read trip rows", async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAppRole(client);
    const { rows } = await client.query<{ id: string }>(
      "select id from trips where id = $1",
      [tripAId],
    );

    assert.deepEqual(rows, []);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
