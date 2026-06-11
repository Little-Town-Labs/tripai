# TripAI Constitution

**Version:** 1.0.0
**Ratified:** 2026-04-11
**Last Amended:** 2026-04-11

---

## Preamble

TripAI is an AI-powered road-trip planning app for families. Families pay once, own the trip forever, and turn it into a living scrapbook of notes, ratings, and photos.

This constitution is a set of **product promises** to those families. Each article states a promise in plain language and then lists the binding rules that make it true. Every specification, plan, and implementation decision MUST conform to these articles. Violations require an explicit, documented exception approved in the relevant spec or plan.

Process-level rules (TDD, code style, verification, spec-kit workflow, security baselines) are governed by the global rules in `~/.claude/rules/` and are not restated here. This document governs the **product**.

---

## Article I: You Own Your Trip Forever

**The Promise:** When a family buys a trip, it's theirs — not a rental, not a subscription, not something we can take away.

**Rules:**
- A purchased trip SHALL remain accessible to its owner indefinitely, with no subscription, no expiration, and no feature-gating after purchase.
- Pricing SHALL be one-time per trip. Recurring charges on purchased trips are prohibited.
- The owner SHALL be able to request a full export of their trip data (itinerary, notes, ratings, photos, metadata) in a portable format. MVP MAY implement this as a manual support-ticket process; self-serve export MAY follow later.
- The owner SHALL be able to request full deletion of their trip. Deletion MUST remove the itinerary, all notes, all ratings, all photos, and all family contributions attached to the trip. MVP MAY implement this as a manual support-ticket process.
- Deletion is absolute: once a trip is deleted at the owner's request, no family member — including share-link contributors — retains access to any part of it.
- Ownership records MUST persist across revisions, price changes, and feature changes.

**Rationale:**
"You own it forever" is the central product promise and the reason a family will pay up front instead of subscribing. Making export and deletion constitutional prevents them from being quietly dropped under delivery pressure. Owner-controlled deletion (wiping family contributions too) keeps the privacy model simple: one trip, one authority.

**Exceptions:**
- A trip MAY be hidden from the owner's view if legal action requires it (e.g., a court order). The data is not deleted and is restored when the order lifts.

---

## Article II: Your Family Joins Free, No Accounts Needed

**The Promise:** Grandma doesn't need an account to see the itinerary, open the map, or upload a photo from the beach.

**Rules:**
- Every purchased trip SHALL be shareable with family via an unguessable share link. Share tokens MUST carry at least 128 bits of entropy, be URL-safe, and be generated with a cryptographically secure RNG.
- Family members accessing a trip via share link MUST NOT be required to create an account, sign in, provide email, or supply any credential.
- Share-link recipients SHALL have **view + contribute** access: they can view the full itinerary, map, stops, and media, AND they can add photos, notes, and ratings.
- Family contributions MUST be attributable via a self-chosen display name ("Grandma," "Uncle Joe") without requiring or storing authentication.
- The trip owner SHALL retain moderation authority: they can revoke share links at any time, and they can remove any contribution made via a share link. Revocation MUST take effect immediately, with no cached access.
- Share links MUST NOT expose the owner's email, auth identity, Stripe session, or other PII beyond their display name.
- Every database row reachable via a share link MUST be governed by an explicit Row-Level Security (RLS) policy scoped to the share token, not to an authenticated user.

**Rationale:**
The product lives or dies on whether the extended family can actually *use* the trip together without friction. Forcing accounts at the sharing step breaks the magic and guarantees adoption failure. Making this a constitutional principle forces the data model and RLS policies to account for share-token auth from day one, rather than retrofitting it as a Phase 2 feature. This article deliberately overrides the "sharing / multi-user trips — out of scope for Phase 1" line in `docs/ARCHITECTURE.md`.

**Exceptions:**
- None. If a feature cannot work under share-link access, it MUST be scoped owner-only and clearly marked in the spec.

---

## Article III: Every Recommendation Is Web-Verified

**The Promise:** Every place we send a family to is real, open, and reachable. Every drive time and distance is drawn from live routing data. We don't make things up.

**Rules:**
- Every stop in a generated or revised trip MUST reference a valid `google_place_id` obtained from a live Google Places API call in the pipeline's retrieval phase.
- Every drive-time and distance figure shown to the user MUST come from a live Google Directions API call, not from LLM estimation.
- Destination information (seasonal notes, event calendars, general tips) MUST be sourced from a verifiable external source (Google Places data, a known API, or a citation-backed web lookup). AI-generated narrative MAY NOT invent factual details.
- The trip validator SHALL reject any planner output containing a stop without a verified `google_place_id`, and the pipeline SHALL retry (max 2 retries) before surfacing an error to the user.
- The validator SHALL re-check each `google_place_id` against the Places API to confirm the venue is not permanently closed before presenting the plan to the user.
- AI-generated fields (titles, summaries, descriptions, tips) MAY write *about* verified data, but MAY NOT fabricate hours, prices, phone numbers, addresses, or "known for" details that are not in the retrieved source data.
- When a fact cannot be verified, the app SHALL either omit it or label it clearly as unverified — never present it as confirmed.

**Rationale:**
The single biggest product risk is sending a family to a restaurant that doesn't exist, a park that's closed for the season, or a drive that's three hours longer than the AI guessed. "Strict grounding" was already a locked architectural decision; elevating it here makes it binding on every future feature, not just the initial planner.

**Exceptions:**
- None. Grounding is the product.

---

## Article IV: We Suggest, We Never Dictate

**The Promise:** The app is a knowledgeable travel agent, not a drill sergeant. The family always has the final say.

**Rules:**
- AI-generated copy SHALL use advisory language ("Consider…", "A popular choice is…", "You might enjoy…"). It MUST NOT use imperative or compulsory language ("You must…", "Do not…", "Required stop").
- Every suggested stop, time, route, or activity SHALL be dismissible, reorderable, or replaceable by the owner and (where permitted) by share-link contributors.
- The app MUST NOT "lock" a family into an itinerary. There is no gated path, no forced sequence, no "you already committed" UI.
- Recommendations SHALL present alternatives when feasible — not a single "correct" answer the family must accept.
- Safety warnings (e.g., "this stretch has limited fuel") are permitted as advisories but MUST NOT block user actions.
- The planner and revisor LLMs SHALL be prompted with an advisory voice; system prompts MUST forbid commanding or guilt-inducing language.

**Rationale:**
Families are on vacation. The app's job is to reduce decision fatigue, not replace family agency. A travel agent who tells you what you "must" do gets fired. This article pins down the product's voice and posture so it survives every prompt revision, UI iteration, and AI model upgrade.

**Exceptions:**
- Legal and safety disclosures (e.g., Stripe terms, data privacy notices) MAY use required/mandatory language as law requires.

---

## Article V: You Can Change Your Mind — Before, During, and On the Road

**The Promise:** Plans change. Kids get tired. Weather happens. The app should flex with the family, not fight them.

**Rules:**
- **Before purchase:** Revisions SHALL be unlimited. The family can iterate as many times as they want while deciding.
- **After purchase, before travel:** The family SHALL receive **2 free revision rounds** to adjust the plan.
- **During the trip (on the road):** The family SHALL receive **3 free on-the-fly revisions** to reshuffle the remaining itinerary (e.g., "skip the afternoon stop, we're running late" or "add a beach day Thursday").
- Every revision SHALL run through the same validator and grounding pipeline (Article III). No revision is exempt from verification.
- When a revision limit is reached, the UI MUST clearly explain the limit, show how many revisions remain, and offer a purchasable top-up path (design TBD; not a hard requirement for MVP).
- Revisions MUST NOT destroy the prior state. The owner SHALL be able to view and restore the previous version of the trip at least until the next revision is committed.
- Mid-trip revisions MUST account for stops the family has already checked off as visited — those stops are preserved, future stops are the revision target.

**Rationale:**
The family paid for a trip, not a brittle document. Revisions are the difference between "we bought a plan and tried to follow it" and "we bought a trip that adapted to us." Mid-trip revisions in particular are what separates TripAI from a generated PDF. Making revision quotas constitutional prevents them from being quietly trimmed under COGS pressure.

**Exceptions:**
- Revision counts MAY be increased (never decreased) as a marketing or support gesture without a constitutional amendment.

---

## Article VI: Built for the Moment

**The Promise:** You'll see your trip come to life as we build it, you'll never get lost in a fleet of old trips, and when you're in the car your co-pilot can actually read the thing.

**Rules:**
- **Streaming generation.** Trip generation SHALL stream progress to the user. First visible progress MUST appear within 2 seconds of the intake form being submitted. Silent spinners are prohibited.
- **Progress narration.** Streaming updates SHALL be human-readable ("Searching restaurants near Orlando…", "Building Day 2…") — not raw JSON or opaque percentages.
- **Single-trip focus.** The app SHALL optimize for one active trip at a time. Trip lists and dashboards MAY exist, but the active trip (the one currently being planned, previewed, or traveled) is always the primary surface.
- **Planning flow is responsive.** The intake, preview, and checkout flows SHALL work on both desktop and mobile. Trip design often starts on a laptop at the kitchen table.
- **Usage flow is mobile-first.** The in-trip experience (day view, stop view, map, notes, photos, navigation hand-offs) SHALL be designed mobile-first. Desktop in-trip views are a nice-to-have.
- **Co-pilot ergonomics.** In-trip views MUST be usable by a passenger in a moving car: glanceable typography, high-contrast, large tappable targets (minimum 44px), current stop + next stop + ETA visible without scrolling.
- First meaningful paint on the trip detail page SHALL render in under 2 seconds on a median mobile connection.

**Rationale:**
Three UX promises folded into one article because they share a thread: the app exists *in the moment* the family is using it. Streaming makes generation feel alive. Single-trip focus keeps the app uncluttered. Co-pilot ergonomics acknowledge the physical reality of a phone held by a passenger at 70 mph. None of these can be bolted on later; they shape the component architecture and the data model.

**Exceptions:**
- Admin and support surfaces are not subject to the mobile-first or co-pilot rules.

---

## Article VII: We Complement, We Don't Replace

**The Promise:** TripAI is the itinerary brain. Waze drives. Google Maps navigates. The Disney app handles the parks. We do the one thing they don't.

**Rules:**
- TripAI SHALL NOT implement turn-by-turn navigation. Every stop MUST provide one-tap hand-offs to Waze and Google Maps for navigation.
- TripAI SHALL NOT replicate park-specific live data (ride wait times, dining availability, park hours as live feeds). The app MAY show static/planning-level info from Google Places but MUST link out to the official park app (e.g., the Disney app) for live operations.
- Hand-off links MUST use platform-standard deep links so they open the target app if installed, fall back to web otherwise.
- The app MUST NOT attempt to position itself as a replacement for Waze, Google Maps, or the Disney app — in marketing copy, in-app messaging, or AI-generated narrative.
- New features that would duplicate a specialist app's core job MUST be rejected at the spec phase.

**Rationale:**
Scope discipline. The apps this constitution explicitly declines to replace are each worked on by teams of hundreds of engineers. Competing with them is a loss. Handing off to them — smoothly — is a win. This article gives reviewers a clear lever to reject scope creep into navigation or park-ops territory.

**Exceptions:**
- If a specialist app's public API lets TripAI embed a specific piece of live data (e.g., official Disney wait-time widget) in a way that improves the family's trip without claiming to *be* that app, the embed is permitted.

---

## Article VIII: Your Trip Is Private By Default

**The Promise:** Your trip is visible to you. It becomes visible to family only when you explicitly choose to share it, and only with the people you give the link to.

**Rules:**
- A trip's default visibility SHALL be owner-only. Sharing is an explicit action the owner takes.
- Share links MUST be opt-in per trip. There is no "share by default" setting.
- Share links MUST be revocable at any time, with immediate effect.
- The owner SHALL be able to see a list of active share links for a trip and revoke them individually.
- Public, search-indexed, or cross-family-discoverable trips are prohibited in MVP.
- The app MUST NOT expose owner email, phone, Stripe identifiers, or any non-display-name PII to share-link recipients.
- Error responses, logs, and analytics MUST NOT leak trip data, share tokens, or owner PII beyond what is strictly necessary for debugging.
- Share tokens MUST be treated as secrets: logged only in hashed form, compared in constant time where feasible, and never emitted in URLs recorded by third-party analytics.

**Rationale:**
Privacy by default is both the ethical baseline and the trust foundation for a product where a family uploads photos of their kids. Making it constitutional prevents a future "discovery feed" feature from quietly flipping trips public.

**Exceptions:**
- Aggregated, fully anonymized analytics (e.g., "83% of Orlando trips include Magic Kingdom") are permitted for product improvement, subject to a documented anonymization standard.

---

## Article IX: A Living Scrapbook, Not a One-Shot PDF

**The Promise:** The trip is not frozen at purchase. It grows with the family — notes, ratings, photos — and becomes the memory of the trip itself.

**Rules:**
- Every purchased trip SHALL support per-stop notes, per-stop ratings (1–5 stars + optional text), and per-stop / per-day / per-trip photos.
- Notes, ratings, and photos SHALL be editable by the owner and by share-link contributors (subject to Article II moderation).
- Contributions MUST persist across revisions: revising the itinerary MUST NOT destroy notes, ratings, or photos attached to stops that remain in the revised plan.
- When a revision removes a stop that has attached contributions, the app MUST warn the owner before committing the revision and offer to preserve the contributions at the day or trip level.
- Photos MUST be stored durably in object storage or equivalent, with access policies matching the trip's access model.
- The scrapbook experience MUST be first-class in the UI, not buried behind a "more" menu. Viewing the trip and adding to it are the same surface.

**Rationale:**
The scrapbook is the second half of the "plan it, live it, keep it" tagline and the reason a family remembers the app after the trip. A trip that loses its notes and photos on every revision is a spreadsheet, not a scrapbook. Preserving contributions through revision is non-obvious and easy to skip, which is exactly why it's constitutional.

**Exceptions:**
- Contributions MAY be evicted when the owner deletes the trip under Article I.

---

## Article X: Your Money and Your Memories Are Safe

**The Promise:** What you pay is what we charge. What you uploaded is still there tomorrow. Nothing gets lost in a crash, a revision, or a bad deploy.

**Rules:**
- Money values (prices, Stripe amounts, discounts, refunds) MUST be stored and manipulated as integer cents. Floating-point money is prohibited.
- Stripe webhook handlers MUST verify signatures before trusting payload contents. Unsigned or invalid payloads MUST be rejected.
- Fulfillment (marking a trip as purchased) SHALL be driven exclusively by verified webhook events, not by client-side success redirects.
- The app MUST NOT charge recurring fees on purchased trips (reinforces Article I).
- Revisions, crashes, or failed deploys MUST NOT destroy user-generated content (notes, ratings, photos). Writes to scrapbook data MUST be durable before the UI acknowledges success.
- Photo uploads MUST be stored with redundancy per the underlying storage provider's durability guarantee. The app SHALL NOT display "uploaded" until the storage provider has confirmed the write.
- Backups or point-in-time recovery SHALL be configured for the primary database such that a bad deploy within the last 24 hours can be rolled back without data loss.

**Rationale:**
"Safe" is the quiet promise underneath every other article. A family that lost a photo after paying for a trip is a family that never trusts the app again. The integer-cents and webhook-signature rules prevent the two most common classes of payment bugs. The durability rules prevent the "we thought it was saved" class of scrapbook bugs.

**Exceptions:**
- None.

---

## Amendment Process

This constitution may be amended by:
1. Proposing the change in a PR that modifies `.specify/memory/constitution.md` and bumps the version number.
2. Documenting the rationale and impact in the PR description.
3. Updating any in-flight specs or plans that the amendment invalidates.

**Versioning:**
- **MAJOR**: Removes or fundamentally changes an existing article.
- **MINOR**: Adds a new article or materially strengthens an existing one.
- **PATCH**: Clarifies language, fixes typos, updates rationale without changing rules.

---

## Adoption

This constitution is effective immediately upon ratification (2026-04-11) and applies to all work performed on the TripAI codebase from that date forward. Work in progress at ratification time is grandfathered but SHOULD be brought into conformance at the next convenient refactor.
