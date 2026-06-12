import assert from "node:assert/strict";
import { test } from "node:test";

import { validateRevisionRequestText } from "../../src/lib/plan-review/validation";

test("rejects missing, short, and oversized revision request text", () => {
  assert.deepEqual(validateRevisionRequestText("   "), {
    ok: false,
    fieldErrors: { requestText: "Tell TripAI what you would like to change." },
  });

  assert.deepEqual(validateRevisionRequestText("more"), {
    ok: false,
    fieldErrors: { requestText: "Add a little more detail so we can revise the plan." },
  });

  assert.deepEqual(validateRevisionRequestText("x".repeat(1001)), {
    ok: false,
    fieldErrors: { requestText: "Keep revision requests under 1,000 characters." },
  });
});

test("accepts and trims valid natural-language revision request text", () => {
  assert.deepEqual(validateRevisionRequestText("  Add more seafood stops near the beach.  "), {
    ok: true,
    value: "Add more seafood stops near the beach.",
  });
});
