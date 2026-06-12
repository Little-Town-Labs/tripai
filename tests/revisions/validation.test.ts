import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validatePreservationDecisions,
  validateRevisionMode,
  validateRevisionRequestText,
} from "../../src/lib/revisions/validation";

test("accepts a practical revision request", () => {
  assert.deepEqual(validateRevisionRequestText("Add more beach time Thursday."), {
    ok: true,
    value: "Add more beach time Thursday.",
  });
});

test("rejects blank and overlong revision requests", () => {
  assert.deepEqual(validateRevisionRequestText("   "), {
    ok: false,
    fieldErrors: { requestText: "Describe what you would like to adjust." },
  });
  assert.equal(validateRevisionRequestText("x".repeat(1201)).ok, false);
});

test("validates supported revision modes", () => {
  assert.deepEqual(validateRevisionMode("planning"), { ok: true, value: "planning" });
  assert.deepEqual(validateRevisionMode("mid_trip"), { ok: true, value: "mid_trip" });
  assert.deepEqual(validateRevisionMode("pre_purchase"), {
    ok: false,
    fieldErrors: { mode: "Choose planning or mid-trip revision mode." },
  });
});

test("validates preservation decisions", () => {
  assert.deepEqual(
    validatePreservationDecisions([
      { stableStopKey: "stop-a-1", targetScope: "day" },
      { stableStopKey: "stop-a-2", targetScope: "trip" },
    ]),
    {
      ok: true,
      value: [
        { stableStopKey: "stop-a-1", targetScope: "day" },
        { stableStopKey: "stop-a-2", targetScope: "trip" },
      ],
    },
  );

  assert.deepEqual(validatePreservationDecisions([{ stableStopKey: "", targetScope: "stop" }]), {
    ok: false,
    fieldErrors: { preservation: "Choose day or trip preservation for every affected stop." },
  });
});
