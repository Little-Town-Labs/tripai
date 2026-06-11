import type { PoolClient } from "pg";

import { hashShareToken } from "./share-token";

export async function setAppRole(client: PoolClient) {
  await client.query("set local role tripai_app");
}

export async function setOwnerContext(client: PoolClient, ownerId: string) {
  await client.query("select set_config('tripai.owner_id', $1, true)", [ownerId]);
}

export async function setShareTokenContext(client: PoolClient, token: string) {
  await client.query("select set_config('tripai.share_token_hash', $1, true)", [
    hashShareToken(token),
  ]);
}

export async function clearAccessContext(client: PoolClient) {
  await client.query("select set_config('tripai.owner_id', '', true)");
  await client.query("select set_config('tripai.share_token_hash', '', true)");
}
