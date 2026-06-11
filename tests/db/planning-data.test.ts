import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { createTestPool, resetAndMigrate } from "./helpers/database";
import {
  dayAId,
  revisionAId,
  seedOwnerPrivacyScenario,
  tripAId,
} from "./helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
});

after(async () => {
  await pool.end();
});

test("US4 real-world non-drive stops require verified venue identity", async () => {
  await assert.rejects(
    pool.query(
      `
        insert into stops (
          trip_id,
          day_id,
          revision_id,
          stable_stop_key,
          order_index,
          name,
          type
        )
        values ($1, $2, $3, 'missing-place', 10, 'Missing Place', 'restaurant')
      `,
      [tripAId, dayAId, revisionAId],
    ),
  );
});

test("US4 intake rejects invalid dates and empty parties", async () => {
  await assert.rejects(
    pool.query(
      `
        insert into trip_intakes (
          origin_address,
          destination_area,
          start_date,
          end_date,
          party_adults,
          party_children,
          budget_level,
          travel_style
        )
        values ('A', 'B', '2026-07-05', '2026-07-01', 0, 0, 'moderate', 'balanced')
      `,
    ),
  );
});

test("US4 route and rating boundary constraints reject invalid values", async () => {
  await assert.rejects(
    pool.query(
      `
        insert into trip_days (trip_id, revision_id, day_number, date, label, total_miles, drive_time_minutes)
        values ($1, $2, 2, '2026-07-02', 'Invalid route', -1, 30)
      `,
      [tripAId, revisionAId],
    ),
  );

  await assert.rejects(
    pool.query(
      `
        insert into stops (
          trip_id,
          day_id,
          revision_id,
          stable_stop_key,
          order_index,
          name,
          type,
          google_place_id,
          google_rating
        )
        values ($1, $2, $3, 'bad-rating', 11, 'Bad Rating', 'restaurant', 'places/bad', 6)
      `,
      [tripAId, dayAId, revisionAId],
    ),
  );
});
