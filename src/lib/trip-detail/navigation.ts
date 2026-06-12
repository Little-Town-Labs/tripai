export const DISNEY_WORLD_OFFICIAL_URL = "https://disneyworld.disney.go.com/";

export type NavigationStopInput = {
  name: string;
  address: string | null;
  googlePlaceId: string | null;
  lat: number | null;
  lng: number | null;
};

export type NavigationLinks = {
  googleMapsUrl: string;
  wazeUrl: string;
};

export function buildNavigationLinks(stop: NavigationStopInput): NavigationLinks {
  const hasCoordinates = typeof stop.lat === "number" && typeof stop.lng === "number";
  const query = hasCoordinates
    ? `${stop.lat},${stop.lng}`
    : [stop.name, stop.address].filter(Boolean).join(" ");
  const encodedQuery = encodeURIComponent(query);
  const placeId = stop.googlePlaceId ? `&query_place_id=${encodeURIComponent(stop.googlePlaceId)}` : "";

  return {
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}${placeId}`,
    wazeUrl: hasCoordinates
      ? `https://waze.com/ul?ll=${encodedQuery}&navigate=yes`
      : `https://waze.com/ul?q=${encodedQuery}&navigate=yes`,
  };
}

export function getOfficialParkUrl({
  type,
  website,
}: {
  type: string;
  website: string | null;
}) {
  if (type !== "park") {
    return null;
  }

  return website || DISNEY_WORLD_OFFICIAL_URL;
}
