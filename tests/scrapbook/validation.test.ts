import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validateNoteInput,
  validateRatingInput,
} from "../../src/lib/scrapbook/validation";

test("US1 accepts a scoped non-empty note and trims content", () => {
  const result = validateNoteInput({
    content: "  Remember the shaded parking row.  ",
    dayId: "13000000-0000-4000-8000-0000000000a1",
    stopId: null,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.content, "Remember the shaded parking row.");
  assert.equal(result.value.dayId, "13000000-0000-4000-8000-0000000000a1");
  assert.equal(result.value.stopId, null);
});

test("US1 rejects blank notes, overlong notes, and day plus stop scope", () => {
  assert.deepEqual(validateNoteInput({ content: "   " }), {
    ok: false,
    fieldErrors: { content: "Add a note before saving." },
  });

  const overlong = validateNoteInput({ content: "x".repeat(1001) });
  assert.equal(overlong.ok, false);
  assert.equal(overlong.fieldErrors.content, "Keep notes to 1000 characters or fewer.");

  const bothScopes = validateNoteInput({
    content: "Valid note",
    dayId: "13000000-0000-4000-8000-0000000000a1",
    stopId: "30000000-0000-4000-8000-000000000001",
  });
  assert.equal(bothScopes.ok, false);
  assert.equal(bothScopes.fieldErrors.scope, "Choose a day or a stop, not both.");
});

test("US2 accepts 1-5 star ratings and trims optional text", () => {
  const result = validateRatingInput({
    stopId: "30000000-0000-4000-8000-000000000001",
    stars: "5",
    text: "  Worth repeating.  ",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.stars, 5);
  assert.equal(result.value.text, "Worth repeating.");
});

test("US2 rejects invalid ratings before insert", () => {
  const missingStop = validateRatingInput({ stopId: "", stars: "5", text: "" });
  assert.equal(missingStop.ok, false);
  assert.equal(missingStop.fieldErrors.stopId, "Choose a stop to rate.");

  for (const stars of ["0", "6", "great"]) {
    const result = validateRatingInput({
      stopId: "30000000-0000-4000-8000-000000000001",
      stars,
      text: "",
    });
    assert.equal(result.ok, false);
    assert.equal(result.fieldErrors.stars, "Choose a rating from 1 to 5 stars.");
  }

  const overlong = validateRatingInput({
    stopId: "30000000-0000-4000-8000-000000000001",
    stars: "4",
    text: "x".repeat(1001),
  });
  assert.equal(overlong.ok, false);
  assert.equal(overlong.fieldErrors.text, "Keep rating notes to 1000 characters or fewer.");
});
