# Research: F10 Scrapbook Notes and Ratings

## Decision 1: Reuse existing scrapbook tables and RLS

**Decision**: Do not add a migration for F10. Use existing `notes`, `ratings`, and `photo_metadata` tables and policies.

**Rationale**: F2 already created the schema and RLS policy foundation. F10 can focus on application services, validation, and first-class UI.

**Alternatives considered**:

- Add new tables for owner-only notes/ratings: Rejected because it would duplicate the constitutional share-link-ready model.

## Decision 2: Owner-only F10; share-link UI waits for F12

**Decision**: F10 reads/writes as the authenticated owner only.

**Rationale**: F12 owns credential-free share links, contributor display names, and moderation. The database policy foundation already supports future share contribution paths.

**Alternatives considered**:

- Add anonymous share forms now: Rejected because token flows, revocation, and moderation need their own security-focused feature.

## Decision 3: Server actions for mutations

**Decision**: Use Next.js Server Actions for note/rating form submissions and `revalidatePath` for `/app/trips/[tripId]` after successful writes.

**Rationale**: The app already uses server actions for intake and plan revision. The local Next 16 docs require auth/authorization inside every action and recommend expected validation errors as return values.

**Alternatives considered**:

- Route handlers for notes/ratings: Rejected for this owner UI because server actions keep the form path simpler and progressively enhanced.

## Decision 4: Photo upload remains disabled until storage exists

**Decision**: Render a first-class photo section that explains storage is not enabled; list existing metadata status if present; do not accept binary uploads.

**Rationale**: The constitution requires durable storage before upload confirmation. No object storage provider is selected in this project yet.

**Alternatives considered**:

- Store base64/blob content in Postgres: Rejected as an inappropriate object-storage substitute.
- Accept uploads to local filesystem: Rejected because CI/deploy environments are not durable user storage.
- Accept metadata-only "photo" records from the UI: Rejected because it would create fake uploads and confuse users.

## Decision 5: One owner-scoped service boundary

**Decision**: Create `getScrapbook`, `createScrapbookNote`, and `createStopRating` in `src/lib/scrapbook/service.ts`, each setting app role and owner context.

**Rationale**: This matches the F7/F9 service pattern and keeps RLS as the final access boundary. It also makes DB-backed tests deterministic.

**Alternatives considered**:

- Fold all logic into `trip-detail/service.ts`: Rejected because contribution writes and validation belong to a separate feature boundary.

## Decision 6: Disabled-by-default feature toggle

**Decision**: Add `TRIPAI_SCRAPBOOK_ENABLED=1` as the only enabled state. UI/actions default off.

**Rationale**: The user wants the scrapbook feature toggleable off at first. Keeping services tested while gating UI/actions lets the code merge safely and be enabled deliberately.

**Alternatives considered**:

- Always-on F10 after merge: Rejected by user preference.
- Compile-time-only dead code: Rejected because we need runtime environment control per deployment.
