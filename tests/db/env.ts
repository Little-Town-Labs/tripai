import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let loaded = false;

export function loadDbTestEnv() {
  if (loaded) {
    return;
  }

  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      if (process.env[key] === undefined) {
        process.env[key] = stripQuotes(rawValue);
      }
    }
  } catch {
    // .env.local is optional in CI if DATABASE_TEST_URL is set directly.
  }

  loaded = true;
}

export function getDatabaseTestUrl() {
  loadDbTestEnv();
  assert.ok(
    process.env.DATABASE_TEST_URL,
    "DATABASE_TEST_URL must point to a Neon testing branch",
  );
  return process.env.DATABASE_TEST_URL;
}

function stripQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
