export const PLANNING_REVISION_LIMIT = 2;
export const MID_TRIP_REVISION_LIMIT = 3;

export type RevisionMode = "planning" | "mid_trip";

export function modeToRevisionKind(mode: RevisionMode) {
  return mode === "planning" ? "post_purchase" : "mid_trip";
}

export function remainingRevisions(mode: RevisionMode, used: number) {
  const limit = mode === "planning" ? PLANNING_REVISION_LIMIT : MID_TRIP_REVISION_LIMIT;
  return Math.max(0, limit - used);
}
