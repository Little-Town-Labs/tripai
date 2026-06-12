# Implementation Plan: F13 Data Export and Deletion Ops

**Branch**: `013-export-delete-ops` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-export-delete-ops/spec.md`

## Summary

Build internal support-ticket operations for Article I export and deletion. The implementation will add a testable TypeScript ops service, a CLI wrapper, and a runbook. Export writes a portable JSON archive for one owner-verified trip without raw share tokens or secrets. Delete requires owner verification plus `--confirm <tripId>` and removes the trip graph through a transaction while preserving unrelated data.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5, Node.js runtime used by existing `tsx` test scripts

**Primary Dependencies**: `pg`, existing `src/db/client.ts`, Node `fs/promises`, Node `path`

**Storage**: Neon Postgres for source data; local JSON file for export archive

**Testing**: `node:test` via `tsx --test`, Neon testing branch DB-backed tests, lint, typecheck, build

**Target Platform**: Internal operator shell on Linux/macOS/WSL with Node and database access

**Project Type**: Internal CLI/service addition inside the existing Next.js repository

**Performance Goals**: Export one family trip in a single operator command; no external provider calls; deletion completes in one database transaction for typical MVP trip sizes.

**Constraints**: Do not print secrets or raw share tokens; require owner/trip match for export and delete; require explicit delete confirmation; photo binary storage remains deferred; commands are internal only.

**Scale/Scope**: One trip per command; MVP support-ticket workflow; self-serve UI, email delivery, and object-storage photo bundle are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article I: You Own Your Trip Forever**: PASS. F13 directly implements manual export and deletion capability.
- **Article II: Your Family Joins Free, No Accounts Needed**: PASS. Deletion removes share-link access and family contributions; export includes display-name attribution.
- **Article III: Every Recommendation Is Web-Verified**: PASS. F13 exports/deletes persisted data and does not generate recommendations.
- **Article VIII: Your Trip Is Private By Default**: PASS. Commands verify owner/trip match and avoid exposing raw share tokens or secrets.
- **Article IX: A Living Scrapbook**: PASS. Export/delete covers notes, ratings, and photo metadata.
- **Article X: Your Money and Your Memories Are Safe**: PASS. Export is read-only; deletion is transactional and requires explicit confirmation.

## Project Structure

### Documentation (this feature)

```text
specs/013-export-delete-ops/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
└── lib/ops/
    └── trip-data.ts

scripts/
└── trip-data-ops.ts

docs/
└── SUPPORT_DATA_OPS.md

tests/
└── ops/
    └── trip-data.test.ts
```

**Structure Decision**: Keep the reusable data logic in `src/lib/ops/`, keep the operator command in `scripts/`, and document the manual workflow under `docs/`. This avoids adding web UI or new runtime dependencies.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
No constitution violations or unusual complexity are required.
