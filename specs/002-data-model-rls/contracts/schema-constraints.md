# Contract: Schema Constraints

## Required Constraint Tests

| Area | Expected Constraint |
|---|---|
| Trip dates | Trip intake end date must not be before start date. |
| Party size | Party must include at least one traveler. |
| Money | Money fields use integer cents and must be non-negative when present. |
| Rating | Rating stars must be integers from 1 through 5. |
| Stop ordering | Stop order is unique per trip day revision. |
| Stop grounding | Real-world non-drive stops require verified venue identity. |
| Trip days | Day number is positive and unique per trip revision. |
| Share token | Token hash is unique; raw token is not stored. |
| Share revocation | Revoked token cannot authorize reads or writes. |
| Current revision | A trip has no more than one current revision. |
| Contribution scope | Notes and photo metadata attach to exactly one scope: trip, day, or stop. |
| Contribution attribution | Contributions have owner attribution or share-link display-name attribution. |
| Photo status | Uploaded photo metadata requires a storage key; storage provider is out of scope. |

## Seed Scenario Contract

A valid seed scenario must create:

- two owners
- one trip for each owner
- one intake linked to Trip A
- two trip days for Trip A
- at least five stops for Trip A
- one active share link and one revoked share link for Trip A
- one owner note, rating, and photo metadata row
- one share-link note, rating, and photo metadata row
- one initial revision and one proposed revision for Trip A

The scenario must prove:

- owner A can see Trip A data
- owner A cannot see Trip B data
- active share link can see Trip A family-visible data
- active share link cannot see Trip B data
- revoked share link sees no Trip A data
- retained-stop contributions remain reachable after a revision
- removed-stop contributions are identifiable before commit
