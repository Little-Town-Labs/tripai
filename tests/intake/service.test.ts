import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { reconcileOwner } from "../../src/lib/auth/owner";
import { createTripIntakeDraft } from "../../src/lib/intake/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
});

after(async () => {
  await pool.end();
});

test("US1 persists a trip intake draft through owner-scoped RLS context", async () => {
  const owner = await reconcileOwner(pool, {
    id: "f4-owner",
    email: "f4-owner@example.com",
    name: "F4 Owner",
  });

  const draft = await createTripIntakeDraft(pool, owner.id, {
    originAddress: "St. Louis, MO",
    destinationArea: "Orlando, FL",
    startDate: "2026-07-06",
    endDate: "2026-07-11",
    partyAdults: 2,
    partyChildren: 2,
    childrenAges: [6, 9],
    interests: ["Theme parks", "Seafood"],
    budgetLevel: "moderate",
    dietaryNeeds: ["Peanut allergy"],
    mobilityNotes: "Prefer stroller-friendly days",
    travelStyle: "balanced",
  });

  assert.match(draft.id, /^[0-9a-f-]{36}$/);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role tripai_app");
    await client.query("select set_config('tripai.owner_id', $1, true)", [owner.id]);
    const ownerRows = await client.query<{ id: string; owner_id: string; destination_area: string }>(
      "select id, owner_id, destination_area from trip_intakes where id = $1",
      [draft.id],
    );
    await client.query("commit");

    assert.equal(ownerRows.rows[0]?.owner_id, owner.id);
    assert.equal(ownerRows.rows[0]?.destination_area, "Orlando, FL");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
