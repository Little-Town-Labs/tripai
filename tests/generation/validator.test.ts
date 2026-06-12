import assert from "node:assert/strict";
import { test } from "node:test";

import { validateNarration, validatePlannerDraft } from "../../src/lib/generation/validator";
import { narratedDraft, retrievalContext, validPlannerDraft } from "./fixtures";

test("accepts planner drafts grounded in retrieval context", () => {
  const report = validatePlannerDraft(validPlannerDraft, retrievalContext);

  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
});

test("rejects planner stops with unverified place ids", () => {
  const report = validatePlannerDraft(
    {
      ...validPlannerDraft,
      days: [
        {
          ...validPlannerDraft.days[0],
          stops: [
            {
              ...validPlannerDraft.days[0].stops[1],
              sourcePlaceId: "not-from-retrieval",
            },
          ],
        },
      ],
    },
    retrievalContext,
  );

  assert.equal(report.ok, false);
  assert.equal(report.errors[0]?.code, "UNVERIFIED_STOP");
  assert.match(report.retryFeedback.join("\n"), /not-from-retrieval/);
});

test("rejects planner route facts that exceed retrieved route facts", () => {
  const report = validatePlannerDraft(
    {
      ...validPlannerDraft,
      days: [
        {
          ...validPlannerDraft.days[0],
          totalMiles: 2000,
          driveTimeMinutes: 2000,
        },
      ],
    },
    retrievalContext,
  );

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.code === "ROUTE_FACT_UNVERIFIED"));
});

test("accepts advisory narration and rejects imperative copy", () => {
  assert.equal(validateNarration(narratedDraft).ok, true);

  const report = validateNarration({
    ...narratedDraft,
    days: [
      {
        ...narratedDraft.days[0],
        aiSummary: "You must visit this required stop before anything else.",
      },
    ],
  });

  assert.equal(report.ok, false);
  assert.equal(report.errors[0]?.code, "IMPERATIVE_COPY");
});
