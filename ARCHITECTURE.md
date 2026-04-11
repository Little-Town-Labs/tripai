# TripAI — Architecture & Product Plan

## Product Vision

An AI-powered travel planning app for families taking road trips in Florida. Families provide their travel dates, starting location, destination preferences, party composition, and interests. AI generates a fully personalized, day-by-day itinerary with restaurant picks, attractions, route guidance, and tips — all grounded in real, verified venue data.

Families **buy the trip once and own it forever**. During and after the trip, the app becomes a living scrapbook: notes, star ratings on every stop, and a personal photo album.

**Tagline concept:** _"Your AI travel agent — plan it, live it, keep it."_

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
| Database | **Supabase (Postgres)** | Auth + DB + Storage in one platform; generous free tier |
| Auth | **Supabase Auth** | Email/password + OAuth (Google); integrates with RLS for row-level security |
| ORM | **Drizzle** | Lightweight, type-safe, edge-compatible |
| Payments | **Stripe Checkout** | One-time payments; webhook-driven fulfillment |
| AI | **Anthropic Claude API** (Sonnet 4.6 for revisions, Opus 4.6 for initial generation) | Strong structured output, tool use, streaming |
| Venue Data | **Google Places API (New)** | Real-time venue lookup, hours, ratings, photos, place IDs |
| Routing | **Google Directions API** | Drive times, distances, waypoints |
| Maps | **Leaflet + react-leaflet** | Already in repo; free, no API key needed for tiles |
| Photo Storage | **Supabase Storage** | S3-compatible, integrates with auth/RLS |
| Styling | **Tailwind CSS v4** | Already configured |
| Deployment | **Vercel** | Native Next.js hosting; edge functions for streaming |

---

## Data Model

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
        │ content  │   │ tags     │   │ url      │  ← Supabase Storage path
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
│       └── callback/route.ts        # Supabase auth callback
│
src/components/
├── intake/                           # Multi-step form components
├── plan-review/                      # Plan display + revision UI
├── trip/                             # Trip detail components
│   ├── DaySection.tsx                # (evolve existing)
│   ├── StopCard.tsx                  # (evolve existing)
│   ├── TripMap.tsx                   # (evolve existing)
│   ├── NoteEditor.tsx
│   ├── RatingStars.tsx
│   └── PhotoUpload.tsx
├── album/                            # Photo album components
└── ui/                               # Shared UI primitives

src/lib/
├── db/
│   ├── schema.ts                     # Drizzle schema (all tables)
│   ├── client.ts                     # Drizzle + Supabase client
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

1. **Supabase setup** — project, auth, DB, storage bucket
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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google
GOOGLE_PLACES_API_KEY=
GOOGLE_DIRECTIONS_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
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
2. Set up Supabase project + Stripe account
3. Get Google Places & Directions API keys
4. Get Anthropic API key
5. Begin Phase 1 implementation (intake form → AI pipeline → checkout → trip view)
