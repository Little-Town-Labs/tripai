# Contract: Data Ops CLI

F13 exposes an internal command-line contract for support staff. The CLI is intended for operator use in a trusted shell with an explicit database URL.

## Export Command

```bash
npm run ops:trip-data -- export \
  --database-url "$DATABASE_URL" \
  --owner-id "<OWNER_UUID>" \
  --trip-id "<TRIP_UUID>" \
  --output "/secure/path/trip-export.json"
```

Optional:

```bash
--overwrite
```

### Success

- Writes a JSON archive to the requested path.
- Prints a short success message with the output path and counts.
- Does not print database URLs, raw share tokens, or secrets.

### Failure

- `invalid_input`: required argument missing or malformed.
- `output_exists`: output path exists and `--overwrite` was not supplied.
- `not_found`: owner/trip pair did not match a trip.
- `write_failed`: archive could not be written.

## Delete Command

```bash
npm run ops:trip-data -- delete \
  --database-url "$DATABASE_URL" \
  --owner-id "<OWNER_UUID>" \
  --trip-id "<TRIP_UUID>" \
  --confirm "<TRIP_UUID>"
```

### Success

- Deletes the target trip and dependent rows.
- Prints a short success message with deletion counts.
- Does not print database URLs, raw share tokens, or secrets.

### Failure

- `invalid_input`: required argument missing or malformed.
- `confirmation_required`: `--confirm` does not exactly match `--trip-id`.
- `not_found`: owner/trip pair did not match a trip.
- `delete_failed`: deletion transaction failed.

## Service Contract

The CLI delegates to `src/lib/ops/trip-data.ts`.

```ts
exportTripData(pool, {
  ownerId: string;
  tripId: string;
  outputPath: string;
  overwrite?: boolean;
}): Promise<
  | { ok: true; outputPath: string; counts: Record<string, number> }
  | { ok: false; reason: "invalid_input" | "output_exists" | "not_found" | "write_failed"; message: string }
>
```

```ts
deleteTripData(pool, {
  ownerId: string;
  tripId: string;
  confirmTripId: string;
}): Promise<
  | { ok: true; deletedTripId: string; counts: Record<string, number> }
  | { ok: false; reason: "invalid_input" | "confirmation_required" | "not_found" | "delete_failed"; message: string }
>
```
