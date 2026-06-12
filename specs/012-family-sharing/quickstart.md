# Quickstart: F12 Credential-free Family Sharing

## Environment

- Use existing `.env.local` database/auth values.
- `DATABASE_TEST_URL` must point at the Neon testing branch for DB-backed tests.
- F12 introduces no new secret or environment variable.
- Photo binary upload remains deferred.

## Validation

Run DB-backed suites sequentially because they reset the Neon testing branch:

```bash
npm run test:sharing
npm run test:db
npm run test:trip-detail
npm run test:scrapbook
npm run lint
npm run typecheck
npm run build
```

## Manual Smoke

1. Sign in as the trip owner.
2. Open `/app/trips/{tripId}` for a purchased trip.
3. Create a family share link from the sharing panel.
4. Copy the URL and open it in a private/incognito browser session.
5. Confirm the shared route does not ask for sign-in.
6. Confirm the shared route shows itinerary, stops, navigation handoffs, notes, ratings, and deferred photo status.
7. Add a trip/day/stop note with display name `Grandma`.
8. Add a stop rating with display name `Grandma`.
9. Return as owner, verify the contributions appear and remove one.
10. Revoke the share link and reload the private/incognito shared URL; it should show unavailable/not found.
