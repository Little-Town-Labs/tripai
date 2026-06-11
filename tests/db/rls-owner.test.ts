import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool, PoolClient } from "pg";

import { setOwnerContext, setAppRole } from "@/lib/access/context";
import { createTestPool, resetAndMigrate } from "./helpers/database";
import { ownerAId, ownerBId, seedOwnerPrivacyScenario, tripAId, tripBId } from "./helpers/seed";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
  await seedOwnerPrivacyScenario(pool);
});

after(async () => {
  await pool.end();
});

async function withOwner<T>(ownerId: string, run: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setOwnerContext(client, ownerId);
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

test("US1 owner can read own trip and not another owner's trip", async () => {
  const rows = await withOwner(ownerAId, async (client) => {
    const result = await client.query<{ id: string }>(
      "select id from trips where id = any($1::uuid[]) order by id",
      [[tripAId, tripBId]],
    );
    return result.rows.map((row) => row.id);
  });

  assert.deepEqual(rows, [tripAId]);
});

test("US1 owner cannot insert a trip for another owner", async () => {
  await assert.rejects(
    withOwner(ownerAId, async (client) => {
      await client.query(
        `
          insert into trips (id, owner_id, title, status)
          values ($1, $2, 'Cross-owner write', 'draft')
        `,
        ["10000000-0000-4000-8000-000000000999", ownerBId],
      );
    }),
  );
});
