import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import {
  commitTripRevision,
  getRevisionPanel,
  markStopVisited,
  requestTripRevision,
  restorePreviousRevision,
  type RevisionGenerator,
} from "../../src/lib/revisions/service";
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
} from "../db/helpers/seed";

const candidateStopId = "30000000-0000-4000-8000-0000000000f1";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchased();
});

after(async () => {
  await pool.end();
});

test("US1 creates planning candidate without consuming quota until commit", async () => {
  const beforePanel = await getRevisionPanel(pool, ownerAId, {
    tripId: tripAId,
    today: new Date("2026-06-15T12:00:00Z"),
  });
  assert.equal(beforePanel.ok, true);
  assert.equal(beforePanel.panel.planningRemaining, 2);

  const requested = await requestTripRevision(
    pool,
    ownerAId,
    {
      tripId: tripAId,
      mode: "planning",
      requestText: "Make the first day more relaxed.",
    },
    { generator: replaceWithCandidateStop },
  );

  assert.equal(requested.ok, true);
  assert.equal(requested.candidate.mode, "planning");
  assert.equal(requested.candidate.canCommit, false);
  assert.equal(requested.candidate.removedStopContributions[0].stableStopKey, "stop-a-1");

  const afterRequest = await getRevisionPanel(pool, ownerAId, {
    tripId: tripAId,
    today: new Date("2026-06-15T12:00:00Z"),
  });
  assert.equal(afterRequest.ok, true);
  assert.equal(afterRequest.panel.planningRemaining, 2);

  const committed = await commitTripRevision(pool, ownerAId, {
    tripId: tripAId,
    revisionId: requested.candidate.revisionId,
    preservationDecisions: [{ stableStopKey: "stop-a-1", targetScope: "trip" }],
  });
  assert.equal(committed.ok, true);
  assert.equal(committed.planningRemaining, 1);
  assert.equal(committed.midTripRemaining, 3);

  const counters = await pool.query<{
    planning_revisions_used: number;
    mid_trip_revisions_used: number;
  }>("select planning_revisions_used, mid_trip_revisions_used from trips where id = $1", [tripAId]);
  assert.equal(counters.rows[0].planning_revisions_used, 1);
  assert.equal(counters.rows[0].mid_trip_revisions_used, 0);
});

test("US2 marks visited stops and passes them to the mid-trip generator", async () => {
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchased();

  const marked = await markStopVisited(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    checked: true,
  });
  assert.deepEqual(marked, { ok: true, stopId: stopAId, checked: true });

  const seenRetainedKeys: string[][] = [];
  const generator: RevisionGenerator = async (input) => {
    seenRetainedKeys.push(input.retainedStableStopKeys);
    return replaceWithCandidateStop(input);
  };

  const requested = await requestTripRevision(
    pool,
    ownerAId,
    {
      tripId: tripAId,
      mode: "mid_trip",
      requestText: "Skip the current restaurant and add a quieter stop.",
    },
    { generator, today: new Date("2026-07-01T12:00:00Z") },
  );

  assert.equal(requested.ok, true);
  assert.deepEqual(seenRetainedKeys, [["stop-a-1"]]);

  const committed = await commitTripRevision(pool, ownerAId, {
    tripId: tripAId,
    revisionId: requested.candidate.revisionId,
    preservationDecisions: [],
  });
  assert.equal(committed.ok, true);
  assert.equal(committed.midTripRemaining, 2);

  const detail = await getTripDetail(pool, ownerAId, {
    tripId: tripAId,
    today: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(detail.ok, true);
  assert.ok(detail.detail.days[0].stops.some((stop) => stop.stableStopKey === "stop-a-1" && stop.checked));
});

test("US3 blocks commit until removed contributed stops have preservation decisions", async () => {
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchased();

  const requested = await requestTripRevision(
    pool,
    ownerAId,
    {
      tripId: tripAId,
      mode: "planning",
      requestText: "Replace the restaurant with a picnic stop.",
    },
    { generator: replaceWithCandidateStop },
  );
  assert.equal(requested.ok, true);

  const blocked = await commitTripRevision(pool, ownerAId, {
    tripId: tripAId,
    revisionId: requested.candidate.revisionId,
    preservationDecisions: [],
  });

  assert.deepEqual(blocked, {
    ok: false,
    reason: "preservation_required",
    affectedStableStopKeys: ["stop-a-1"],
  });
});

test("US3 preserves removed stop scrapbook content at the selected trip scope", async () => {
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchased();

  const requested = await requestTripRevision(
    pool,
    ownerAId,
    {
      tripId: tripAId,
      mode: "planning",
      requestText: "Replace the contributed stop.",
    },
    { generator: replaceWithCandidateStop },
  );
  assert.equal(requested.ok, true);

  const committed = await commitTripRevision(pool, ownerAId, {
    tripId: tripAId,
    revisionId: requested.candidate.revisionId,
    preservationDecisions: [{ stableStopKey: "stop-a-1", targetScope: "trip" }],
  });
  assert.equal(committed.ok, true);

  const preserved = await pool.query<{ content: string }>(
    `
      select content
      from notes
      where trip_id = $1
        and day_id is null
        and stop_id is null
        and content like 'Preserved from Seed Restaurant:%'
      order by created_at desc
    `,
    [tripAId],
  );
  assert.ok(preserved.rows.some((row) => row.content.includes("Seed note")));
  assert.ok(preserved.rows.some((row) => row.content.includes("5 / 5 stars")));
});

test("US4 restores the latest previous version without consuming quota", async () => {
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
  await makeTripAPurchased();

  const requested = await requestTripRevision(
    pool,
    ownerAId,
    {
      tripId: tripAId,
      mode: "planning",
      requestText: "Try a different first stop.",
    },
    { generator: replaceWithCandidateStop },
  );
  assert.equal(requested.ok, true);
  const committed = await commitTripRevision(pool, ownerAId, {
    tripId: tripAId,
    revisionId: requested.candidate.revisionId,
    preservationDecisions: [{ stableStopKey: "stop-a-1", targetScope: "trip" }],
  });
  assert.equal(committed.ok, true);

  const restored = await restorePreviousRevision(pool, ownerAId, { tripId: tripAId });
  assert.deepEqual(restored, { ok: true, currentRevisionId: revisionAId });

  const counters = await pool.query<{
    planning_revisions_used: number;
  }>("select planning_revisions_used from trips where id = $1", [tripAId]);
  assert.equal(counters.rows[0].planning_revisions_used, 1);
});

test("US1 denies other owners", async () => {
  const result = await requestTripRevision(
    pool,
    ownerBId,
    {
      tripId: tripAId,
      mode: "planning",
      requestText: "This should not work.",
    },
    { generator: replaceWithCandidateStop },
  );

  assert.deepEqual(result, { ok: false, reason: "not_found" });
});

const replaceWithCandidateStop: RevisionGenerator = async (input) => ({
  summary: `Candidate for ${input.mode}: ${input.requestText}`,
  days: [
    {
      dayNumber: 1,
      date: "2026-07-01",
      label: "Revised Drive Day",
      fromLocation: "St. Louis, MO",
      toLocation: "Orlando, FL",
      totalMiles: 260,
      driveTimeMinutes: 250,
      aiSummary: "Consider this quieter revised day.",
      stops: [
        ...input.retainedStops,
        {
          id: candidateStopId,
          stableStopKey: "candidate-stop",
          orderIndex: input.retainedStops.length,
          name: "Quiet Picnic Stop",
          type: "attraction",
          googlePlaceId: "places/candidate-stop",
          address: "3 Test Way",
          lat: 28.43,
          lng: -81.58,
          eta: null,
          description: "A calmer outdoor break.",
          tips: "Consider packing snacks.",
          priceLevel: null,
          googleRating: 4.5,
          hoursSummary: null,
          phone: null,
          website: null,
          checked: false,
        },
      ],
    },
  ],
});

async function makeTripAPurchased() {
  await pool.query(
    `
      update trips
      set status = 'purchased',
          purchased_at = now(),
          price_cents = 4900,
          planning_revisions_used = 0,
          mid_trip_revisions_used = 0
      where id = $1
    `,
    [tripAId],
  );
  await pool.query(
    `
      update trip_days
      set date = '2026-07-01',
          from_location = 'St. Louis, MO',
          to_location = 'Orlando, FL',
          ai_summary = 'Initial day summary.'
      where id = $1
    `,
    [dayAId],
  );
}
