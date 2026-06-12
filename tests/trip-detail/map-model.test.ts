import assert from "node:assert/strict";
import test from "node:test";

import type { TripDetail } from "../../src/lib/trip-detail/service";
import { buildTripMapStops } from "../../src/components/trip/trip-map-model";

test("builds ordered map stops only when coordinates are present", () => {
  const detail = {
    days: [
      {
        dayNumber: 1,
        stops: [
          stop({ id: "stop-1", orderIndex: 0, name: "Lunch", lat: 28.37, lng: -81.55 }),
          stop({ id: "stop-2", orderIndex: 1, name: "Missing coordinates", lat: null, lng: null }),
        ],
      },
      {
        dayNumber: 2,
        stops: [stop({ id: "stop-3", orderIndex: 0, name: "Park", lat: 28.42, lng: -81.58 })],
      },
    ],
  } as TripDetail;

  assert.deepEqual(buildTripMapStops(detail), [
    {
      id: "stop-1",
      dayNumber: 1,
      orderIndex: 0,
      name: "Lunch",
      type: "meal",
      lat: 28.37,
      lng: -81.55,
    },
    {
      id: "stop-3",
      dayNumber: 2,
      orderIndex: 0,
      name: "Park",
      type: "meal",
      lat: 28.42,
      lng: -81.58,
    },
  ]);
});

function stop(input: {
  id: string;
  orderIndex: number;
  name: string;
  lat: number | null;
  lng: number | null;
}) {
  return {
    id: input.id,
    stableStopKey: input.id,
    orderIndex: input.orderIndex,
    name: input.name,
    type: "meal",
    googlePlaceId: null,
    lat: input.lat,
    lng: input.lng,
    address: null,
    eta: null,
    description: null,
    tips: null,
    priceLevel: null,
    googleRating: null,
    hoursSummary: null,
    phone: null,
    website: null,
    checked: false,
    isCurrent: false,
    isNext: false,
    nextStopName: null,
    navigation: {
      googleMapsUrl: "https://www.google.com/maps",
      wazeUrl: "https://waze.com",
    },
    officialParkUrl: null,
  };
}
