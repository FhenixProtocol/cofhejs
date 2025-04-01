/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
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
import {
  fnExistsIface,
  MockQueryDecrypterAddress,
  MockZkVerifierAddress,
  mockZkVerifierIface,
  MockZkVerifierSignerPkey,
} from "../utils/consts";

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
    const existsIface = new ethers.Interface(fnExistsIface);
    const existsCallData = existsIface.encodeFunctionData("exists");

    // Call with empty data to check if contracts exist
    const zkVerifierExistsRaw = await provider.call({
      to: MockZkVerifierAddress,
      data: existsCallData,
    });
    const queryDecrypterExistsRaw = await provider.call({
      to: MockQueryDecrypterAddress,
      data: existsCallData,
    });

    console.log({ zkVerifierExistsRaw, queryDecrypterExistsRaw });

    const [zkVerifierExists] = existsIface.decodeFunctionResult(
      "exists",
      zkVerifierExistsRaw,
    );
    const [queryDecrypterExists] = existsIface.decodeFunctionResult(
      "exists",
      queryDecrypterExistsRaw,
    );

    console.log({ zkVerifierExists, queryDecrypterExists });

    return zkVerifierExists && queryDecrypterExists;
  } catch (err) {
    return false;
  }
}

async function mockZkVerifySign(
  provider: AbstractProvider,
  user: string,
  items: EncryptableItem[],
  securityZone: number,
): Promise<Result<VerifyResult[]>> {
  // Create ethers wallet with mockZkVerifierSignerPkey
  const zkVerifierSigner = new ethers.Wallet(MockZkVerifierSignerPkey);

  // Create array to store results
  const results = [];

  // Fetch chainId
  const chainId = await provider.getChainId();

  // Create MockZkVerifier iface
  const zkVerifierIface = new ethers.Interface(mockZkVerifierIface);

  // Construct zkVerifyCalcCtHashesPacked call data
  const zkVerifyCalcCtHashesPackedCallData = zkVerifierIface.encodeFunctionData(
    "zkVerifyCalcCtHashesPacked",
    [
      items.map((item) => BigInt(item.data)),
      items.map((item) => item.utype),
      user,
      securityZone,
      BigInt(chainId),
    ],
  );

  // Call zkVerifyCalcCtHashesPacked
  const zkVerifyCalcCtHashesPackedResult = await provider.call({
    to: MockZkVerifierAddress,
    data: zkVerifyCalcCtHashesPackedCallData,
  });

  // Decode zkVerifyCalcCtHashesPacked result
  console.log(
    "zkVerifyCalcCtHashesPackedResult",
    zkVerifyCalcCtHashesPackedResult,
  );
  const [ctHashes] = zkVerifierIface.decodeFunctionResult(
    "zkVerifyCalcCtHashesPacked",
    zkVerifyCalcCtHashesPackedResult,
  );
  console.log("ctHashes", ctHashes);

  const itemsWithCtHashes = items.map((item, index) => ({
    ...item,
    ctHash: ctHashes[index],
  }));

  try {
    // Construct insertPackedCtHashes call data
    const insertPackedCtHashesCallData = zkVerifierIface.encodeFunctionData(
      "insertPackedCtHashes",
      [
        itemsWithCtHashes.map(({ ctHash }) => ctHash.toString()),
        itemsWithCtHashes.map(({ utype }) => utype),
      ],
    );

    // Call insertPackedCtHashes
    const insertPackedCtHashesResult = await provider.call({
      to: MockZkVerifierAddress,
      data: insertPackedCtHashesCallData,
    });

    console.log({ insertPackedCtHashesResult });
  } catch (err) {
    console.log("mockZkVerifySign :: insertPackedCtHashes :: err:", err);
    return ResultErr(`mockZkVerifySign :: insertPackedCtHashes :: err: ${err}`);
  }

  // Sign the items
  try {
    for (const item of itemsWithCtHashes) {
      // Pack the data into bytes and hash it
      const packedData = ethers.solidityPacked(
        ["uint256", "int32", "uint8"],
        [BigInt(item.data), securityZone, item.utype],
      );
      const messageHash = ethers.keccak256(packedData);

      // Convert to EthSignedMessageHash (adds "\x19Ethereum Signed Message:\n32" prefix)
      const ethSignedHash = ethers.hashMessage(ethers.getBytes(messageHash));

      // Sign the message
      const signature = await zkVerifierSigner.signMessage(
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

  if (state.provider == null)
    return ResultErr("encrypt :: provider uninitialized");

  const encryptableItems = encryptExtract(item);

  setState(EncryptStep.Pack);

  // Sleep to avoid rate limiting
  await sleep(100);

  setState(EncryptStep.Prove);

  await sleep(500);

  setState(EncryptStep.Verify);

  await sleep(2000);

  const signedResults = await mockZkVerifySign(
    state.provider,
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
  provider: AbstractProvider,
  utype: FheTypes,
  permission: Permission,
) {
  const mockExampleIFace = new ethers.Interface(mockExampleAbi);

  const hashCallData = mockExampleIFace.encodeFunctionData("numberHash");
  const hashResult = await provider.call({
    to: mockExampleAddress,
    data: hashCallData,
  });
  const [ctHash] = mockExampleIFace.decodeFunctionResult(
    "numberHash",
    hashResult,
  );

  console.log({
    hashResult,
    ctHash,
  });

  const queryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
  const querySealOutputCallData = queryDecrypterIface.encodeFunctionData(
    "querySealOutput",
    [ctHash, utype, permission],
  );

  const querySealOutputResult = await provider.call({
    to: MockQueryDecrypterAddress,
    data: querySealOutputCallData,
  });

  const [sealedResult] = await queryDecrypterIface.decodeFunctionResult(
    "querySealOutput",
    querySealOutputResult,
  );

  const {
    allowed,
    error,
    result,
  }: { allowed: boolean; error: string; result: string } = sealedResult;

  console.log("sealedResult", allowed, error, result);

  const sealedBigInt = BigInt(result);
  const sealingKeyBigInt = BigInt(permission.sealingKey);
  const unsealed = sealedBigInt ^ sealingKeyBigInt;

  console.log("mock unsealed", unsealed);
}

// TODO: Re-enable after testSealOutput is working
// - architect_dev 2025-04-01
//
// export async function testDecrypt(
//   provider: JsonRpcProvider,
//   utype: FheTypes,
//   permission: Permission,
// ) {
//   const mockExampleIFace = new ethers.Interface(mockExampleAbi);

//   const hashCallData = mockExampleIFace.encodeFunctionData("numberHash");
//   const hashResult = await provider.call({
//     to: mockExampleAddress,
//     data: hashCallData,
//   });

//   const mockDecrypter = new ethers.Contract(
//     mockQueryDecrypterAddress,
//     mockQueryDecrypterAbi,
//     provider,
//   );

//   const decryptResult = await mockDecrypter.queryDecrypt(
//     hashResult,
//     utype,
//     permission,
//   );

//   console.log("query decrypt result", decryptResult);
// }

export async function mockSealOutput<U extends FheTypes>(
  provider: AbstractProvider,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<Result<UnsealedItem<U>>> {
  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    return ResultErr("mockSealOutput :: permit domain invalid");
  }

  // const queryDecrypter = new ethers.Contract(
  //   mockQueryDecrypterAddress,
  //   mockQueryDecrypterAbi,
  //   provider,
  // );

  const permission = permit.getPermission();

  console.log("permission", permission);

  const queryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
  const querySealOutputCallData = queryDecrypterIface.encodeFunctionData(
    "querySealOutput",
    [ctHash, utype, permission],
  );

  const querySealOutputResult = await provider.call({
    to: MockQueryDecrypterAddress,
    data: querySealOutputCallData,
  });

  console.log("querySealOutputResult", querySealOutputResult);

  const [allowed, error, result] =
    await queryDecrypterIface.decodeFunctionResult(
      "querySealOutput",
      querySealOutputResult,
    );

  console.log("sealedResult", allowed, error, result);

  if (error != "") {
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
  provider: AbstractProvider,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<Result<UnsealedItem<U>>> {
  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    return ResultErr("mockDecrypt :: permit domain invalid");
  }

  // const queryDecrypter = new ethers.Contract(
  //   mockQueryDecrypterAddress,
  //   mockQueryDecrypterAbi,
  //   provider,
  // );

  const permission = permit.getPermission();

  const queryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
  const queryDecryptCallData = queryDecrypterIface.encodeFunctionData(
    "queryDecrypt",
    [ctHash, utype, permission],
  );

  const queryDecryptResult = await provider.call({
    to: MockQueryDecrypterAddress,
    data: queryDecryptCallData,
  });

  const [decryptResult] = await queryDecrypterIface.decodeFunctionResult(
    "queryDecrypt",
    queryDecryptResult,
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
