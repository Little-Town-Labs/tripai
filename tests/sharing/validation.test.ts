import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validateCreateShareLinkInput,
  validateSharedNoteInput,
  validateSharedRatingInput,
} from "@/lib/sharing/validation";

test("US1 accepts blank labels as null and bounds long labels", () => {
  assert.deepEqual(validateCreateShareLinkInput({ label: "  " }), {
    ok: true,
    value: { label: null },
  });
  assert.deepEqual(validateCreateShareLinkInput({ label: " Family " }), {
    ok: true,
    value: { label: "Family" },
  });

  const result = validateCreateShareLinkInput({ label: "x".repeat(81) });
  assert.equal(result.ok, false);
  assert.deepEqual(result.fieldErrors, {
    label: "Keep labels to 80 characters or fewer.",
  });
});

test("US3 validates display names and trip/day/stop note content", () => {
  const valid = validateSharedNoteInput({
    displayName: " Grandma ",
    content: " Bring snacks. ",
    dayId: "13000000-0000-4000-8000-0000000000a1",
  });

  assert.deepEqual(valid, {
    ok: true,
    value: {
      displayName: "Grandma",
      content: "Bring snacks.",
      dayId: "13000000-0000-4000-8000-0000000000a1",
      stopId: null,
    },
  });

  const invalid = validateSharedNoteInput({
    displayName: " ",
    content: " ",
    dayId: "day",
    stopId: "stop",
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.fieldErrors, {
    displayName: "Add your display name before saving.",
    content: "Add a note before saving.",
    scope: "Choose a day or a stop, not both.",
  });
});

test("US3 validates stop ratings with optional text", () => {
  const valid = validateSharedRatingInput({
    displayName: " Uncle Pat ",
    stopId: "30000000-0000-4000-8000-000000000001",
    stars: "4",
    text: " Great patio. ",
  });

  assert.deepEqual(valid, {
    ok: true,
    value: {
      displayName: "Uncle Pat",
      stopId: "30000000-0000-4000-8000-000000000001",
      stars: 4,
      text: "Great patio.",
    },
  });

  const invalid = validateSharedRatingInput({
    displayName: "x".repeat(81),
    stopId: "",
    stars: "6",
    text: "x".repeat(1001),
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.fieldErrors, {
    displayName: "Keep display names to 80 characters or fewer.",
    stopId: "Choose a stop to rate.",
    stars: "Choose a rating from 1 to 5 stars.",
    text: "Keep rating notes to 1000 characters or fewer.",
  });
});
