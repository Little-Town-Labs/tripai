import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import {
  findRemovedStopContributions,
  getCurrentRevision,
  listRetainedStopContributions,
} from "@/db/revisions";
import { createTestPool, resetAndMigrate } from "./helpers/database";
import {
  revisionAId,
  seedOwnerPrivacyScenario,
  stopAId,
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

test("US3 current revision metadata is distinguishable", async () => {
  const revision = await getCurrentRevision(pool, tripAId);

  assert.equal(revision?.id, revisionAId);
  assert.equal(revision?.revisionNumber, 1);
  assert.equal(revision?.status, "current");
});

test("US3 retained-stop contributions remain discoverable", async () => {
  const contributions = await listRetainedStopContributions(pool, tripAId, [
    "stop-a-1",
  ]);

  assert.equal(contributions.length, 3);
  assert.ok(contributions.every((item) => item.stopId === stopAId));
});

test("US3 removed-stop contributions are identifiable before commit", async () => {
  const contributions = await findRemovedStopContributions(pool, tripAId, []);

  assert.equal(contributions.length, 3);
  assert.ok(contributions.every((item) => item.stopId === stopAId));
});
