import type { RevisionMode } from "./config";

export const REVISION_REQUEST_MAX_LENGTH = 1200;

export type RevisionRequestFieldErrors = {
  requestText?: string;
};

export type RevisionModeFieldErrors = {
  mode?: string;
};

export type PreservationFieldErrors = {
  preservation?: string;
};

export type PreservationDecision = {
  stableStopKey: string;
  targetScope: "day" | "trip";
};

export function validateRevisionRequestText(input: unknown):
  | { ok: true; value: string }
  | { ok: false; fieldErrors: RevisionRequestFieldErrors } {
  if (typeof input !== "string" || input.trim().length === 0) {
    return {
      ok: false,
      fieldErrors: { requestText: "Describe what you would like to adjust." },
    };
  }

  const value = input.trim();
  if (value.length > REVISION_REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      fieldErrors: { requestText: `Keep revision requests under ${REVISION_REQUEST_MAX_LENGTH} characters.` },
    };
  }

  return { ok: true, value };
}

export function validateRevisionMode(input: unknown):
  | { ok: true; value: RevisionMode }
  | { ok: false; fieldErrors: RevisionModeFieldErrors } {
  if (input === "planning" || input === "mid_trip") {
    return { ok: true, value: input };
  }

  return {
    ok: false,
    fieldErrors: { mode: "Choose planning or mid-trip revision mode." },
  };
}

export function validatePreservationDecisions(input: unknown):
  | { ok: true; value: PreservationDecision[] }
  | { ok: false; fieldErrors: PreservationFieldErrors } {
  if (!Array.isArray(input)) {
    return { ok: true, value: [] };
  }

  const value: PreservationDecision[] = [];
  for (const item of input) {
    if (!isRecord(item)) {
      return invalidPreservation();
    }
    const stableStopKey = item.stableStopKey;
    const targetScope = item.targetScope;
    if (
      typeof stableStopKey !== "string" ||
      stableStopKey.trim().length === 0 ||
      (targetScope !== "day" && targetScope !== "trip")
    ) {
      return invalidPreservation();
    }
    value.push({ stableStopKey: stableStopKey.trim(), targetScope });
  }

  return { ok: true, value };
}

function invalidPreservation() {
  return {
    ok: false as const,
    fieldErrors: { preservation: "Choose day or trip preservation for every affected stop." },
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
