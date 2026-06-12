import { GenerationProviderError } from "./errors";
import { buildNarratorPrompt, buildPlannerPrompt } from "./prompts";
import type {
  AiGenerationProvider,
  NarratedDraft,
  NarratorPromptInput,
  PlannerDraft,
  PlannerPromptInput,
} from "./types";

type FetchLike = typeof fetch;

type OpenRouterGenerationProviderOptions = {
  apiKey?: string;
  model?: string;
  fetch?: FetchLike;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it";

export class OpenRouterGenerationProvider implements AiGenerationProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenRouterGenerationProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    this.model = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async createPlannerDraft(input: PlannerPromptInput): Promise<PlannerDraft> {
    const prompt = buildPlannerPrompt(input);
    return this.sendStructuredRequest<PlannerDraft>("trip_planner_draft", plannerSchema(), prompt);
  }

  async createNarration(input: NarratorPromptInput): Promise<NarratedDraft> {
    const prompt = buildNarratorPrompt(input);
    return this.sendStructuredRequest<NarratedDraft>("trip_narration", narratedSchema(), prompt);
  }

  private async sendStructuredRequest<T>(
    schemaName: string,
    schema: Record<string, unknown>,
    prompt: { system: string; user: string },
  ): Promise<T> {
    if (!this.apiKey) {
      throw new GenerationProviderError("PROVIDER_CONFIGURATION", "OpenRouter API key is not configured.");
    }

    const response = await this.fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: new Headers({
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new GenerationProviderError("PROVIDER_ERROR", `OpenRouter returned HTTP ${response.status}.`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new GenerationProviderError("PROVIDER_ERROR", "OpenRouter response did not include structured content.");
    }

    return JSON.parse(content) as T;
  }
}

function plannerSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "days"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      days: { type: "array", items: daySchema(stopSchema()) },
    },
  };
}

function narratedSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "days"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      days: { type: "array", items: daySchema(narratedStopSchema(), { aiSummary: { type: "string" } }) },
    },
  };
}

function daySchema(stop: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["dayNumber", "date", "label", "fromLocation", "toLocation", "totalMiles", "driveTimeMinutes", "stops", ...Object.keys(extra)],
    properties: {
      dayNumber: { type: "number" },
      date: { type: "string" },
      label: { type: "string" },
      fromLocation: nullableString(),
      toLocation: nullableString(),
      totalMiles: nullableNumber(),
      driveTimeMinutes: nullableNumber(),
      stops: { type: "array", items: stop },
      ...extra,
    },
  };
}

function stopSchema(extra: Record<string, unknown> = {}) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "stableStopKey",
      "orderIndex",
      "name",
      "type",
      "sourcePlaceId",
      "address",
      "lat",
      "lng",
      "eta",
      "priceLevel",
      "googleRating",
      "hoursSummary",
      ...Object.keys(extra),
    ],
    properties: {
      stableStopKey: { type: "string" },
      orderIndex: { type: "number" },
      name: { type: "string" },
      type: { type: "string" },
      sourcePlaceId: nullableString(),
      address: nullableString(),
      lat: nullableNumber(),
      lng: nullableNumber(),
      eta: nullableString(),
      priceLevel: nullableNumber(),
      googleRating: nullableNumber(),
      hoursSummary: nullableString(),
      ...extra,
    },
  };
}

function narratedStopSchema() {
  return stopSchema({
    description: { type: "string" },
    tips: { type: "string" },
  });
}

function nullableString() {
  return { anyOf: [{ type: "string" }, { type: "null" }] };
}

function nullableNumber() {
  return { anyOf: [{ type: "number" }, { type: "null" }] };
}
