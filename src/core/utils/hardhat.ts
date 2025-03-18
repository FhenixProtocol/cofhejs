import { EncryptedNumber } from "../../types";
import { bigintToUint8Array, stringToUint8Array } from "./utils";

// HARDHAT MOCKS
// Mock FHE operations are automatically injected on the hardhat network
// The utility functions allow the client / sdk to interact with the mocked FHE ops

export const chainIsHardhat = (chainId?: bigint): boolean => {
  if (chainId == null) return false;
  return chainId === 31337n;
};

export const hardhatMockUnseal = (value: string): bigint => {
  let result = BigInt(0);
  for (const byteArrayItem of stringToUint8Array(value)) {
    result = (result << BigInt(8)) + BigInt(byteArrayItem);
  }
  return result;
};

export const hardhatMockEncrypt = (
  value: bigint,
  securityZone = 0,
): EncryptedNumber => ({
  data: bigintToUint8Array(BigInt(value)),
  securityZone: securityZone || 0,
});
