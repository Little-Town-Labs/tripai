# Contract: RLS Access Matrix

Every row-level access policy must have at least one allow test and one deny test. Tests run against the Neon testing branch.

## Test Actors

- `owner_a`: owns Trip A.
- `owner_b`: owns Trip B.
- `share_a_active`: active share link for Trip A.
- `share_a_revoked`: revoked share link for Trip A.
- `anonymous`: no owner context and no share token context.

## Owner Policy Contract

For each trip-scoped table:

| Operation | Allow | Deny |
|---|---|---|
| Select | `owner_a` can select Trip A rows. | `owner_a` cannot select Trip B rows. |
| Insert | `owner_a` can insert rows scoped to Trip A where owner-managed writes are allowed. | `owner_a` cannot insert rows scoped to Trip B. |
| Update | `owner_a` can update mutable Trip A rows. | `owner_a` cannot update Trip B rows. |
| Delete | `owner_a` can delete or soft-delete mutable Trip A rows where supported. | `owner_a` cannot delete Trip B rows. |

Trip-scoped tables:

- `trip_intakes`
- `trips`
- `trip_revisions`
- `trip_days`
- `stops`
- `notes`
- `ratings`
- `photo_metadata`
- `share_links`

## Share-Link Policy Contract

For share-link-readable tables:

| Operation | Allow | Deny |
|---|---|---|
| Select | `share_a_active` can select Trip A rows meant for family view. | `share_a_active` cannot select Trip B rows. |
| Insert | `share_a_active` can insert contributions scoped to Trip A with display-name attribution. | `share_a_active` cannot insert contributions scoped to Trip B. |
| Update | `share_a_active` can update its own share-link contribution rows where supported. | `share_a_active` cannot update owner rows, other share-link rows, or Trip B rows. |
| Delete | `share_a_active` can soft-remove its own contribution rows where supported. | `share_a_active` cannot delete owner rows, other share-link rows, or Trip B rows. |

Share-link writable tables:

- `notes`
- `ratings`
- `photo_metadata`

Share-link readable tables:

- `trips`
- `trip_days`
- `stops`
- `notes`
- `ratings`
- `photo_metadata`

Share links must not read:

- owner email or auth identity
- payment identifiers
- raw token material
- unrelated trips

## Revocation Contract

After `share_links.revoked_at` is set:

- selecting Trip A through the revoked token returns no rows
- inserting notes, ratings, or photo metadata through the revoked token is denied
- updating prior contributions through the revoked token is denied
- deleting prior contributions through the revoked token is denied

## Default-Deny Contract

For every RLS-enabled table:

- `anonymous` without owner context and without active share-token context sees no rows
- `anonymous` cannot insert, update, or delete rows
- no policy may accidentally allow `public` access to owner-only or token-only rows
