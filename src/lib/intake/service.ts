import type { Pool } from "pg";

import { setAppRole, setOwnerContext } from "@/lib/access/context";

import type { TripIntakeValues } from "./validation";

export type TripIntakeDraft = {
  id: string;
};

export async function createTripIntakeDraft(
  pool: Pool,
  ownerId: string,
  values: TripIntakeValues,
): Promise<TripIntakeDraft> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAppRole(client);
    await setOwnerContext(client, ownerId);

    const result = await client.query<{ id: string }>(
      `
        insert into trip_intakes (
          owner_id,
          origin_address,
          destination_area,
          start_date,
          end_date,
          party_adults,
          party_children,
          children_ages,
          interests,
          budget_level,
          dietary_needs,
          mobility_notes,
          travel_style
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        returning id
      `,
      [
        ownerId,
        values.originAddress,
        values.destinationArea,
        values.startDate,
        values.endDate,
        values.partyAdults,
        values.partyChildren,
        values.childrenAges,
        values.interests,
        values.budgetLevel,
        values.dietaryNeeds,
        values.mobilityNotes,
        values.travelStyle,
      ],
    );

    await client.query("commit");
    return result.rows[0];
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
