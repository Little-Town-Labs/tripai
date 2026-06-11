import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool, PoolClient } from "pg";

import { setShareTokenContext, setAppRole } from "@/lib/access/context";
import { createTestPool, resetAndMigrate } from "./helpers/database";
import {
  activeShareLinkId,
  activeShareToken,
  seedOwnerPrivacyScenario,
  stopAId,
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

test("US2 active share link can add trip-scoped note to shared trip", async () => {
  const rows = await withShare(activeShareToken, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        insert into notes (trip_id, author_share_link_id, author_display_name, content)
        values ($1, $2, 'Grandma', 'Share note')
        returning id
      `,
      [tripAId, activeShareLinkId],
    );
    return result.rows;
  });

  assert.equal(rows.length, 1);
});

test("US2 active share link can add rating to shared trip stop", async () => {
  const rows = await withShare(activeShareToken, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        insert into ratings (trip_id, stop_id, author_share_link_id, author_display_name, stars, text)
        values ($1, $2, $3, 'Grandma', 4, 'Share rating')
        returning id
      `,
      [tripAId, stopAId, activeShareLinkId],
    );
    return result.rows;
  });

  assert.equal(rows.length, 1);
});

test("US2 active share link cannot add contribution to unrelated trip", async () => {
  await assert.rejects(
    withShare(activeShareToken, async (client) => {
      await client.query(
        `
          insert into notes (trip_id, author_share_link_id, author_display_name, content)
          values ($1, $2, 'Grandma', 'Wrong trip')
        `,
        [tripBId, activeShareLinkId],
      );
    }),
  );
});
