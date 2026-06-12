# Quickstart: Plan Review & Pre-Purchase Revisions

## Run Focused Tests

```bash
npm run test:plan-review
```

## Run Relevant Validation

```bash
npm run lint
npm run typecheck
npm run test:plan-review
npm run test:generation
npm run build
```

DB-backed tests reset the Neon testing branch. Run them sequentially with other DB/auth suites.

## Manual Review

1. Start the app:

   ```bash
   npm run dev
   ```

2. Sign in as an owner.
3. Open `/app/plan/<tripId>` for a seeded/generated draft trip.
4. Confirm the page shows either a progress-ready state or an ordered itinerary.
5. Submit a pre-purchase revision request and confirm it appears as pending while the current version remains browsable.
