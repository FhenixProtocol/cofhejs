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

  const chainIdBytes = new Uint8Array(4);
  chainIdBytes[0] = (chainId >> 24) & 0xff;
  chainIdBytes[1] = (chainId >> 16) & 0xff;
  chainIdBytes[2] = (chainId >> 8) & 0xff;
  chainIdBytes[3] = chainId & 0xff;

  const metadata = new Uint8Array(1 + accountBytes.length + 4);
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
