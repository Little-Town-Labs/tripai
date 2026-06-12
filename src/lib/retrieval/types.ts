export type BudgetLevel = "budget" | "moderate" | "premium";
export type TravelStyle = "packed" | "relaxed" | "balanced";
export type MobilityCategory = "none" | "stroller" | "accessibility" | "general";
export type PlanningCategory = "restaurant" | "attraction" | "hotel" | "fuel" | "rest" | "park" | "other";
export type CacheKind = "place_search" | "place_details" | "route";
export type CacheStatus = "fresh" | "cached" | "unavailable";
export type SourceName = "google_places" | "google_routes";

export type RetrievalContextInput = {
  originAddress: string;
  destinationArea: string;
  startDate: string;
  endDate: string;
  partyAdults: number;
  partyChildren: number;
  childrenAges: number[];
  interests: string[];
  budgetLevel: BudgetLevel;
  dietaryNeeds: string[];
  mobilityNotes?: string | null;
  travelStyle: TravelStyle;
};

export type NormalizedRetrievalRequest = {
  originAddress: string;
  destinationArea: string;
  startDate: string;
  endDate: string;
  partyAdults: number;
  partyChildren: number;
  childrenAges: number[];
  interests: string[];
  budgetLevel: BudgetLevel;
  dietaryNeeds: string[];
  mobilityCategory: MobilityCategory;
  travelStyle: TravelStyle;
};

export type LatLng = {
  lat: number;
  lng: number;
};

export type PlaceSearchRequest = {
  textQuery: string;
  category: PlanningCategory;
};

export type RouteRequest = {
  origin: string;
  destination: string;
};

export type ProviderPlace = {
  id: string;
  source: "google_places";
  name: string;
  address: string | null;
  location: LatLng | null;
  category: PlanningCategory;
  businessStatus: string | null;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: number | null;
  types: string[];
  website?: string | null;
  phone?: string | null;
  hoursSummary?: string | null;
  fetchedAt: string;
};

export type ProviderRouteSegment = {
  distanceMeters: number | null;
  durationSeconds: number | null;
  startLocation?: LatLng | null;
  endLocation?: LatLng | null;
};

export type ProviderRoute = {
  source: "google_routes";
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
  segments: ProviderRouteSegment[];
};

export type PlaceCandidate = ProviderPlace & {
  cacheStatus: CacheStatus;
};

export type RouteSkeleton = ProviderRoute & {
  origin: string;
  destination: string;
  fetchedAt: string;
  cacheStatus: CacheStatus;
};

export type RetrievalWarning = {
  code: string;
  message: string;
  category?: PlanningCategory;
};

export type RetrievalErrorCode =
  | "CONFIGURATION_ERROR"
  | "PLACE_SEARCH_UNAVAILABLE"
  | "PLACE_DETAILS_UNAVAILABLE"
  | "ROUTE_UNAVAILABLE"
  | "PROVIDER_ERROR";

export type RetrievalError = {
  code: RetrievalErrorCode;
  message: string;
  category?: PlanningCategory;
};

export type RetrievalContext = {
  request: NormalizedRetrievalRequest;
  candidateGroups: Record<PlanningCategory, PlaceCandidate[]>;
  route: RouteSkeleton | null;
  warnings: RetrievalWarning[];
  errors: RetrievalError[];
  generatedAt: string;
};

export type CachedValue<T> = {
  value: T;
  fetchedAt: string;
  expiresAt: string;
  cacheStatus: "cached";
};

export type RetrievalCache = {
  get<T>(key: string): CachedValue<T> | null;
  set<T>(key: string, value: T, expiresAt: Date): void;
};

export type PlaceProvider = {
  searchText(request: PlaceSearchRequest): Promise<ProviderPlace[]>;
  getDetails(placeId: string): Promise<ProviderPlace | null>;
};

export type RouteProvider = {
  computeRoute(request: RouteRequest): Promise<ProviderRoute | null>;
};
