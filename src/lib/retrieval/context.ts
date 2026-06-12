import { publicProviderMessage, retrievalError } from "./errors";
import { createCacheKey, normalizeRetrievalInput } from "./normalizers";
import type {
  CacheKind,
  NormalizedRetrievalRequest,
  PlaceCandidate,
  PlaceProvider,
  PlaceSearchRequest,
  PlanningCategory,
  ProviderPlace,
  ProviderRoute,
  RetrievalCache,
  RetrievalContext,
  RetrievalContextInput,
  RouteProvider,
  RouteSkeleton,
} from "./types";

type BuildRetrievalContextOptions = {
  placeProvider: PlaceProvider;
  routeProvider: RouteProvider;
  cache: RetrievalCache;
  now?: () => Date;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function buildRetrievalContext(
  input: RetrievalContextInput,
  options: BuildRetrievalContextOptions,
): Promise<RetrievalContext> {
  const now = options.now ?? (() => new Date());
  const request = normalizeRetrievalInput(input);
  const generatedAt = now().toISOString();
  const candidateGroups = emptyCandidateGroups();
  const errors: RetrievalContext["errors"] = [];
  const warnings: RetrievalContext["warnings"] = [];

  for (const searchRequest of buildPlaceSearchRequests(request)) {
    try {
      candidateGroups[searchRequest.category] = await getPlaceCandidates(searchRequest, options, now);
    } catch (error) {
      errors.push(
        retrievalError(
          "PLACE_SEARCH_UNAVAILABLE",
          publicProviderMessage(error, `Place search unavailable for ${searchRequest.category}.`),
          searchRequest.category,
        ),
      );
    }
  }

  let route: RouteSkeleton | null = null;
  try {
    route = await getRouteSkeleton(request, options, now);
    if (!route) {
      errors.push(retrievalError("ROUTE_UNAVAILABLE", "Route data is unavailable."));
    }
  } catch (error) {
    errors.push(retrievalError("ROUTE_UNAVAILABLE", publicProviderMessage(error, "Route data is unavailable.")));
  }

  return {
    request,
    candidateGroups,
    route,
    warnings,
    errors,
    generatedAt,
  };
}

function buildPlaceSearchRequests(request: NormalizedRetrievalRequest): PlaceSearchRequest[] {
  const interestText = request.interests.length > 0 ? request.interests.join(" ") : "family";
  return [
    { category: "restaurant", textQuery: `${request.budgetLevel} family restaurants ${interestText} in ${request.destinationArea}` },
    { category: "attraction", textQuery: `family attractions ${interestText} in ${request.destinationArea}` },
    { category: "hotel", textQuery: `family hotels in ${request.destinationArea}` },
    { category: "fuel", textQuery: `gas stations between ${request.originAddress} and ${request.destinationArea}` },
    { category: "rest", textQuery: `rest areas between ${request.originAddress} and ${request.destinationArea}` },
  ];
}

async function getPlaceCandidates(
  request: PlaceSearchRequest,
  options: BuildRetrievalContextOptions,
  now: () => Date,
) {
  const searchResult = await getCached(
    options.cache,
    "place_search",
    request,
    () => options.placeProvider.searchText(request),
    now,
  );

  const candidates: PlaceCandidate[] = [];
  for (const place of searchResult.value) {
    if (!place.id) continue;

    const detailResult = await getCached(
      options.cache,
      "place_details",
      { placeId: place.id },
      () => options.placeProvider.getDetails(place.id),
      now,
    );
    const details = detailResult.value ?? place;
    const candidate = toCandidate({ ...place, ...details, category: request.category }, detailResult.cacheStatus);

    if (!candidate.id || candidate.businessStatus === "CLOSED_PERMANENTLY") continue;
    candidates.push(candidate);
  }

  return candidates;
}

async function getRouteSkeleton(
  request: NormalizedRetrievalRequest,
  options: BuildRetrievalContextOptions,
  now: () => Date,
) {
  const routeRequest = { origin: request.originAddress, destination: request.destinationArea };
  const routeResult = await getCached(
    options.cache,
    "route",
    routeRequest,
    () => options.routeProvider.computeRoute(routeRequest),
    now,
  );

  if (!routeResult.value) return null;
  return toRouteSkeleton(routeResult.value, request, routeResult.cacheStatus, now);
}

async function getCached<T>(
  cache: RetrievalCache,
  kind: CacheKind,
  material: unknown,
  load: () => Promise<T>,
  now: () => Date,
) {
  const key = createCacheKey(kind, material);
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const value = await load();
  const expiresAt = new Date(now().getTime() + ONE_DAY_MS);
  cache.set(key, value, expiresAt);
  return {
    value,
    fetchedAt: now().toISOString(),
    expiresAt: expiresAt.toISOString(),
    cacheStatus: "fresh" as const,
  };
}

function toCandidate(place: ProviderPlace, cacheStatus: PlaceCandidate["cacheStatus"]): PlaceCandidate {
  return {
    ...place,
    cacheStatus,
  };
}

function toRouteSkeleton(
  route: ProviderRoute,
  request: NormalizedRetrievalRequest,
  cacheStatus: RouteSkeleton["cacheStatus"],
  now: () => Date,
): RouteSkeleton {
  return {
    ...route,
    origin: request.originAddress,
    destination: request.destinationArea,
    fetchedAt: now().toISOString(),
    cacheStatus,
  };
}

function emptyCandidateGroups(): Record<PlanningCategory, PlaceCandidate[]> {
  return {
    restaurant: [],
    attraction: [],
    hotel: [],
    fuel: [],
    rest: [],
    park: [],
    other: [],
  };
}
