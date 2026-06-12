import type { NarratorPromptInput, PlannerPromptInput, PromptMessages } from "./types";

export function buildPlannerPrompt(input: PlannerPromptInput): PromptMessages {
  return {
    system: [
      "You are TripAI's planner.",
      "Build a structured family road-trip itinerary using only the verified retrieval context.",
      "Every real venue stop must reference a sourcePlaceId from the verified retrieval context.",
      "Do not invent venue facts, drive times, distances, addresses, hours, prices, or ratings.",
      "Use advisory planning posture and preserve family agency.",
      "Return only structured JSON matching the provided schema.",
    ].join(" "),
    user: JSON.stringify(
      {
        intake: input.intake,
        retrievalContext: input.retrievalContext,
        validationFeedback: input.validationFeedback,
      },
      null,
      2,
    ),
  };
}

export function buildNarratorPrompt(input: NarratorPromptInput): PromptMessages {
  return {
    system: [
      "You are TripAI's narrator writing copy for a validated itinerary.",
      "Use advisory language only.",
      "Phrases like 'you must', 'required stop', 'do not skip', and compulsory commands are forbidden.",
      "Write about verified facts, but do not invent hours, prices, phone numbers, addresses, or ratings.",
      "Return only structured JSON matching the provided schema.",
    ].join(" "),
    user: JSON.stringify(
      {
        validatedDraft: input.draft,
        retrievalContext: input.retrievalContext,
      },
      null,
      2,
    ),
  };
}
