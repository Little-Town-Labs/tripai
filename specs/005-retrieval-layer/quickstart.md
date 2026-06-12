# Quickstart: Retrieval Layer

## Validate The Feature

Run focused retrieval tests:

```bash
npm run test:retrieval
```

Run the standard local checks before opening a PR:

```bash
npm run lint
npm run typecheck
npm run test:retrieval
npm run build
```

## Expected Behavior

- Retrieval context can be assembled from a valid intake using fake providers.
- Place candidates without source place ids are excluded.
- Permanently closed places are excluded.
- Route failures return typed errors rather than estimated drive facts.
- Repeated normalized requests reuse fresh cache entries and report freshness metadata.
- Tests do not need live Google credentials.

## Optional Live Smoke

Set `GOOGLE_MAPS_API_KEY` only in a local shell or environment manager, never in committed files. A live smoke should remain manual and skipped when the key is absent.
