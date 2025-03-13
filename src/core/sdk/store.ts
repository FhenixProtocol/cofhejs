/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStore } from "zustand/vanilla";
import { produce } from "immer";
import { fromHexString } from "../utils/utils";
import { PUBLIC_KEY_LENGTH_MIN } from "./consts";
import {
  AbstractProvider,
  AbstractSigner,
  InitializationParams,
} from "../../types";
import { checkIsTestnet } from "./testnet";

type ChainRecord<T> = Record<string, T>;
type SecurityZoneRecord<T> = Record<number, T>;

type SdkStoreProviderInitialization =
  | {
      providerInitialized: false;
      signer: never;
      account: never;
    }
  | {
      providerInitialized: true;
      provider: AbstractProvider;
      chainId: string;
    };

type SdkStoreSignerInitialization =
  | {
      signerInitialized: false;
      signer: never;
      account: never;
    }
  | {
      signerInitialized: true;
      signer: AbstractSigner;
      account: string;
    };

export type SdkStore = SdkStoreProviderInitialization &
  SdkStoreSignerInitialization & {
    provider: AbstractProvider;
    chainId: string;
    isTestnet: boolean;

    fheKeysInitialized: boolean;

    securityZones: number[];
    fheKeys: ChainRecord<SecurityZoneRecord<Uint8Array | undefined>>;
    crs: ChainRecord<Uint8Array | undefined>;

    coFheUrl: string | undefined;
  };

export const _sdkStore = createStore<SdkStore>(
  () =>
    ({
      fheKeysInitialized: false,

      securityZones: [0],
      fheKeys: {},
      crs: {},

      coFheUrl: undefined,

      providerInitialized: false,
      provider: undefined as never,
      chainId: undefined as never,
      isTestnet: false,

      signerInitialized: false,
      signer: undefined as never,
      account: undefined as never,
    }) as SdkStore,
);

// Store getters / setters

export const _store_isTestnet = () => {
  return _sdkStore.getState().isTestnet;
};

const _store_getFheKey = (chainId: string | undefined, securityZone = 0) => {
  if (chainId == null || securityZone == null) return undefined;
  return _sdkStore.getState().fheKeys[chainId]?.[securityZone];
};

export const _store_getConnectedChainFheKey = (securityZone = 0) => {
  const state = _sdkStore.getState();

  if (securityZone == null) return undefined;
  if (state.chainId == null) return undefined;

  return state.fheKeys[state.chainId]?.[securityZone];
};

export const _store_getCrs = (chainId: string | undefined) => {
  if (chainId == null) return undefined;
  return _sdkStore.getState().crs[chainId];
};

const getChainIdFromProvider = async (
  provider: AbstractProvider,
): Promise<string> => {
  const chainId = await provider.getChainId();
  if (chainId == null)
    throw new Error(
      "sdk :: getChainIdFromProvider :: provider.getChainId returned a null result, ensure that your provider is connected to a network",
    );
  return chainId;
};

// External functionality

export const _store_initialize = async (params: InitializationParams) => {
  const {
    provider,
    signer,
    securityZones = [0],
    coFheUrl = undefined,
    tfhePublicKeySerializer,
    compactPkeCrsSerializer,
  } = params;

  _sdkStore.setState({
    providerInitialized: false,
    signerInitialized: false,
    coFheUrl,
  });

  // PROVIDER

  // Fetch chain Id from provider
  const chainId = await getChainIdFromProvider(provider);
  const chainIdChanged =
    chainId != null && chainId !== _sdkStore.getState().chainId;
  if (chainId != null && provider != null) {
    _sdkStore.setState({ providerInitialized: true, provider, chainId });
  }

  // IS TESTNET
  const isTestnet = await checkIsTestnet(provider);
  _sdkStore.setState({ isTestnet });

  // SIGNER

  // Account is fetched and stored here, the `account` field in the store is used to index which permits belong to which users
  // In sdk functions, `state.account != null` is validated, this is a check to ensure that a valid signer has been provided
  //   which is necessary to interact with permits
  const account = await signer?.getAddress();
  if (account != null && signer != null) {
    _sdkStore.setState({ signerInitialized: true, account, signer });
  } else {
    _sdkStore.setState({
      signerInitialized: false,
      account: undefined,
      signer: undefined,
    });
  }

  // If chainId, securityZones, or CoFhe enabled changes, update the store and update fheKeys for re-initialization
  const securityZonesChanged =
    securityZones !== _sdkStore.getState().securityZones;
  if (chainIdChanged || securityZonesChanged) {
    _sdkStore.setState({
      securityZones,
      fheKeysInitialized: false,
    });
  }

  // Fetch FHE keys (skipped if hardhat)
  if (!isTestnet && !_sdkStore.getState().fheKeysInitialized) {
    await Promise.all(
      securityZones.map((securityZone) =>
        _store_fetchKeys(
          chainId,
          securityZone,
          tfhePublicKeySerializer,
          compactPkeCrsSerializer,
          true,
        ),
      ),
    );
  }

  _sdkStore.setState({ fheKeysInitialized: true });
};

/**
 * Retrieves the FHE public key from the provider.
 * If the key already exists in the store it is returned, else it is fetched, stored, and returned
 * @param {string} chainId - The chain to fetch the FHE key for, if no chainId provided, undefined is returned
 * @param securityZone - The security zone for which to retrieve the key (default 0).
 * @returns {Promise<TfheCompactPublicKey>} - The retrieved public key.
 */
export const _store_fetchKeys = async (
  chainId: string,
  securityZone: number = 0,
  tfhePublicKeySerializer: (buff: Uint8Array) => void,
  compactPkeCrsSerializer: (buff: Uint8Array) => void,
  forceFetch = false,
) => {
  const storedKey = _store_getFheKey(chainId, securityZone);
  if (storedKey != null && !forceFetch) return;

  const coFheUrl = _sdkStore.getState().coFheUrl;
  if (coFheUrl == null || typeof coFheUrl !== "string") {
    throw new Error(
      "Error initializing cofhejs; coFheUrl invalid, ensure it is set in `cofhejs.initialize`",
    );
  }

  let pk_data: string | undefined = undefined;
  let crs_data: string | undefined = undefined;

  // Fetch publicKey from CoFhe
  try {
    const pk_res = await fetch(`${coFheUrl}/GetNetworkPublicKey`, {
      method: "POST",
    });
    pk_data = (await pk_res.json()).public_key;

    const crs_res = await fetch(`${coFheUrl}/crs`, {
      method: "POST",
    });
    crs_data = (await crs_res.json()).crs;
  } catch (err) {
    throw new Error(
      `Error initializing cofhejs; fetching FHE publicKey and CRS from CoFHE failed with error ${err}`,
    );
  }

  if (pk_data == null || typeof pk_data !== "string") {
    throw new Error(
      `Error initializing cofhejs; FHE publicKey fetched from CoFHE invalid: missing or not a string`,
    );
  }

  if (pk_data === "0x") {
    throw new Error(
      "Error initializing cofhejs; provided chain is not FHE enabled, no FHE publicKey found",
    );
  }

  if (pk_data.length < PUBLIC_KEY_LENGTH_MIN) {
    throw new Error(
      `Error initializing cofhejs; got shorter than expected FHE publicKey: ${pk_data.length}. Expected length >= ${PUBLIC_KEY_LENGTH_MIN}`,
    );
  }

  if (crs_data == null || typeof crs_data !== "string") {
    throw new Error(
      `Error initializing cofhejs; CRS fetched from CoFHE invalid: missing or not a string`,
    );
  }

  const pk_buff = fromHexString(pk_data);
  const crs_buff = fromHexString(crs_data);

  try {
    tfhePublicKeySerializer(pk_buff);
  } catch (err) {
    throw new Error(`Error serializing public key ${err}`);
  }

  try {
    compactPkeCrsSerializer(crs_buff);
  } catch (err) {
    throw new Error(`Error serializing CRS ${err}`);
  }

  _sdkStore.setState(
    produce<SdkStore>((state) => {
      if (state.fheKeys[chainId] == null) state.fheKeys[chainId] = {};
      state.fheKeys[chainId][securityZone] = pk_buff;
      state.crs[chainId] = crs_buff;
    }),
  );
};
