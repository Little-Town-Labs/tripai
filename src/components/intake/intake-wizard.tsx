"use client";

import { useActionState, useMemo, useState } from "react";
import type { MouseEvent } from "react";

import { saveTripIntakeAction } from "@/app/app/intake/actions";
import {
  budgetLevels,
  intakeInterests,
  travelStyles,
  validateTripIntakeInput,
  type IntakeFieldErrors,
} from "@/lib/intake/validation";

import { FieldError, SelectField, TextAreaField, TextField } from "./intake-fields";

type WizardValues = {
  originAddress: string;
  destinationArea: string;
  startDate: string;
  endDate: string;
  partyAdults: string;
  partyChildren: string;
  childrenAges: string;
  interests: string[];
  budgetLevel: string;
  dietaryNeeds: string;
  mobilityNotes: string;
  travelStyle: string;
  additionalConstraints: string;
};

const initialValues: WizardValues = {
  originAddress: "",
  destinationArea: "",
  startDate: "",
  endDate: "",
  partyAdults: "2",
  partyChildren: "0",
  childrenAges: "",
  interests: [],
  budgetLevel: "moderate",
  dietaryNeeds: "",
  mobilityNotes: "",
  travelStyle: "balanced",
  additionalConstraints: "",
};

const steps = [
  {
    title: "Route",
    fields: ["originAddress", "destinationArea"],
  },
  {
    title: "Dates",
    fields: ["startDate", "endDate"],
  },
  {
    title: "Family",
    fields: ["partyAdults", "partyChildren", "childrenAges"],
  },
  {
    title: "Preferences",
    fields: ["interests", "budgetLevel", "travelStyle"],
  },
  {
    title: "Constraints",
    fields: ["dietaryNeeds", "mobilityNotes", "additionalConstraints"],
  },
] as const;

export function IntakeWizard() {
  const [actionState, formAction, pending] = useActionState(saveTripIntakeAction, {});
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<IntakeFieldErrors>({});
  const errors = actionState.fieldErrors ?? clientErrors;
  const currentStep = steps[step];

  const progress = useMemo(() => `${step + 1} of ${steps.length}`, [step]);

  function update<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setClientErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validateStep() {
    const result = validateTripIntakeInput(values);
    if (result.ok) {
      setClientErrors({});
      return true;
    }

    const stepErrors = Object.fromEntries(
      Object.entries(result.fieldErrors).filter(([field]) => (currentStep.fields as readonly string[]).includes(field)),
    );
    setClientErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function goNext(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (validateStep()) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  }

  if (actionState.status === "success") {
    return (
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">Ready for trip generation</p>
        <h2 className="mt-2 text-2xl font-semibold">Your intake is saved</h2>
        <p className="mt-3 leading-7">
          {actionState.message} Draft ID: <span className="font-mono text-sm">{actionState.intakeId}</span>
        </p>
      </section>
    );
  }

  return (
    <form action={formAction} className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">Step {progress}</p>
          <h2 className="mt-1 text-2xl font-semibold">{currentStep.title}</h2>
        </div>
        <div className="flex gap-1" aria-label="Intake progress">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`h-2 w-8 rounded-full ${index <= step ? "bg-emerald-800" : "bg-stone-200"}`}
            />
          ))}
        </div>
      </div>

      {actionState.status === "error" && actionState.message ? (
        <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{actionState.message}</p>
      ) : null}

      <div hidden={step !== 0} className="grid gap-4">
        <TextField
          label="Starting point"
          name="originAddress"
          value={values.originAddress}
          error={errors.originAddress}
          onChange={(value) => update("originAddress", value)}
        />
        <TextField
          label="Destination area"
          name="destinationArea"
          value={values.destinationArea}
          error={errors.destinationArea}
          onChange={(value) => update("destinationArea", value)}
        />
      </div>

      <div hidden={step !== 1} className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Start date"
          name="startDate"
          type="date"
          value={values.startDate}
          error={errors.startDate}
          onChange={(value) => update("startDate", value)}
        />
        <TextField
          label="End date"
          name="endDate"
          type="date"
          value={values.endDate}
          error={errors.endDate}
          onChange={(value) => update("endDate", value)}
        />
      </div>

      <div hidden={step !== 2} className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Adults"
          name="partyAdults"
          type="number"
          min={0}
          value={values.partyAdults}
          error={errors.partyAdults}
          onChange={(value) => update("partyAdults", value)}
        />
        <TextField
          label="Children"
          name="partyChildren"
          type="number"
          min={0}
          value={values.partyChildren}
          error={errors.partyChildren}
          onChange={(value) => update("partyChildren", value)}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Children's ages"
            name="childrenAges"
            value={values.childrenAges}
            error={errors.childrenAges}
            onChange={(value) => update("childrenAges", value)}
          />
        </div>
      </div>

      <div hidden={step !== 3} className="grid gap-5">
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-stone-800">Interests</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {intakeInterests.map((interest) => (
              <label
                key={interest}
                className="flex min-h-11 items-center gap-3 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800"
              >
                <input
                  name="interests"
                  value={interest}
                  type="checkbox"
                  checked={values.interests.includes(interest)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...values.interests, interest]
                      : values.interests.filter((item) => item !== interest);
                    update("interests", next);
                  }}
                />
                {interest}
              </label>
            ))}
          </div>
          <FieldError id="interests-error" messages={errors.interests} />
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Budget preference"
            name="budgetLevel"
            value={values.budgetLevel}
            error={errors.budgetLevel}
            onChange={(value) => update("budgetLevel", value)}
          >
            {budgetLevels.map((level) => (
              <option key={level} value={level}>
                {level[0].toUpperCase()}
                {level.slice(1)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Travel pace"
            name="travelStyle"
            value={values.travelStyle}
            error={errors.travelStyle}
            onChange={(value) => update("travelStyle", value)}
          >
            {travelStyles.map((style) => (
              <option key={style} value={style}>
                {style[0].toUpperCase()}
                {style.slice(1)}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div hidden={step !== 4} className="grid gap-4">
        <TextAreaField
          label="Dietary needs"
          name="dietaryNeeds"
          value={values.dietaryNeeds}
          error={errors.dietaryNeeds}
        />
        <TextAreaField
          label="Mobility notes"
          name="mobilityNotes"
          value={values.mobilityNotes}
          error={errors.mobilityNotes}
        />
        <TextAreaField
          label="Additional constraints"
          name="additionalConstraints"
          value={values.additionalConstraints}
          error={errors.additionalConstraints}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save intake"}
          </button>
        )}
      </div>
    </form>
  );
}
