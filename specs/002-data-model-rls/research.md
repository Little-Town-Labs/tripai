# Research: Data Model & Access Policies

## Decision: Use Drizzle ORM with node-postgres for runtime DB access

**Rationale**: Drizzle's official PostgreSQL guide supports `node-postgres` with `drizzle-orm/node-postgres`, and the package set is straightforward for this app: `drizzle-orm pg` plus dev-time `drizzle-kit @types/pg`. This matches the existing TypeScript/Next.js app and keeps runtime DB access server-side.

**Alternatives considered**:
- `postgres.js`: also supported by Drizzle, but `pg` is more familiar for direct integration tests and low-level transaction/session setup.
- Raw SQL only: useful for tests and policy assertions, but it would leave the TypeScript application without a typed schema layer.

**Source**: https://orm.drizzle.team/docs/get-started-postgresql

## Decision: Use Drizzle Kit generated SQL migrations, with custom SQL where RLS needs exact control

**Rationale**: Drizzle Kit `migrate` applies generated SQL migration files and records applied migrations in the database. F2 needs durable migration files, plus the option to hand-author custom policy SQL when it is clearer or safer than encoding complex policy logic in schema code.

**Alternatives considered**:
- `drizzle-kit push`: faster for prototyping, but not appropriate for committed, reviewable schema changes.
- Manual SQL migrations only: maximally explicit, but loses typed schema generation and relation metadata.

**Source**: https://orm.drizzle.team/docs/drizzle-kit-migrate

## Decision: RLS policies use explicit owner and share-token contexts with default-deny posture

**Rationale**: PostgreSQL row security defaults to denying access when RLS is enabled and no policy allows a row. Policies can be specific to commands and can use separate `USING` and `WITH CHECK` expressions for read vs write rules. This matches TripAI's constitutional requirements: owner-only by default, token-scoped sharing, and allow/deny tests for every reachable row.

**Alternatives considered**:
- Application-only authorization: simpler initially, but violates the roadmap requirement that every share-link-reachable row be governed by row-level policies.
- Broad read policies plus app filters: easier query writing, but creates privacy risk and makes cross-owner leakage harder to test.

**Source**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Decision: Model share-token access through hashed tokens and request-scoped database settings

**Rationale**: The app should not store raw share tokens. The planned policy shape sets a request-scoped value before a transaction or query path and compares it to stored token hashes through a stable helper function. This keeps token matching in the database policy layer while avoiding raw-token reads.

**Alternatives considered**:
- Store raw tokens: easier matching, unacceptable exposure risk.
- Resolve token to trip in application code only: useful for UX, but insufficient because database policies would not independently enforce token scope.

**Source**: PostgreSQL RLS policy expressions and `USING`/`WITH CHECK` behavior documented at https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Decision: Use a Neon testing branch for F2 TDD and migration validation

**Rationale**: Neon CLI supports creating branches, including named branches and branch-specific connection strings. F2 tests will create/reset a dedicated branch such as `test-data-model-rls` so migrations and destructive policy tests do not touch the default branch.

**Alternatives considered**:
- Use the default branch for tests: faster setup, but too risky for schema/RLS iteration.
- Use local Postgres only: useful as a supplementary option, but it would not validate Neon Auth roles and Neon branch behavior.

**Source**: https://neon.com/docs/reference/cli-branches

## Decision: Photo metadata is in F2; photo binary storage remains deferred

**Rationale**: Constitution Article IX requires per-stop/day/trip photos, and F10 will implement uploads. F2 should model photo metadata and access policies now so future photo storage can attach safely, but it should not pick or configure an object storage provider.

**Alternatives considered**:
- Defer all photo tables: would force F10/F12 to redesign access policies.
- Implement storage now: conflicts with the user's explicit decision to delay photo bucket storage until later.
