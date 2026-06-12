import assert from "node:assert/strict";
import { test } from "node:test";

import { buildNarratorPrompt, buildPlannerPrompt } from "../../src/lib/generation/prompts";
import { retrievalContext, validPlannerDraft } from "./fixtures";

test("planner prompt enforces retrieval grounding and advisory posture", () => {
  const prompt = buildPlannerPrompt({
    intake: retrievalContext.request,
    retrievalContext,
    validationFeedback: [],
  });

  assert.match(prompt.system, /verified retrieval context/i);
  assert.match(prompt.system, /do not invent/i);
  assert.match(prompt.system, /advisory/i);
  assert.match(prompt.user, /place-restaurant-1/);
  assert.match(prompt.user, /1609344/);
});

test("narrator prompt receives only validated draft and forbids commanding language", () => {
  const prompt = buildNarratorPrompt({
    draft: validPlannerDraft,
    retrievalContext,
  });

  assert.match(prompt.system, /validated itinerary/i);
  assert.match(prompt.system, /you must/i);
  assert.match(prompt.system, /forbidden/i);
  assert.match(prompt.user, /Garden Grill/);
});
