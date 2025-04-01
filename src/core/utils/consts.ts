// TODO: Verify what is actually needed here and remove the rest
// - architect_dev 2025-04-01

export const MAX_UINT8: bigint = 255n;
export const MAX_UINT16: bigint = 65535n;
export const MAX_UINT32: bigint = 4294967295n;
export const MAX_UINT64: bigint = 18446744073709551615n; // 2^64 - 1
export const MAX_UINT128: bigint = 340282366920938463463374607431768211455n; // 2^128 - 1
export const MAX_UINT256: bigint =
  115792089237316195423570985008687907853269984665640564039457584007913129640319n; // 2^256 - 1

export const FheOpsAddress = "0x0000000000000000000000000000000000000080";
export const PUBLIC_KEY_LENGTH_MIN = 15_000;
export const DEFAULT_COFHE_URL = "http://127.0.0.1";

// Addresses
export const TaskManagerAddress = "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9";
export const MockZkVerifierAddress =
  "0x0000000000000000000000000000000000000100";
export const MockQueryDecrypterAddress =
  "0x0000000000000000000000000000000000000200";
export const MockZkVerifierSignerPkey =
  "0x6c8d7f768a6bb4aafe85e8a2f5a9680355239c7e14646ed62b044e39de154512";

// IFaces
export const fnExistsSig = "function exists() public view returns (bool)";
export const fnExistsIface = [fnExistsSig];
export const fnAclIface = ["function acl() view returns (address)"];
export const fnEip712DomainIface = [
  `function eip712Domain() public view returns (
    bytes1 fields,
    string name,
    string version,
    uint256 chainId,
    address verifyingContract,
    bytes32 salt,
    uint256[] extensions
  )`,
];
export const mockZkVerifierIface = [
  fnExistsSig,
  `function zkVerifyCalcCtHashesPacked(
    uint256[] memory values,
    uint8[] memory utypes,
    address user,
    uint8 securityZone,
    uint256 chainId
  ) public view returns (uint256[] memory ctHashes)`,
  "function insertPackedCtHashes(uint256[] ctHashes, uint256[] values) public",
];
