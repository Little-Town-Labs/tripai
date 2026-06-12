# Implementation Plan: AI Generation Pipeline

**Branch**: `006-ai-generation-pipeline` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-ai-generation-pipeline/spec.md`

## Summary

Implement F6 as a server-side generation pipeline that consumes F4 intake data and F5 retrieval context to produce validated draft trip data for F7 review. The pipeline will be provider-agnostic, with OpenRouter as the first concrete runtime and `google/gemma-4-26b-a4b-it` as the MVP model because it exposes OpenAI-compatible chat completions, streaming, and JSON-schema structured outputs. Codex remains a development/workflow agent and is not used as the production trip-generation runtime.

## Technical Context

**Language/Version**: TypeScript 5, Node runtime, React 19.2.4, Next.js 16.2.9 app repository

**Primary Dependencies**: Existing runtime dependencies only for the first slice; use platform `fetch`, `node:test`, F5 retrieval types, and a small provider interface. Avoid adding OpenRouter/OpenAI SDKs until the fetch adapter proves the request shape.

**Storage**: Existing Neon Postgres schema: `trips`, `trip_revisions`, `trip_days`, and `stops`. F6 persists only validated draft trip data and current initial revision metadata.

**Testing**: Add `npm run test:generation` with `tsx --test --test-concurrency=1 tests/generation/**/*.test.ts`; run `npm run test:retrieval`, `npm run typecheck`, `npm run lint`, and `npm run build`

**Target Platform**: Server-side Next.js runtime, self-hosted CI, future Vercel deployment

**Project Type**: Single Next.js web application with reusable server-side generation modules

**Performance Goals**: Emit first progress event immediately when pipeline starts; fake-timer tests prove first progress before two seconds; avoid live provider calls in CI

**Constraints**: Keep `OPENROUTER_API_KEY` server-side; do not expose raw provider payloads or secrets in progress events/errors; strict grounding against F5 retrieval context; max two planner retries; no Stripe, photos, review UI, or revision UI in this feature

**Scale/Scope**: One owner-driven draft generation at a time for the MVP. F6 creates the backend initial-generation contract consumed by F7 and later reused by F11.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article III: Every Recommendation Is Web-Verified**: Pass. Planner output is rejected unless stops reference verified retrieval candidates and route facts from F5.
- **Article IV: We Suggest, We Never Dictate**: Pass. Narration prompt and validation forbid imperative trip copy.
- **Article V: You Can Change Your Mind**: Pass. F6 exposes generation contracts that can later be reused by F11; revision UX is out of scope.
- **Article VI: Built for the Moment**: Pass. Pipeline emits human-readable progress events with first event under two seconds.
- **Article VII: We Complement, We Don't Replace**: Pass. Route facts are used for itinerary planning only; no turn-by-turn navigation is implemented.
- **Article VIII: Your Trip Is Private By Default**: Pass. Generation is owner-scoped and does not expose owner PII/share data.
- **Article X: Your Money and Your Memories Are Safe**: Pass. F6 does not touch payments or scrapbook writes; only validated drafts are persisted.

## Project Structure

### Documentation (this feature)

```text
specs/006-ai-generation-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── generation-pipeline.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── lib/
    └── generation/
        ├── context.ts
        ├── errors.ts
        ├── openrouter.ts
        ├── persistence.ts
        ├── pipeline.ts
        ├── prompts.ts
        ├── types.ts
        └── validator.ts

tests/
└── generation/
    ├── openrouter.test.ts
    ├── pipeline.test.ts
    ├── prompts.test.ts
    └── validator.test.ts
```

**Structure Decision**: Keep F6 in `src/lib/generation` because it is backend domain capability that F7 can call from a route/action later. The provider adapter is injected, so tests use fake providers and OpenRouter can be swapped without rewriting validator or persistence logic.

## Complexity Tracking

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/generation-pipeline.md](contracts/generation-pipeline.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article III** remains satisfied because the validator compares planner stops to retrieval place ids and rejects invented route facts.
- **Article IV** remains satisfied because prompt contracts and narrative validation reject compulsory phrasing.
- **Article V** remains satisfied because the generation contract carries validation reports and revision-friendly draft structure.
- **Article VI** remains satisfied because progress events are part of the public internal contract and tested.
- **Article VII** remains satisfied because navigation hand-offs remain deferred to F9.
- **Article VIII** remains satisfied because provider payloads use only trip-planning context and safe errors.
- **Article X** remains satisfied because invalid drafts are not persisted as ready data.
