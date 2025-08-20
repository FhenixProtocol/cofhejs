/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CompactCiphertextListBuilder,
  CompactPkeCrs,
  TfheCompactPublicKey,
} from "node-tfhe";
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
  removePermit,
  selectActivePermit,
  unseal,
  decrypt,
} from "../core/sdk";
import { Permit } from "../core/permit";
import { _sdkStore } from "../core/sdk/store";
import {
  CoFheInItem,
  Encrypted_Inputs,
  EncryptStep,
  InitializationParams,
  Environment,
  CofhejsError,
  CofhejsErrorCode,
  wrapFunctionAsync,
  wrapFunction,
  Result,
  Permission,
  ResultOk,
  ResultErrOrInternal,
  EncryptableItem,
} from "../types";
import { initTfhe } from "./init";
import { zkPack, zkProve, zkVerify } from "./zkPoK";
import { mockEncrypt } from "../core/sdk/testnet";
import { applyEnvironmentDefaults } from "../utils/environment";
import {
  EthersInitializerParams,
  getViemAbstractProviders,
  getEthersAbstractProviders,
  ViemInitializerParams,
} from "../core/sdk/initializers";
import { marshallEncryptParams } from "../core/utils";
import { ZkPackProveVerify } from "../core/encrypt/zkPackProveVerify";
import { EncryptInputsBuilder } from "../core/encrypt/encryptInput";

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
  const { provider, signer, zkvSigner } =
    await getViemAbstractProviders(params);

  return initialize({
    provider,
    signer,
    ...params,
    mockConfig: {
      decryptDelay: params.mockConfig?.decryptDelay ?? 0,
      zkvSigner,
    },
  });
}

async function initializeWithEthers(
  params: EthersInitializerParams,
): Promise<Permit | undefined> {
  const { provider, signer, zkvSigner } =
    await getEthersAbstractProviders(params);

  return initialize({
    provider,
    signer,
    ...params,
    mockConfig: {
      decryptDelay: params.mockConfig?.decryptDelay ?? 0,
      zkvSigner,
    },
  });
}

let overriddenAccount: string | undefined;
const encryptOverrideAccount = (account: string) => {
  overriddenAccount = account;
};

// NOTE: This function returns the result type directly
// Usually we use wrapFunctionAsync to wrap this function
// but in this case the input types are too complex
async function encrypt<T extends any[]>(
  item: [...T],
  setStateCallback?: (state: EncryptStep) => void,
): Promise<Result<[...Encrypted_Inputs<T>]>>;
async function encrypt<T extends any[]>(
  item: [...T],
  securityZone: number,
  setStateCallback?: (state: EncryptStep) => void,
): Promise<Result<[...Encrypted_Inputs<T>]>>;
async function encrypt<T extends any[]>(
  item: [...T],
  setStateOrSecurityZone?: ((state: EncryptStep) => void) | number,
  maybeSetState?: (state: EncryptStep) => void,
): Promise<Result<[...Encrypted_Inputs<T>]>> {
  try {
    const { securityZone, setStateCallback } = marshallEncryptParams(
      setStateOrSecurityZone,
      maybeSetState,
    );

    const state = _sdkStore.getState();
    if (state.isTestnet) {
      const mockEncryptResult = await mockEncrypt(
        item,
        securityZone,
        setStateCallback,
      );
      return ResultOk(mockEncryptResult);
    }

    setStateCallback(EncryptStep.Extract);

    const keysResult = encryptGetKeys();

    const { fhePublicKey, crs, verifierUrl, account, chainId } = keysResult;

    const accountOrOverride = overriddenAccount ?? account;
    console.log("accountOrOverride", accountOrOverride);

    const encryptableItems = encryptExtract(item);

    setStateCallback(EncryptStep.Pack);

    const builder = zkPack(
      encryptableItems,
      TfheCompactPublicKey.deserialize(fhePublicKey),
    );

    setStateCallback(EncryptStep.Prove);

    const proved = await zkProve(
      builder,
      CompactPkeCrs.deserialize(crs),
      accountOrOverride,
      securityZone,
      chainId,
    );

    setStateCallback(EncryptStep.Verify);

    const verifyResults = await zkVerify(
      verifierUrl,
      proved,
      accountOrOverride,
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

    setStateCallback(EncryptStep.Replace);

    const [preparedInputItems, remainingInItems] = encryptReplace(
      item,
      inItems,
    );

    if (remainingInItems.length !== 0)
      throw new CofhejsError({
        code: CofhejsErrorCode.EncryptRemainingInItems,
        message: "Some encrypted inputs remaining after replacement",
      });

    setStateCallback(EncryptStep.Done);

    return ResultOk(preparedInputItems);
  } catch (error) {
    return ResultErrOrInternal(error);
  }
}

/**
 * Creates a new EncryptInputsBuilder instance for chaining encryption operations.
 * This starts the function chaining pattern for encrypting inputs.
 *
 * @returns {EncryptInputsBuilder} A builder instance for configuring and executing encryption
 *
 * @example
 * ```typescript
 * const encrypted = await cofhejs
 *   .encryptInputs([Encryptable.uint128(value)])
 *   .setSender(paymasterData.address)
 *   .setSecurityZone(0)
 *   .setStepCallback((step) => console.log(step))
 *   .encrypt();
 * ```
 */
export function encryptInputs<T extends any[]>(
  inputs: [...T],
): EncryptInputsBuilder<[...T]> {
  const { fhePublicKey, crs, verifierUrl, account, chainId } = encryptGetKeys();

  const _zkPack = (items: EncryptableItem[]) => {
    return zkPack(items, TfheCompactPublicKey.deserialize(fhePublicKey));
  };

  const _zkProve = (
    builder: CompactCiphertextListBuilder,
    address: string,
    securityZone: number,
    chainId: string,
  ) => {
    return zkProve(
      builder,
      CompactPkeCrs.deserialize(crs),
      address,
      securityZone,
      chainId,
    );
  };

  const zkPackProveVerify = new ZkPackProveVerify(_zkPack, _zkProve, zkVerify);

  return new EncryptInputsBuilder<[...T]>({
    inputs,
    sender: account,
    chainId,
    zkVerifierUrl: verifierUrl,
    zk: zkPackProveVerify,
  });
}

export const cofhejs = {
  store: _sdkStore,
  initialize: wrapFunctionAsync(initialize),
  initializeWithViem: wrapFunctionAsync(initializeWithViem),
  initializeWithEthers: wrapFunctionAsync(initializeWithEthers),

  createPermit: wrapFunctionAsync(createPermit),
  removePermit: wrapFunction(removePermit),
  importPermit: wrapFunctionAsync(importPermit),
  selectActivePermit: wrapFunction(selectActivePermit),
  getPermit: wrapFunction(getPermit),
  getPermission: wrapFunction(getPermission) as (
    hash?: string,
  ) => Result<Permission>,
  getAllPermits: wrapFunction(getAllPermits),

  encrypt: encrypt,
  encryptInputs: encryptInputs,

  unseal: wrapFunctionAsync(unseal),
  decrypt: wrapFunctionAsync(decrypt),

  // TEMP
  encryptOverrideAccount,
};
