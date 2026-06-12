import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import {
  getPlanReview,
  requestPrePurchaseRevision,
} from "../../src/lib/plan-review/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  dayAId,
  ownerAId,
  ownerBId,
  revisionAId,
  seedOwnerPrivacyScenario,
  tripAId,
} from "../db/helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripADraftForPrePurchaseReview();
});

after(async () => {
  await pool.end();
});

test("US1 loads an owner-scoped ready draft plan with ordered days and stops", async () => {
  const result = await getPlanReview(pool, ownerAId, { tripId: tripAId });

  assert.equal(result.ok, true);
  assert.equal(result.review.status, "ready");
  assert.equal(result.review.trip.title, "Owner A Trip");
  assert.equal(result.review.selectedRevision?.id, revisionAId);
  assert.equal(result.review.days.length, 1);
  assert.equal(result.review.days[0].id, dayAId);
  assert.equal(result.review.days[0].totalMiles, 250);
  assert.equal(result.review.days[0].stops[0].name, "Seed Restaurant");
  assert.equal(result.review.days[0].stops[0].googlePlaceId, "places/seed-a");
});

test("US1 denies another owner through owner-scoped access", async () => {
  const result = await getPlanReview(pool, ownerBId, { tripId: tripAId });

  assert.deepEqual(result, { ok: false, reason: "not_found" });
});

test("US1 returns a progress-ready review when the trip has no current revision", async () => {
  const result = await getPlanReview(pool, ownerBId, {
    tripId: "10000000-0000-4000-8000-0000000000b2",
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.status, "progress");
  assert.equal(result.review.selectedRevision, null);
  assert.deepEqual(result.review.days, []);
});

test("US2 accepts unlimited pre-purchase requests without using paid revision counters", async () => {
  const first = await requestPrePurchaseRevision(pool, ownerAId, {
    tripId: tripAId,
    requestText: "Add one more relaxed outdoor lunch option.",
  });
  const second = await requestPrePurchaseRevision(pool, ownerAId, {
    tripId: tripAId,
    requestText: "Make day one less packed for the kids.",
  });
  const third = await requestPrePurchaseRevision(pool, ownerAId, {
    tripId: tripAId,
    requestText: "Prefer hotels closer to the theme parks.",
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, true);

  const counters = await pool.query<{
    planning_revisions_used: number;
    mid_trip_revisions_used: number;
  }>(
    "select planning_revisions_used, mid_trip_revisions_used from trips where id = $1",
    [tripAId],
  );
  assert.equal(counters.rows[0].planning_revisions_used, 0);
  assert.equal(counters.rows[0].mid_trip_revisions_used, 0);
});

test("US2 rejects pre-purchase requests after purchase", async () => {
  await pool.query("update trips set purchased_at = now(), status = 'purchased' where id = $1", [
    tripAId,
  ]);

  const result = await requestPrePurchaseRevision(pool, ownerAId, {
    tripId: tripAId,
    requestText: "Change the hotel after checkout.",
  });

  assert.deepEqual(result, { ok: false, reason: "already_purchased" });

  await makeTripADraftForPrePurchaseReview();
});

test("US3 loads a previous committed revision without changing the current pointer", async () => {
  const previousRevisionId = "12000000-0000-4000-8000-0000000000c3";
  await seedPreviousCommittedRevision(previousRevisionId);

  const result = await getPlanReview(pool, ownerAId, {
    tripId: tripAId,
    revisionId: previousRevisionId,
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.selectedRevision?.id, previousRevisionId);
  assert.equal(result.review.days[0].label, "Earlier Drive Day");

  const pointer = await pool.query<{ current_revision_id: string }>(
    "select current_revision_id from trips where id = $1",
    [tripAId],
  );
  assert.equal(pointer.rows[0].current_revision_id, revisionAId);
});

async function makeTripADraftForPrePurchaseReview() {
  await pool.query(
    `
      update trips
      set status = 'draft',
          purchased_at = null,
          price_cents = null,
          planning_revisions_used = 0,
          mid_trip_revisions_used = 0
      where id = $1
    `,
    [tripAId],
  );
}

async function seedPreviousCommittedRevision(previousRevisionId: string) {
  const dayId = "13000000-0000-4000-8000-0000000000c3";
  await pool.query(
    `
      insert into trip_revisions (id, trip_id, revision_number, kind, parent_revision_id, status, summary, committed_at)
      values ($1, $2, 99, 'initial', null, 'superseded', 'Earlier version', now())
      on conflict (trip_id, revision_number) do nothing
    `,
    [previousRevisionId, tripAId],
  );
  await pool.query(
    `
      insert into trip_days (id, trip_id, revision_id, day_number, date, label, total_miles, drive_time_minutes)
      values ($1, $2, $3, 1, '2026-06-30', 'Earlier Drive Day', 200, 210)
      on conflict (trip_id, revision_id, day_number) do nothing
    `,
    [dayId, tripAId, previousRevisionId],
  );
  await pool.query(
    `
      insert into stops (
        trip_id,
        day_id,
        revision_id,
        stable_stop_key,
        order_index,
        name,
        type,
        google_place_id
      )
      values ($1, $2, $3, 'previous-stop', 0, 'Earlier Stop', 'attraction', 'places/previous')
      on conflict do nothing
    `,
    [tripAId, dayId, previousRevisionId],
  );
}
