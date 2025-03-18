export function constructZkPoKMetadata(
  accountAddr: string,
  securityZone: number,
  chainId: number,
): Uint8Array {
  // Decode the account address from hex
  const accountAddrNoPrefix = accountAddr.startsWith("0x")
    ? accountAddr.slice(2)
    : accountAddr;
  const accountBytes = hexToBytes(accountAddrNoPrefix);

  // Encode chainId as 32 bytes (u256) in big-endian format
  const chainIdBytes = new Uint8Array(32);

  // Since chain IDs are typically small numbers, we can just encode them
  // directly without BigInt operations, filling only the necessary bytes
  // from the right (least significant)
  let value = chainId;
  for (let i = 31; i >= 0 && value > 0; i--) {
    chainIdBytes[i] = value & 0xff;
    value = value >>> 8;
  }

  // console.log("chainId", chainId, toHexString(chainIdBytes));

  const metadata = new Uint8Array(1 + accountBytes.length + 32);
  metadata[0] = securityZone;
  metadata.set(accountBytes, 1);
  metadata.set(chainIdBytes, 1 + accountBytes.length);

  return metadata;
}

// Helper function to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export function concatSigRecid(signature: string, recid: number): string {
  return signature + (recid + 27).toString(16).padStart(2, "0");
}
