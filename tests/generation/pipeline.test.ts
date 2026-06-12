import assert from "node:assert/strict";
import { test } from "node:test";

import { runGenerationPipeline } from "../../src/lib/generation/pipeline";
import type {
  AiGenerationProvider,
  GenerationPersistence,
  NarratedDraft,
  PlannerDraft,
  PlannerPromptInput,
} from "../../src/lib/generation/types";
import { narratedDraft, retrievalContext, validPlannerDraft } from "./fixtures";

const input = {
  ownerId: "owner-1",
  intakeId: "intake-1",
  intake: retrievalContext.request,
  retrievalContext,
};

test("generates and persists a grounded draft trip with fake providers", async () => {
  const persistence = new FakePersistence();
  const result = await runGenerationPipeline(input, {
    provider: new FakeProvider({
      plannerDrafts: [validPlannerDraft],
      narration: narratedDraft,
    }),
    persistence,
    now: fixedNow,
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.tripId, "trip-1");
  assert.equal(persistence.saved?.draft.title, "Orlando Family Road Trip");
  assert.deepEqual(
    result.progress.map((event) => event.stage),
    ["retrieval", "planning", "validating", "narrating", "persisting", "succeeded"],
  );
});

test("retries invalid planner output at most twice before succeeding", async () => {
  const invalidDraft: PlannerDraft = {
    ...validPlannerDraft,
    days: [
      {
        ...validPlannerDraft.days[0],
        stops: [
          {
            ...validPlannerDraft.days[0].stops[1],
            sourcePlaceId: "invented-place",
          },
        ],
      },
    ],
  };
  const provider = new FakeProvider({
    plannerDrafts: [invalidDraft, validPlannerDraft],
    narration: narratedDraft,
  });

  const result = await runGenerationPipeline(input, {
    provider,
    persistence: new FakePersistence(),
    now: fixedNow,
  });

  assert.equal(result.ok, true);
  assert.equal(provider.plannerInputs[1]?.validationFeedback[0]?.includes("invented-place"), true);
  assert.ok(result.progress.some((event) => event.stage === "retrying"));
});

test("fails safely after planner retry limit is exhausted", async () => {
  const invalidDraft: PlannerDraft = {
    ...validPlannerDraft,
    days: [
      {
        ...validPlannerDraft.days[0],
        stops: [
          {
            ...validPlannerDraft.days[0].stops[1],
            sourcePlaceId: "invented-place",
          },
        ],
      },
    ],
  };

  const result = await runGenerationPipeline(
    { ...input, maxPlannerRetries: 1 },
    {
      provider: new FakeProvider({
        plannerDrafts: [invalidDraft, invalidDraft],
        narration: narratedDraft,
      }),
      persistence: new FakePersistence(),
      now: fixedNow,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.failure.code, "PLANNER_VALIDATION_FAILED");
  assert.ok(result.progress.some((event) => event.stage === "failed"));
});

test("rejects imperative narrator output before persistence", async () => {
  const persistence = new FakePersistence();
  const result = await runGenerationPipeline(input, {
    provider: new FakeProvider({
      plannerDrafts: [validPlannerDraft],
      narration: {
        ...narratedDraft,
        summary: "You must follow this required plan.",
      },
    }),
    persistence,
    now: fixedNow,
  });

  assert.equal(result.ok, false);
  assert.equal(persistence.saved, null);
  assert.equal(!result.ok && result.failure.code, "NARRATION_VALIDATION_FAILED");
});

class FakeProvider implements AiGenerationProvider {
  plannerInputs: PlannerPromptInput[] = [];

  constructor(
    private readonly options: {
      plannerDrafts: PlannerDraft[];
      narration: NarratedDraft;
    },
  ) {}

  async createPlannerDraft(input: PlannerPromptInput) {
    this.plannerInputs.push(input);
    const draft = this.options.plannerDrafts.shift();
    if (!draft) throw new Error("No planner draft queued.");
    return draft;
  }

  async createNarration() {
    return this.options.narration;
  }
}

class FakePersistence implements GenerationPersistence {
  saved: { ownerId: string; intakeId: string; draft: NarratedDraft } | null = null;

  async saveValidatedDraft(input: { ownerId: string; intakeId: string; draft: NarratedDraft }) {
    this.saved = input;
    return { tripId: "trip-1", revisionId: "revision-1" };
  }
}

function fixedNow() {
  return new Date("2026-06-11T12:00:00.000Z");
}
