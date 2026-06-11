import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { reconcileOwner } from "../../src/lib/auth/owner";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";

let pool: Pool;

before(async () => {
  pool = createTestPool();
  await resetAndMigrate(pool);
});

after(async () => {
  await pool.end();
});

test("US1 creates a TripAI owner record for a new authenticated identity", async () => {
  const owner = await reconcileOwner(pool, {
    id: "auth-user-not-a-uuid",
    email: "owner@example.com",
    name: "Trip Owner",
  });

  assert.equal(owner.email, "owner@example.com");
  assert.equal(owner.displayName, "Trip Owner");
  assert.match(owner.id, /^[0-9a-f-]{36}$/);
});

test("US1 owner reconciliation is idempotent by email", async () => {
  const first = await reconcileOwner(pool, {
    id: "first-provider-id",
    email: "same-owner@example.com",
    name: "First Name",
  });
  const second = await reconcileOwner(pool, {
    id: "second-provider-id",
    email: "same-owner@example.com",
    name: "Updated Name",
  });

  assert.equal(second.id, first.id);
  assert.equal(second.email, "same-owner@example.com");
});

test("US2 rejects sessions without an email before owner access", async () => {
  await assert.rejects(
    reconcileOwner(pool, {
      id: "missing-email",
      email: "",
      name: "No Email",
    }),
    /authenticated owner email is required/i,
  );
});
