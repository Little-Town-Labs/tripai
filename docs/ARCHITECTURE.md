# TripAI — Architecture & Product Plan

## Product Vision

An AI-powered travel planning app for families taking road trips in Florida. Families provide their travel dates, starting location, destination preferences, party composition, and interests. AI generates a fully personalized, day-by-day itinerary with restaurant picks, attractions, route guidance, and tips — all grounded in real, verified venue data.

Families **buy the trip once and own it forever**. During and after the trip, the app becomes a living scrapbook: notes, star ratings on every stop, and a personal photo album.

**Tagline:** _"Plan it. Live it. Keep it."_

---

## Users & Market

**Primary user:** Busy parents with young kids, planning a road trip they don't have time to research. Not tech-savvy — they want the app to feel like talking to a smart friend, not configuring software.

**Secondary users:** Multigenerational travel parties — grandparents, aunts, uncles, older kids — who join the trip via a link the parents send them. They never make an account. They see the itinerary, tap to navigate, upload photos, and leave ratings.

**Who we're competing with:** Nothing, functionally. Our users are currently switching from "winging it," a Google Doc, a pile of browser tabs, or a half-started spreadsheet. TripAI is the first real tool they'll use for this job.

**The job to be done:** _"Plan a road trip my family will actually enjoy, without spending my limited free time becoming a travel agent — and keep the memories afterward."_

**Success metrics for MVP:**
- **Conversion:** % of families who complete the intake form and then purchase (target: 25%+)
- **Revision usage:** avg revisions used pre-purchase (signal: is the plan close enough on first pass?)
- **Share adoption:** % of purchased trips that generate at least one share link (target: 60%+)
- **Scrapbook activity:** % of purchased trips with at least one photo or note uploaded during or after travel (target: 50%+)
- **Referral intent:** families who report they'd recommend it (NPS-style, post-trip)

**Positioning:** Not a navigation app. Not a booking engine. Not a travel guide. TripAI is the **itinerary brain + family scrapbook** for the one week a year a family hits the road together.

---

## Locked Decisions

| # | Decision | Answer |
|---|---|---|
| 1 | Generation UX | Streaming — show the AI planning live ("Searching restaurants near Orlando…") |
| 2 | Revisions | Unlimited before purchase; **2 free revisions** after purchase |
| 3 | Pre-purchase preview | Full plan visible; pay to lock in + unlock notes, photos, and permanent ownership |
| 4 | Grounding strictness | **Strict** — every venue must have a verified Google Places ID |
| 5 | Starter destinations | **Florida focus** (Disney/Orlando, Gulf Coast, Keys, Panhandle, etc.) |
| 6 | Trip types | **Road trips only** |
| 7 | Primary data source | **Google Places API + Google Directions API** |
| 8 | Model COGS budget | **$1–3 per trip** generation (Claude API + Google APIs combined) |

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19) | Already in repo; Server Components + Server Functions for the AI pipeline |
| Language | **TypeScript** | Already configured |
| Database | **Neon Postgres** | Serverless Postgres; avoids Supabase project limits while preserving SQL, Drizzle, and RLS-oriented design |
| Auth | **Neon Auth with Better Auth** | Email/password + OAuth (Google); auth data lives with the Neon database and can be queried directly |
| ORM | **Drizzle** | Lightweight, type-safe, edge-compatible |
| Payments | **Stripe Checkout** | One-time payments; webhook-driven fulfillment |
| AI | **OpenRouter** using `google/gemma-4-26b-a4b-it` | Structured JSON output with provider abstraction for planner and narrator calls |
| Venue Data | **Google Places API (New)** | Real-time venue lookup, hours, ratings, photos, place IDs |
| Routing | **Google Directions API** | Drive times, distances, waypoints |
| Maps | **Current: route overview + Google/Waze handoffs. Candidate: Leaflet + OpenStreetMap tiles** | The older Disney tracker uses Leaflet/OSM; TripAI can adopt it later for in-app map display without a Google Maps tile key |
| Photo Storage | **S3-compatible object storage (vendor TBD)** | Neon does not provide object storage; keep photos in durable object storage and authorize access through app/database policy |
| Styling | **Tailwind CSS v4** | Already configured |
| Deployment | **Vercel** | Native Next.js hosting; edge functions for streaming |

Neon setup, CLI, MCP, and agent connection instructions live in [`docs/NEON.md`](NEON.md).

---

## Data Model

**F2 implementation note:** The production schema adds two constitution-driven tables not shown in the original diagram: `ShareLink` for credential-free family access and revocation, and `TripRevision` for current/prior itinerary versions. The implemented `Photo` surface is currently `photo_metadata`; binary object storage remains deferred until F10 photo upload work. Stop rows include a stable stop key so notes, ratings, and photo metadata can survive revisions when stops remain.

```
┌──────────────┐       ┌──────────────────┐
│    User       │       │   TripIntake      │
│──────────────│       │──────────────────│
│ id (uuid)     │       │ id (uuid)         │
│ email         │──┐    │ user_id (fk)?     │  ← nullable (anonymous until purchase)
│ display_name  │  │    │ origin_address    │
│ created_at    │  │    │ destination_area  │  ← "Orlando", "Gulf Coast", etc.
│ preferences   │  │    │ start_date        │
└──────────────┘  │    │ end_date          │
                   │    │ party_adults      │
                   │    │ party_children    │
                   │    │ children_ages     │  ← int[]
                   │    │ interests         │  ← text[] ("theme parks", "beaches", "seafood", etc.)
                   │    │ budget_level      │  ← "budget" | "moderate" | "premium"
                   │    │ dietary_needs     │  ← text[]
                   │    │ mobility_notes    │
                   │    │ travel_style      │  ← "packed" | "relaxed" | "balanced"
                   │    │ created_at        │
                   │    └──────────────────┘
                   │
                   │    ┌──────────────────┐
                   │    │      Trip         │
                   │    │──────────────────│
                   └───>│ id (uuid)         │
                        │ user_id (fk)      │
                        │ intake_id (fk)    │
                        │ title             │  ← AI-generated ("Your 7-Day Orlando Adventure")
                        │ summary           │  ← AI-generated blurb
                        │ status            │  ← "draft" | "purchased" | "active" | "completed"
                        │ stripe_session_id │
                        │ price_cents       │
                        │ revisions_used    │  ← int, max 2 after purchase
                        │ created_at        │
                        │ purchased_at      │
                        └──────────────────┘
                              │
                              │ 1:N
                              ▼
                        ┌──────────────────┐
                        │     TripDay       │
                        │──────────────────│
                        │ id (uuid)         │
                        │ trip_id (fk)      │
                        │ day_number        │
                        │ date              │
                        │ label             │  ← "Drive Day", "Magic Kingdom", "Beach Day"
                        │ from_location     │
                        │ to_location       │
                        │ total_miles       │
                        │ drive_time_min    │
                        │ ai_summary        │  ← AI-generated day narrative
                        └──────────────────┘
                              │
                              │ 1:N
                              ▼
                        ┌──────────────────┐
                        │      Stop         │
                        │──────────────────│
                        │ id (uuid)         │
                        │ day_id (fk)       │
                        │ order_index       │
                        │ name              │
                        │ type              │  ← "drive" | "fuel" | "restaurant" | "attraction" | "hotel" | "rest" | "park"
                        │ google_place_id   │  ← REQUIRED — grounding anchor
                        │ lat               │
                        │ lng               │
                        │ address           │
                        │ eta               │
                        │ description       │  ← AI-generated tip/reason
                        │ tips              │  ← AI-generated
                        │ price_level       │  ← from Google Places (1-4)
                        │ google_rating     │  ← from Google Places
                        │ hours_summary     │  ← from Google Places
                        │ phone             │
                        │ website           │
                        │ checked           │  ← user marks as visited
                        └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │   Note   │   │  Rating  │   │  Photo   │
        │──────────│   │──────────│   │──────────│
        │ id       │   │ id       │   │ id       │
        │ stop_id  │   │ stop_id  │   │ stop_id? │  ← nullable (can attach to day or trip)
        │ day_id?  │   │ user_id  │   │ day_id?  │
        │ trip_id  │   │ stars    │   │ trip_id  │
        │ user_id  │   │ text     │   │ user_id  │
        │ content  │   │ tags     │   │ url      │  ← object storage path
        │ created  │   │ created  │   │ caption  │
        └──────────┘   └──────────┘   │ created  │
                                       └──────────┘
```

---

## AI Trip Generation Pipeline

### Overview

```
Intake Form  →  Retrieval  →  Planner LLM  →  Validator  →  Narrator LLM  →  Draft Trip
                                                                                    │
                                                                           User Review/Revise
                                                                                    │
                                                                              Stripe Checkout
                                                                                    │
                                                                              Owned Trip
```

### Step 1: Intake

User fills a multi-step form. Output: `TripIntake` JSON saved to DB (or session if anonymous).

### Step 2: Retrieval (server-side)

Before calling the LLM, we fetch real data to ground the plan:

1. **Destination candidates** — Google Places Text Search for restaurants, attractions, hotels within the destination area, filtered by the family's interests and budget.
2. **Route skeleton** — Google Directions API for the overall drive from origin to destination, including waypoints and total drive time.
3. **Fuel/rest stops** — Along-the-route search for gas stations and rest areas at ~150-mile intervals.
4. **Seasonal context** — Park hours, known events/festivals for the travel dates (initially hardcoded for Disney/Universal; later from an API).

Output: a **retrieval context** document with structured venue data (name, place_id, address, rating, price_level, hours, types).

### Step 3: Planner LLM (Claude)

**Input:**
- `TripIntake` JSON
- Retrieval context (real venues with place IDs)
- System prompt with planning rules:
  - Every stop MUST reference a `google_place_id` from the retrieval context
  - Respect drive time constraints (no 14-hour drive days)
  - Balance activity intensity with party composition (kids need downtime)
  - Spread meal types across the trip (don't repeat cuisines)
  - Include tips tailored to the family's needs

**Output:** Structured JSON matching the `Trip > TripDay > Stop` schema.

**Model:** Claude Opus 4.6 for initial generation (highest quality). Budget: ~$0.50–1.50 per generation.

**Streaming:** Use the Anthropic streaming API. Parse partial JSON to show progress in the UI:
- "Planning your route from St. Louis to Orlando…"
- "Found 12 restaurants matching your preferences…"
- "Building Day 1: Drive day with 3 stops…"
- "Day 1 complete. Starting Day 2…"

### Step 4: Validator (server-side, no LLM)

Programmatic checks before showing to user:
- Every stop has a valid `google_place_id`
- No stop references a permanently closed venue (re-check Places API)
- Drive times between consecutive stops are plausible (< 6 hours per segment)
- Total daily drive time is reasonable (< 10 hours)
- No duplicate stops
- Required stop types present (at least one meal per day, hotel for overnights)

Failed checks → feed back to planner for correction (retry loop, max 2 retries).

### Step 5: Narrator LLM (Claude Sonnet 4.6)

Takes the validated plan and generates:
- Trip title and summary
- Per-day narrative summaries
- Per-stop descriptions and tips personalized to the family

**Model:** Claude Sonnet 4.6 (fast, cheap). Budget: ~$0.10–0.30 per trip.

### Step 6: Revision Loop

User reviews the full plan and can request changes in natural language:
- "Swap the Day 2 lunch for something more kid-friendly"
- "Add a beach stop on Day 4"
- "We don't want to drive more than 6 hours on any day"

Revision flow:
1. User message + current plan JSON → Claude Sonnet 4.6
2. LLM outputs a diff (which stops to replace/add/remove)
3. New stops go through retrieval + validation
4. Updated plan displayed

**Before purchase:** Unlimited revisions.
**After purchase:** 2 free revisions, then locked.

---

## App Routes (Next.js 16 App Router)

```
src/app/
├── layout.tsx                        # Root layout, auth provider, fonts
├── page.tsx                          # Landing / marketing page
├── globals.css
│
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── plan/
│   ├── page.tsx                      # Intake form (multi-step wizard)
│   └── [tripId]/
│       ├── page.tsx                  # Plan review + revision chat
│       ├── checkout/page.tsx         # Stripe Checkout redirect
│       └── success/page.tsx          # Post-purchase confirmation
│
├── trips/
│   ├── page.tsx                      # "My Trips" dashboard
│   └── [tripId]/
│       ├── page.tsx                  # Trip detail view (day-by-day, map)
│       ├── day/[dayNumber]/page.tsx  # Single day detail
│       └── album/page.tsx            # Photo album view
│
├── api/
│   ├── generate/route.ts            # POST: kick off AI generation (streaming response)
│   ├── revise/route.ts              # POST: submit revision request
│   ├── places/route.ts              # GET: proxy Google Places (keep API key server-side)
│   ├── stripe/
│   │   └── webhook/route.ts         # POST: Stripe webhook handler
│   ├── trips/
│   │   └── [tripId]/
│   │       ├── notes/route.ts       # CRUD notes
│   │       ├── ratings/route.ts     # CRUD ratings
│   │       └── photos/route.ts      # Upload/list photos
│   └── auth/
│       └── [...neon]/route.ts       # Neon Auth API handler
│
src/components/
├── intake/                           # Multi-step form components
├── plan-review/                      # Plan display + revision UI
├── trip/                             # Trip detail components
│   ├── DaySection.tsx                # (evolve existing)
│   ├── StopCard.tsx                  # (evolve existing)
│   ├── TripRouteOverview.tsx         # Current no-key route summary; may evolve into Leaflet/OSM map
│   ├── NoteEditor.tsx
│   ├── RatingStars.tsx
│   └── PhotoUpload.tsx
├── album/                            # Photo album components
└── ui/                               # Shared UI primitives

src/lib/
├── db/
│   ├── schema.ts                     # Drizzle schema (all tables)
│   ├── client.ts                     # Drizzle + Neon Postgres client
│   └── migrations/                   # Drizzle migrations
├── ai/
│   ├── planner.ts                    # Planner prompt + Claude API call
│   ├── narrator.ts                   # Narrator prompt + Claude API call
│   ├── revisor.ts                    # Revision prompt + diff logic
│   └── prompts/                      # System prompts as template strings
├── google/
│   ├── places.ts                     # Google Places API wrapper
│   └── directions.ts                 # Google Directions API wrapper
├── stripe/
│   └── checkout.ts                   # Stripe session creation + webhook handler
├── validators/
│   └── trip-validator.ts             # Post-generation validation checks
└── types.ts                          # Shared TypeScript types
```

---

## Phase 1 — MVP Scope

**Goal:** One user can go from intake → AI-generated Florida road trip → purchase → use it with notes, ratings, and photos.

### Tasks

1. **Neon setup** — Postgres project, Neon Auth, env vars, DB branches
2. **Drizzle schema** — all tables from data model above
3. **Intake form** — multi-step wizard (origin, dates, party, interests, budget, constraints)
4. **Google Places integration** — server-side search + detail lookup
5. **Google Directions integration** — route calculation
6. **AI planner** — Claude Opus 4.6 with structured output, streaming
7. **Trip validator** — programmatic checks on generated plan
8. **AI narrator** — Claude Sonnet 4.6 for descriptions and tips
9. **Plan review page** — full plan display with map, streaming generation UX
10. **Revision chat** — natural language revision with AI
11. **Stripe Checkout** — one-time payment, webhook fulfillment
12. **Trip detail view** — day-by-day owned trip with map (evolve existing components)
13. **Notes** — per-stop and per-day text notes
14. **Ratings** — 1–5 stars + optional text per stop
15. **Photo upload** — attach photos to stops/days, basic gallery view

### Out of scope for Phase 1
- Sharing / multi-user trips
- Offline mode
- Aggregated ratings across users
- Multiple destination regions (Florida only)
- Trip "remix" / preference memory

---

## Environment Variables Required

```env
# Neon
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=

# OpenRouter
OPENROUTER_API_KEY=

# Google
GOOGLE_MAPS_API_KEY=
# Compatibility names accepted by the current adapter if keys are split.
GOOGLE_PLACES_API_KEY=
GOOGLE_DIRECTIONS_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Object storage (deferred until F10 photo upload work)
# STORAGE_ENDPOINT=
# STORAGE_REGION=
# STORAGE_BUCKET=
# STORAGE_ACCESS_KEY_ID=
# STORAGE_SECRET_ACCESS_KEY=
```

---

## Cost Estimate Per Trip

| Component | Estimate |
|---|---|
| Claude Opus 4.6 (planner) | $0.50–1.50 |
| Claude Sonnet 4.6 (narrator + revisions) | $0.10–0.50 |
| Google Places API (~50–100 calls) | $0.25–0.50 |
| Google Directions API (~5–10 calls) | $0.05–0.10 |
| **Total COGS per trip** | **$0.90–2.60** |

At a **$39–$59 price point** per trip, margins are healthy (~95%).

---

## Next Steps

1. Review and approve this architecture
2. Set up Neon project/Auth + Stripe account
3. Get Google Places & Directions API keys
4. Get OpenRouter API key
5. Begin Phase 1 implementation (intake form → AI pipeline → checkout → trip view)
