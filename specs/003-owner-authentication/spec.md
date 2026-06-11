# Feature Specification: Owner Authentication

**Feature Branch**: `003-owner-authentication`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "F3 Owner authentication: Email/password plus Google OAuth through Neon Auth with Better Auth, login, signup, session handling, auth route handler, route protection middleware, owner-only authentication, and family members never sign in."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Can Create An Account And Sign In (Priority: P1)

As the trip owner, I need to create an account and sign in with either email/password or Google so my trip plans and future purchases are tied to my private owner identity.

**Why this priority**: Owner authentication is the Phase 0 gate that lets F4 and later features store trips against a real owner while preserving private-by-default access.

**Independent Test**: Can be fully tested by signing up with email/password, signing out, signing back in, and proving the owner reaches the authenticated app surface with the same owner identity.

**Acceptance Scenarios**:

1. **Given** a new visitor is on the signup screen, **When** they submit a valid email, password, and display name, **Then** an owner account is created and the owner is taken to the authenticated app surface.
2. **Given** an existing owner has signed out, **When** they sign in with the correct email and password, **Then** they regain access to their owner session.
3. **Given** a visitor chooses Google sign-in, **When** the provider returns a valid identity, **Then** the app establishes an owner session for that identity.

---

### User Story 2 - Owner Session Protects Private App Surfaces (Priority: P2)

As a trip owner, I need owner-only pages and actions to reject unauthenticated visitors so my trip planning workspace is private until I intentionally share a trip link in a later feature.

**Why this priority**: F2 already enforces database privacy; F3 must ensure the web app does not expose owner workflows without an owner session.

**Independent Test**: Can be fully tested by attempting to visit an owner-only route while signed out and proving the visitor is sent to login, then signing in and proving the same route is available.

**Acceptance Scenarios**:

1. **Given** a visitor is not signed in, **When** they request an owner-only app route, **Then** they are redirected to login without revealing owner data.
2. **Given** an owner is signed in, **When** they request an owner-only app route, **Then** the page loads and uses the owner's identity for subsequent data access.
3. **Given** an owner signs out, **When** they request an owner-only app route again, **Then** the route is protected and the prior session is no longer accepted.

---

### User Story 3 - Authentication Errors Are Clear And Safe (Priority: P3)

As a visitor trying to sign in, I need clear recovery messages when authentication fails without exposing whether another family's account or trip data exists.

**Why this priority**: Authentication mistakes are common, but error handling must not leak private owner or trip information.

**Independent Test**: Can be fully tested by submitting invalid credentials, duplicate signup data, and malformed inputs, then verifying the page shows actionable generic errors and no private details.

**Acceptance Scenarios**:

1. **Given** a visitor submits invalid login credentials, **When** authentication fails, **Then** the app shows a generic sign-in failure message and no account-specific detail.
2. **Given** a visitor submits malformed signup input, **When** validation fails, **Then** the app identifies the field that needs correction before attempting authentication.
3. **Given** an authentication provider is unavailable, **When** a visitor attempts to sign in, **Then** the app reports that sign-in is temporarily unavailable and does not expose provider internals.

### Edge Cases

- Family members with future share links must never be required to create an owner account.
- A signed-out visitor requesting an owner-only URL must not see a flash of private owner data before redirect.
- Authentication failures must not reveal whether a specific email address has an account.
- A session created by one provider must resolve to one owner identity when the same verified email is reused through another provider.
- Owner display names can be changed later, but F3 only needs a display name captured or available for owner attribution.
- Local browser-only vacation passcode behavior is separate from production owner authentication and must not be treated as a production auth session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a trip owner to create an account with email/password.
- **FR-002**: The system MUST allow a trip owner to sign in with email/password.
- **FR-003**: The system MUST allow a trip owner to sign in with Google OAuth.
- **FR-004**: The system MUST establish a durable owner session after successful signup or login.
- **FR-005**: The system MUST allow a signed-in owner to sign out and invalidate local access to owner-only routes.
- **FR-006**: The system MUST protect owner-only app routes from unauthenticated access.
- **FR-007**: The system MUST redirect unauthenticated visitors from owner-only routes to login without revealing owner trip data.
- **FR-008**: The system MUST expose the authenticated owner's identity to server-side app logic so F2 owner-scoped database access can use the correct owner context.
- **FR-009**: The system MUST create or reconcile the TripAI owner record for a newly authenticated owner identity before owner-scoped app actions rely on it.
- **FR-010**: The system MUST preserve the constitutional rule that family share-link recipients do not create accounts or sign in.
- **FR-011**: The system MUST show generic, safe authentication errors that do not disclose whether an email address is registered.
- **FR-012**: The system MUST validate signup and login inputs before submitting them to authentication.
- **FR-013**: The system MUST provide automated tests for signup, login, logout, route protection, and safe authentication error handling.
- **FR-014**: The system MUST document the required local environment values for owner authentication without committing secrets.

### Key Entities *(include if feature involves data)*

- **Authenticated Owner Identity**: The verified identity returned by the authentication provider for the trip owner.
- **Owner Session**: The active browser/server session that proves the visitor is the trip owner for protected app surfaces.
- **TripAI Owner Record**: The owner profile row used by F2 database ownership and future trip planning records.
- **Auth Error State**: A user-facing failure state for invalid input, rejected credentials, provider failure, or expired session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time owner can complete account creation and reach the authenticated app surface in under 2 minutes.
- **SC-002**: An existing owner can sign in, sign out, and be blocked from owner-only routes after sign-out in automated tests.
- **SC-003**: 100% of owner-only routes introduced or protected by this feature have automated coverage proving signed-out denial and signed-in access.
- **SC-004**: Authentication error tests prove invalid credentials and duplicate or malformed signup attempts do not reveal private owner or trip data.
- **SC-005**: The authenticated owner identity can be mapped to a TripAI owner record and used by owner-scoped database access in an automated integration test.
- **SC-006**: Family share-link access remains outside the owner authentication flow, with no account requirement added to the family-recipient path.

## Assumptions

- F1 platform bootstrap and Neon Auth configuration are complete.
- F2 owner and RLS tables are complete and provide the owner record consumed by this feature.
- Neon Auth with Better Auth remains the selected auth provider for email/password and Google OAuth.
- Password reset, email verification polishing, account deletion UI, and account profile editing are outside F3 unless the auth provider requires a minimal built-in flow.
- Family sharing remains F12; F3 must avoid adding account requirements for family members.
- Stripe remains deferred and does not participate in authentication for this feature.
