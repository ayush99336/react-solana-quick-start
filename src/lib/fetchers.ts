import { Connection, PublicKey } from "@solana/web3.js";
import {
  getCreatorDecoder,
  type Creator,
} from "../../codama/client/js/generated/accounts/creator";
import {
  getTierDecoder,
  type Tier,
} from "../../codama/client/js/generated/accounts/tier";
import {
  getPassDecoder,
  type Pass,
} from "../../codama/client/js/generated/accounts/pass";

// Minimal Maybe<T> shape for UI consumption
export type MaybeAccount<T> = { exists: false } | { exists: true; data: T };

export async function fetchMaybeCreatorW3J(
  connection: Connection,
  address: string
): Promise<MaybeAccount<Creator>> {
  const info = await connection.getAccountInfo(new PublicKey(address));
  if (!info) return { exists: false };
  const data = getCreatorDecoder().decode(new Uint8Array(info.data));
  return { exists: true, data };
}

export async function fetchMaybeTierW3J(
  connection: Connection,
  address: string
): Promise<MaybeAccount<Tier>> {
  const info = await connection.getAccountInfo(new PublicKey(address));
  if (!info) return { exists: false };
  const data = getTierDecoder().decode(new Uint8Array(info.data));
  return { exists: true, data };
}

export async function fetchMaybePassW3J(
  connection: Connection,
  address: string
): Promise<MaybeAccount<Pass>> {
  const info = await connection.getAccountInfo(new PublicKey(address));
  if (!info) return { exists: false };
  const data = getPassDecoder().decode(new Uint8Array(info.data));
  return { exists: true, data };
}
