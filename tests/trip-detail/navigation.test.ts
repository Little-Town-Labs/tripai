import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildNavigationLinks,
  getOfficialParkUrl,
} from "../../src/lib/trip-detail/navigation";

test("US2 builds Google Maps and Waze links from coordinates", () => {
  const links = buildNavigationLinks({
    name: "Magic Kingdom Park",
    address: "Bay Lake, FL",
    googlePlaceId: "ChIJ1Y7zH4Zw3YgR5rSZk9XJvBc",
    lat: 28.417663,
    lng: -81.581212,
  });

  assert.equal(
    links.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=28.417663%2C-81.581212&query_place_id=ChIJ1Y7zH4Zw3YgR5rSZk9XJvBc",
  );
  assert.equal(
    links.wazeUrl,
    "https://waze.com/ul?ll=28.417663%2C-81.581212&navigate=yes",
  );
});

test("US2 falls back to text search when coordinates are missing", () => {
  const links = buildNavigationLinks({
    name: "Seed Restaurant",
    address: "1 Test Way, Orlando, FL",
    googlePlaceId: null,
    lat: null,
    lng: null,
  });

  assert.equal(
    links.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=Seed%20Restaurant%201%20Test%20Way%2C%20Orlando%2C%20FL",
  );
  assert.equal(
    links.wazeUrl,
    "https://waze.com/ul?q=Seed%20Restaurant%201%20Test%20Way%2C%20Orlando%2C%20FL&navigate=yes",
  );
});

test("US3 exposes official links for park stops only", () => {
  assert.equal(
    getOfficialParkUrl({ type: "park", website: "https://disneyworld.disney.go.com/destinations/magic-kingdom/" }),
    "https://disneyworld.disney.go.com/destinations/magic-kingdom/",
  );
  assert.equal(
    getOfficialParkUrl({ type: "park", website: null }),
    "https://disneyworld.disney.go.com/",
  );
  assert.equal(
    getOfficialParkUrl({ type: "restaurant", website: "https://example.test" }),
    null,
  );
});
