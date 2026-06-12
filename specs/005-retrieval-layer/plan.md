# Implementation Plan: Retrieval Layer

**Branch**: `005-retrieval-layer` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-retrieval-layer/spec.md`

## Summary

Implement F5 as a server-side retrieval library that turns a validated trip intake into a structured retrieval context for F6 initial generation and F11 revisions. The layer will provide Google Places Text Search and Place Details adapters, a Google route skeleton adapter, deterministic request/cache normalization, typed provider failures, and planner-ready candidate grouping. Tests use fake adapters so CI never needs live Google credentials.

## Technical Context

**Language/Version**: TypeScript 5, Node runtime, React 19.2.4, Next.js 16.2.9 app repository

**Primary Dependencies**: Existing runtime dependencies only; use platform `fetch`, `crypto`, and `node:test`

**Storage**: F5 ships a cache interface plus in-process cache implementation for deterministic behavior. Persistent database cache is intentionally deferred until F6/F11 prove query shape and freshness needs.

**Testing**: Add `npm run test:retrieval` with `tsx --test --test-concurrency=1 tests/retrieval/**/*.test.ts`; continue `npm run lint`, `npm run typecheck`, and `npm run build`

**Target Platform**: Server-side Next.js runtime, self-hosted CI, future Vercel deployment

**Project Type**: Single Next.js web application with reusable server-side library modules

**Performance Goals**: Retrieval assembly avoids duplicate external lookups for identical normalized requests within a single process; cache hits return without provider calls; provider failures produce typed errors instead of slow retry loops in this slice

**Constraints**: Do not expose or log Google API keys; no live external network calls in normal tests; do not add Stripe or photo storage; no public UI or route handler required for F5; if future Next APIs are touched, read the relevant `node_modules/next/dist/docs/` guide first

**Scale/Scope**: Supports the single-family MVP planning flow, Florida road trips, destination candidates, route skeletons, rest/fuel along-route anchors, and an internal contract for F6/F11

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article III: Every Recommendation Is Web-Verified**: Pass. F5 is the grounding layer and rejects planner-ready venue candidates without verified place identifiers.
- **Article IV: We Suggest, We Never Dictate**: Pass. F5 returns facts and candidates only; it does not produce directive copy.
- **Article VI: Built for the Moment**: Pass. F5 supports fast generation by caching stable lookups and returning structured progress-ready context, but no UI is added in this slice.
- **Article VII: We Complement, We Don't Replace**: Pass. F5 retrieves route facts but does not implement turn-by-turn navigation.
- **Article VIII: Your Trip Is Private By Default**: Pass. Cache keys exclude owner PII, secrets, and free-text private notes.
- **Article X: Your Money and Your Memories Are Safe**: Pass. F5 does not touch payments or scrapbook writes; provider credentials remain server-side.

## Project Structure

### Documentation (this feature)

```text
specs/005-retrieval-layer/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── retrieval-context.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── lib/
    └── retrieval/
        ├── cache.ts
        ├── context.ts
        ├── errors.ts
        ├── google.ts
        ├── normalizers.ts
        └── types.ts

tests/
└── retrieval/
    ├── cache.test.ts
    ├── context.test.ts
    └── google.test.ts
```

**Structure Decision**: Keep F5 in `src/lib/retrieval` because it is shared backend capability for F6 and F11, not an app route or UI. Provider adapters are injected so tests and future generation code can use the same context builder without live credentials.

## Complexity Tracking

No constitutional gate violations.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [data-model.md](data-model.md), [contracts/retrieval-context.md](contracts/retrieval-context.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **Article III** remains satisfied because all planner-ready candidates require source place identifiers, closed venues are excluded, and provider failures do not fabricate facts.
- **Article IV** remains satisfied because retrieval output is factual context only, leaving advisory narrative to later prompt-controlled features.
- **Article VI** remains satisfied because the cache contract supports fast repeated generation/revision attempts.
- **Article VII** remains satisfied because route data is used for planning context and later map hand-offs, not navigation.
- **Article VIII** remains satisfied because normalization and cache-key rules exclude owner PII and private free text.
- **Article X** remains satisfied because no money or scrapbook durability path is touched.
