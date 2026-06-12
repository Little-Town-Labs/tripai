# Research: Plan Review & Pre-Purchase Revisions

## Decisions

### Use persisted draft data instead of live provider calls

**Decision**: F7 reads `trips`, `trip_revisions`, `trip_days`, and `stops` and never calls OpenRouter or Google directly.

**Rationale**: F6 owns generation contracts and providers. F7 is the owner-facing review and intent-capture layer. Keeping provider calls out of F7 makes CI deterministic and prevents secret exposure.

**Alternatives considered**: Trigger AI revision execution synchronously from the review form. Rejected because F11 owns broader revision execution and limits; synchronous AI calls would also make review tests slow and flaky.

### Store pending pre-purchase requests as draft revisions

**Decision**: An accepted pre-purchase revision request creates `trip_revisions.kind = 'pre_purchase'`, `status = 'draft'`, `parent_revision_id = currentRevisionId`, and `summary = request text`.

**Rationale**: The existing schema already models draft/current/superseded revisions and enforces one current revision per trip. A draft row preserves the current version until a future generation job commits the revision.

**Alternatives considered**: Add a new `revision_requests` table. Rejected for this slice because the existing schema can represent pending revision intent and the MVP should avoid schema churn without a demonstrated need.

### Use owner-scoped RLS service functions

**Decision**: Plan review queries run inside a transaction with `set local role tripai_app` and `tripai.owner_id` set to the authenticated owner id.

**Rationale**: This matches F4/F2 patterns and means tests exercise the same owner isolation rules as production code.

**Alternatives considered**: Query as the migration/admin role and filter `owner_id` manually. Rejected because it weakens privacy guarantees and bypasses policies the feature relies on.

### Next.js 16 route and action patterns

**Decision**: Implement `/app/plan/[tripId]` as a Server Component route with `params: Promise<{ tripId: string }>` and a colocated Server Action for revision requests.

**Rationale**: The Next.js 16 docs under `node_modules/next/dist/docs/` specify Promise params for dynamic routes and warn that Server Actions are direct POST targets that must verify auth/authorization.

**Alternatives considered**: Client-side fetching or API route first. Rejected because the page can render from server data and the form can progressively enhance through a Server Action.
