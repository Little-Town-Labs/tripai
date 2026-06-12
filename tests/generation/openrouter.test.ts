import assert from "node:assert/strict";
import { test } from "node:test";

import { OpenRouterGenerationProvider } from "../../src/lib/generation/openrouter";
import { retrievalContext, validPlannerDraft } from "./fixtures";

test("sends strict structured-output planner requests to OpenRouter with Gemma model", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const provider = new OpenRouterGenerationProvider({
    apiKey: "test-openrouter-key",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(validPlannerDraft) } }],
      });
    },
  });

  const draft = await provider.createPlannerDraft({
    intake: retrievalContext.request,
    retrievalContext,
    validationFeedback: [],
  });

  assert.equal(draft.title, "Orlando Family Road Trip");
  assert.equal(calls[0]?.url, "https://openrouter.ai/api/v1/chat/completions");
  const headers = calls[0]?.init?.headers as Headers;
  assert.equal(headers.get("Authorization"), "Bearer test-openrouter-key");
  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.equal(body.model, "google/gemma-4-26b-a4b-it");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
});

test("missing OpenRouter key fails with safe configuration error", async () => {
  const provider = new OpenRouterGenerationProvider({ apiKey: "" });

  await assert.rejects(
    () =>
      provider.createPlannerDraft({
        intake: retrievalContext.request,
        retrievalContext,
        validationFeedback: [],
      }),
    /OpenRouter API key is not configured/,
  );
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
