import assert from "node:assert/strict";
import { test } from "node:test";

import { validateTripIntakeInput } from "../../src/lib/intake/validation";

const validInput = {
  originAddress: "St. Louis, MO",
  destinationArea: "Chicago, IL",
  startDate: "2026-07-06",
  endDate: "2026-07-11",
  partyAdults: "2",
  partyChildren: "2",
  childrenAges: "6, 9",
  interests: ["Scenic stops", "Museums", "Local food"],
  budgetLevel: "moderate",
  dietaryNeeds: "Peanut allergy, vegetarian options",
  mobilityNotes: "Prefer stroller-friendly days",
  travelStyle: "balanced",
  additionalConstraints: "Avoid driving more than 7 hours in one day.",
};

test("US1 normalizes valid intake values for persistence", () => {
  const result = validateTripIntakeInput(validInput);

  assert.equal(result.ok, true);
  assert.deepEqual(result.values, {
    originAddress: "St. Louis, MO",
    destinationArea: "Chicago, IL",
    startDate: "2026-07-06",
    endDate: "2026-07-11",
    partyAdults: 2,
    partyChildren: 2,
    childrenAges: [6, 9],
    interests: ["Scenic stops", "Museums", "Local food"],
    budgetLevel: "moderate",
    dietaryNeeds: ["Peanut allergy", "vegetarian options"],
    mobilityNotes: "Prefer stroller-friendly days\n\nAdditional constraints: Avoid driving more than 7 hours in one day.",
    travelStyle: "balanced",
  });
});

test("US2 rejects invalid dates, party details, child ages, and option values", () => {
  const result = validateTripIntakeInput({
    originAddress: "",
    destinationArea: "",
    startDate: "2026-07-12",
    endDate: "2026-07-01",
    partyAdults: "-1",
    partyChildren: "2",
    childrenAges: "6",
    interests: ["", "Scenic stops"],
    budgetLevel: "luxury",
    dietaryNeeds: "",
    mobilityNotes: "",
    travelStyle: "rushed",
    additionalConstraints: "",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.fieldErrors, {
    originAddress: ["Enter a starting point."],
    destinationArea: ["Enter a destination area."],
    endDate: ["End date must be the same as or after the start date."],
    partyAdults: ["Adults must be 0 or more."],
    childrenAges: ["Enter one age for each child."],
    budgetLevel: ["Choose a budget preference."],
    travelStyle: ["Choose a travel pace."],
  });
  assert.equal(result.values.destinationArea, "");
});

test("US2 rejects trips longer than the MVP planning window", () => {
  const result = validateTripIntakeInput({
    ...validInput,
    startDate: "2026-07-01",
    endDate: "2026-08-15",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.fieldErrors, {
    endDate: ["TripAI can plan trips up to 21 days for this MVP."],
  });
});
