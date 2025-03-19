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
  FheUintUTypes,
  Permission,
  Result,
  ResultErr,
  ResultOk,
  UnsealedItem,
  VerifyResult,
} from "../../types";
import { sleep, uint160ToAddress } from "../utils";
import { _sdkStore } from "./store";
import { Permit } from "../permit";

const mockZkVerifierAddress = "0x0000000000000000000000000000000000000100";
const mockQueryDecrypterAddress = "0x0000000000000000000000000000000000000200";
const mockZkVerifierSignerPkey =
  "0x6c8d7f768a6bb4aafe85e8a2f5a9680355239c7e14646ed62b044e39de154512";
const existsSignature = "0x267c4ae4";
const mockQueryDecrypterAbi = [
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
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
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
  provider: AbstractProvider,
  ctHash: bigint,
  utype: FheTypes,
  permission: Permission,
) {
  const mockQueryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
  const callData = mockQueryDecrypterIface.encodeFunctionData(
    "querySealOutput",
    [ctHash, utype, permission],
  );

  console.log("Permission", permission);

  const result = await provider.call({
    to: mockQueryDecrypterAddress,
    data: callData,
  });

  console.log("result", result);
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

  const sealed = await queryDecrypter.querySealOutput(
    ctHash,
    utype,
    permission,
  );

  console.log("sealed", sealed);

  const sealedBigInt = BigInt(sealed);
  const sealingKeyBigInt = BigInt(permission.sealingKey);
  const unsealed = sealedBigInt ^ sealingKeyBigInt;

  console.log("unsealed", unsealed);

  // const unsealed = await permit.unsealCiphertext(sealed);

  if (utype === FheTypes.Bool) {
    return ResultOk(!!unsealed) as Result<UnsealedItem<U>>;
  } else if (utype === FheTypes.Uint160) {
    return ResultOk(uint160ToAddress(unsealed)) as Result<UnsealedItem<U>>;
  } else if (utype == null || FheUintUTypes.includes(utype as number)) {
    return ResultOk(unsealed) as Result<UnsealedItem<U>>;
  } else {
    return ResultErr(`mockSealOutput :: invalid utype :: ${utype}`);
  }
}
