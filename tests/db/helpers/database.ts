import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { getDatabaseTestUrl } from "../env";

export function createTestPool() {
  const connectionString = getDatabaseTestUrl();
  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

export async function resetPublicSchema(pool: Pool) {
  await pool.query("drop schema if exists public cascade");
  await pool.query("create schema public");
}

export async function applyMigrations(pool: Pool) {
  const files = (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(join("drizzle", file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
  }
}

export async function resetAndMigrate(pool: Pool) {
  await resetPublicSchema(pool);
  await applyMigrations(pool);
}
