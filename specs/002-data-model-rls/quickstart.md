# Quickstart: Data Model & Access Policies

## Prerequisites

- `.env.local` contains `DATABASE_URL`, `NEON_API_KEY`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`.
- The Neon project is `tripai`.
- Use a Neon testing branch for F2 validation.

## 1. Create Or Reset The Neon Testing Branch

```bash
set -a
. ./.env.local
set +a
npx neonctl@latest branches create --project-id sparkling-thunder-06034517 --name test-data-model-rls --output json
```

If the branch already exists and needs to be reset from its parent:

```bash
set -a
. ./.env.local
set +a
npx neonctl@latest branches reset test-data-model-rls --project-id sparkling-thunder-06034517 --parent
```

Fetch a connection string for the testing branch and store it only in `.env.local`:

```bash
set -a
. ./.env.local
set +a
npx neonctl@latest connection-string test-data-model-rls --project-id sparkling-thunder-06034517
```

Use that value as `DATABASE_TEST_URL`.

## 2. Install F2 Database Dependencies

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

## 3. TDD Validation Loop

Write failing tests before migrations:

```bash
npm run test:db
```

Expected first failure: schema/config/test harness does not exist yet.

Then implement in this order:

1. DB client and Drizzle config.
2. Schema entities.
3. Generated migration.
4. RLS policies and helper functions.
5. Seed helpers.
6. Owner allow/deny tests.
7. Share-link allow/deny tests.
8. Revision-preservation tests.

## 4. Apply Migrations To Testing Branch

```bash
DATABASE_URL="$DATABASE_TEST_URL" npx drizzle-kit migrate
```

## 5. Acceptance Checks

```bash
npm run lint
npm run typecheck
npm run test:db
npm run build
npm run test:e2e
```

F2 is not complete until every access policy has an allow and deny test and the tests run against the Neon testing branch.
