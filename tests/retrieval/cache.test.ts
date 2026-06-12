import assert from "node:assert/strict";
import { test } from "node:test";

import { MemoryRetrievalCache } from "../../src/lib/retrieval/cache";
import { createCacheKey, normalizeRetrievalInput } from "../../src/lib/retrieval/normalizers";

const input = {
  originAddress: "  St. Louis, MO ",
  destinationArea: "ORLANDO, fl",
  startDate: "2026-07-06",
  endDate: "2026-07-11",
  partyAdults: 2,
  partyChildren: 2,
  childrenAges: [9, 6],
  interests: ["Seafood", "theme parks", "Seafood"],
  budgetLevel: "moderate" as const,
  dietaryNeeds: ["Vegetarian", "peanut allergy"],
  mobilityNotes: "Prefer stroller-friendly days for the parks",
  travelStyle: "balanced" as const,
};

test("normalizes retrieval input and excludes private free text from cache key material", () => {
  const normalized = normalizeRetrievalInput(input);

  assert.deepEqual(normalized, {
    originAddress: "St. Louis, MO",
    destinationArea: "Orlando, FL",
    startDate: "2026-07-06",
    endDate: "2026-07-11",
    partyAdults: 2,
    partyChildren: 2,
    childrenAges: [6, 9],
    interests: ["seafood", "theme parks"],
    budgetLevel: "moderate",
    dietaryNeeds: ["peanut allergy", "vegetarian"],
    mobilityCategory: "stroller",
    travelStyle: "balanced",
  });

  const key = createCacheKey("place_search", normalized);
  assert.match(key, /^place_search:[0-9a-f]{64}$/);
  assert.equal(key.includes("stroller-friendly"), false);
  assert.equal(key.includes("St. Louis"), false);
});

test("fresh cache entries are returned and stale entries are ignored", () => {
  const cache = new MemoryRetrievalCache({ now: () => new Date("2026-06-11T12:00:00.000Z") });

  cache.set("route:one", { durationSeconds: 120 }, new Date("2026-06-11T12:05:00.000Z"));

  assert.deepEqual(cache.get("route:one"), {
    value: { durationSeconds: 120 },
    fetchedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-06-11T12:05:00.000Z",
    cacheStatus: "cached",
  });

  const staleCache = new MemoryRetrievalCache({ now: () => new Date("2026-06-11T12:10:00.000Z") });
  staleCache.set("route:two", { durationSeconds: 120 }, new Date("2026-06-11T12:05:00.000Z"));

  assert.equal(staleCache.get("route:two"), null);
});
