/* eslint-disable @typescript-eslint/no-explicit-any */
import { CompactPkeCrs, TfheCompactPublicKey } from "tfhe";
import {
  createPermit,
  encryptExtract,
  encryptReplace,
  encryptGetKeys,
  getAllPermits,
  getPermission,
  getPermit,
  importPermit,
  initializeCore,
  selectActivePermit,
  unseal,
  decrypt,
} from "../core/sdk";
import { Permit } from "../core/permit";
import { _sdkStore } from "../core/sdk/store";
import {
  CoFheInItem,
  CofhejsError,
  CofhejsErrorCode,
  Encrypted_Inputs,
  EncryptStep,
  InitializationParams,
  Permission,
  Result,
  wrapFunction,
  wrapFunctionAsync,
} from "../types";
import { initTfhe } from "./init";
import { zkPack, zkProve, zkVerify } from "./zkPoK";
import { mockEncrypt } from "../core/sdk/testnet";
import { applyEnvironmentDefaults } from "../utils/environment";
import { Environment } from "../types";
import {
  ViemInitializerParams,
  getViemAbstractProviders,
  EthersInitializerParams,
  getEthersAbstractProviders,
} from "../core/sdk/initializers";

/**
 * Initializes the `cofhejs` to enable encrypting input data, creating permits / permissions, and decrypting sealed outputs.
 * Initializes `fhevm` client FHE wasm module and fetches the provided chain's FHE publicKey.
 * If a valid signer is provided, a `permit/permission` is generated automatically
 */
export const initialize = async (
  params: Omit<
    InitializationParams,
    "tfhePublicKeySerializer" | "compactPkeCrsSerializer"
  > & {
    ignoreErrors?: boolean;
    generatePermit?: boolean;
    environment?: Environment;
  },
): Promise<Permit | undefined> => {
  // Apply environment-specific defaults if environment is provided
  const processedParams = applyEnvironmentDefaults(params);

  // Initialize the fhevm
  await initTfhe().catch((err: unknown) => {
    if (processedParams.ignoreErrors) {
      return undefined;
    } else {
      throw new CofhejsError({
        code: CofhejsErrorCode.InitTfheFailed,
        message: `initializing TFHE failed - is the network FHE-enabled?`,
        cause: err instanceof Error ? err : undefined,
      });
    }
  });

  return initializeCore({
    ...processedParams,
    tfhePublicKeySerializer: (buff: Uint8Array) => {
      return TfheCompactPublicKey.deserialize(buff);
    },
    compactPkeCrsSerializer: (buff: Uint8Array) => {
      return CompactPkeCrs.deserialize(buff);
    },
  });
};

async function initializeWithViem(
  params: ViemInitializerParams,
): Promise<Permit | undefined> {
  const { provider, signer } = await getViemAbstractProviders(params);

  return initialize({
    provider,
    signer,
    ...params,
  });
}

async function initializeWithEthers(
  params: EthersInitializerParams,
): Promise<Permit | undefined> {
  const { provider, signer } = await getEthersAbstractProviders(params);

  return initialize({
    provider,
    signer,
    ...params,
  });
}

async function encrypt<T extends any[]>(
  setState: (state: EncryptStep) => void,
  item: [...T],
  securityZone = 0,
): Promise<[...Encrypted_Inputs<T>]> {
  const state = _sdkStore.getState();
  if (state.isTestnet) {
    return mockEncrypt(setState, item, securityZone);
  }

  setState(EncryptStep.Extract);

  const keysResult = encryptGetKeys();

  const { fhePublicKey, crs, verifierUrl, account, chainId } = keysResult;

  const encryptableItems = encryptExtract(item);

  setState(EncryptStep.Pack);

  const builder = zkPack(
    encryptableItems,
    TfheCompactPublicKey.deserialize(fhePublicKey),
  );

  setState(EncryptStep.Prove);

  const proved = await zkProve(
    builder,
    CompactPkeCrs.deserialize(crs),
    account,
    securityZone,
    chainId,
  );

  setState(EncryptStep.Verify);

  const verifyResults = await zkVerify(
    verifierUrl,
    proved,
    account,
    securityZone,
    chainId,
  );

  const inItems: CoFheInItem[] = verifyResults.map(
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
    throw new CofhejsError({
      code: CofhejsErrorCode.EncryptRemainingInItems,
      message: "Some encrypted inputs remaining after replacement",
    });

  setState(EncryptStep.Done);

  return preparedInputItems;
}

export const cofhejs = {
  store: _sdkStore,
  initialize: wrapFunctionAsync(initialize),
  initializeWithViem: wrapFunctionAsync(initializeWithViem),
  initializeWithEthers: wrapFunctionAsync(initializeWithEthers),

  createPermit: wrapFunctionAsync(createPermit),
  importPermit: wrapFunctionAsync(importPermit),
  selectActivePermit: wrapFunction(selectActivePermit),
  getPermit: wrapFunction(getPermit),
  getPermission: wrapFunction(getPermission) as (
    hash?: string,
  ) => Result<Permission>,
  getAllPermits: wrapFunction(getAllPermits),

  encrypt: wrapFunctionAsync(encrypt),

  unseal: wrapFunctionAsync(unseal),
  decrypt: wrapFunctionAsync(decrypt),
};
