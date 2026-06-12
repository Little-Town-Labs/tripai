"use server";

import { revalidatePath } from "next/cache";

import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { isScrapbookEnabled } from "@/lib/scrapbook/config";
import {
  createScrapbookNote,
  createStopRating,
} from "@/lib/scrapbook/service";
import type {
  NoteFieldErrors,
  RatingFieldErrors,
} from "@/lib/scrapbook/validation";
import {
  commitTripRevision,
  markStopVisited,
  requestTripRevision,
  restorePreviousRevision,
  type RevisionGenerator,
} from "@/lib/revisions/service";

export type NoteActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: NoteFieldErrors;
};

export type RatingActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: RatingFieldErrors;
};

export type RevisionActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: { requestText?: string; mode?: string; preservation?: string };
};

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to save scrapbook contributions.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export async function createTripNoteAction(
  tripId: string,
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  if (!isScrapbookEnabled()) {
    return {
      status: "error",
      message: "Scrapbook notes are not enabled yet.",
    };
  }

  try {
    const owner = await requireCurrentOwner();
    const result = await createScrapbookNote(getAppPool(), owner.id, {
      tripId,
      dayId: optionalStringField(formData, "dayId"),
      stopId: optionalStringField(formData, "stopId"),
      content: formData.get("content"),
    });

    if (result.ok) {
      revalidatePath(`/app/trips/${tripId}`);
      return {
        status: "success",
        message: "Note saved.",
      };
    }

    if (result.reason === "invalid") {
      return {
        status: "error",
        message: "Check the note before saving.",
        fieldErrors: result.fieldErrors,
      };
    }

    return {
      status: "error",
      message: result.reason === "not_purchased"
        ? "Scrapbook notes unlock after purchase."
        : "We could not find that trip for your account.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not save that note right now.",
    };
  }
}

function optionalStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

export async function createStopRatingAction(
  tripId: string,
  _prevState: RatingActionState,
  formData: FormData,
): Promise<RatingActionState> {
  if (!isScrapbookEnabled()) {
    return {
      status: "error",
      message: "Scrapbook ratings are not enabled yet.",
    };
  }

  try {
    const owner = await requireCurrentOwner();
    const result = await createStopRating(getAppPool(), owner.id, {
      tripId,
      stopId: String(formData.get("stopId") ?? ""),
      stars: formData.get("stars"),
      text: formData.get("text"),
    });

    if (result.ok) {
      revalidatePath(`/app/trips/${tripId}`);
      return {
        status: "success",
        message: "Rating saved.",
      };
    }

    if (result.reason === "invalid") {
      return {
        status: "error",
        message: "Check the rating before saving.",
        fieldErrors: result.fieldErrors,
      };
    }

    return {
      status: "error",
      message: result.reason === "not_purchased"
        ? "Scrapbook ratings unlock after purchase."
        : "We could not find that trip for your account.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not save that rating right now.",
    };
  }
}

export async function requestPlanningRevisionAction(
  tripId: string,
  _prevState: RevisionActionState,
  formData: FormData,
): Promise<RevisionActionState> {
  return requestRevisionAction(tripId, "planning", formData);
}

export async function requestMidTripRevisionAction(
  tripId: string,
  _prevState: RevisionActionState,
  formData: FormData,
): Promise<RevisionActionState> {
  return requestRevisionAction(tripId, "mid_trip", formData);
}

async function requestRevisionAction(
  tripId: string,
  mode: "planning" | "mid_trip",
  formData: FormData,
): Promise<RevisionActionState> {
  try {
    const owner = await requireCurrentOwner();
    const result = await requestTripRevision(
      getAppPool(),
      owner.id,
      {
        tripId,
        mode,
        requestText: formData.get("requestText"),
      },
      { generator: cloneVerifiedRouteGenerator },
    );

    if (result.ok) {
      revalidatePath(`/app/trips/${tripId}`);
      return {
        status: "success",
        message: result.candidate.canCommit
          ? "Revision candidate is ready to review."
          : "Revision candidate is ready. Review preservation choices before committing.",
      };
    }

    if (result.reason === "invalid") {
      return {
        status: "error",
        message: "Check the revision request before submitting.",
        fieldErrors: result.fieldErrors,
      };
    }

    return {
      status: "error",
      message: revisionReasonMessage(result.reason),
    };
  } catch {
    return {
      status: "error",
      message: "We could not request a revision right now.",
    };
  }
}

export async function commitRevisionAction(
  tripId: string,
  _prevState: RevisionActionState,
  formData: FormData,
): Promise<RevisionActionState> {
  try {
    const owner = await requireCurrentOwner();
    const result = await commitTripRevision(getAppPool(), owner.id, {
      tripId,
      revisionId: String(formData.get("revisionId") ?? ""),
      preservationDecisions: preservationDecisionsFromForm(formData),
    });

    if (result.ok) {
      revalidatePath(`/app/trips/${tripId}`);
      return {
        status: "success",
        message: "Revision committed.",
      };
    }

    return {
      status: "error",
      message: result.reason === "preservation_required"
        ? "Choose how to preserve affected scrapbook contributions before committing."
        : revisionReasonMessage(result.reason),
      fieldErrors: result.reason === "preservation_required"
        ? { preservation: "Choose day or trip preservation for every affected stop." }
        : undefined,
    };
  } catch {
    return {
      status: "error",
      message: "We could not commit that revision right now.",
    };
  }
}

export async function restorePreviousRevisionAction(
  tripId: string,
  prevState: RevisionActionState,
): Promise<RevisionActionState> {
  void prevState;
  try {
    const owner = await requireCurrentOwner();
    const result = await restorePreviousRevision(getAppPool(), owner.id, { tripId });

    if (result.ok) {
      revalidatePath(`/app/trips/${tripId}`);
      return {
        status: "success",
        message: "Previous version restored.",
      };
    }

    return {
      status: "error",
      message: revisionReasonMessage(result.reason),
    };
  } catch {
    return {
      status: "error",
      message: "We could not restore the previous version right now.",
    };
  }
}

export async function markStopVisitedAction(
  tripId: string,
  formData: FormData,
) {
  try {
    const owner = await requireCurrentOwner();
    await markStopVisited(getAppPool(), owner.id, {
      tripId,
      stopId: String(formData.get("stopId") ?? ""),
      checked: formData.get("checked") === "true",
    });
    revalidatePath(`/app/trips/${tripId}`);
  } catch {
    return;
  }
}

const cloneVerifiedRouteGenerator: RevisionGenerator = async (input) => ({
  summary: `Consider this revision request: ${input.requestText}`,
  days: input.currentDays.map((day) => ({
    dayNumber: day.dayNumber,
    date: day.date,
    label: day.label,
    fromLocation: day.fromLocation,
    toLocation: day.toLocation,
    totalMiles: day.totalMiles,
    driveTimeMinutes: day.driveTimeMinutes,
    aiSummary: day.aiSummary,
    stops: day.stops.map((stop) => ({
      stableStopKey: stop.stableStopKey,
      orderIndex: stop.orderIndex,
      name: stop.name,
      type: stop.type,
      googlePlaceId: stop.googlePlaceId,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      eta: stop.eta,
      description: stop.description,
      tips: stop.tips,
      priceLevel: stop.priceLevel,
      googleRating: stop.googleRating,
      hoursSummary: stop.hoursSummary,
      phone: stop.phone,
      website: stop.website,
      checked: stop.checked,
    })),
  })),
});

function preservationDecisionsFromForm(formData: FormData) {
  return formData.getAll("stableStopKey").map((value) => {
    const stableStopKey = String(value);
    return {
      stableStopKey,
      targetScope: formData.get(`targetScope:${stableStopKey}`),
    };
  });
}

function revisionReasonMessage(reason: string) {
  switch (reason) {
    case "not_found":
      return "We could not find that trip for your account.";
    case "not_purchased":
      return "Revisions unlock after purchase.";
    case "limit_reached":
      return "No free revision rounds remain for this mode.";
    case "not_ready":
      return "This trip is not ready for that revision mode.";
    case "candidate_not_found":
      return "That revision candidate is no longer available.";
    case "stale_candidate":
      return "A newer revision started. Review the latest trip before committing.";
    case "previous_not_found":
      return "There is no previous version available to restore.";
    case "generation_failed":
      return "The revision candidate could not be prepared.";
    default:
      return "We could not complete that revision action.";
  }
}
