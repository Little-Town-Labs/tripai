import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

export type TripAiDb = ReturnType<typeof createDb>;

export function createPool(connectionString: string, config: PoolConfig = {}) {
  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    ...config,
  });
}

export function createDb(connectionString: string) {
  const pool = createPool(connectionString);
  return drizzle(pool, { schema });
}
