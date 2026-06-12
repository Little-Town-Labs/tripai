import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { hashShareToken } from "@/lib/access/share-token";
import {
  createShareLink,
  createSharedNote,
  createSharedRating,
  getSharedTrip,
  listShareLinks,
  removeContribution,
  revokeShareLink,
} from "@/lib/sharing/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  activeShareLinkId,
  activeShareToken,
  dayAId,
  ownerAId,
  ownerBId,
  revokedShareToken,
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
  await makeTripAPurchased();
});

after(async () => {
  await pool.end();
});

test("US1 creates hash-only share links and lists without raw secrets", async () => {
  const created = await createShareLink(pool, ownerAId, {
    tripId: tripAId,
    label: " Cousins ",
    appBaseUrl: "https://tripai.example",
  });

  assert.equal(created.ok, true);
  assert.equal(created.link.label, "Cousins");
  assert.match(created.link.token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(created.link.url, `https://tripai.example/share/${created.link.token}`);

  const stored = await pool.query<{
    tokenHash: string;
    tokenMatchesHash: boolean;
  }>(
    `
      select
        token_hash as "tokenHash",
        token_hash = $2 as "tokenMatchesHash"
      from share_links
      where id = $1
    `,
    [created.link.id, hashShareToken(created.link.token)],
  );

  assert.equal(stored.rows[0].tokenMatchesHash, true);
  assert.notEqual(stored.rows[0].tokenHash, created.link.token);

  const listed = await listShareLinks(pool, ownerAId, { tripId: tripAId });
  assert.equal(listed.ok, true);
  assert.ok(listed.links.some((link) => link.id === created.link.id));
  assert.ok(!("token" in listed.links[0]));
  assert.ok(!("tokenHash" in listed.links[0]));
});

test("US1 revokes links immediately and denies non-owner management", async () => {
  const created = await createShareLink(pool, ownerAId, {
    tripId: tripAId,
    label: "Revoke me",
  });
  assert.equal(created.ok, true);

  const revoked = await revokeShareLink(pool, ownerAId, {
    tripId: tripAId,
    shareLinkId: created.link.id,
  });
  assert.deepEqual(revoked, { ok: true, shareLinkId: created.link.id });

  const shared = await getSharedTrip(pool, {
    token: created.link.token,
    today: new Date("2026-07-01T12:00:00Z"),
  });
  assert.deepEqual(shared, { ok: false, reason: "not_found" });

  assert.deepEqual(await listShareLinks(pool, ownerBId, { tripId: tripAId }), {
    ok: false,
    reason: "not_found",
  });
  assert.deepEqual(await createShareLink(pool, ownerBId, { tripId: tripBId }), {
    ok: false,
    reason: "not_purchased",
  });
});

test("US2 loads shared trip through active token without owner or payment fields", async () => {
  const result = await getSharedTrip(pool, {
    token: activeShareToken,
    today: new Date("2026-07-01T12:00:00Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.detail.trip.id, tripAId);
  assert.equal(result.detail.trip.title, "Owner A Trip");
  assert.equal(result.detail.status, "ready");
  assert.equal(result.detail.days[0].stops[0].id, stopAId);
  assert.equal(result.detail.scrapbook.photosByStopId[stopAId][0].status, "pending_upload");

  const serialized = JSON.stringify(result.detail);
  assert.ok(!serialized.includes("owner-a@example.test"));
  assert.ok(!serialized.includes("ownerId"));
  assert.ok(!serialized.includes("stripe"));
  assert.ok(!serialized.includes("price"));
});

test("US2 rejects invalid or revoked shared tokens generically", async () => {
  assert.deepEqual(await getSharedTrip(pool, { token: "not-a-real-token" }), {
    ok: false,
    reason: "not_found",
  });
  assert.deepEqual(await getSharedTrip(pool, { token: revokedShareToken }), {
    ok: false,
    reason: "not_found",
  });
});

test("US3 creates share-authored notes and ratings with display names", async () => {
  const note = await createSharedNote(pool, {
    token: activeShareToken,
    tripId: tripAId,
    dayId: dayAId,
    displayName: "Grandma",
    content: "Pack rain ponchos.",
  });
  const rating = await createSharedRating(pool, {
    token: activeShareToken,
    tripId: tripAId,
    stopId: stopAId,
    displayName: "Grandma",
    stars: "4",
    text: "Good lunch stop.",
  });

  assert.equal(note.ok, true);
  assert.equal(rating.ok, true);

  const stored = await pool.query<{
    noteShareLinkId: string;
    noteOwnerId: string | null;
    ratingShareLinkId: string;
    ratingOwnerId: string | null;
  }>(
    `
      select
        notes.author_share_link_id as "noteShareLinkId",
        notes.author_owner_id as "noteOwnerId",
        ratings.author_share_link_id as "ratingShareLinkId",
        ratings.author_owner_id as "ratingOwnerId"
      from notes
      cross join ratings
      where notes.id = $1
        and ratings.id = $2
    `,
    [note.noteId, rating.ratingId],
  );
  assert.equal(stored.rows[0].noteShareLinkId, activeShareLinkId);
  assert.equal(stored.rows[0].noteOwnerId, null);
  assert.equal(stored.rows[0].ratingShareLinkId, activeShareLinkId);
  assert.equal(stored.rows[0].ratingOwnerId, null);

  const shared = await getSharedTrip(pool, {
    token: activeShareToken,
    today: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(shared.ok, true);
  assert.ok(shared.detail.scrapbook.notesByDayId[dayAId].some((item) => item.id === note.noteId));
  assert.ok(shared.detail.scrapbook.ratingsByStopId[stopAId].some((item) => item.id === rating.ratingId));
});

test("US3 rejects invalid share contributions before writing", async () => {
  const invalidNote = await createSharedNote(pool, {
    token: activeShareToken,
    tripId: tripAId,
    dayId: "13000000-0000-4000-8000-0000000000ff",
    displayName: "Grandma",
    content: "Wrong day.",
  });
  const revokedRating = await createSharedRating(pool, {
    token: revokedShareToken,
    tripId: tripAId,
    stopId: stopAId,
    displayName: "Grandma",
    stars: "5",
  });

  assert.deepEqual(invalidNote, {
    ok: false,
    reason: "invalid",
    fieldErrors: { scope: "Choose a valid day or stop for this trip." },
  });
  assert.deepEqual(revokedRating, { ok: false, reason: "not_found" });
});

test("US4 lets the owner remove share-link contributions only", async () => {
  const note = await createSharedNote(pool, {
    token: activeShareToken,
    tripId: tripAId,
    stopId: stopAId,
    displayName: "Aunt Robin",
    content: "Too spicy for the kids.",
  });
  const rating = await createSharedRating(pool, {
    token: activeShareToken,
    tripId: tripAId,
    stopId: stopAId,
    displayName: "Aunt Robin",
    stars: "2",
  });
  assert.equal(note.ok, true);
  assert.equal(rating.ok, true);

  assert.deepEqual(await removeContribution(pool, ownerBId, {
    tripId: tripAId,
    contributionType: "note",
    contributionId: note.noteId,
  }), { ok: false, reason: "not_found" });

  assert.deepEqual(await removeContribution(pool, ownerAId, {
    tripId: tripAId,
    contributionType: "note",
    contributionId: note.noteId,
  }), { ok: true, contributionId: note.noteId });
  assert.deepEqual(await removeContribution(pool, ownerAId, {
    tripId: tripAId,
    contributionType: "rating",
    contributionId: rating.ratingId,
  }), { ok: true, contributionId: rating.ratingId });

  const shared = await getSharedTrip(pool, {
    token: activeShareToken,
    today: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(shared.ok, true);
  assert.ok(!shared.detail.scrapbook.notesByStopId[stopAId]?.some((item) => item.id === note.noteId));
  assert.ok(!shared.detail.scrapbook.ratingsByStopId[stopAId]?.some((item) => item.id === rating.ratingId));
});

async function makeTripAPurchased() {
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
}
