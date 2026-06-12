# Feature Specification: F12 Credential-free Family Sharing

**Feature Branch**: `012-family-sharing`

**Created**: 2026-06-12

**Status**: Draft

**Roadmap Item**: F12 Credential-free family sharing

**Input**: Roadmap F12 requires opt-in share links for purchased trips. The trip owner can generate unguessable private links, family members can open a link without an account, view the full trip, add notes and ratings with a self-chosen display name, and the owner can revoke links and remove family contributions. Share links must not expose owner PII or Stripe identifiers, tokens must be secret and hashed at rest, and all access must use existing token-scoped RLS.

## User Scenarios & Testing

### User Story 1 - Owner Creates and Manages Share Links (Priority: P1)

As the trip owner, I can create an opt-in private share link for a purchased trip and revoke it later so I control who can access the family trip.

**Why this priority**: Article II and Article VIII require explicit owner sharing, cryptographically strong tokens, revocation, and privacy by default.

**Independent Test**: Seed a purchased owner trip, create a share link, verify only the token is returned once, verify only the hash is stored, list active links without the token, revoke the link, and verify token access stops immediately.

**Acceptance Scenarios**:

1. **Given** an owner is viewing a purchased trip, **When** they create a share link with an optional label, **Then** the app returns a private URL with an unguessable token and stores only the token hash.
2. **Given** the owner lists share links for a trip, **When** the page renders, **Then** active and revoked links are visible without showing raw tokens.
3. **Given** an active share link exists, **When** the owner revokes it, **Then** the link immediately stops granting access.
4. **Given** another owner tries to manage share links for the trip, **When** the service checks ownership, **Then** the request is denied without exposing trip data.

---

### User Story 2 - Family Opens Shared Trip Without an Account (Priority: P1)

As a family member, I can open a private share link without signing in so I can see the itinerary, current trip details, scrapbook content, and navigation handoffs.

**Why this priority**: The core sharing promise is that family members do not need credentials or email addresses.

**Independent Test**: Use an active share token to load a purchased trip through share-token context, verify itinerary and scrapbook read data are visible, owner email/Stripe fields are absent, and revoked or invalid tokens return not found.

**Acceptance Scenarios**:

1. **Given** a family member has an active share URL, **When** they open it, **Then** they see the shared trip without a sign-in prompt.
2. **Given** the shared trip contains stops and scrapbook content, **When** the page renders, **Then** the member can view the itinerary, stop cards, navigation handoffs, notes, ratings, and deferred photo status.
3. **Given** the share link is revoked or malformed, **When** the member opens it, **Then** the app shows a not-found/unavailable state without leaking whether the trip exists.
4. **Given** a family member views the page, **When** they inspect the visible trip data, **Then** owner email, auth identity, and Stripe identifiers are absent.

---

### User Story 3 - Family Adds Notes and Ratings With a Display Name (Priority: P1)

As a family member using a share link, I can choose a display name and add notes or stop ratings so the scrapbook includes everyone’s memories without accounts.

**Why this priority**: Article II grants view + contribute access and requires attribution without credentials.

**Independent Test**: With an active share token, submit trip/day/stop notes and stop ratings with a display name, verify durable database rows are attributed to the share link and display name, and verify invalid scopes/ratings/display names are rejected.

**Acceptance Scenarios**:

1. **Given** a family member enters a display name, **When** they add a trip, day, or stop note, **Then** the note appears with that display name after the durable write succeeds.
2. **Given** a family member rates a stop from 1 to 5 stars with optional text, **When** the write succeeds, **Then** the rating appears on that stop with the display name.
3. **Given** the member submits blank display name, blank note, invalid rating, or a day/stop outside the trip, **When** validation runs, **Then** no contribution is written.
4. **Given** a revoked share token is used to submit a contribution, **When** the service checks token context, **Then** the contribution is denied.

---

### User Story 4 - Owner Moderates Family Contributions (Priority: P2)

As the trip owner, I can remove notes or ratings added through share links so I retain moderation authority over the family scrapbook.

**Why this priority**: Owner moderation is constitutional and keeps the privacy model simple: one trip, one owner authority.

**Independent Test**: Seed share-link notes/ratings, remove them as owner, verify they disappear from owner and shared views, verify non-owners/share-link users cannot moderate, and verify deleted rows are excluded from revision preservation checks.

**Acceptance Scenarios**:

1. **Given** a family note appears on the trip, **When** the owner removes it, **Then** the note is hidden from owner and shared views.
2. **Given** a family rating appears on a stop, **When** the owner removes it, **Then** the rating no longer contributes to the stop’s family average.
3. **Given** a share-link user attempts moderation, **When** the request is submitted, **Then** the app denies the action.

### Edge Cases

- A share label is blank or very long.
- A generated token is shown only immediately after creation and never listed again.
- A token is invalid, revoked, or belongs to a deleted trip.
- A purchased trip has no current itinerary revision.
- A family member opens a shared trip with JavaScript disabled.
- A display name is blank, too long, or contains only whitespace.
- A family contribution references a day or stop outside the shared trip.
- Owner revokes a link while a family member has the page open.
- A moderation delete targets an owner-authored contribution, a share-authored contribution, or a nonexistent contribution.
- Photo binary storage remains deferred; share-link users must not see fake upload success.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST keep trips owner-only by default and require an explicit owner action to create a share link.
- **FR-002**: The system MUST generate share tokens with at least 128 bits of entropy using a cryptographically secure RNG.
- **FR-003**: The system MUST store only a hash of the share token and MUST return the raw token only at creation time.
- **FR-004**: The system MUST allow owners to list active and revoked share links for their purchased trips without exposing raw tokens.
- **FR-005**: The system MUST allow owners to revoke share links and revocation MUST take effect immediately for reads and writes.
- **FR-006**: The system MUST deny share-link management to non-owners and to trips that are not purchased or are deleted.
- **FR-007**: The system MUST allow family members to view a purchased trip through an active share token without signing in.
- **FR-008**: The shared trip view MUST include itinerary days, stops, navigation handoffs, notes, ratings, and deferred photo status.
- **FR-009**: The shared trip view MUST NOT expose owner email, auth identity, Stripe session ID, price, or other non-display-name PII.
- **FR-010**: The system MUST reject invalid or revoked share tokens with a generic unavailable result.
- **FR-011**: The system MUST allow share-link users to create trip/day/stop notes with a self-chosen display name.
- **FR-012**: The system MUST allow share-link users to create per-stop ratings with 1-5 stars, optional text, and a self-chosen display name.
- **FR-013**: The system MUST reject blank or overlong display names, blank notes, invalid ratings, and scopes outside the shared trip before writing rows.
- **FR-014**: The system MUST attribute share-link contributions to the share link and display name, not to an owner account.
- **FR-015**: The system MUST confirm share-link notes and ratings only after durable database writes succeed.
- **FR-016**: The system MUST let owners remove share-link notes and ratings from their trip.
- **FR-017**: Removed share-link contributions MUST disappear from owner and shared trip views and from revision preservation checks.
- **FR-018**: Share-link users MUST NOT be able to revoke links, see owner management data, or moderate contributions.
- **FR-019**: The system MUST NOT log raw share tokens or include them in owner-facing link lists.
- **FR-020**: Photo binary upload remains deferred; the system MUST NOT accept or claim successful shared photo uploads until object storage is implemented.

### Key Entities

- **Share Link**: Owner-created record for a trip, storing token hash, label, creation metadata, last-used timestamp, and revoked timestamp.
- **Share Token**: Raw URL-safe secret returned only at creation and provided by family members in the share URL.
- **Shared Trip View**: Read model for family members that contains itinerary and scrapbook content but no owner PII or payment fields.
- **Share Contribution**: Note or rating authored through a share link with a self-chosen display name.
- **Moderation Action**: Owner action that soft-deletes a share-link note or rating.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Tests prove share tokens have at least 128 bits of entropy, are URL-safe, and are stored hashed.
- **SC-002**: Owner service tests prove create/list/revoke flows work and raw tokens are returned only once.
- **SC-003**: Share-view tests prove active tokens can read the trip and revoked/invalid tokens cannot.
- **SC-004**: Privacy tests prove shared trip data excludes owner email, auth IDs, Stripe session IDs, and prices.
- **SC-005**: Contribution tests prove share-link notes and ratings persist with display-name attribution and invalid writes are rejected.
- **SC-006**: Moderation tests prove owners can remove share-link contributions and removed rows disappear from owner/shared views.
- **SC-007**: Validation passes with focused sharing tests, existing RLS share tests, trip-detail/scrapbook tests, lint, typecheck, and build.

## Assumptions

- Existing `share_links`, notes, ratings, photo metadata, and token-scoped RLS policies remain the data foundation.
- F12 implements shared note/rating contributions; binary shared photo upload remains deferred with the existing photo-storage boundary.
- Share URLs may use a route under `/share/{token}` and the raw token may appear in the browser address bar for the family member; the app must not log or relist it.
- Family members do not need accounts, emails, cookies, or passwords.
- Owner moderation uses soft delete through existing `deleted_at` fields.
