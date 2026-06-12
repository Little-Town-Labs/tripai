# Quickstart: F10 Scrapbook Notes and Ratings

## Prerequisites

- `.env.local` contains `DATABASE_URL`.
- `.env.local` contains `DATABASE_TEST_URL` for DB-backed tests.
- A purchased trip exists and can be opened at `/app/trips/{tripId}`.
- `TRIPAI_SCRAPBOOK_ENABLED=1` is set when you want to exercise the write UI locally.

## Local Route

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/app/trips/{tripId}
```

Expected behavior:

- Trip detail shows the co-pilot route plus first-class scrapbook sections.
- Owners can add trip/day/stop notes.
- Owners can add 1-5 star stop ratings.
- Notes and ratings appear after the database write succeeds.
- Photo section explains upload is not enabled until storage is selected.
- Other owners cannot access or write the trip scrapbook.

With `TRIPAI_SCRAPBOOK_ENABLED` unset or set to `0`, the trip detail page should show the scrapbook as coming soon and server actions should reject writes.

## Validation

Run focused tests:

```bash
npm run test:scrapbook
```

Run related and standard checks:

```bash
npm run test:trip-detail
npm run lint
npm run typecheck
npm run build
```

DB-backed suites reset the Neon testing branch. Run DB/auth/feature DB suites sequentially when running locally.
