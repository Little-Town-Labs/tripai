import { RetrievalProviderError } from "./errors";
import type {
  LatLng,
  PlaceProvider,
  PlaceSearchRequest,
  ProviderPlace,
  ProviderRoute,
  ProviderRouteSegment,
  RouteProvider,
  RouteRequest,
} from "./types";

type FetchLike = typeof fetch;

type GoogleMapsProviderOptions = {
  apiKey?: string;
  fetch?: FetchLike;
  now?: () => Date;
};

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "businessStatus",
  "rating",
  "userRatingCount",
  "priceLevel",
  "types",
  "websiteUri",
  "internationalPhoneNumber",
  "regularOpeningHours",
  "currentOpeningHours",
].join(",");

const ROUTE_FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.polyline.encodedPolyline",
  "routes.legs.distanceMeters",
  "routes.legs.duration",
  "routes.legs.startLocation",
  "routes.legs.endLocation",
].join(",");

export class GoogleMapsProvider implements PlaceProvider, RouteProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;

  constructor(options: GoogleMapsProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY ?? "";
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async searchText(request: PlaceSearchRequest): Promise<ProviderPlace[]> {
    const response = await this.requestJson<{ places?: unknown[] }>(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: this.headers(SEARCH_FIELD_MASK),
        body: JSON.stringify({ textQuery: request.textQuery }),
      },
    );

    return (response.places ?? []).map((place) => mapGooglePlace(place, request.category, this.now()));
  }

  async getDetails(placeId: string): Promise<ProviderPlace | null> {
    const response = await this.requestJson<unknown>(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: this.headers(DETAILS_FIELD_MASK),
    });

    return mapGooglePlace(response, "other", this.now());
  }

  async computeRoute(request: RouteRequest): Promise<ProviderRoute | null> {
    const response = await this.requestJson<{ routes?: unknown[] }>(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: this.headers(ROUTE_FIELD_MASK),
        body: JSON.stringify({
          origin: { address: request.origin },
          destination: { address: request.destination },
          travelMode: "DRIVE",
        }),
      },
    );
    const route = response.routes?.[0];
    if (!route || typeof route !== "object") return null;

    const record = route as Record<string, unknown>;
    const distanceMeters = numberOrNull(record.distanceMeters);
    const durationSeconds = parseGoogleDuration(record.duration);
    if (distanceMeters === null || durationSeconds === null) return null;

    return {
      source: "google_routes",
      distanceMeters,
      durationSeconds,
      polyline: nestedString(record.polyline, "encodedPolyline"),
      segments: Array.isArray(record.legs) ? record.legs.map(mapGoogleRouteSegment) : [],
    };
  }

  private headers(fieldMask: string) {
    if (!this.apiKey) {
      throw new RetrievalProviderError("CONFIGURATION_ERROR", "Google Maps API key is not configured.");
    }

    return new Headers({
      "Content-Type": "application/json",
      "X-Goog-Api-Key": this.apiKey,
      "X-Goog-FieldMask": fieldMask,
    });
  }

  private async requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(url, init);
    if (!response.ok) {
      throw new RetrievalProviderError("PROVIDER_ERROR", `Google Maps provider returned HTTP ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}

function mapGooglePlace(place: unknown, category: ProviderPlace["category"], fetchedAt: Date): ProviderPlace {
  const record = (place ?? {}) as Record<string, unknown>;
  return {
    id: stringOrEmpty(record.id),
    source: "google_places",
    name: displayName(record.displayName),
    address: stringOrNull(record.formattedAddress),
    location: mapLatLng(record.location),
    category,
    businessStatus: stringOrNull(record.businessStatus),
    rating: numberOrNull(record.rating),
    ratingCount: numberOrNull(record.userRatingCount),
    priceLevel: mapPriceLevel(record.priceLevel),
    types: Array.isArray(record.types) ? record.types.filter((item): item is string => typeof item === "string") : [],
    website: stringOrNull(record.websiteUri),
    phone: stringOrNull(record.internationalPhoneNumber),
    hoursSummary: openingHoursSummary(record.currentOpeningHours) ?? openingHoursSummary(record.regularOpeningHours),
    fetchedAt: fetchedAt.toISOString(),
  };
}

function mapGoogleRouteSegment(segment: unknown): ProviderRouteSegment {
  const record = (segment ?? {}) as Record<string, unknown>;
  return {
    distanceMeters: numberOrNull(record.distanceMeters),
    durationSeconds: parseGoogleDuration(record.duration),
    startLocation: mapLatLng((record.startLocation as Record<string, unknown> | undefined)?.latLng),
    endLocation: mapLatLng((record.endLocation as Record<string, unknown> | undefined)?.latLng),
  };
}

function displayName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { text?: unknown }).text === "string") {
    return (value as { text: string }).text;
  }
  return "";
}

function mapLatLng(value: unknown): LatLng | null {
  const record = value as Record<string, unknown> | null;
  const lat = numberOrNull(record?.latitude);
  const lng = numberOrNull(record?.longitude);
  return lat === null || lng === null ? null : { lat, lng };
}

function mapPriceLevel(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[value] ?? null;
}

function openingHoursSummary(value: unknown) {
  const descriptions = (value as { weekdayDescriptions?: unknown } | null)?.weekdayDescriptions;
  if (!Array.isArray(descriptions)) return null;
  return descriptions.filter((item): item is string => typeof item === "string").join("; ") || null;
}

function parseGoogleDuration(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : null;
}

function nestedString(value: unknown, key: string) {
  const nested = value as Record<string, unknown> | null;
  return stringOrNull(nested?.[key]);
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
