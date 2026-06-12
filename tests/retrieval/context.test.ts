import assert from "node:assert/strict";
import { test } from "node:test";

import { MemoryRetrievalCache } from "../../src/lib/retrieval/cache";
import { buildRetrievalContext } from "../../src/lib/retrieval/context";
import type { PlaceProvider, ProviderPlace, ProviderRoute, RouteProvider } from "../../src/lib/retrieval/types";

const intake = {
  originAddress: "St. Louis, MO",
  destinationArea: "Orlando, FL",
  startDate: "2026-07-06",
  endDate: "2026-07-11",
  partyAdults: 2,
  partyChildren: 2,
  childrenAges: [6, 9],
  interests: ["Theme parks", "Seafood"],
  budgetLevel: "moderate" as const,
  dietaryNeeds: ["Peanut allergy"],
  mobilityNotes: "Prefer stroller-friendly days",
  travelStyle: "balanced" as const,
};

test("builds planner-ready destination candidates and excludes closed or unverified places", async () => {
  const placeProvider = new FakePlaceProvider({
    searchResults: [
      place({ id: "restaurant-1", name: "Garden Grill", category: "restaurant" }),
      place({ id: "", name: "Missing Id", category: "restaurant" }),
      place({ id: "closed-1", name: "Closed Cafe", businessStatus: "CLOSED_PERMANENTLY", category: "restaurant" }),
    ],
  });

  const context = await buildRetrievalContext(intake, {
    placeProvider,
    routeProvider: new FakeRouteProvider({ route: successfulRoute() }),
    cache: new MemoryRetrievalCache({ now: fixedNow }),
    now: fixedNow,
  });

  assert.deepEqual(context.candidateGroups.restaurant.map((candidate) => candidate.id), ["restaurant-1"]);
  assert.equal(context.candidateGroups.restaurant[0]?.name, "Garden Grill");
  assert.equal(context.candidateGroups.restaurant[0]?.cacheStatus, "fresh");
  assert.equal(context.errors.length, 0);
});

test("builds route skeletons from provider data and reports provider failures without estimates", async () => {
  const routeProvider = new FakeRouteProvider({ route: successfulRoute() });

  const context = await buildRetrievalContext(intake, {
    placeProvider: new FakePlaceProvider(),
    routeProvider,
    cache: new MemoryRetrievalCache({ now: fixedNow }),
    now: fixedNow,
  });

  assert.equal(context.route?.distanceMeters, 1609344);
  assert.equal(context.route?.durationSeconds, 54000);
  assert.equal(context.route?.cacheStatus, "fresh");

  const failed = await buildRetrievalContext(intake, {
    placeProvider: new FakePlaceProvider(),
    routeProvider: new FakeRouteProvider({ route: null }),
    cache: new MemoryRetrievalCache({ now: fixedNow }),
    now: fixedNow,
  });

  assert.equal(failed.route, null);
  assert.equal(failed.errors[0]?.code, "ROUTE_UNAVAILABLE");
});

test("reuses fresh cached retrieval data for equivalent requests", async () => {
  const cache = new MemoryRetrievalCache({ now: fixedNow });
  const placeProvider = new FakePlaceProvider({
    searchResults: [place({ id: "restaurant-1", name: "Garden Grill", category: "restaurant" })],
  });
  const routeProvider = new FakeRouteProvider({
    route: successfulRoute(),
  });

  await buildRetrievalContext(intake, { placeProvider, routeProvider, cache, now: fixedNow });
  const second = await buildRetrievalContext(
    {
      ...intake,
      originAddress: "  St. Louis, MO ",
      destinationArea: "orlando, fl",
      interests: ["Seafood", "Theme parks"],
    },
    { placeProvider, routeProvider, cache, now: fixedNow },
  );

  assert.equal(placeProvider.searchCalls, 5);
  assert.equal(routeProvider.calls, 1);
  assert.equal(second.candidateGroups.restaurant[0]?.cacheStatus, "cached");
  assert.equal(second.route?.cacheStatus, "cached");
});

function fixedNow() {
  return new Date("2026-06-11T12:00:00.000Z");
}

class FakePlaceProvider implements PlaceProvider {
  searchCalls = 0;
  detailsCalls = 0;

  constructor(private readonly options: { searchResults?: ProviderPlace[] } = {}) {}

  async searchText() {
    this.searchCalls += 1;
    return this.options.searchResults ?? [];
  }

  async getDetails(placeId: string) {
    this.detailsCalls += 1;
    return this.options.searchResults?.find((result) => result.id === placeId) ?? null;
  }
}

class FakeRouteProvider implements RouteProvider {
  calls = 0;

  constructor(private readonly options: { route?: ProviderRoute | null } = {}) {}

  async computeRoute() {
    this.calls += 1;
    return this.options.route ?? null;
  }
}

function place(overrides: Partial<ProviderPlace>): ProviderPlace {
  return {
    id: "place-1",
    source: "google_places",
    name: "Place",
    address: "Orlando, FL",
    location: { lat: 28.37, lng: -81.55 },
    category: "restaurant",
    businessStatus: "OPERATIONAL",
    rating: 4.5,
    ratingCount: 100,
    priceLevel: 2,
    types: ["restaurant"],
    fetchedAt: fixedNow().toISOString(),
    ...overrides,
  };
}

function successfulRoute(): ProviderRoute {
  return {
    source: "google_routes",
    distanceMeters: 1609344,
    durationSeconds: 54000,
    polyline: "encoded",
    segments: [{ distanceMeters: 804672, durationSeconds: 27000 }],
  };
}
