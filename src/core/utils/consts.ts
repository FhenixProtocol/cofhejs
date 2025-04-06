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

export const mockQueryDecrypterAbi = [
  {
    type: "function",
    name: "acl",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract ACL" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decodeLowLevelReversion",
    inputs: [{ name: "data", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "error", type: "string", internalType: "string" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "exists",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "_taskManager", type: "address", internalType: "address" },
      { name: "_acl", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryDecrypt",
    inputs: [
      { name: "ctHash", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
      {
        name: "permission",
        type: "tuple",
        internalType: "struct Permission",
        components: [
          { name: "issuer", type: "address", internalType: "address" },
          { name: "expiration", type: "uint64", internalType: "uint64" },
          { name: "recipient", type: "address", internalType: "address" },
          { name: "validatorId", type: "uint256", internalType: "uint256" },
          {
            name: "validatorContract",
            type: "address",
            internalType: "address",
          },
          { name: "sealingKey", type: "bytes32", internalType: "bytes32" },
          { name: "issuerSignature", type: "bytes", internalType: "bytes" },
          { name: "recipientSignature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "allowed", type: "bool", internalType: "bool" },
      { name: "error", type: "string", internalType: "string" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "querySealOutput",
    inputs: [
      { name: "ctHash", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
      {
        name: "permission",
        type: "tuple",
        internalType: "struct Permission",
        components: [
          { name: "issuer", type: "address", internalType: "address" },
          { name: "expiration", type: "uint64", internalType: "uint64" },
          { name: "recipient", type: "address", internalType: "address" },
          { name: "validatorId", type: "uint256", internalType: "uint256" },
          {
            name: "validatorContract",
            type: "address",
            internalType: "address",
          },
          { name: "sealingKey", type: "bytes32", internalType: "bytes32" },
          { name: "issuerSignature", type: "bytes", internalType: "bytes" },
          { name: "recipientSignature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "allowed", type: "bool", internalType: "bool" },
      { name: "error", type: "string", internalType: "string" },
      { name: "", type: "bytes32", internalType: "bytes32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "seal",
    inputs: [
      { name: "input", type: "uint256", internalType: "uint256" },
      { name: "key", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "taskManager",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract TaskManager" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unseal",
    inputs: [
      { name: "hashed", type: "bytes32", internalType: "bytes32" },
      { name: "key", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "pure",
  },
  { type: "error", name: "NotAllowed", inputs: [] },
  { type: "error", name: "SealingKeyInvalid", inputs: [] },
  { type: "error", name: "SealingKeyMissing", inputs: [] },
] as const;
