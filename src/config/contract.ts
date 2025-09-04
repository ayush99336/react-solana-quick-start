import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(import.meta.env.VITE_PROGRAM_ID!);
export const CREATOR_OWNER = new PublicKey(import.meta.env.VITE_CREATOR_OWNER!);
export const TIER_INDEX = Number(import.meta.env.VITE_TIER_INDEX ?? 1);
export const NETWORK = "devnet"; // change to "mainnet-beta" when deploying to mainnet
