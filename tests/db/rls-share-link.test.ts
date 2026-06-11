import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool, PoolClient } from "pg";

import { setShareTokenContext, setAppRole } from "@/lib/access/context";
import { createTestPool, resetAndMigrate } from "./helpers/database";
import {
  activeShareToken,
  seedOwnerPrivacyScenario,
  tripAId,
  tripBId,
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

async function withShare<T>(token: string, run: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setShareTokenContext(client, token);
    await setAppRole(client);
    const result = await run(client);
    await client.query("rollback");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

test("US2 active share link can read only its shared trip", async () => {
  const rows = await withShare(activeShareToken, async (client) => {
    const result = await client.query<{ id: string }>(
      "select id from trips where id = any($1::uuid[]) order by id",
      [[tripAId, tripBId]],
    );
    return result.rows.map((row) => row.id);
  });

  assert.deepEqual(rows, [tripAId]);
});
