# Quickstart: F13 Data Export and Deletion Ops

## Environment

- Use the Neon testing branch for validation.
- Set `DATABASE_TEST_URL` for automated tests.
- For manual support operations, pass the intended database URL through `--database-url`; do not paste URLs into tickets or logs.

## Validation

Run:

```bash
npm run test:ops
npm run test:db
npm run lint
npm run typecheck
npm run build
```

DB-backed suites reset the Neon testing branch, so run them sequentially.

## Manual Export Smoke

1. Verify the owner id and trip id from the support ticket.
2. Run:
   ```bash
   npm run ops:trip-data -- export \
     --database-url "$DATABASE_URL" \
     --owner-id "<OWNER_UUID>" \
     --trip-id "<TRIP_UUID>" \
     --output "/secure/path/trip-export.json"
   ```
3. Confirm the file exists and includes one trip.
4. Confirm the file does not include raw share tokens or unrelated trips.

## Manual Delete Smoke

1. Export the trip first unless the owner explicitly declined export.
2. Verify the owner id and trip id again.
3. Run against the intended database:
   ```bash
   npm run ops:trip-data -- delete \
     --database-url "$DATABASE_URL" \
     --owner-id "<OWNER_UUID>" \
     --trip-id "<TRIP_UUID>" \
     --confirm "<TRIP_UUID>"
   ```
4. Confirm the trip no longer opens for the owner.
5. Confirm former share links no longer open.
6. Record the ticket id, timestamp, operator, command outcome, and export file handling decision outside the repository.
