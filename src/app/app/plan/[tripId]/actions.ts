"use server";

import { revalidatePath } from "next/cache";

import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { requestPrePurchaseRevision } from "@/lib/plan-review/service";

export type RevisionRequestActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: {
    requestText?: string;
  };
};

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to request plan revisions.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export async function requestPlanRevisionAction(
  tripId: string,
  _prevState: RevisionRequestActionState,
  formData: FormData,
): Promise<RevisionRequestActionState> {
  try {
    const owner = await requireCurrentOwner();
    const result = await requestPrePurchaseRevision(getAppPool(), owner.id, {
      tripId,
      requestText: formData.get("requestText"),
    });

    if (result.ok) {
      revalidatePath(`/app/plan/${tripId}`);
      return {
        status: "success",
        message: "Revision request saved. The current version stays available while the next draft is prepared.",
      };
    }

    if (result.reason === "invalid") {
      return {
        status: "error",
        message: "Check the revision request before saving.",
        fieldErrors: result.fieldErrors,
      };
    }

    const messageByReason = {
      already_purchased: "This trip has already been purchased, so future changes use the post-purchase revision flow.",
      not_found: "We could not find that trip for your account.",
      not_ready: "The first draft needs to finish before requesting a revision.",
    } satisfies Record<typeof result.reason, string>;

    return {
      status: "error",
      message: messageByReason[result.reason],
    };
  } catch {
    return {
      status: "error",
      message: "We could not save that revision request right now.",
    };
  }
}
