# TripAI Implementation Roadmap

**Version:** 1.0.0
**Created:** 2026-04-11
**PRD Source:** `docs/ARCHITECTURE.md` (combined PRD + architecture)
**Constitution:** `.specify/memory/constitution.md` v1.0.0

---

## Executive Summary

**Product vision:** An AI-powered road-trip planning app for families, where families pay once, own the trip forever, and turn it into a living scrapbook. Tagline: _"Plan it. Live it. Keep it."_

**Scope of this roadmap:** Everything required to ship the MVP — from empty repo to a family being able to plan, buy, live, share, and scrapbook a Florida road trip.

**Total features:** 13, organized into 5 phases.

**Critical path:** F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → (MVP launch) → F13

**Parallelization opportunities:** F4 (intake form) and F5 (retrieval layer) can run in parallel after F3. F10 (scrapbook) and F9 (trip view) share surfaces but the data layer can be built in parallel.

---

## Constitutional Deltas From the Architecture Doc

The constitution requires **two features that the arch doc's Phase 1 task list does not include**. Surfacing them here so the roadmap is honest about scope:

| Constitutional Article | Missing From Arch Doc Phase 1 | Added As |
|---|---|---|
| Article II: Your family joins free, no accounts needed | "Sharing / multi-user trips" was explicitly out of scope | **F12: Credential-free family sharing** (required for MVP) |
| Article V: You can change your mind — before, during, and on the road | Mid-trip revisions were not scoped | **F11: Post-purchase & mid-trip revisions** (required for MVP) |

Both are constitutional commitments and therefore non-negotiable for launch. The roadmap reflects them as first-class features.

---

## Feature Inventory

### Phase 0 — Foundation

#### F1: Platform bootstrap
**Status:** Done — validated against Neon project `tripai` on 2026-06-11.
**Source:** Arch doc §Tech Stack, §Environment Variables
**Description:** Neon Postgres project, Neon Auth configuration, env vars, Next.js 16 App Router baseline (read `node_modules/next/dist/docs/` before touching Next 16 APIs per `AGENTS.md`), Drizzle setup, Tailwind v4, CI skeleton (lint + typecheck + test runner), Vercel project link, and Neon CLI/MCP setup per `docs/NEON.md`. Photo bucket/object storage selection remains deferred after the F10 notes/ratings slice.
**Complexity:** Small
**Priority:** P0
**Blocks:** Everything
**Constitution:** Article VII (tech stack)

#### F2: Data model & RLS policies
**Status:** Done — implemented with Drizzle schema, Neon testing branch validation, and owner/share-link RLS tests on 2026-06-11.
**Source:** Arch doc §Data Model
**Description:** Full Drizzle schema — `User`, `TripIntake`, `Trip`, `TripDay`, `Stop`, `Note`, `Rating`, `Photo`, plus **new tables required by the constitution**: `ShareLink` (tokens, revocation, per-link moderation metadata) and `TripRevision` (versioning for Article V rollback and Article IX revision-safe scrapbook). RLS policies MUST cover both owner-auth and share-token-auth paths. Every policy gets a dedicated test (Article II, Article IV of constitution).
**Complexity:** Medium
**Priority:** P0
**Depends on:** F1
**Constitution:** Articles II, VIII, IX

#### F3: Owner authentication
**Status:** Done — implemented with Neon Auth owner signup/signin, protected owner app route, owner reconciliation, and live disposable signup/sign-out smoke on 2026-06-11.
**Source:** Arch doc §Tech Stack (Neon Auth), §App Routes (`(auth)/`)
**Description:** Email/password + Google OAuth via Neon Auth with Better Auth. Login, signup, session handling, auth route handler, route protection middleware. **Only the trip owner authenticates — family members never do.**
**Complexity:** Small
**Priority:** P0
**Depends on:** F1, F2

---

### Phase 1 — Generate a Trip

#### F4: Intake form (responsive wizard)
**Status:** Done — implemented as an authenticated responsive owner intake wizard with validation, owner-scoped draft persistence through RLS, and desktop/mobile E2E coverage on 2026-06-11.
**Source:** Arch doc §AI Trip Generation Pipeline Step 1
**Description:** Multi-step intake wizard capturing `TripIntake` fields (origin, dates, party, interests, budget, constraints). **Responsive: works on desktop and mobile** per Article VI. Saves to DB for authenticated users; saves to session for anonymous until purchase.
**Complexity:** Medium
**Priority:** P0
**Depends on:** F2, F3

#### F5: Retrieval layer (Google Places + Directions)
**Status:** Done — implemented as a server-side retrieval library with Google Places/Routes adapters, deterministic cache keys, in-process cache freshness handling, typed provider errors, and fake-provider tests on 2026-06-11.
**Source:** Arch doc §AI Trip Generation Pipeline Step 2
**Description:** Server-side wrappers for Google Places (Text Search + Details) and Google Directions. Keys stay server-side (Article IV). Caching for stable results (venue details, route skeletons) per Article VI. This layer is consumed by both initial generation (F6) and revisions (F11).
**Complexity:** Small
**Priority:** P0
**Depends on:** F1
**Can run in parallel with:** F4

#### F6: AI generation pipeline (planner + validator + narrator)
**Status:** Done — implemented as a provider-agnostic server-side generation pipeline with OpenRouter `google/gemma-4-26b-a4b-it` request mapping, strict retrieval grounding validation, max-2 planner retry behavior, advisory narration checks, progress events, and fake-provider tests on 2026-06-11.
**Source:** Arch doc §AI Trip Generation Pipeline Steps 3–5
**Description:** The heart of the product.
- **Planner:** OpenRouter using `google/gemma-4-26b-a4b-it`, structured JSON output, system prompt enforces grounding (Article III).
- **Validator:** programmatic checks — every stop has a verified `google_place_id`, no closed venues, drive times plausible, required stop types present. Retry loop max 2 attempts per Article III.
- **Narrator:** OpenRouter using `google/gemma-4-26b-a4b-it` generates titles, summaries, per-day narratives, per-stop descriptions.
- **Voice constraint:** all prompts enforce advisory language per Article IV ("Consider…", never "You must…").
- **Streaming UX hooks** emit human-readable progress events per Article VI (<2s to first visible progress).
**Complexity:** Large
**Priority:** P0
**Depends on:** F2, F5

#### F7: Plan review & pre-purchase revisions
**Status:** Done — implemented as an authenticated owner-only review page with persisted draft itinerary display, progress-ready states, unlimited pre-purchase revision request capture, and previous-version browsing on 2026-06-11.
**Source:** Arch doc §AI Trip Generation Pipeline Step 6, §App Routes (`plan/[tripId]`)
**Description:** Streaming review page that displays the trip as it's generated, then the full plan with map. Natural-language revision chat. **Unlimited** revisions before purchase (Article V). Previous version browsable before the next revision commits.
**Complexity:** Medium
**Priority:** P0
**Depends on:** F6

---

### Phase 2 — Sell & Own a Trip

#### F8: Stripe checkout & fulfillment
**Status:** Done — implemented behind disabled-by-default `TRIPAI_STRIPE_ENABLED`, with owner-only checkout entry, hosted one-time Checkout session creation, integer-cent price validation, verified raw-body webhook fulfillment, and fake-provider checkout tests on 2026-06-11.
**Source:** Arch doc §App Routes (`plan/[tripId]/checkout`, `api/stripe/webhook`)
**Description:** Stripe Checkout session creation for one-time payment. **Integer cents only** (Article X). Webhook handler verifies signatures, marks trip as purchased, no reliance on client-side success redirect. No subscription SKUs (Article I). Post-purchase unlock of notes/ratings/photos.
**Complexity:** Medium
**Priority:** P0
**Depends on:** F7

#### F9: Trip detail view (co-pilot UX)
**Status:** Done — implemented as `/app/trips/[tripId]` owner-only purchased trip co-pilot view with current/next stop context, persisted route overview, lightweight Leaflet/OpenStreetMap stop map when coordinates exist, Google Maps/Waze handoffs, park official links, and no live Disney dependency on 2026-06-12.
**Source:** Arch doc §App Routes (`trips/[tripId]`), §Components (`TripRouteOverview`, `DaySection`, `StopCard`)
**Description:** The in-trip experience. Day-by-day itinerary, route overview with Leaflet/OpenStreetMap stop map, stop cards with ETA/distance/next-stop always visible. **Mobile-first** per Article VI. Every stop has one-tap hand-offs to Waze and Google Maps for navigation (Article VII). Park stops link out to the Disney app when applicable. Large tappable targets (≥44px), high-contrast typography, glanceable layout. Owner-only view.
**Complexity:** Large
**Priority:** P0
**Depends on:** F8

#### F10: Scrapbook (notes, ratings, photos)
**Status:** Done — implemented as a disabled-by-default `TRIPAI_SCRAPBOOK_ENABLED` owner scrapbook surface with durable trip/day/stop notes, stop ratings, first-class trip detail integration, photo metadata/status display, and an explicit no-fake-upload placeholder while object storage remains deferred on 2026-06-12.
**Source:** Arch doc §Data Model (`Note`, `Rating`, `Photo`), §App Routes (`api/trips/[tripId]/notes|ratings|photos`)
**Description:** Per-stop, per-day, per-trip notes and ratings (1–5 stars + text). Photo upload with client-side resize/compress, stored in S3-compatible object storage with access authorized through the app/database policy. **First-class in the UI** (not buried behind a "more" menu) per Article IX. Durable writes: no "uploaded" confirmation until storage confirms (Article X). Survives revisions per F11.
**Complexity:** Medium
**Priority:** P0
**Depends on:** F9

---

### Phase 3 — Adapt & Share (MVP completion)

#### F11: Post-purchase & mid-trip revisions
**Status:** Done — implemented owner-only revision controls with two planning rounds, three mid-trip rounds, visited-stop marking, draft candidate/commit workflow, removed-stop scrapbook preservation blocking and preservation writes, previous-version restore, trip-detail UI integration, and DB-backed revision tests on 2026-06-12. The app action path uses a conservative verified-route candidate generator through the service seam; provider-backed replanning can replace that generator without changing quota/commit/preservation behavior.
**Source:** Arch doc §AI Trip Generation Pipeline Step 6 (planning revisions), **Constitution Article V** (mid-trip revisions)
**Description:** Two revision modes sharing the same backend:
- **Planning revisions (post-purchase, pre-travel):** 2 free rounds. Same UX as F7 revisions.
- **Mid-trip revisions (on the road):** 3 free rounds. Mobile-first UX tuned for the passenger seat. Preserves stops the family has already checked off as visited — only future stops are revised.
- **Scrapbook preservation (Article IX):** when a revision would remove a stop that has notes/ratings/photos attached, the app warns and offers to preserve them at the day or trip level.
- **Rollback (Article V):** prior version browsable until the next revision commits.
- **Limit UX:** clear "you have N revisions left" messaging.
**Complexity:** Medium
**Priority:** P0
**Depends on:** F6, F9, F10
**Risk:** The scrapbook-preservation-on-revision logic is non-obvious and needs strong test coverage (Article II § RLS/scrapbook tests).

#### F12: Credential-free family sharing
**Status:** Done — implemented as opt-in owner share-link management, hash-only token storage, `/share/[token]` account-free itinerary/scrapbook viewing, share-link notes and ratings with display-name attribution, immediate revocation, owner moderation, and focused RLS/service/build validation on 2026-06-12. Photo binary upload remains deferred; shared users see photo metadata/status only.
**Source:** **Constitution Articles II, VIII** (not in arch doc Phase 1)
**Description:** The headline feature that wasn't in the arch doc.
- **Share link generation:** owner clicks "Share with family" → app mints an unguessable token (≥128 bits entropy, crypto-secure RNG, URL-safe), stored hashed when feasible.
- **Token-scoped access:** RLS policies on `Trip`, `TripDay`, `Stop`, `Note`, `Rating`, `Photo` accept the share token as an alternate auth path. Every policy has a test proving both allow and deny paths.
- **View + contribute:** family members view the full trip, add notes and ratings. Self-chosen display name ("Grandma"). Photo binary upload remains deferred until object storage is implemented.
- **Owner moderation:** owner can revoke any link (immediate effect, no cached access) and remove any family contribution.
- **Privacy:** share links never expose owner email, auth identity, or Stripe identifiers beyond display name. Tokens never appear in analytics URLs.
- **Opt-in only:** no "share by default" setting (Article VIII).
**Complexity:** Large
**Priority:** P0
**Depends on:** F2 (RLS infrastructure), F9 (view surface), F10 (contribution surface)
**Risk:** RLS correctness is a privacy incident risk. This is the single highest-risk feature and needs dedicated security review (use `security-reviewer` agent) before launch.

**🚀 MVP LAUNCH GATE:** F1–F12 complete = ready to ship.

---

### Phase 4 — Operational Promises (post-MVP OK)

#### F13: Data export & deletion (manual ops process)
**Status:** Done — implemented as internal support-ticket commands and runbook for owner-verified trip JSON export and confirmed permanent trip deletion on 2026-06-12. Export omits raw share tokens and secrets; deletion requires `--confirm <tripId>` and removes the target trip graph while preserving unrelated data.
**Source:** **Constitution Article I**
**Description:** Manual support-ticket-driven workflows to honor "you own it forever":
- **Export:** support staff can produce a portable archive (JSON + photos) of a user's trip on request.
- **Deletion:** support staff can permanently delete a trip, including all family contributions reachable via any share link (Article I rule).
- Self-serve versions may follow later; MVP ships with documented internal runbooks and DB queries/scripts.
**Complexity:** Small
**Priority:** P1 (MVP promise, but acceptable as manual process)
**Depends on:** F2, F10
**Note:** This is a constitutional commitment — it does not have to be a polished self-serve feature at MVP, but the capability to honor the promise MUST exist before launch.

---

## Dependency Graph

```
F1 (Bootstrap)
 ├──> F2 (Data model + RLS)
 │     ├──> F3 (Owner auth)
 │     │     └──> F4 (Intake form) ──────────────┐
 │     └──> F12 (Sharing) ◄──── depends on F9/F10
 └──> F5 (Retrieval layer) ──────────────────────┤
                                                  ▼
                                        F6 (AI pipeline)
                                                  │
                                                  ▼
                                    F7 (Review + pre-purchase rev)
                                                  │
                                                  ▼
                                      F8 (Stripe checkout)
                                                  │
                                                  ▼
                                    F9 (Trip detail / co-pilot)
                                                  │
                                                  ▼
                                         F10 (Scrapbook)
                                                  │
                                                  ▼
                                     F11 (Post/mid-trip revisions)
                                                  │
                                                  ▼
                                    F12 (Family sharing)  ◄── MVP gate
                                                  │
                                                  ▼
                                     F13 (Export/delete ops)
```

**Parallelization windows:**
- After F3: F4 and F5 in parallel
- After F9: F10 and the F12 data-layer pieces (token generation, RLS additions) can start in parallel with each other even though F12 UI still waits on F10

---

## Phase Summary

| Phase | Features | Goal | Blocks |
|---|---|---|---|
| 0 — Foundation | F1, F2, F3 | Empty repo → authenticated app with data model and RLS | Everything |
| 1 — Generate | F4, F5, F6, F7 | A family can go from intake → streaming AI-generated plan → unlimited pre-purchase revisions | Phase 2 |
| 2 — Sell & Own | F8, F9, F10 | The family can buy the trip, see the co-pilot UX, and add to the scrapbook | Phase 3 |
| 3 — Adapt & Share | F11, F12 | MVP-completing features: revisions (planning + mid-trip) and credential-free family sharing | MVP launch |
| 4 — Ops | F13 | Manual export/delete capability behind support tickets | n/a |

---

## Risk Assessment

### F6 — AI generation pipeline (Large)
**Technical risks:**
- Streaming partial-JSON parsing is fragile; LLM can emit malformed output mid-stream.
- Grounding enforcement via system prompt can be bypassed by the model; validator must be the real enforcer.
- COGS overshoot if retries loop.
**Business risks:**
- "Hallucinated venue" incident destroys trust.
**Mitigation:**
- Validator is programmatic and non-negotiable (Article III). Cap retries at 2.
- Prompt + tool-use design should constrain outputs; treat the prompt as a polite request, the validator as the contract.
- Log every retrieval call and every validator rejection for observability.
- Use `tdd-guide` for validator unit tests and `security-reviewer` for prompt-injection resistance.

### F12 — Credential-free family sharing (Large)
**Technical risks:**
- **RLS policy correctness is a privacy incident risk.** A silently broken policy leaks one family's trip to another.
- Token leakage via logs, analytics URLs, or error messages.
- Revocation cache invalidation (stale client-side session state).
**Business risks:**
- A single privacy leak ends the product.
**Mitigation:**
- Dedicated test per RLS policy proving both deny and allow paths (constitutional requirement, Article II of constitution).
- `security-reviewer` agent pass before launch.
- Share tokens never logged in plaintext; constant-time comparison.
- Revocation forces a short TTL on cached access.

### F9 — Trip detail view / co-pilot UX (Large)
**Technical risks:**
- Mobile performance with Leaflet + many stops.
- Glanceable UX is hard to design without actual in-car testing.
**Business risks:**
- If it's not usable in a moving car, Article VI is violated and the product loses its in-trip promise.
**Mitigation:**
- Performance budget: first meaningful paint <2s on median mobile (Article VI).
- Prototype + test on actual phones in actual cars (with a passenger, not the driver) before freezing the UI.
- `e2e-runner` agent for mobile viewport E2E tests.

### F11 — Post/mid-trip revisions (Medium)
**Technical risks:**
- Preserving scrapbook contributions when a revision removes a stop requires careful migration logic.
- "Already checked off" state must be respected by the revision planner.
**Mitigation:**
- Explicit test cases for revision + scrapbook interaction (Article IX rule).
- Revision planner gets the checked-off stops as frozen context.

### F8 — Stripe checkout & fulfillment (Medium)
**Technical risks:**
- Webhook idempotency (same event delivered twice).
- Client-side redirect trusted before webhook confirms payment.
**Mitigation:**
- Fulfillment driven ONLY by verified webhook (Article X).
- Idempotency key on webhook handler.

---

## Constitutional Compliance Check

| Article | Covered By | Status |
|---|---|---|
| I: You Own Your Trip Forever | F8 (no subscription), F13 (export/delete) | ✅ |
| II: Your Family Joins Free | F2 (RLS), F12 (sharing) | ✅ |
| III: Every Recommendation Is Web-Verified | F5 (retrieval), F6 (validator) | ✅ |
| IV: We Suggest, We Never Dictate | F6 (prompts), F7/F11 (UI language), F9 (no forced orderings) | ✅ |
| V: You Can Change Your Mind | F7 (pre-purchase), F11 (post + mid-trip) | ✅ |
| VI: Built for the Moment | F6 (streaming), F9 (co-pilot UX), F4 (responsive intake) | ✅ |
| VII: We Complement, We Don't Replace | F9 (Waze/Google Maps/Disney hand-offs) | ✅ |
| VIII: Your Trip Is Private By Default | F2 (owner-only default), F12 (opt-in share) | ✅ |
| IX: A Living Scrapbook | F10 (first-class), F11 (revision-safe) | ✅ |
| X: Your Money and Your Memories Are Safe | F8 (integer cents, signed webhooks), F10 (durable writes) | ✅ |

**Status:** ✅ All 10 constitutional articles have features in the roadmap.

---

## Execution Checklist

### Pre-Implementation Gates
- [x] PRD reviewed (`docs/ARCHITECTURE.md`)
- [x] Constitution ratified (`v1.0.0`)
- [x] Features identified and numbered
- [x] Dependencies mapped
- [x] Priorities assigned
- [x] Constitutional deltas surfaced (F11, F12 added)
- [x] Risks identified
- [x] Neon Postgres project created
- [x] Neon Auth configured
- [ ] Google Places + Directions API keys available locally for MVP validation
- [x] OpenRouter API key available locally for MVP validation
- [x] Vercel project linked (`poorlyordereds-projects/tripai`)

### Phase 0 — Foundation
- [x] **F1: Platform bootstrap** — `specs/001-platform-bootstrap`
- [x] **F2: Data model & RLS policies** — `specs/002-data-model-rls`
- [x] **F3: Owner authentication** — `specs/003-owner-authentication`
- [x] Phase 0 gate: authenticated user can sign up / log in; empty DB with RLS verified

### Phase 1 — Generate a Trip
- [x] **F4: Intake form** — `specs/004-intake-form`
- [x] **F5: Retrieval layer** — `specs/005-retrieval-layer`
- [x] **F6: AI generation pipeline** — `specs/006-ai-generation-pipeline`
- [x] **F7: Plan review & pre-purchase revisions** — `specs/007-plan-review-revisions`
- [ ] Phase 1 gate: a user can submit intake and see a grounded, streaming, revisable plan

### Phase 2 — Sell & Own a Trip
- [x] Stripe intentionally deferred behind `TRIPAI_STRIPE_ENABLED=0` for this MVP
- [x] **F8: Stripe checkout & fulfillment** — `specs/008-stripe-checkout-fulfillment`
- [x] **F9: Trip detail view (co-pilot UX)** — `specs/009-trip-detail-copilot`
- [x] **F10: Scrapbook (notes, ratings, photos)** — `specs/010-scrapbook`
- [x] Phase 2 gate: Stripe checkout is implemented but intentionally disabled; owner interaction continues through the purchased-trip surfaces for this MVP

### Phase 3 — Adapt & Share (MVP completion)
- [x] **F11: Post-purchase & mid-trip revisions** — `specs/011-mid-trip-revisions`
- [x] **F12: Credential-free family sharing** — `/speckit-specify 12-family-sharing`
- [ ] 🚀 **MVP launch gate:** all 12 features in production, security review passed

### Phase 4 — Operational Promises
- [x] **F13: Data export & deletion ops** — `/speckit-specify 13-export-delete-ops`

---

## Next Steps

**Short-term vacation slice:** build the local-first MVP described in `docs/LOCAL_MVP.md` before the full F1-F12 roadmap. This is intentionally not a replacement for Neon/Auth/AI/Stripe delivery; it is a usable browser-only planning aid for this week's trip.

**Recommended approach: phase-by-phase.** Specify all features in Phase 0, implement Phase 0, then specify Phase 1, implement Phase 1, etc. This lets lessons from early phases inform later specs and avoids locking in decisions before you learn from the first build.

**Immediate next command:**

```
/speckit-specify 4-intake-form
```

This will produce the F4 intake-form spec and its requirements checklist, then walk through clarify → plan → tasks → analyze → implement → review for F4.

**Before specifying F6:** if Anthropic, Google Places, or Stripe accounts aren't provisioned yet, do that first — the spec phase for F6 will want concrete key availability.

---

## Open Questions to Resolve Before MVP Launch

1. **Revision top-up UX:** Article V says "when a revision limit is reached, the UI MUST clearly explain the limit…and offer a purchasable top-up path (design TBD; not a hard requirement for MVP)." Decide whether top-ups are in or out before F11 spec.
2. **Photo storage limits per trip:** no explicit cap in the arch doc or constitution. F10 deferred binary photo upload and object storage; lock this during the later photo-storage slice.
3. **Pricing point:** arch doc says "$39–$59" range. Needs to be locked before F8 spec so checkout shows a real number.
4. **"Coming soon" handoff surface for Disney app live data:** Decided in F9: ship official park app/web handoff links only. No live Disney data dependency in the family MVP co-pilot route.
