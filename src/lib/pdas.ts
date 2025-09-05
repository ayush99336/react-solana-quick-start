import {
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getU32Encoder,
  type Address,
  type ProgramDerivedAddress,
} from "gill";
import { RX_PROGRAM_ADDRESS } from "../../codama/client/js/generated/programs";

export async function findCreatorPda(
  owner: Address
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: RX_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([99, 114, 101, 97, 116, 111, 114])
      ),
      getAddressEncoder().encode(owner),
    ],
  });
}

export async function findTierPda(
  creator: Address,
  index: number
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: RX_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([116, 105, 101, 114])),
      getAddressEncoder().encode(creator),
      getU32Encoder().encode(index),
    ],
  });
}

export async function findPassPda(
  tier: Address,
  wallet: Address
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: RX_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([112, 97, 115, 115])),
      getAddressEncoder().encode(tier),
      getAddressEncoder().encode(wallet),
    ],
  });
}
