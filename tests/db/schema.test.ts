import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { createTestPool, resetAndMigrate } from "./helpers/database";
import { seedOwnerPrivacyScenario } from "./helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
});

after(async () => {
  await pool.end();
});

test("US1 schema creates required trip ownership tables", async () => {
  const { rows } = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name
    `,
    [
      [
        "owners",
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

  assert.deepEqual(
    rows.map((row) => row.table_name),
    [
      "notes",
      "owners",
      "photo_metadata",
      "ratings",
      "share_links",
      "stops",
      "trip_days",
      "trip_intakes",
      "trip_revisions",
      "trips",
    ],
  );
});

test("US1 schema rejects out-of-range ratings", async () => {
  await assert.rejects(
    pool.query(
      `
        insert into ratings (id, trip_id, stop_id, author_owner_id, stars)
        values (
          '20000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-0000000000a1',
          '30000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-0000000000a1',
          6
        )
      `,
    ),
  );
});
