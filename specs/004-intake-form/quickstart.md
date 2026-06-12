# Quickstart: Intake Form

## Prerequisites

- `.env.local` contains the Neon database and auth values used by F2/F3.
- The F2 migration has been applied to the target development database.
- Owner authentication from F3 works locally.

## Local Run

1. Start the app:

   ```bash
   npm run dev
   ```

2. Sign in as an owner.

3. Open:

   ```text
   http://localhost:3000/app/intake
   ```

4. Complete the wizard with a realistic family road-trip request.

5. Submit the final step and confirm the page shows the saved draft as ready for trip generation.

## Validation

Run focused checks during implementation:

```bash
npm run lint
npm run typecheck
npm run test:intake
npm run test:auth
npm run test:db
npm run test:e2e
```

Expected F4 coverage:

- validation rejects impossible dates and inconsistent party details
- owner-scoped service persists a draft intake
- signed-out users cannot reach `/app/intake`
- signed-in users can complete `/app/intake`
- mobile and desktop viewport tests complete without layout overlap
