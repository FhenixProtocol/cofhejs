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
  Result,
  ResultErr,
  ResultOk,
  InitializationParams,
  EncryptableItem,
  FheTypes,
  UnsealedItem,
  FheUintUTypes,
} from "../../types";
import { mockSealOutput } from "./testnet";

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
): Promise<Result<Permit | undefined>> => {
  if (params.provider == null)
    return ResultErr(
      "initialize :: missing provider - Please provide an AbstractProvider interface",
    );

  if (params.securityZones != null && params.securityZones.length === 0)
    return ResultErr(
      "initialize :: a list of securityZones was provided, but it is empty",
    );

  await _store_initialize(params);

  // `generatePermit` must set to `false` to early exit here
  if (params.generatePermit === false) return ResultOk(undefined);

  // Return the existing active permit
  const userActivePermit = getPermit();
  if (userActivePermit.success) return userActivePermit;

  // Create permit and return it
  return createPermit();
};

/**
 * Internal reusable initialization checker
 */
const _checkInitialized = (
  state: SdkStore,
  options?: {
    fheKeys?: boolean;
    provider?: boolean;
    signer?: boolean;
    coFheUrl?: boolean;
    verifierUrl?: boolean;
    rpcUrl?: boolean;
  },
) => {
  if (
    !state.isTestnet &&
    options?.fheKeys !== false &&
    !state.fheKeysInitialized
  ) {
    return ResultErr("cofhejs not initialized. Use `cofhejs.initialize(...)`.");
  }

  if (!state.isTestnet && options?.coFheUrl !== false && !state.coFheUrl)
    return ResultErr(
      "cofhejs not initialized with a coFheUrl. Set `coFheUrl` in `cofhejs.initialize`.",
    );

  if (!state.isTestnet && options?.verifierUrl !== false && !state.verifierUrl)
    return ResultErr(
      "cofhejs not initialized with a verifierUrl. Set `verifierUrl` in `cofhejs.initialize`.",
    );

  if (options?.provider !== false && !state.providerInitialized)
    return ResultErr(
      "cofhejs not initialized with valid provider. Use `cofhejs.initialize(...)` with a valid provider that satisfies `AbstractProvider`.",
    );

  if (options?.signer !== false && !state.signerInitialized)
    return ResultErr(
      "cofhejs not initialized with a valid signer. Use `cofhejs.initialize(...)` with a valid signer that satisfies `AbstractSigner`.",
    );

  if (options?.rpcUrl !== false && !state.rpcUrl)
    return ResultErr(
      "cofhejs not initialized with a valid rpcUrl. Use `cofhejs.initialize(...)` with a valid rpcUrl.",
    );

  return ResultOk(null);
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
): Promise<Result<Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${createPermit.name} :: ${initialized.error}`);

  const optionsWithDefaults: PermitOptions = {
    type: "self",
    issuer: state.account,
    ...options,
  };

  let permit: Permit;
  try {
    permit = await Permit.createAndSign(
      optionsWithDefaults,
      state.signer,
      state.rpcUrl!,
    );
  } catch (e) {
    console.log("createPermit :: e", e);
    return ResultErr(`${createPermit.name} :: ${e}`);
  }

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
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
): Promise<Result<Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${createPermit.name} :: ${initialized.error}`);

  // Import validation
  if (typeof imported === "string") {
    try {
      imported = JSON.parse(imported);
    } catch (e) {
      return ResultErr(`importPermit :: json parsing failed - ${e}`);
    }
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
    return ResultErr(`importPermit :: invalid permit data - ${errorString}`);
  }
  if (parsedPermit.type !== "self") {
    if (parsedPermit.issuer === state.account) parsedPermit.type = "sharing";
    else if (parsedPermit.recipient === state.account)
      parsedPermit.type = "recipient";
    else {
      return ResultErr(
        `importPermit :: invalid Permit - connected account <${state.account}> is not issuer or recipient`,
      );
    }
  }

  let permit: Permit;
  try {
    permit = await Permit.create(parsedPermit as PermitInterface);
  } catch (e) {
    return ResultErr(`importPermit :: ${e}`);
  }

  const { valid, error } = permit.isValid();
  if (!valid) {
    return ResultErr(
      `importPermit :: newly imported permit is invalid - ${error}`,
    );
  }

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
};

/**
 * Selects the active permit using its hash.
 * If the hash is not found in the stored permits store, throws an error.
 * The matched permit will be marked as the active permit.
 *
 * @param {string} hash - The `Permit.getHash` of the target permit.
 */
export const selectActivePermit = (hash: string): Result<Permit> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${selectActivePermit.name} :: ${initialized.error}`);

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    return ResultErr(
      `${selectActivePermit.name} :: Permit with hash <${hash}> not found`,
    );

  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
};

/**
 * Retrieves a stored permit based on its hash.
 * If no hash is provided, the currently active permit will be retrieved.
 *
 * @param {string} hash - Optional `Permit.getHash` of the permit.
 * @returns {Result<Permit>} - The active permit or permit associated with `hash` as a Result object.
 */
export const getPermit = (hash?: string): Result<Permit> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${getPermit.name} :: ${initialized.error}`);

  if (hash == null) {
    const permit = permitStore.getActivePermit(state.account);
    if (permit == null)
      return ResultErr(`getPermit :: active permit not found`);

    return ResultOk(permit);
  }

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    return ResultErr(`getPermit :: permit with hash <${hash}> not found`);

  return ResultOk(permit);
};

/**
 * Retrieves a stored permission based on the permit's hash.
 * If no hash is provided, the currently active permit will be used.
 * The `Permission` is extracted from the permit.
 *
 * @param {string} hash - Optional hash of the permission to get, defaults to active permit's permission
 * @returns {Result<Permission>} - The active permission or permission associated with `hash`, as a result object.
 */
export const getPermission = (hash?: string): Result<Permission> => {
  const permitResult = getPermit(hash);
  if (!permitResult.success)
    return ResultErr(`${getPermission.name} :: ${permitResult.error}`);

  return ResultOk(permitResult.data.getPermission());
};

/**
 * Exports all stored permits.
 * @returns {Result<Record<string, Permit>>} - All stored permits.
 */
export const getAllPermits = (): Result<Record<string, Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${getAllPermits.name} :: ${initialized.error}`);

  return ResultOk(permitStore.getPermits(state.account));
};

// Encrypt (Steps)

export function encryptGetKeys(): Result<{
  fhePublicKey: Uint8Array;
  crs: Uint8Array;
  coFheUrl: string;
  verifierUrl: string;
  account: string;
  chainId: string;
}> {
  const state = _sdkStore.getState();

  // Only need to check `fheKeysInitialized`, signer and provider not needed for encryption
  const initialized = _checkInitialized(state, {
    provider: false,
    signer: false,
  });
  if (!initialized.success) return ResultErr(`encrypt :: ${initialized.error}`);

  if (state.account == null)
    return ResultErr("encrypt :: account uninitialized");

  if (state.chainId == null)
    return ResultErr("encrypt :: chainId uninitialized");

  const fhePublicKey = _store_getConnectedChainFheKey(0);
  if (fhePublicKey == null)
    return ResultErr("encrypt :: fheKey for current chain not found");

  const crs = _store_getCrs(state.chainId);
  if (crs == null)
    return ResultErr("encrypt :: CRS for current chain not found");

  const coFheUrl = state.coFheUrl;
  if (coFheUrl == null) return ResultErr("encrypt :: coFheUrl not initialized");

  const verifierUrl = state.verifierUrl;
  if (verifierUrl == null)
    return ResultErr("encrypt :: verifierUrl not initialized");

  return ResultOk({
    fhePublicKey,
    crs,
    coFheUrl,
    verifierUrl,
    account: state.account,
    chainId: state.chainId,
  });
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
): Promise<Result<UnsealedItem<U>>> {
  const initialized = _checkInitialized(_sdkStore.getState());
  if (!initialized.success)
    return ResultErr(`${unseal.name} :: ${initialized.error}`);

  const resolvedAccount = account ?? _sdkStore.getState().account;
  const resolvedHash =
    permitHash ?? permitStore.getActivePermitHash(resolvedAccount);
  if (resolvedAccount == null || resolvedHash == null) {
    return ResultErr(
      `unseal :: Permit hash not provided and active Permit not found`,
    );
  }

  console.log("unseal :: resolvedAccount", resolvedAccount);
  console.log("unseal :: resolvedHash", resolvedHash);

  const permit = permitStore.getPermit(resolvedAccount, resolvedHash);
  if (permit == null) {
    return ResultErr(
      `unseal :: Permit with account <${account}> and hash <${permitHash}> not found`,
    );
  }

  if (_sdkStore.getState().isTestnet) {
    return mockSealOutput(_sdkStore.getState().rpcUrl!, ctHash, utype, permit);
  }

  const verifierUrl = _sdkStore.getState().verifierUrl;
  if (verifierUrl == null)
    return ResultErr("unseal :: verifierUrl not initialized");

  let sealed: string | undefined;
  try {
    const sealOutputRes = await fetch(`${verifierUrl}:50054/sealOutput`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ctHash,
        permission: permit.getPermission(),
      }),
    });
    const sealOutput = await sealOutputRes.json();
    sealed = BigInt(sealOutput.data).toString();
  } catch (e) {
    return ResultErr(`unseal :: sealOutput request failed :: ${e}`);
  }

  if (utype === FheTypes.Bool) {
    return ResultOk(permit.unsealCiphertext(sealed)) as Result<UnsealedItem<U>>;
  } else if (utype === FheTypes.Uint160) {
    return ResultOk(permit.unsealCiphertext(sealed)) as Result<UnsealedItem<U>>;
  } else if (utype == null || FheUintUTypes.includes(utype as number)) {
    return ResultOk(permit.unsealCiphertext(sealed)) as Result<UnsealedItem<U>>;
  } else {
    return ResultErr(`unseal :: invalid utype :: ${utype}`);
  }
}
