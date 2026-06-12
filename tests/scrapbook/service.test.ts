import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";

import { listRetainedStopContributions } from "@/db/revisions";
import {
  createScrapbookNote,
  createStopRating,
  getScrapbook,
} from "../../src/lib/scrapbook/service";
import { createTestPool, resetAndMigrate } from "../db/helpers/database";
import {
  dayAId,
  ownerAId,
  ownerBId,
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

test("US1 creates and lists owner notes at trip, day, and stop scope", async () => {
  const tripNote = await createScrapbookNote(pool, ownerAId, {
    tripId: tripAId,
    content: "Favorite road-trip moment.",
  });
  const dayNote = await createScrapbookNote(pool, ownerAId, {
    tripId: tripAId,
    dayId: dayAId,
    content: "Pack extra water for this day.",
  });
  const stopNote = await createScrapbookNote(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    content: "Kids loved this stop.",
  });

  assert.equal(tripNote.ok, true);
  assert.equal(dayNote.ok, true);
  assert.equal(stopNote.ok, true);

  const result = await getScrapbook(pool, ownerAId, { tripId: tripAId });
  assert.equal(result.ok, true);
  assert.ok(result.scrapbook.tripNotes.some((note) => note.id === tripNote.noteId));
  assert.ok(result.scrapbook.notesByDayId[dayAId].some((note) => note.id === dayNote.noteId));
  assert.ok(result.scrapbook.notesByStopId[stopAId].some((note) => note.id === stopNote.noteId));
});

test("US1 rejects invalid note scope for the trip", async () => {
  const result = await createScrapbookNote(pool, ownerAId, {
    tripId: tripAId,
    dayId: "13000000-0000-4000-8000-0000000000ff",
    content: "Wrong day.",
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "invalid",
    fieldErrors: { scope: "Choose a valid day or stop for this trip." },
  });
});

test("US2 creates ratings, rejects invalid ratings, and reports stop summaries", async () => {
  const first = await createStopRating(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    stars: "5",
    text: "Worth repeating.",
  });
  const second = await createStopRating(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    stars: "3",
    text: "",
  });
  const invalid = await createStopRating(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    stars: "6",
    text: "",
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, "invalid");

  const result = await getScrapbook(pool, ownerAId, { tripId: tripAId });
  assert.equal(result.ok, true);
  assert.ok(result.scrapbook.ratingsByStopId[stopAId].some((rating) => rating.id === first.ratingId));
  assert.equal(result.scrapbook.ratingSummariesByStopId[stopAId].count, 3);
  assert.equal(result.scrapbook.ratingSummariesByStopId[stopAId].average, 4.3);
});

test("US1 and US2 deny other owners and non-purchased trips", async () => {
  const hidden = await getScrapbook(pool, ownerBId, { tripId: tripAId });
  const hiddenWrite = await createScrapbookNote(pool, ownerBId, {
    tripId: tripAId,
    content: "Should not save.",
  });
  const notPurchased = await createStopRating(pool, ownerBId, {
    tripId: tripBId,
    stopId: stopAId,
    stars: "5",
  });

  assert.deepEqual(hidden, { ok: false, reason: "not_found" });
  assert.deepEqual(hiddenWrite, { ok: false, reason: "not_found" });
  assert.deepEqual(notPurchased, { ok: false, reason: "not_purchased" });
});

test("US3 lists photo metadata without treating pending uploads as uploaded photos", async () => {
  const result = await getScrapbook(pool, ownerAId, { tripId: tripAId });

  assert.equal(result.ok, true);
  assert.equal(result.scrapbook.photosByStopId[stopAId].length, 1);
  assert.equal(result.scrapbook.photosByStopId[stopAId][0].status, "pending_upload");
  assert.equal(result.scrapbook.photosByStopId[stopAId][0].storageKey, null);
});

test("US4 F10-created stop contributions remain visible to revision preservation checks", async () => {
  const note = await createScrapbookNote(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    content: "Preserve this.",
  });
  const rating = await createStopRating(pool, ownerAId, {
    tripId: tripAId,
    stopId: stopAId,
    stars: "4",
  });

  assert.equal(note.ok, true);
  assert.equal(rating.ok, true);

  const contributions = await listRetainedStopContributions(pool, tripAId, ["stop-a-1"]);
  assert.ok(contributions.some((item) => item.kind === "note" && item.id === note.noteId));
  assert.ok(contributions.some((item) => item.kind === "rating" && item.id === rating.ratingId));
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
