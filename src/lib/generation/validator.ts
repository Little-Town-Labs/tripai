import type {
  NarratedDraft,
  PlannerDraft,
  ValidationIssue,
  ValidationReport,
} from "./types";
import type { RetrievalContext } from "../retrieval/types";

const IMPERATIVE_PATTERNS = [
  /\byou must\b/i,
  /\brequired stop\b/i,
  /\bdo not skip\b/i,
  /\bhave to\b/i,
];

export function validatePlannerDraft(
  draft: PlannerDraft,
  retrievalContext: RetrievalContext,
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const verifiedPlaceIds = new Set(
    Object.values(retrievalContext.candidateGroups)
      .flat()
      .map((candidate) => candidate.id),
  );
  const seenStops = new Set<string>();
  let hasRestaurant = false;

  if (!draft.days.length) {
    errors.push({ code: "EMPTY_DRAFT", message: "Planner returned no trip days." });
  }

  for (const day of draft.days) {
    if (routeFactsExceedContext(day.totalMiles, day.driveTimeMinutes, retrievalContext)) {
      errors.push({
        code: "ROUTE_FACT_UNVERIFIED",
        message: `Day ${day.dayNumber} contains route facts not supported by retrieval context.`,
      });
    }

    for (const stop of day.stops) {
      const duplicateKey = `${day.dayNumber}:${stop.stableStopKey}`;
      if (seenStops.has(duplicateKey)) {
        errors.push({
          code: "DUPLICATE_STOP",
          message: `Stop ${stop.stableStopKey} is duplicated on day ${day.dayNumber}.`,
        });
      }
      seenStops.add(duplicateKey);

      if (stop.type === "restaurant") hasRestaurant = true;
      if (!["drive", "rest"].includes(stop.type) && !stop.sourcePlaceId) {
        errors.push({
          code: "UNVERIFIED_STOP",
          message: `Stop ${stop.name} is missing a verified place id.`,
        });
      }
      if (stop.sourcePlaceId && !verifiedPlaceIds.has(stop.sourcePlaceId)) {
        errors.push({
          code: "UNVERIFIED_STOP",
          message: `Stop ${stop.name} references unverified place id ${stop.sourcePlaceId}.`,
        });
      }
    }
  }

  if (!hasRestaurant) {
    warnings.push({
      code: "MISSING_REQUIRED_STOP",
      message: "Draft does not include a restaurant stop.",
    });
  }

  return makeReport(errors, warnings);
}

export function validateNarration(draft: NarratedDraft): ValidationReport {
  const errors: ValidationIssue[] = [];
  const texts = [
    draft.title,
    draft.summary,
    ...draft.days.flatMap((day) => [
      day.label,
      day.aiSummary,
      ...day.stops.flatMap((stop) => [stop.description, stop.tips]),
    ]),
  ];

  for (const text of texts) {
    if (IMPERATIVE_PATTERNS.some((pattern) => pattern.test(text))) {
      errors.push({
        code: "IMPERATIVE_COPY",
        message: `Narration contains imperative copy: "${text}"`,
      });
    }
  }

  return makeReport(errors, []);
}

function routeFactsExceedContext(
  totalMiles: number | null,
  driveTimeMinutes: number | null,
  retrievalContext: RetrievalContext,
) {
  if (!retrievalContext.route) {
    return totalMiles !== null || driveTimeMinutes !== null;
  }

  const routeMiles = Math.ceil(retrievalContext.route.distanceMeters / 1609.344);
  const routeMinutes = Math.ceil(retrievalContext.route.durationSeconds / 60);
  return (
    (totalMiles !== null && totalMiles > routeMiles) ||
    (driveTimeMinutes !== null && driveTimeMinutes > routeMinutes)
  );
}

function makeReport(errors: ValidationIssue[], warnings: ValidationIssue[]): ValidationReport {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    retryFeedback: errors.map((error) => error.message),
  };
}
