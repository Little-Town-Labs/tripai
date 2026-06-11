# Research: Intake Form

## Decision: Use a protected `/app/intake` route for the MVP intake workflow

**Rationale**: F3 already protects `/app/*` and exposes `requireCurrentOwner()`. Placing intake under `/app` gives F4 the same owner-only privacy model as the workspace and avoids creating a second auth boundary.

**Alternatives considered**:

- Public intake first, then account creation: aligns with later anonymous/purchase flow, but it increases F4 scope and conflicts with the current family-only MVP priority of having login now.
- Home page replacement: preserves the local demo surface poorly and mixes authenticated production workflow with the old browser-only vacation demo.

## Decision: Use a client wizard for step state and a Server Action for final save

**Rationale**: The wizard needs interactive step navigation, preserved field values, and client-side affordances. Next.js 16 docs recommend Client Components for state/event handlers and Server Actions for form mutations. The Server Action must re-check owner auth because Server Functions are callable through direct POST requests.

**Alternatives considered**:

- One large server-rendered form: simpler but worse mobile ergonomics and weaker step-by-step experience.
- API route plus client fetch: works, but Server Actions better match the current App Router form pattern and keep mutation logic close to the route.

## Decision: Validate intake data in a shared server-safe TypeScript module without adding a validation dependency

**Rationale**: The project currently uses hand-written validation for auth and has no schema validation dependency. A focused `src/lib/intake/validation.ts` can be unit-tested, reused by the Server Action, and avoid adding package churn.

**Alternatives considered**:

- Add Zod: strong option if validation complexity grows, but F4's field set is bounded and does not justify a new dependency yet.
- Rely only on database constraints: insufficient because owners need field-specific, plain-language correction messages before persistence.

## Decision: Persist through `pg` with app role and owner RLS context

**Rationale**: F2 created RLS policies around `tripai.owner_id`, and `src/lib/access/context.ts` already provides helpers to set the app role and owner context. F4 should prove production writes follow the same privacy path instead of bypassing RLS.

**Alternatives considered**:

- Use Drizzle directly from the owner connection without setting context: type-safe, but risks bypassing the exact RLS behavior F2 validated.
- Add a generic repository abstraction: unnecessary until more features share a richer persistence surface.

## Decision: Keep F4 scoped to draft intake persistence, not AI generation

**Rationale**: Roadmap F6 owns AI generation and F5 owns retrieval. F4 should end at a clear "ready for generation" state with a saved draft intake ID, which is independently testable and valuable.

**Alternatives considered**:

- Immediately generate a placeholder trip after save: tempting for demos, but it muddies the F4/F5/F6 boundaries and would produce unverified recommendations.
