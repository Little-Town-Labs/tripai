# Quickstart: F11 Post-purchase and Mid-trip Revisions

## Environment

- Use the existing Neon database settings from `.env.local`.
- Use `DATABASE_TEST_URL` for DB-backed tests.
- Keep `TRIPAI_STRIPE_ENABLED=0` unless intentionally testing checkout; F11 does not add paid top-ups.
- Keep `TRIPAI_SCRAPBOOK_ENABLED=0` or `1` as needed; F11 preservation service must work either way.

## Test-first Validation

```bash
npm run test:revisions
npm run test:trip-detail
npm run test:scrapbook
npm run lint
npm run typecheck
npm run build
```

## Manual Smoke

1. Sign in as an owner.
2. Open a purchased trip at `/app/trips/{tripId}`.
3. Confirm the revision panel shows:
   - planning rounds remaining,
   - mid-trip rounds remaining,
   - no paid top-up CTA.
4. Mark a stop visited.
5. Submit a mid-trip revision request.
6. Confirm visited stops remain unchanged in the candidate.
7. If removed future stops have scrapbook content, confirm commit is blocked until preservation is selected.
8. Commit the candidate.
9. Reload trip detail and confirm current/next stop data, scrapbook content, and handoff links reflect the committed current version.
10. Restore the previous version and confirm quota counts do not change.
