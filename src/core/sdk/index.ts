/* eslint-disable @typescript-eslint/no-explicit-any */
import { Permit, permitStore, PermitParamsValidator } from "../permit";
import {
  _sdkStore,
  _store_getConnectedChainFheKey,
  _store_getCrs,
  _store_initialize,
  SdkStore,
} from "./store";
import {
  CoFheInItem,
  Encrypted_Inputs,
  isEncryptableItem,
  PermitOptions,
  PermitInterface,
  Permission,
  InitializationParams,
  EncryptableItem,
  FheTypes,
  UnsealedItem,
  CofhejsError,
  CofhejsErrorCode,
  wrapFunction,
} from "../../types";
import { mockDecrypt, mockSealOutput } from "./testnet";
import { bytesToBigInt } from "../utils";
import { convertViaUtype, isValidUtype } from "../utils/utype";
import { EthEncryptedData } from "./sealing";

/**
 * Initializes the `cofhejs` to enable encrypting input data, creating permits / permissions, and decrypting sealed outputs.
 * Initializes `fhevm` client FHE wasm module and fetches the provided chain's FHE publicKey.
 * If a valid signer is provided, a `permit/permission` is generated automatically
 */
export const initializeCore = async (
  params: InitializationParams & {
    ignoreErrors?: boolean;
    generatePermit?: boolean;
  },
): Promise<Permit | undefined> => {
  if (params.provider == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.MissingProviderParam,
      message: "Missing initialization parameter `provider`",
    });

  if (params.securityZones != null && params.securityZones.length === 0)
    throw new CofhejsError({
      code: CofhejsErrorCode.MissingSecurityZonesParam,
      message:
        "Initialization parameter provided but empty `securityZones = []`",
    });

  await _store_initialize(params);

  // `generatePermit` must set to `false` to early exit here
  if (params.generatePermit === false) return undefined;

  // Return the existing active permit
  const userActivePermit = getPermit_asResult();
  if (userActivePermit.success) return userActivePermit.data;

  // Create permit and return it
  return createPermit();
};

/**
 * Internal reusable initialization checker
 */
const _checkInitialized = (
  state: SdkStore,
  requirements?: {
    fheKeys?: boolean;
    provider?: boolean;
    signer?: boolean;
    coFheUrl?: boolean;
    verifierUrl?: boolean;
    thresholdNetworkUrl?: boolean;
  },
) => {
  const {
    fheKeys,
    provider,
    signer,
    coFheUrl,
    verifierUrl,
    thresholdNetworkUrl,
  } = requirements ?? {};

  if (!state.isTestnet && fheKeys !== false && !state.fheKeysInitialized) {
    throw new CofhejsError({
      code: CofhejsErrorCode.NotInitialized,
      message: "FHE publicKey or CRS not initialized.",
    });
  }

  if (!state.isTestnet && coFheUrl !== false && !state.coFheUrl)
    throw new CofhejsError({
      code: CofhejsErrorCode.NotInitialized,
      message: "`coFheUrl` missing from `cofhejs.initialize`.",
    });

  if (!state.isTestnet && verifierUrl !== false && !state.verifierUrl)
    throw new CofhejsError({
      code: CofhejsErrorCode.NotInitialized,
      message: "`verifierUrl` missing from `cofhejs.initialize`.",
    });

  if (
    !state.isTestnet &&
    thresholdNetworkUrl !== false &&
    !state.thresholdNetworkUrl
  )
    throw new CofhejsError({
      code: CofhejsErrorCode.NotInitialized,
      message: "`thresholdNetworkUrl` missing from `cofhejs.initialize`.",
    });

  if (provider !== false && !state.providerInitialized)
    throw new CofhejsError({
      code: CofhejsErrorCode.ProviderNotInitialized,
      message: "`provider` missing from `cofhejs.initialize`.",
    });

  if (signer !== false && !state.signerInitialized)
    throw new CofhejsError({
      code: CofhejsErrorCode.SignerNotInitialized,
      message: "`signer` missing from `cofhejs.initialize`.",
    });
};

// Permit

/**
 * Creates a new permit with options, prompts user for signature.
 * Handles all `permit.type`s, and prompts for the correct signature type.
 * The created Permit will be inserted into the store and marked as the active permit.
 * NOTE: This is a wrapper around `Permit.create` and `Permit.sign`
 *
 * @param {PermitOptions} options - Partial Permit fields to create the Permit with, if no options provided will be filled with the defaults:
 * { type: "self", issuer: initializedUserAddress }
 * @returns {Result<Permit>} - Newly created Permit as a Result object
 */
export const createPermit = async (
  options?: PermitOptions,
): Promise<Permit> => {
  const state = _sdkStore.getState();

  _checkInitialized(state);

  const optionsWithDefaults: PermitOptions = {
    type: "self",
    issuer: state.account,
    ...options,
  };

  const permit = await Permit.createAndSign(optionsWithDefaults, state.signer);

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return permit;
};

/**
 * Imports a fully formed existing permit, expected to be valid.
 * Does not ask for user signature, expects to already be populated.
 * Will throw an error if the imported permit is invalid, see `Permit.isValid`.
 * The imported Permit will be inserted into the store and marked as the active permit.
 *
 * @param {string | PermitInterface} imported - Permit to import as a text string or PermitInterface
 */
export const importPermit = async (
  imported: string | PermitInterface,
): Promise<Permit> => {
  const state = _sdkStore.getState();

  _checkInitialized(state);

  // Import validation
  if (typeof imported === "string") {
    imported = JSON.parse(imported);
  }

  const {
    success,
    data: parsedPermit,
    error: permitParsingError,
  } = PermitParamsValidator.safeParse(imported as PermitInterface);

  if (!success) {
    const errorString = Object.entries(permitParsingError.flatten().fieldErrors)
      .map(([field, err]) => `- ${field}: ${err}`)
      .join("\n");

    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidPermitData,
      message: errorString,
    });
  }
  if (parsedPermit.type !== "self") {
    if (parsedPermit.issuer === state.account) parsedPermit.type = "sharing";
    else if (parsedPermit.recipient === state.account)
      parsedPermit.type = "recipient";
    else {
      throw new CofhejsError({
        code: CofhejsErrorCode.InvalidPermitData,
        message: `Connected account <${state.account}> is not issuer or recipient`,
      });
    }
  }

  const permit = await Permit.create(parsedPermit as PermitInterface);

  const { valid, error } = permit.isValid();
  if (!valid) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidPermitData,
      message: `Imported permit is invalid - ${error}`,
    });
  }

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return permit;
};

/**
 * Selects the active permit using its hash.
 * If the hash is not found in the stored permits store, throws an error.
 * The matched permit will be marked as the active permit.
 *
 * @param {string} hash - The `Permit.getHash` of the target permit.
 */
export const selectActivePermit = (hash: string): Permit => {
  const state = _sdkStore.getState();

  _checkInitialized(state);

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit with hash <${hash}> not found`,
    });

  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return permit;
};

/**
 * Retrieves a stored permit based on its hash.
 * If no hash is provided, the currently active permit will be retrieved.
 *
 * @param {string} hash - Optional `Permit.getHash` of the permit.
 * @returns {Result<Permit>} - The active permit or permit associated with `hash` as a Result object.
 */
export const getPermit = (hash?: string): Permit => {
  const state = _sdkStore.getState();

  _checkInitialized(state);

  if (hash == null) {
    const permit = permitStore.getActivePermit(state.account);
    if (permit == null)
      throw new CofhejsError({
        code: CofhejsErrorCode.PermitNotFound,
        message: `Active permit not found`,
      });

    return permit;
  }

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit with hash <${hash}> not found`,
    });

  return permit;
};

export const getPermit_asResult = wrapFunction(getPermit);

/**
 * Retrieves a stored permission based on the permit's hash.
 * If no hash is provided, the currently active permit will be used.
 * The `Permission` is extracted from the permit.
 *
 * @param {string} hash - Optional hash of the permission to get, defaults to active permit's permission
 * @returns {Result<Permission>} - The active permission or permission associated with `hash`, as a result object.
 */
export const getPermission = (hash?: string): Permission => {
  const permit = getPermit(hash);
  return permit.getPermission();
};

/**
 * Exports all stored permits.
 * @returns {Result<Record<string, Permit>>} - All stored permits.
 */
export const getAllPermits = (): Record<string, Permit> => {
  const state = _sdkStore.getState();

  _checkInitialized(state);

  return permitStore.getPermits(state.account);
};

// Encrypt (Steps)

export function encryptGetKeys(): {
  fhePublicKey: Uint8Array;
  crs: Uint8Array;
  coFheUrl: string;
  verifierUrl: string;
  thresholdNetworkUrl: string;
  account: string;
  chainId: string;
} {
  const state = _sdkStore.getState();

  // Only need to check `fheKeysInitialized`, signer and provider not needed for encryption
  _checkInitialized(state);

  if (state.account == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.AccountUninitialized,
      message: "account uninitialized",
    });

  if (state.chainId == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.ChainIdUninitialized,
      message: "chainId uninitialized",
    });

  const fhePublicKey = _store_getConnectedChainFheKey(0);
  if (fhePublicKey == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.FheKeyNotFound,
      message: "fheKey for current chain not found",
    });

  const crs = _store_getCrs(state.chainId);
  if (crs == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.CrsNotFound,
      message: "CRS for current chain not found",
    });

  return {
    fhePublicKey,
    crs,
    coFheUrl: state.coFheUrl!,
    verifierUrl: state.verifierUrl!,
    thresholdNetworkUrl: state.thresholdNetworkUrl!,
    account: state.account,
    chainId: state.chainId,
  };
}

export function encryptExtract<T>(item: T): EncryptableItem[];
export function encryptExtract<T extends any[]>(
  item: [...T],
): EncryptableItem[];
export function encryptExtract<T>(item: T) {
  if (isEncryptableItem(item)) {
    return item;
  }

  // Object | Array
  if (typeof item === "object" && item !== null) {
    if (Array.isArray(item)) {
      // Array - recurse
      return item.flatMap((nestedItem) => encryptExtract(nestedItem));
    } else {
      // Object - recurse
      return Object.values(item).flatMap((value) => encryptExtract(value));
    }
  }

  return [];
}

export function encryptReplace<T>(
  item: T,
  encryptedItems: CoFheInItem[],
): [Encrypted_Inputs<T>, CoFheInItem[]];
export function encryptReplace<T extends any[]>(
  item: [...T],
  encryptedItems: CoFheInItem[],
): [...Encrypted_Inputs<T>, CoFheInItem[]];
export function encryptReplace<T>(item: T, encryptedItems: CoFheInItem[]) {
  if (isEncryptableItem(item)) {
    return [encryptedItems[0], encryptedItems.slice(1)];
  }

  // Object | Array
  if (typeof item === "object" && item !== null) {
    if (Array.isArray(item)) {
      // Array - recurse
      return item.reduce<[any[], CoFheInItem[]]>(
        ([acc, remaining], item) => {
          const [newItem, newRemaining] = encryptReplace(item, remaining);
          return [[...acc, newItem], newRemaining];
        },
        [[], encryptedItems],
      );
    } else {
      // Object - recurse
      return Object.entries(item).reduce<[Record<string, any>, CoFheInItem[]]>(
        ([acc, remaining], [key, value]) => {
          const [newValue, newRemaining] = encryptReplace(value, remaining);
          return [{ ...acc, [key]: newValue }, newRemaining];
        },
        [{}, encryptedItems],
      );
    }
  }

  return [item, encryptedItems];
}

// Unseal

/**
 * Uses the privateKey of `permit.sealingPair` to recursively unseal any contained `SealedItems`.
 * If `item` is a single `SealedItem` it will be individually.
 * NOTE: Only unseals typed `SealedItem`s returned from `FHE.sealoutputTyped` and the FHE bindings' `e____.sealTyped`.
 *
 * @param {any | any[]} ctHashes - Array, object, or item. Any nested `SealedItems` will be unsealed.
 * @returns - Recursively unsealed data in the target type, SealedBool -> boolean, SealedAddress -> string, etc.
 */
export async function unseal<U extends FheTypes>(
  ctHash: bigint,
  utype: U,
  account?: string,
  permitHash?: string,
): Promise<UnsealedItem<U>> {
  _checkInitialized(_sdkStore.getState());
  const thresholdNetworkUrl = _sdkStore.getState().thresholdNetworkUrl!;

  const provider = _sdkStore.getState().provider;
  if (provider == null)
    throw new CofhejsError({
      code: CofhejsErrorCode.ProviderNotInitialized,
      message: "provider not initialized",
    });

  const resolvedAccount = account ?? _sdkStore.getState().account;
  const resolvedHash =
    permitHash ?? permitStore.getActivePermitHash(resolvedAccount);

  if (resolvedAccount == null || resolvedHash == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit hash not provided and active Permit not found`,
    });
  }

  const permit = permitStore.getPermit(resolvedAccount, resolvedHash);
  if (permit == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit with account <${account}> and hash <${permitHash}> not found`,
    });
  }

  if (_sdkStore.getState().isTestnet) {
    return mockSealOutput(provider, ctHash, utype, permit);
  }

  let sealed: EthEncryptedData | undefined;

  try {
    const body = {
      ct_tempkey: ctHash.toString(16).padStart(64, "0"),
      host_chain_id: Number(_sdkStore.getState().chainId),
      permit: permit.getPermission(),
    };
    const sealOutputRes = await fetch(`${thresholdNetworkUrl}/sealoutput`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const sealOutput = await sealOutputRes.json();
    sealed = sealOutput.sealed;
  } catch (e) {
    throw new CofhejsError({
      code: CofhejsErrorCode.SealOutputFailed,
      message: `sealOutput request failed`,
    });
  }

  if (sealed == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.SealOutputReturnedNull,
      message: "sealed data not found",
    });
  }

  const unsealed = permit.unseal(sealed);

  if (!isValidUtype(utype)) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidUtype,
      message: `invalid utype :: ${utype}`,
    });
  }

  return convertViaUtype(utype, unsealed);
}

export async function decrypt<U extends FheTypes>(
  ctHash: bigint,
  utype: U,
  account?: string,
  permitHash?: string,
): Promise<UnsealedItem<U>> {
  _checkInitialized(_sdkStore.getState());
  const thresholdNetworkUrl = _sdkStore.getState().thresholdNetworkUrl!;

  const resolvedAccount = account ?? _sdkStore.getState().account;
  const resolvedHash =
    permitHash ?? permitStore.getActivePermitHash(resolvedAccount);
  if (resolvedAccount == null || resolvedHash == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit hash not provided and active Permit not found`,
    });
  }

  console.log("decrypt :: resolvedAccount", resolvedAccount);
  console.log("decrypt :: resolvedHash", resolvedHash);

  const permit = permitStore.getPermit(resolvedAccount, resolvedHash);
  if (permit == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.PermitNotFound,
      message: `Permit with account <${account}> and hash <${permitHash}> not found`,
    });
  }

  if (_sdkStore.getState().isTestnet) {
    return mockDecrypt(_sdkStore.getState().provider!, ctHash, utype, permit);
  }

  let decrypted: bigint | undefined;
  let decryptOutput: any | undefined;

  try {
    const body = {
      ct_tempkey: ctHash.toString(16).padStart(64, "0"),
      host_chain_id: Number(_sdkStore.getState().chainId),
      permit: permit.getPermission(),
    };

    const decryptOutputRes = await fetch(`${thresholdNetworkUrl}/decrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    decryptOutput = await decryptOutputRes.json();
    decrypted = bytesToBigInt(decryptOutput.decrypted);
  } catch (e: unknown) {
    throw new CofhejsError({
      code: CofhejsErrorCode.DecryptFailed,
      message: `decrypt request failed`,
      cause: e as Error,
    });
  }

  if (decryptOutput == null || decrypted == null) {
    throw new CofhejsError({
      code: CofhejsErrorCode.DecryptReturnedNull,
      message: "decrypted data not found",
    });
  }

  if (decryptOutput.encryption_type !== utype) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidUtype,
      message: `unexpected encryption type :: received ${decryptOutput.encryption_type}, expected ${utype}`,
    });
  }

  if (!isValidUtype(utype)) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidUtype,
      message: `invalid utype :: ${utype}`,
    });
  }

  return convertViaUtype(utype, decrypted);
}

export * from "./initializers";
