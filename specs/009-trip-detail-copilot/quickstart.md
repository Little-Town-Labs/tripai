# Quickstart: F9 Trip Detail View / Co-pilot UX

## Prerequisites

- `.env.local` contains `DATABASE_URL`.
- `.env.local` contains `DATABASE_TEST_URL` for DB-backed tests.
- A purchased trip exists through F8 fulfillment or seeded test data.

## Local Route

Start the app:

```bash
npm run dev
```

Open a purchased trip detail route:

```text
http://localhost:3000/app/trips/{tripId}
```

Expected behavior:

- Unauthenticated users are handled by the existing owner auth guard.
- Owners can only see their own purchased trips.
- Draft trips do not show the co-pilot route.
- Stop cards show Google Maps and Waze handoff actions.
- Park stops show an official park link.

## Validation

Run focused tests first:

```bash
npm run test:trip-detail
```

Then run standard checks:

```bash
npm run lint
npm run typecheck
npm run build
```

DB-backed suites reset the Neon testing branch. Run them sequentially with other DB/auth suites.
