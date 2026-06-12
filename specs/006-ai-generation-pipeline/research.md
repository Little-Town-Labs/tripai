# Research: AI Generation Pipeline

## Decision: Use OpenRouter as the first F6 runtime provider behind a local interface

**Rationale**: OpenRouter provides a unified API to many models through one endpoint and supports direct REST calls without adding dependencies. Its quickstart documents `/api/v1/chat/completions`, model slugs, streaming support, and using the OpenAI SDK pointed at OpenRouter. The selected MVP model is `google/gemma-4-26b-a4b-it`; its OpenRouter page describes structured output support, function calling, and a large context window. A local `AiPlannerProvider` interface lets us keep the domain pipeline independent of OpenRouter's exact request shape.

**Alternatives considered**:
- Hard-code Anthropic Claude as in the original roadmap. Rejected because the user wants OpenRouter or maybe Codex.
- Use OpenAI direct only. Deferred; the same interface can support this later.
- Use Codex as the production planner. Rejected for F6 runtime because Codex is documented primarily as a software-development agent; its SDK/MCP surfaces are useful for internal engineering workflows, not customer-facing vacation plan generation.

## Decision: Use strict JSON-schema structured outputs for planner and narrator calls

**Rationale**: OpenRouter's structured-output guide documents `response_format` with `type: json_schema`, strict mode, and model-support checks. This matches the need for parseable `Trip`, `TripDay`, and `Stop` drafts. OpenAI's structured-output docs support the same general direction if a direct OpenAI adapter is added later.

**Alternatives considered**:
- Ask for plain JSON in text. Rejected because malformed or extra fields increase validator complexity.
- Tool calling for this slice. Deferred because F5 already performs retrieval, and F6 can pass retrieval context directly without live model tool calls.

## Decision: Keep provider streaming separate from product progress events

**Rationale**: OpenRouter supports streaming model chunks, but Article VI requires human-readable progress events tied to product stages. F6 should emit its own progress events before and around provider calls, while provider token streaming remains optional internal detail.

**Alternatives considered**:
- Stream raw provider deltas to the owner. Rejected because raw tokens are not stable product progress and can leak incomplete JSON.

## Decision: Validate planner output deterministically before narration or persistence

**Rationale**: The constitution makes grounding non-negotiable. The validator can check place ids, stop types, route facts, daily drive bounds, duplicate stops, and required meal/hotel structure without another model call. Invalid output receives structured feedback for at most two retries.

**Alternatives considered**:
- Trust model self-validation. Rejected because prompts are not enforcement.
- Let narration repair planner structure. Rejected because narration should only run after a grounded plan exists.

## Decision: Persist only validated drafts

**Rationale**: F7 needs a stable draft to review, and Article X requires not acknowledging unsafe writes. F6 should create a draft `Trip`, initial `TripRevision`, `TripDay`, and `Stop` rows only after validation and narration pass.

**Alternatives considered**:
- Persist every failed attempt for debugging. Deferred; raw provider outputs risk PII/provider-payload leakage and are not needed for MVP.

## Decision: Keep live AI smoke optional and credential-gated

**Rationale**: CI should be deterministic, cheap, and secret-free. Fake providers can cover planner retries, validation, narration, progress, and persistence shape. Optional local smoke can validate OpenRouter credentials and model selection.

**Alternatives considered**:
- Live OpenRouter tests in CI. Rejected due to cost, quota, rate limit, and secret management.

## Decision: Read the server-side credential from `OPENROUTER_API_KEY`

**Rationale**: `OPENROUTER_API_KEY` is the conventional and final project variable name for the OpenRouter credential. F6 will read this variable server-side for the OpenRouter adapter and never print or persist its value.

**Alternatives considered**:
- Keep the shorter `OPENROUTER_API` name. Rejected to avoid ambiguity between an API base URL and a secret API key.
