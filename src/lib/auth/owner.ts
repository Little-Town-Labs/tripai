import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import type { Pool, PoolClient, QueryResult } from "pg";

import { createPool } from "@/db/client";

export type AuthenticatedOwnerIdentity = {
  id: string;
  email: string;
  name?: string | null;
};

export type TripAiOwner = {
  id: string;
  email: string;
  displayName: string | null;
};

type Queryable = Pick<Pool | PoolClient, "query">;

let appPool: Pool | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for TripAI owner authentication.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ownerIdForIdentity(identity: AuthenticatedOwnerIdentity) {
  return isUuid(identity.id) ? identity.id : randomUUID();
}

function ownerFromRow(row: { id: string; email: string; display_name: string | null }): TripAiOwner {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

export async function reconcileOwner(
  db: Queryable,
  identity: AuthenticatedOwnerIdentity,
): Promise<TripAiOwner> {
  const email = normalizeEmail(identity.email);
  if (!email) {
    throw new Error("Authenticated owner email is required before owner access.");
  }

  if (isUuid(identity.id)) {
    const byId = await db.query<{ id: string; email: string; display_name: string | null }>(
      "select id, email, display_name from owners where id = $1 limit 1",
      [identity.id],
    );
    if (byId.rows[0]) {
      return ownerFromRow(byId.rows[0]);
    }
  }

  const byEmail = await db.query<{ id: string; email: string; display_name: string | null }>(
    "select id, email, display_name from owners where email = $1 limit 1",
    [email],
  );
  if (byEmail.rows[0]) {
    return ownerFromRow(byEmail.rows[0]);
  }

  const created: QueryResult<{ id: string; email: string; display_name: string | null }> = await db.query(
    `
      insert into owners (id, email, display_name)
      values ($1, $2, $3)
      returning id, email, display_name
    `,
    [ownerIdForIdentity(identity), email, identity.name?.trim() || null],
  );

  return ownerFromRow(created.rows[0]);
}

type SessionUser = {
  id?: string;
  email?: string;
  name?: string | null;
};

export async function getCurrentOwner(): Promise<TripAiOwner | null> {
  const { auth } = await import("./server");
  const { data: session } = await auth.getSession();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id || !user.email) {
    return null;
  }

  return reconcileOwner(getAppPool(), {
    id: user.id,
    email: user.email,
    name: user.name,
  });
}

export async function requireCurrentOwner() {
  const owner = await getCurrentOwner();

  if (!owner) {
    redirect("/auth/sign-in");
  }

  return owner;
}
