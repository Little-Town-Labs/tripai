# Support Data Ops Runbook

F13 provides manual support-ticket workflows for Article I export and deletion requests. These commands are internal operator tools. Do not send command output, database URLs, or environment values to customers.

## Safety Rules

- Verify the requester owns the trip before running any command.
- Use the intended database URL for the environment you are operating on.
- Run export before deletion unless the owner explicitly declines an export.
- Store export files only in an approved secure location.
- Never paste `DATABASE_URL`, `DATABASE_TEST_URL`, share tokens, or secret keys into support tickets.
- Deletion is permanent in the application database. Provider backups/PITR may still exist according to infrastructure retention.

## Required Inputs

- `owner-id`: UUID from the verified owner record.
- `trip-id`: UUID from the requested trip.
- `database-url`: Neon connection string for the target environment.
- `output`: secure local path for export archives.

## Export A Trip

```bash
npm run ops:trip-data -- export \
  --database-url "$DATABASE_URL" \
  --owner-id "<OWNER_UUID>" \
  --trip-id "<TRIP_UUID>" \
  --output "/secure/path/trip-export.json"
```

Use `--overwrite` only when intentionally replacing an existing archive.

After export:

- Confirm the command reports success.
- Confirm the archive contains exactly one trip id.
- Confirm the archive does not contain raw share tokens or database URLs.
- Record the archive handling decision in the support ticket.

## Delete A Trip

Export first unless the owner declined it. Then run:

```bash
npm run ops:trip-data -- delete \
  --database-url "$DATABASE_URL" \
  --owner-id "<OWNER_UUID>" \
  --trip-id "<TRIP_UUID>" \
  --confirm "<TRIP_UUID>"
```

The `--confirm` value must exactly match `--trip-id`; there is no `--yes` shortcut.

After deletion:

- Confirm the command reports success.
- Confirm the owner can no longer open the trip.
- Confirm any known share URL returns unavailable/not found.
- Record the timestamp, operator, ticket id, and command result outside the repository.

## Test Environment Check

Use the Neon testing branch before running a production operation for the first time:

```bash
npm run test:ops
```

DB-backed suites reset the Neon testing branch, so run them sequentially with other DB tests.
