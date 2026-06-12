"use server";

import { revalidatePath } from "next/cache";

import { createPool } from "@/db/client";
import {
  createSharedNote,
  createSharedRating,
} from "@/lib/sharing/service";
import type {
  SharedNoteFieldErrors,
  SharedRatingFieldErrors,
} from "@/lib/sharing/validation";

export type SharedNoteActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: SharedNoteFieldErrors;
};

export type SharedRatingActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: SharedRatingFieldErrors;
};

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to save shared contributions.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export async function createSharedNoteAction(
  token: string,
  tripId: string,
  _prevState: SharedNoteActionState,
  formData: FormData,
): Promise<SharedNoteActionState> {
  try {
    const result = await createSharedNote(getAppPool(), {
      token,
      tripId,
      dayId: optionalStringField(formData, "dayId"),
      stopId: optionalStringField(formData, "stopId"),
      displayName: formData.get("displayName"),
      content: formData.get("content"),
    });

    if (result.ok) {
      revalidatePath(`/share/${token}`);
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
      message: "This shared trip is not available.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not save that note right now.",
    };
  }
}

export async function createSharedRatingAction(
  token: string,
  tripId: string,
  _prevState: SharedRatingActionState,
  formData: FormData,
): Promise<SharedRatingActionState> {
  try {
    const result = await createSharedRating(getAppPool(), {
      token,
      tripId,
      stopId: String(formData.get("stopId") ?? ""),
      displayName: formData.get("displayName"),
      stars: formData.get("stars"),
      text: formData.get("text"),
    });

    if (result.ok) {
      revalidatePath(`/share/${token}`);
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
      message: "This shared trip is not available.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not save that rating right now.",
    };
  }
}

function optionalStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}
