import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { markStopVisited } from "../../src/lib/revisions/service";
import { getTripDetail } from "../../src/lib/trip-detail/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  dayAId,
  ownerAId,
  ownerBId,
  revisionAId,
  seedOwnerPrivacyScenario,
  stopAId,
  tripAId,
  tripBId,
} from "../db/helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchasedForCoPilot();
});

after(async () => {
  await pool.end();
});

test("US1 loads a purchased owner trip with ordered days and current/next stop context", async () => {
  const result = await getTripDetail(pool, ownerAId, {
    tripId: tripAId,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.detail.status, "ready");
  assert.equal(result.detail.trip.title, "Owner A Trip");
  assert.equal(result.detail.selectedRevision?.id, revisionAId);
  assert.equal(result.detail.activeDayId, dayAId);
  assert.equal(result.detail.currentStopId, "30000000-0000-4000-8000-000000000002");
  assert.equal(result.detail.nextStopId, "30000000-0000-4000-8000-000000000003");
  assert.equal(result.detail.days.length, 1);
  assert.equal(result.detail.days[0].stops.length, 3);
  assert.equal(result.detail.days[0].stops[0].id, stopAId);
  assert.equal(result.detail.days[0].stops[0].checked, true);
  assert.equal(result.detail.days[0].stops[1].isCurrent, true);
  assert.equal(result.detail.days[0].stops[1].nextStopName, "Magic Kingdom Park");
  assert.equal(result.detail.revisionPanel.planningRemaining, 2);
  assert.equal(result.detail.revisionPanel.midTripRemaining, 3);
  assert.equal(result.detail.revisionPanel.canRequestPlanning, false);
  assert.equal(result.detail.revisionPanel.canRequestMidTrip, true);
  assert.equal(
    result.detail.days[0].stops[2].officialParkUrl,
    "https://disneyworld.disney.go.com/",
  );
});

test("F11 exposes revision panel counts and checked stop state after visited updates", async () => {
  const marked = await markStopVisited(pool, ownerAId, {
    tripId: tripAId,
    stopId: "30000000-0000-4000-8000-000000000002",
    checked: true,
  });
  assert.equal(marked.ok, true);

  const result = await getTripDetail(pool, ownerAId, {
    tripId: tripAId,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.detail.revisionPanel.currentRevisionId, revisionAId);
  assert.equal(result.detail.revisionPanel.planningRemaining, 2);
  assert.equal(result.detail.revisionPanel.midTripRemaining, 3);
  assert.equal(result.detail.days[0].stops[1].checked, true);
});

test("US4 denies another owner through owner-scoped access", async () => {
  const result = await getTripDetail(pool, ownerBId, {
    tripId: tripAId,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.deepEqual(result, { ok: false, reason: "not_found" });
});

test("US1 rejects owner-visible trips that are not purchased", async () => {
  const result = await getTripDetail(pool, ownerBId, {
    tripId: tripBId,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.deepEqual(result, { ok: false, reason: "not_purchased" });
});

test("US1 returns not-ready for purchased trips without current route data", async () => {
  await pool.query(
    `
      update trips
      set status = 'purchased',
          purchased_at = now(),
          current_revision_id = null
      where id = $1
    `,
    [tripBId],
  );

  const result = await getTripDetail(pool, ownerBId, {
    tripId: tripBId,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.detail.status, "not_ready");
  assert.equal(result.detail.selectedRevision, null);
  assert.deepEqual(result.detail.days, []);
});

async function makeTripAPurchasedForCoPilot() {
  await pool.query(
    `
      update trips
      set status = 'purchased',
          purchased_at = now(),
          price_cents = 4900
      where id = $1
    `,
    [tripAId],
  );
  await pool.query(
    `
      update stops
      set checked = true,
          eta = '2026-07-01 12:15:00+00',
          lat = 28.4101,
          lng = -81.582,
          description = 'Lunch before the park.',
          tips = 'Mobile order if the line is long.'
      where id = $1
    `,
    [stopAId],
  );
  await pool.query(
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
        eta,
        lat,
        lng
      )
      values (
        '30000000-0000-4000-8000-000000000002',
        $1,
        $2,
        $3,
        'stop-a-2',
        1,
        'Hotel Check-in',
        'hotel',
        'places/hotel-a',
        '2 Test Way',
        '2026-07-01 15:00:00+00',
        28.42,
        -81.57
      )
      on conflict do nothing
    `,
    [tripAId, dayAId, revisionAId],
  );
  await pool.query(
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
        address
      )
      values (
        '30000000-0000-4000-8000-000000000003',
        $1,
        $2,
        $3,
        'stop-a-3',
        2,
        'Magic Kingdom Park',
        'park',
        'places/park-a',
        'Bay Lake, FL'
      )
      on conflict do nothing
    `,
    [tripAId, dayAId, revisionAId],
  );
}
