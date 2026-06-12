# Contract: Generation Pipeline

## Purpose

F6 exposes a server-side contract that F7 can call to generate a draft trip from a saved intake and F5 retrieval context.

## Inputs

```ts
type GenerateTripInput = {
  ownerId: string;
  intakeId: string;
  intake: TripIntakeValues;
  retrievalContext: RetrievalContext;
  maxPlannerRetries?: number;
};
```

## Progress Events

```ts
type GenerationProgressEvent = {
  sequence: number;
  stage:
    | "retrieval"
    | "planning"
    | "validating"
    | "retrying"
    | "narrating"
    | "persisting"
    | "succeeded"
    | "failed";
  message: string;
  createdAt: string;
};
```

## Outputs

```ts
type GenerateTripResult =
  | {
      ok: true;
      tripId: string;
      revisionId: string;
      progress: GenerationProgressEvent[];
    }
  | {
      ok: false;
      failure: GenerationFailure;
      progress: GenerationProgressEvent[];
    };
```

## Provider Interface

```ts
type AiGenerationProvider = {
  createPlannerDraft(input: PlannerPromptInput): Promise<PlannerDraft>;
  createNarration(input: NarratorPromptInput): Promise<NarratedDraft>;
};
```

The OpenRouter adapter is the first implementation. It sends OpenAI-compatible chat completion requests to `https://openrouter.ai/api/v1/chat/completions` with strict JSON-schema response format and default model `google/gemma-4-26b-a4b-it`.

## Required Guarantees

- Fake providers can drive all normal tests without live credentials.
- Provider credentials are read only from server-side `OPENROUTER_API_KEY` and never included in result objects or progress events.
- Planner draft validation runs before narration.
- Narration validation runs before persistence.
- No invalid draft is persisted as ready for owner review.
- Planner retries stop after two invalid attempts unless a caller passes a smaller limit.

## Optional Live Smoke

When `OPENROUTER_API_KEY` and a configured model are present, a future manual smoke can exercise one minimal planner/narrator request. This remains outside default CI.
