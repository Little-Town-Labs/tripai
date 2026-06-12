import type { NormalizedRetrievalRequest, RetrievalContext } from "../retrieval/types";

export type GenerationStage =
  | "retrieval"
  | "planning"
  | "validating"
  | "retrying"
  | "narrating"
  | "persisting"
  | "succeeded"
  | "failed";

export type GenerationProgressEvent = {
  sequence: number;
  stage: GenerationStage;
  message: string;
  createdAt: string;
};

export type GenerateTripInput = {
  ownerId: string;
  intakeId: string;
  intake: NormalizedRetrievalRequest;
  retrievalContext: RetrievalContext;
  maxPlannerRetries?: number;
};

export type PlannerPromptInput = {
  intake: NormalizedRetrievalRequest;
  retrievalContext: RetrievalContext;
  validationFeedback: string[];
};

export type NarratorPromptInput = {
  draft: PlannerDraft;
  retrievalContext: RetrievalContext;
};

export type PromptMessages = {
  system: string;
  user: string;
};

export type DraftStopType =
  | "drive"
  | "fuel"
  | "restaurant"
  | "attraction"
  | "hotel"
  | "rest"
  | "park"
  | "other";

export type PlannerStopDraft = {
  stableStopKey: string;
  orderIndex: number;
  name: string;
  type: DraftStopType;
  sourcePlaceId: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  eta: string | null;
  priceLevel: number | null;
  googleRating: number | null;
  hoursSummary: string | null;
};

export type PlannerDayDraft = {
  dayNumber: number;
  date: string;
  label: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalMiles: number | null;
  driveTimeMinutes: number | null;
  stops: PlannerStopDraft[];
};

export type PlannerDraft = {
  title: string;
  summary: string;
  days: PlannerDayDraft[];
};

export type NarratedStopDraft = PlannerStopDraft & {
  description: string;
  tips: string;
};

export type NarratedDayDraft = Omit<PlannerDayDraft, "stops"> & {
  aiSummary: string;
  stops: NarratedStopDraft[];
};

export type NarratedDraft = Omit<PlannerDraft, "days"> & {
  days: NarratedDayDraft[];
};

export type ValidationErrorCode =
  | "EMPTY_DRAFT"
  | "UNVERIFIED_STOP"
  | "ROUTE_FACT_UNVERIFIED"
  | "MISSING_REQUIRED_STOP"
  | "DUPLICATE_STOP"
  | "IMPERATIVE_COPY";

export type ValidationIssue = {
  code: ValidationErrorCode;
  message: string;
};

export type ValidationReport = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  retryFeedback: string[];
};

export type GenerationFailureCode =
  | "PROVIDER_CONFIGURATION"
  | "PROVIDER_ERROR"
  | "PLANNER_VALIDATION_FAILED"
  | "NARRATION_VALIDATION_FAILED"
  | "PERSISTENCE_FAILED";

export type GenerationFailure = {
  code: GenerationFailureCode;
  stage: GenerationStage;
  message: string;
  retryable: boolean;
};

export type GenerateTripResult =
  | {
      ok: true;
      tripId: string;
      revisionId: string;
      progress: GenerationProgressEvent[];
    }
  | {
      ok: false;
      failure: GenerationFailure;
      progress: GenerationProgressEvent[];
    };

export type AiGenerationProvider = {
  createPlannerDraft(input: PlannerPromptInput): Promise<PlannerDraft>;
  createNarration(input: NarratorPromptInput): Promise<NarratedDraft>;
};

export type GenerationPersistence = {
  saveValidatedDraft(input: {
    ownerId: string;
    intakeId: string;
    draft: NarratedDraft;
  }): Promise<{ tripId: string; revisionId: string }>;
};
