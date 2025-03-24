/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, JsonRpcProvider } from "ethers";
import { encryptExtract, encryptReplace } from ".";
import {
  AbstractProvider,
  CoFheInItem,
  EncryptableItem,
  Encrypted_Inputs,
  EncryptStep,
  FheTypes,
  Permission,
  Result,
  ResultErr,
  ResultOk,
  UnsealedItem,
  VerifyResult,
} from "../../types";
import { sleep } from "../utils";
import { _sdkStore } from "./store";
import { Permit } from "../permit";
import { convertViaUtype, isValidUtype } from "../utils/utype";

const mockZkVerifierAddress = "0x0000000000000000000000000000000000000100";
const mockQueryDecrypterAddress = "0x0000000000000000000000000000000000000200";
const mockZkVerifierSignerPkey =
  "0x6c8d7f768a6bb4aafe85e8a2f5a9680355239c7e14646ed62b044e39de154512";
const existsSignature = "0x267c4ae4";
const mockExampleAbi = [
  {
    type: "function",
    name: "numberHash",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
];
const mockExampleAddress = "0x0000000000000000000000000000000000000300";
const mockQueryDecrypterAbi = [
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

export async function checkIsTestnet(
  provider: AbstractProvider,
): Promise<boolean> {
  // Check if testnet mock contracts are deployed by attempting to call them
  try {
    // Call with empty data to check if contracts exist
    const zkVerifierExistsRaw = await provider.call({
      to: mockZkVerifierAddress,
      data: existsSignature,
    });
    const queryDecrypterExistsRaw = await provider.call({
      to: mockQueryDecrypterAddress,
      data: existsSignature,
    });

    const [zkVerifierExists] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      zkVerifierExistsRaw,
    );
    const [queryDecrypterExists] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      queryDecrypterExistsRaw,
    );

    return zkVerifierExists && queryDecrypterExists;
  } catch (err) {
    return false;
  }
}

const MockZkVerifierAbi = [
  {
    type: "function",
    name: "exists",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "insertCtHash",
    inputs: [
      { name: "ctHash", type: "uint256", internalType: "uint256" },
      { name: "value", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "insertPackedCtHashes",
    inputs: [
      { name: "ctHashes", type: "uint256[]", internalType: "uint256[]" },
      { name: "values", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "zkVerify",
    inputs: [
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "utype", type: "uint8", internalType: "uint8" },
      { name: "user", type: "address", internalType: "address" },
      { name: "securityZone", type: "uint8", internalType: "uint8" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct EncryptedInput",
        components: [
          { name: "ctHash", type: "uint256", internalType: "uint256" },
          { name: "securityZone", type: "uint8", internalType: "uint8" },
          { name: "utype", type: "uint8", internalType: "uint8" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "zkVerifyCalcCtHash",
    inputs: [
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "utype", type: "uint8", internalType: "uint8" },
      { name: "user", type: "address", internalType: "address" },
      { name: "securityZone", type: "uint8", internalType: "uint8" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "ctHash", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "zkVerifyCalcCtHashesPacked",
    inputs: [
      { name: "values", type: "uint256[]", internalType: "uint256[]" },
      { name: "utypes", type: "uint8[]", internalType: "uint8[]" },
      { name: "user", type: "address", internalType: "address" },
      { name: "securityZone", type: "uint8", internalType: "uint8" },
      { name: "chainId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "ctHashes", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "zkVerifyPacked",
    inputs: [
      { name: "values", type: "uint256[]", internalType: "uint256[]" },
      { name: "utypes", type: "uint8[]", internalType: "uint8[]" },
      { name: "user", type: "address", internalType: "address" },
      { name: "securityZone", type: "uint8", internalType: "uint8" },
      { name: "chainId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "inputs",
        type: "tuple[]",
        internalType: "struct EncryptedInput[]",
        components: [
          { name: "ctHash", type: "uint256", internalType: "uint256" },
          { name: "securityZone", type: "uint8", internalType: "uint8" },
          { name: "utype", type: "uint8", internalType: "uint8" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  { type: "error", name: "InvalidInputs", inputs: [] },
] as const;

const mockAnvilSenderPkey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function mockZkVerifySign(
  provider: JsonRpcProvider,
  user: string,
  items: EncryptableItem[],
  securityZone: number,
): Promise<Result<VerifyResult[]>> {
  // Create ethers wallet with mockZkVerifierSignerPkey
  const wallet = new ethers.Wallet(mockZkVerifierSignerPkey, provider);
  const sender = new ethers.Wallet(mockAnvilSenderPkey, provider);

  // Create array to store results
  const results = [];

  // Attach to MockZkVerifier contract
  const mockZkVerifier = new ethers.Contract(
    mockZkVerifierAddress,
    MockZkVerifierAbi,
    sender,
  );

  const chainId = (await provider.getNetwork()).chainId;

  const ctHashes: bigint[] = await mockZkVerifier.zkVerifyCalcCtHashesPacked(
    items.map((item) => BigInt(item.data)),
    items.map((item) => item.utype),
    user,
    securityZone,
    BigInt(chainId),
  );

  const itemsWithCtHashes = items.map((item, index) => ({
    ...item,
    ctHash: ctHashes[index],
  }));

  try {
    const tx = await mockZkVerifier.insertPackedCtHashes(
      itemsWithCtHashes.map(({ ctHash }) => ctHash.toString()),
      itemsWithCtHashes.map(({ utype }) => utype),
    );
    await tx.wait();
  } catch (err) {
    console.log("mockZkVerifySign :: insertPackedCtHashes :: err:", err);
    return ResultErr(`mockZkVerifySign :: insertPackedCtHashes :: err: ${err}`);
  }

  try {
    for (const item of itemsWithCtHashes) {
      const exists = await mockZkVerifier.exists();
      if (!exists) {
        return ResultErr("mockZkVerifySign :: mockZkVerifier does not exist");
      }

      // Store and fetch the ctHash

      // Pack the data into bytes and hash it
      const packedData = ethers.solidityPacked(
        ["uint256", "int32", "uint8"],
        [BigInt(item.data), securityZone, item.utype],
      );
      const messageHash = ethers.keccak256(packedData);

      // Convert to EthSignedMessageHash (adds "\x19Ethereum Signed Message:\n32" prefix)
      const ethSignedHash = ethers.hashMessage(ethers.getBytes(messageHash));

      // Sign the message
      const signature = await wallet.signMessage(
        ethers.getBytes(ethSignedHash),
      );

      results.push({
        ct_hash: item.ctHash.toString(),
        signature: signature,
      });
    }
    return ResultOk(results);
  } catch (err) {
    console.log("mockZkVerifySign :: err:", err);
    return ResultErr(`mockZkVerifySign :: err: ${err}`);
  }
}

export async function mockEncrypt<T extends any[]>(
  setState: (state: EncryptStep) => void,
  item: [...T],
  securityZone = 0,
): Promise<Result<[...Encrypted_Inputs<T>]>> {
  setState(EncryptStep.Extract);

  const state = _sdkStore.getState();

  if (state.account == null)
    return ResultErr("encrypt :: account uninitialized");

  if (state.chainId == null)
    return ResultErr("encrypt :: chainId uninitialized");

  if (state.rpcUrl == null) return ResultErr("encrypt :: rpcUrl uninitialized");

  const provider = new ethers.JsonRpcProvider(state.rpcUrl);

  const encryptableItems = encryptExtract(item);

  setState(EncryptStep.Pack);

  // Sleep to avoid rate limiting
  await sleep(100);

  setState(EncryptStep.Prove);

  await sleep(500);

  setState(EncryptStep.Verify);

  await sleep(2000);

  const signedResults = await mockZkVerifySign(
    provider,
    state.account,
    encryptableItems,
    securityZone,
  );
  if (!signedResults.success)
    return ResultErr(
      `encrypt :: ZK proof verification failed - ${signedResults.error}`,
    );

  const inItems: CoFheInItem[] = signedResults.data.map(
    ({ ct_hash, signature }, index) => ({
      ctHash: BigInt(ct_hash),
      securityZone,
      utype: encryptableItems[index].utype,
      signature,
    }),
  );

  setState(EncryptStep.Replace);

  const [preparedInputItems, remainingInItems] = encryptReplace(item, inItems);

  if (remainingInItems.length !== 0)
    return ResultErr(
      "encrypt :: some encrypted inputs remaining after replacement",
    );

  setState(EncryptStep.Done);

  return ResultOk(preparedInputItems);
}

export async function testSealOutput(
  provider: JsonRpcProvider,
  utype: FheTypes,
  permission: Permission,
) {
  const mockExampleIFace = new ethers.Interface(mockExampleAbi);

  const hashCallData = mockExampleIFace.encodeFunctionData("numberHash");
  const hashResult = await provider.call({
    to: mockExampleAddress,
    data: hashCallData,
  });

  console.log({
    hashResult,
  });

  const mockDecrypter = new ethers.Contract(
    mockQueryDecrypterAddress,
    mockQueryDecrypterAbi,
    provider,
  );

  const sealOutputResult = await mockDecrypter.querySealOutput(
    hashResult,
    utype,
    permission,
  );

  console.log("query seal output result", sealOutputResult);

  const [allowed, error, result] = sealOutputResult;

  const sealedBigInt = BigInt(result);
  const sealingKeyBigInt = BigInt(permission.sealingKey);
  const unsealed = sealedBigInt ^ sealingKeyBigInt;

  console.log("mock unsealed", unsealed);
}

export async function testDecrypt(
  provider: JsonRpcProvider,
  utype: FheTypes,
  permission: Permission,
) {
  const mockExampleIFace = new ethers.Interface(mockExampleAbi);

  const hashCallData = mockExampleIFace.encodeFunctionData("numberHash");
  const hashResult = await provider.call({
    to: mockExampleAddress,
    data: hashCallData,
  });

  console.log({
    hashResult,
  });

  const mockDecrypter = new ethers.Contract(
    mockQueryDecrypterAddress,
    mockQueryDecrypterAbi,
    provider,
  );

  const decryptResult = await mockDecrypter.queryDecrypt(
    hashResult,
    utype,
    permission,
  );

  console.log("query decrypt result", decryptResult);
}

export async function mockSealOutput<U extends FheTypes>(
  rpcUrl: string,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<Result<UnsealedItem<U>>> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    return ResultErr("mockSealOutput :: permit domain invalid");
  }

  const queryDecrypter = new ethers.Contract(
    mockQueryDecrypterAddress,
    mockQueryDecrypterAbi,
    provider,
  );

  const permission = permit.getPermission();

  console.log("permission", permission);

  const sealedResult = await queryDecrypter.querySealOutput(
    ctHash,
    utype,
    permission,
  );

  const {
    allowed,
    error,
    result,
  }: { allowed: boolean; error: string; result: string } = sealedResult;

  console.log("sealedResult", allowed, error, result);

  if (error != null) {
    return ResultErr(
      `mockSealOutput :: querySealOutput onchain error - ${error}`,
    );
  }

  const sealedBigInt = BigInt(result);
  const sealingKeyBigInt = BigInt(permission.sealingKey);
  const unsealed = sealedBigInt ^ sealingKeyBigInt;

  console.log("mock unsealed", unsealed);

  if (!isValidUtype(utype)) {
    return ResultErr(`mockSealOutput :: invalid utype :: ${utype}`);
  }

  return ResultOk(convertViaUtype(utype, unsealed)) as Result<UnsealedItem<U>>;
}

export async function mockDecrypt<U extends FheTypes>(
  rpcUrl: string,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<Result<UnsealedItem<U>>> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    return ResultErr("mockDecrypt :: permit domain invalid");
  }

  const queryDecrypter = new ethers.Contract(
    mockQueryDecrypterAddress,
    mockQueryDecrypterAbi,
    provider,
  );

  const permission = permit.getPermission();

  const decryptResult = await queryDecrypter.queryDecrypt(
    ctHash,
    utype,
    permission,
  );

  const {
    allowed,
    error,
    result,
  }: { allowed: boolean; error: string; result: string } = decryptResult;

  console.log("decryptResult", allowed, error, result);

  if (error != null) {
    return ResultErr(`mockDecrypt :: queryDecrypt onchain error - ${error}`);
  }

  const resultBigInt = BigInt(result);

  if (!isValidUtype(utype)) {
    return ResultErr(`mockDecrypt :: invalid utype :: ${utype}`);
  }

  return ResultOk(convertViaUtype(utype, resultBigInt)) as Result<
    UnsealedItem<U>
  >;
}
