/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { encryptExtract, encryptReplace } from ".";
import {
  AbstractProvider,
  AbstractSigner,
  CoFheInItem,
  CofhejsError,
  CofhejsErrorCode,
  CofhejsMocksConfig,
  EncryptableItem,
  Encrypted_Inputs,
  EncryptSetStateFn,
  EncryptStep,
  FheTypes,
  UnsealedItem,
  VerifyResult,
} from "../../types";
import { sleep } from "../utils";
import { _sdkStore } from "./store";
import { Permit } from "../permit";
import { convertViaUtype, isValidUtype } from "../utils/utype";
import {
  fnExistsIface,
  mockQueryDecrypterAbi,
  MockQueryDecrypterAddress,
  MockZkVerifierAddress,
  mockZkVerifierIface,
  MockZkVerifierSignerPkey,
} from "../utils/consts";

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

    const [zkVerifierExists] = existsIface.decodeFunctionResult(
      "exists",
      zkVerifierExistsRaw,
    );
    const [queryDecrypterExists] = existsIface.decodeFunctionResult(
      "exists",
      queryDecrypterExistsRaw,
    );

    return zkVerifierExists && queryDecrypterExists;
  } catch (err) {
    return false;
  }
}

async function mockZkVerifySign(
  mockConfig: CofhejsMocksConfig,
  signer: AbstractSigner,
  provider: AbstractProvider,
  user: string,
  items: EncryptableItem[],
  securityZone: number,
): Promise<VerifyResult[]> {
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
      items.map(({ data }) => BigInt(data)),
      items.map(({ utype }) => utype),
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
  const [ctHashes] = zkVerifierIface.decodeFunctionResult(
    "zkVerifyCalcCtHashesPacked",
    zkVerifyCalcCtHashesPackedResult,
  );

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
        itemsWithCtHashes.map(({ data }) => BigInt(data)),
      ],
    );

    // Call insertPackedCtHashes
    await (mockConfig.zkvSigner ?? signer).sendTransaction({
      to: MockZkVerifierAddress,
      data: insertPackedCtHashesCallData,
    });
  } catch (err) {
    throw new CofhejsError({
      code: CofhejsErrorCode.ZkVerifyInsertPackedCtHashesFailed,
      message: `mockZkVerifySign insertPackedCtHashes failed: ${err}`,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // Create ethers wallet with mockZkVerifierSignerPkey
  const zkVerifierSigner = new ethers.Wallet(MockZkVerifierSignerPkey);

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

    return results;
  } catch (err) {
    throw new CofhejsError({
      code: CofhejsErrorCode.ZkVerifySignFailed,
      message: `mockZkVerifySign sign failed: ${err}`,
      cause: err instanceof Error ? err : undefined,
    });
  }
}

export async function mockEncrypt<T extends any[]>(
  item: [...T],
  securityZone = 0,
  setStateCallback?: EncryptSetStateFn,
): Promise<[...Encrypted_Inputs<T>]> {
  setStateCallback?.(EncryptStep.Extract);

  const state = _sdkStore.getState();

  if (state.account == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.AccountUninitialized,
      message: "Account uninitialized",
    });

  if (state.chainId == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.ChainIdUninitialized,
      message: "ChainId uninitialized",
    });

  if (state.provider == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.ProviderNotInitialized,
      message: "Provider uninitialized",
    });

  if (state.signer == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.SignerNotInitialized,
      message: "Signer uninitialized",
    });

  const encryptableItems = encryptExtract(item);

  setStateCallback?.(EncryptStep.Pack);

  // Sleep to avoid rate limiting
  await sleep(100);

  setStateCallback?.(EncryptStep.Prove);

  await sleep(500);

  setStateCallback?.(EncryptStep.Verify);

  await sleep(500);

  const signedResults = await mockZkVerifySign(
    state.mockConfig,
    state.signer,
    state.provider,
    state.account,
    encryptableItems,
    securityZone,
  );

  const inItems: CoFheInItem[] = signedResults.map(
    ({ ct_hash, signature }, index) => ({
      ctHash: BigInt(ct_hash),
      securityZone,
      utype: encryptableItems[index].utype,
      signature,
    }),
  );

  setStateCallback?.(EncryptStep.Replace);

  const [preparedInputItems, remainingInItems] = encryptReplace(item, inItems);

  if (remainingInItems.length !== 0)
    throw new CofhejsError({
      code: CofhejsErrorCode.EncryptRemainingInItems,
      message: "Some encrypted inputs remaining after replacement",
    });

  setStateCallback?.(EncryptStep.Done);

  return preparedInputItems;
}

export async function mockSealOutput<U extends FheTypes>(
  provider: AbstractProvider,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<UnsealedItem<U>> {
  // Delay before decrypting the output
  const decryptDelay = _sdkStore.getState().mockConfig?.decryptDelay ?? 0;
  await sleep(decryptDelay);

  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidPermitDomain,
      message: "permit domain invalid",
    });
  }

  const permission = permit.getPermission();

  const queryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
  const querySealOutputCallData = queryDecrypterIface.encodeFunctionData(
    "querySealOutput",
    [ctHash, utype, permission],
  );

  const querySealOutputResult = await provider.call({
    to: MockQueryDecrypterAddress,
    data: querySealOutputCallData,
  });

  const [allowed, error, result] =
    await queryDecrypterIface.decodeFunctionResult(
      "querySealOutput",
      querySealOutputResult,
    );

  if (error != "") {
    throw new CofhejsError({
      code: CofhejsErrorCode.SealOutputFailed,
      message: `On-chain reversion: ${error}`,
    });
  }

  if (allowed == false) {
    throw new CofhejsError({
      code: CofhejsErrorCode.SealOutputFailed,
      message: `ACL Access Denied (NotAllowed)`,
    });
  }

  const sealedBigInt = BigInt(result);
  const sealingKeyBigInt = BigInt(permission.sealingKey);
  const unsealed = sealedBigInt ^ sealingKeyBigInt;

  if (!isValidUtype(utype)) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidUtype,
      message: `Invalid utype: ${utype}`,
    });
  }

  return convertViaUtype(utype, unsealed);
}

export async function mockDecrypt<U extends FheTypes>(
  provider: AbstractProvider,
  ctHash: bigint,
  utype: U,
  permit: Permit,
): Promise<UnsealedItem<U>> {
  // Delay before decrypting the output
  const decryptDelay = _sdkStore.getState().mockConfig?.decryptDelay ?? 0;
  await sleep(decryptDelay);

  const domainValid = await permit.checkSignedDomainValid(provider);
  if (!domainValid) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidPermitDomain,
      message: "permit domain invalid",
    });
  }

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

  if (error != null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.DecryptFailed,
      message: `On-chain reversion: ${error}`,
    });
  }

  if (allowed == false) {
    throw new CofhejsError({
      code: CofhejsErrorCode.DecryptFailed,
      message: `ACL Access Denied (NotAllowed)`,
    });
  }

  const resultBigInt = BigInt(result);

  if (!isValidUtype(utype)) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidUtype,
      message: `Invalid utype: ${utype}`,
    });
  }

  return convertViaUtype(utype, resultBigInt);
}
