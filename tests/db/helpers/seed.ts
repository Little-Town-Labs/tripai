import { hashShareToken } from "@/lib/access/share-token";
import type { Pool } from "pg";

export const ownerAId = "00000000-0000-4000-8000-0000000000a1";
export const ownerBId = "00000000-0000-4000-8000-0000000000b2";

export const tripAId = "10000000-0000-4000-8000-0000000000a1";
export const tripBId = "10000000-0000-4000-8000-0000000000b2";
export const intakeAId = "11000000-0000-4000-8000-0000000000a1";
export const revisionAId = "12000000-0000-4000-8000-0000000000a1";
export const proposedRevisionAId = "12000000-0000-4000-8000-0000000000a2";
export const dayAId = "13000000-0000-4000-8000-0000000000a1";
export const stopAId = "30000000-0000-4000-8000-000000000001";
export const activeShareLinkId = "40000000-0000-4000-8000-0000000000a1";
export const revokedShareLinkId = "40000000-0000-4000-8000-0000000000b2";
export const activeShareToken = "active-share-token-for-trip-a";
export const revokedShareToken = "revoked-share-token-for-trip-a";

export function makeDisplayName(suffix: string) {
  return `Family ${suffix}`;
}

export const invalidPlanningDataCases = {
  missingPlaceStop: {
    stableStopKey: "missing-place",
    orderIndex: 10,
    name: "Missing Place",
    type: "restaurant",
  },
  invalidIntake: {
    originAddress: "A",
    destinationArea: "B",
    startDate: "2026-07-05",
    endDate: "2026-07-01",
    partyAdults: 0,
    partyChildren: 0,
    budgetLevel: "moderate",
    travelStyle: "balanced",
  },
  invalidRouteDay: {
    dayNumber: 2,
    date: "2026-07-02",
    label: "Invalid route",
    totalMiles: -1,
    driveTimeMinutes: 30,
  },
};

export async function seedOwnerPrivacyScenario(pool: Pool) {
  await seedOwnerA(pool);
  await seedOwnerB(pool);
}

async function seedOwnerA(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('tripai.owner_id', $1, true)", [ownerAId]);
    await client.query(
      `
        insert into owners (id, email, display_name)
        values ($1, 'owner-a@example.test', 'Owner A')
      `,
      [ownerAId],
    );
    await client.query(
      `
        insert into trip_intakes (
          id,
          owner_id,
          origin_address,
          destination_area,
          start_date,
          end_date,
          party_adults,
          party_children,
          budget_level,
          travel_style
        )
        values ($1, $2, 'St. Louis, MO', 'Orlando, FL', '2026-07-01', '2026-07-05', 2, 2, 'moderate', 'balanced')
      `,
      [intakeAId, ownerAId],
    );
    await client.query(
      `
        insert into trips (id, owner_id, intake_id, title, summary, status, price_cents)
        values ($1, $2, $3, 'Owner A Trip', 'Seed trip A', 'purchased', 4900)
      `,
      [tripAId, ownerAId, intakeAId],
    );
    await client.query(
      `
        insert into trip_revisions (id, trip_id, revision_number, kind, status, summary, committed_at)
        values ($1, $2, 1, 'initial', 'current', 'Initial seed revision', now())
      `,
      [revisionAId, tripAId],
    );
    await client.query(
      "update trips set current_revision_id = $1 where id = $2",
      [revisionAId, tripAId],
    );
    await client.query(
      `
        insert into trip_revisions (id, trip_id, revision_number, kind, parent_revision_id, status, summary)
        values ($1, $2, 2, 'pre_purchase', $3, 'draft', 'Proposed seed revision')
      `,
      [proposedRevisionAId, tripAId, revisionAId],
    );
    await client.query(
      `
        insert into trip_days (id, trip_id, revision_id, day_number, date, label, total_miles, drive_time_minutes)
        values ($1, $2, $3, 1, '2026-07-01', 'Drive Day', 250, 240)
      `,
      [dayAId, tripAId, revisionAId],
    );
    await client.query(
      `
        insert into stops (
          id,
          trip_id,
          day_id,
          revision_id,
          stable_stop_key,
          order_index,
          name,
          type,
          google_place_id,
          address
        )
        values ($1, $2, $3, $4, 'stop-a-1', 0, 'Seed Restaurant', 'restaurant', 'places/seed-a', '1 Test Way')
      `,
      [stopAId, tripAId, dayAId, revisionAId],
    );
    await client.query(
      `
        insert into notes (trip_id, stop_id, author_owner_id, author_display_name, content)
        values ($1, $2, $3, 'Owner A', 'Seed note')
      `,
      [tripAId, stopAId, ownerAId],
    );
    await client.query(
      `
        insert into ratings (trip_id, stop_id, author_owner_id, author_display_name, stars, text)
        values ($1, $2, $3, 'Owner A', 5, 'Seed rating')
      `,
      [tripAId, stopAId, ownerAId],
    );
    await client.query(
      `
        insert into photo_metadata (trip_id, stop_id, author_owner_id, author_display_name, caption)
        values ($1, $2, $3, 'Owner A', 'Seed photo')
      `,
      [tripAId, stopAId, ownerAId],
    );
    await client.query(
      `
        insert into share_links (id, trip_id, token_hash, label, created_by_owner_id)
        values ($1, $2, $3, 'Family active', $4)
      `,
      [activeShareLinkId, tripAId, hashShareToken(activeShareToken), ownerAId],
    );
    await client.query(
      `
        insert into share_links (id, trip_id, token_hash, label, created_by_owner_id, revoked_at)
        values ($1, $2, $3, 'Family revoked', $4, now())
      `,
      [revokedShareLinkId, tripAId, hashShareToken(revokedShareToken), ownerAId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function seedOwnerB(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('tripai.owner_id', $1, true)", [ownerBId]);
    await client.query(
      `
        insert into owners (id, email, display_name)
        values ($1, 'owner-b@example.test', 'Owner B')
      `,
      [ownerBId],
    );
    await client.query(
      `
        insert into trips (id, owner_id, title, summary, status)
        values ($1, $2, 'Owner B Trip', 'Seed trip B', 'draft')
      `,
      [tripBId, ownerBId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
