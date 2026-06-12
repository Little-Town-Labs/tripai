# Research: F13 Data Export and Deletion Ops

## Decision: Implement internal ops commands in TypeScript using existing `pg` pool utilities

**Rationale**: The project already uses TypeScript, `pg`, `tsx --test`, and Neon Postgres. A TypeScript service plus CLI wrapper keeps operator behavior testable without adding a new runtime or external dependency.

**Alternatives considered**:
- SQL-only runbook: rejected because ownership checks, archive shaping, overwrite protection, and tests are easier to maintain in application code.
- Self-serve UI: rejected for F13 because the roadmap explicitly permits manual support-ticket MVP operations.

## Decision: Export a single JSON document with redacted share-link metadata

**Rationale**: JSON is portable, easy to inspect, and captures nested trip records without needing a binary archive format while photo binary storage remains deferred. Share links are included as metadata only; raw tokens are impossible to recover and must not be emitted.

**Alternatives considered**:
- ZIP archive: useful when photo binaries exist, but premature while F10/F12 only store photo metadata/status.
- CSV bundle: less expressive for nested itinerary and scrapbook data and harder to validate in tests.

## Decision: Hard-delete trip rows after owner verification and explicit confirmation

**Rationale**: Article I says deletion is absolute for the app database. The schema already uses cascade relationships from `trips` into itinerary, scrapbook, share-link, and photo metadata tables. A transaction can verify ownership, delete the trip, and validate that dependent rows are gone.

**Alternatives considered**:
- Soft delete only: rejected because Article I requires full deletion for owner requests.
- Delete by share link or title: rejected because support operations need stable identifiers and explicit owner authority.

## Decision: Require `--confirm <tripId>` for destructive deletion

**Rationale**: A confirmation value matching the target trip id prevents accidental copy/paste deletion and is easy to test. The command also supports dry-run style behavior by refusing to delete without confirmation.

**Alternatives considered**:
- `--yes`: too easy to pass accidentally.
- Interactive prompt: poor fit for CI/testability and scripted support workflows.

## Decision: Keep archives local and do not automate delivery

**Rationale**: The F13 promise is capability, not a full support desk workflow. Local output avoids introducing storage, email, or file-sharing integrations that would require new privacy/security review.

**Alternatives considered**:
- Upload exports to object storage: deferred until object storage is selected for photos.
- Email export to owner: rejected because email delivery is not part of the current auth/support stack.
