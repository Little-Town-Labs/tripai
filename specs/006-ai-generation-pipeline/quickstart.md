# Quickstart: AI Generation Pipeline

## Validate The Feature

Run focused generation tests:

```bash
npm run test:generation
```

Run adjacent provider/retrieval tests:

```bash
npm run test:retrieval
```

Run standard checks before PR:

```bash
npm run lint
npm run typecheck
npm run test:generation
npm run test:retrieval
npm run build
```

## Expected Behavior

- Fake providers can generate a valid grounded draft trip.
- Planner output with unverified stops is rejected and retried at most twice.
- Progress events are ordered and owner-safe.
- Narration uses advisory voice and rejects imperative phrases.
- Missing provider credentials produce typed failures, not accidental live calls.

## Optional Live Smoke

Set `OPENROUTER_API_KEY` and model configuration only in local environment files or shell state, never in committed files. The MVP default model is `google/gemma-4-26b-a4b-it`. Live AI smoke remains manual and skipped when credentials are absent.
