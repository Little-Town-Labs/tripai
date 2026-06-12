import assert from "node:assert/strict";
import { test } from "node:test";

import { GoogleMapsProvider } from "../../src/lib/retrieval/google";

test("maps Google Places search and details responses with field-mask requests", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const provider = new GoogleMapsProvider({
    apiKey: "test-key",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).includes(":searchText")) {
        return jsonResponse({
          places: [
            {
              id: "place-1",
              displayName: { text: "Garden Grill" },
              formattedAddress: "Orlando, FL",
              location: { latitude: 28.37, longitude: -81.55 },
              businessStatus: "OPERATIONAL",
              rating: 4.4,
              userRatingCount: 128,
              priceLevel: "PRICE_LEVEL_MODERATE",
              types: ["restaurant"],
            },
          ],
        });
      }

      return jsonResponse({
        id: "place-1",
        displayName: { text: "Garden Grill" },
        formattedAddress: "Orlando, FL",
        businessStatus: "OPERATIONAL",
        websiteUri: "https://example.test",
        internationalPhoneNumber: "+1 555-0100",
        regularOpeningHours: { weekdayDescriptions: ["Monday: 9:00 AM - 5:00 PM"] },
      });
    },
  });

  const search = await provider.searchText({ textQuery: "family restaurants in Orlando, FL", category: "restaurant" });
  const details = await provider.getDetails("place-1");

  assert.equal(search[0]?.id, "place-1");
  assert.equal(search[0]?.name, "Garden Grill");
  assert.equal(search[0]?.priceLevel, 2);
  assert.equal(details?.website, "https://example.test");
  assert.equal(details?.hoursSummary, "Monday: 9:00 AM - 5:00 PM");
  assert.equal(calls[0]?.init?.headers instanceof Headers, true);
  assert.equal((calls[0]?.init?.headers as Headers).get("X-Goog-Api-Key"), "test-key");
  assert.match((calls[0]?.init?.headers as Headers).get("X-Goog-FieldMask") ?? "", /places\.id/);
  assert.match((calls[1]?.init?.headers as Headers).get("X-Goog-FieldMask") ?? "", /displayName/);
});

test("maps Google route responses into route skeletons", async () => {
  const provider = new GoogleMapsProvider({
    apiKey: "test-key",
    fetch: async () =>
      jsonResponse({
        routes: [
          {
            distanceMeters: 1609344,
            duration: "54000s",
            polyline: { encodedPolyline: "abc123" },
            legs: [
              {
                distanceMeters: 804672,
                duration: "27000s",
                startLocation: { latLng: { latitude: 38.63, longitude: -90.2 } },
                endLocation: { latLng: { latitude: 33.75, longitude: -84.39 } },
              },
            ],
          },
        ],
      }),
  });

  const route = await provider.computeRoute({ origin: "St. Louis, MO", destination: "Orlando, FL" });

  assert.equal(route?.distanceMeters, 1609344);
  assert.equal(route?.durationSeconds, 54000);
  assert.equal(route?.polyline, "abc123");
  assert.equal(route?.segments[0]?.distanceMeters, 804672);
});

test("uses split Google Places env key when a unified Maps key is not configured", async () => {
  const previousMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const previousPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
  const previousDirectionsKey = process.env.GOOGLE_DIRECTIONS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "places-key";
  process.env.GOOGLE_DIRECTIONS_API_KEY = "directions-key";

  try {
    const calls: Array<{ init?: RequestInit }> = [];
    const provider = new GoogleMapsProvider({
      fetch: async (_url, init) => {
        calls.push({ init });
        return jsonResponse({ places: [] });
      },
    });

    await provider.searchText({ textQuery: "Orlando family restaurants", category: "restaurant" });

    assert.equal((calls[0]?.init?.headers as Headers).get("X-Goog-Api-Key"), "places-key");
  } finally {
    restoreEnv("GOOGLE_MAPS_API_KEY", previousMapsKey);
    restoreEnv("GOOGLE_PLACES_API_KEY", previousPlacesKey);
    restoreEnv("GOOGLE_DIRECTIONS_API_KEY", previousDirectionsKey);
  }
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
