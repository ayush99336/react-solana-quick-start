import { type Instruction, AccountRole } from "gill";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

// Convert a Codama/Gill Instruction into a web3.js TransactionInstruction
export function toWeb3Instruction(
  ix: Instruction<string>
): TransactionInstruction {
  const keys = (ix.accounts as any[]).map((meta: any) => {
    const role = meta.role as AccountRole;
    const isWritable =
      role === AccountRole.WRITABLE || role === AccountRole.WRITABLE_SIGNER;
    const isSigner =
      role === AccountRole.READONLY_SIGNER ||
      role === AccountRole.WRITABLE_SIGNER ||
      !!meta.signer;
    return {
      pubkey: new PublicKey(meta.address as string),
      isWritable,
      isSigner,
    };
  });
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress as string),
    keys,
    data: Buffer.from(ix.data as Uint8Array),
  });
}
