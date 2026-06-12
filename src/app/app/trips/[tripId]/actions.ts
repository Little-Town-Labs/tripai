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
