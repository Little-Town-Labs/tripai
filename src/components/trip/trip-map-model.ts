export type TripMapStop = {
  id: string;
  dayNumber: number;
  orderIndex: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
};

type TripMapSource = {
  days: Array<{
    dayNumber: number;
    stops: Array<{
      id: string;
      orderIndex: number;
      name: string;
      type: string;
      lat: number | null;
      lng: number | null;
    }>;
  }>;
};

export function buildTripMapStops(detail: TripMapSource): TripMapStop[] {
  return detail.days.flatMap((day) =>
    day.stops
      .filter((stop) => typeof stop.lat === "number" && typeof stop.lng === "number")
      .map((stop) => ({
        id: stop.id,
        dayNumber: day.dayNumber,
        orderIndex: stop.orderIndex,
        name: stop.name,
        type: stop.type,
        lat: stop.lat as number,
        lng: stop.lng as number,
      })),
  );
}
