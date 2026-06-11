"use server";

import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { createTripIntakeDraft } from "@/lib/intake/service";
import { type IntakeFieldErrors, validateTripIntakeInput } from "@/lib/intake/validation";

export type IntakeActionState = {
  status?: "success" | "error";
  intakeId?: string;
  message?: string;
  fieldErrors?: IntakeFieldErrors;
  values?: Record<string, string | string[]>;
};

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to save trip intake drafts.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

function formInput(formData: FormData) {
  return {
    originAddress: formData.get("originAddress"),
    destinationArea: formData.get("destinationArea"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    partyAdults: formData.get("partyAdults"),
    partyChildren: formData.get("partyChildren"),
    childrenAges: formData.get("childrenAges"),
    interests: formData.getAll("interests"),
    budgetLevel: formData.get("budgetLevel"),
    dietaryNeeds: formData.get("dietaryNeeds"),
    mobilityNotes: formData.get("mobilityNotes"),
    travelStyle: formData.get("travelStyle"),
    additionalConstraints: formData.get("additionalConstraints"),
  };
}

function isE2EBypass() {
  return process.env.TRIPAI_E2E_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production";
}

export async function saveTripIntakeAction(
  _prevState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const input = formInput(formData);
  const parsed = validateTripIntakeInput(input);

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted answers before saving.",
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  if (isE2EBypass()) {
    return {
      status: "success",
      intakeId: "00000000-0000-4000-8000-000000000004",
      message: "Ready for trip generation.",
    };
  }

  try {
    const owner = await requireCurrentOwner();
    const draft = await createTripIntakeDraft(getAppPool(), owner.id, parsed.values);

    return {
      status: "success",
      intakeId: draft.id,
      message: "Ready for trip generation.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not save your intake right now. Your answers are still here so you can try again.",
      fieldErrors: {},
      values: input as Record<string, string | string[]>,
    };
  }
}
