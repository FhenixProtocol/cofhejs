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
import { persist, createJSONStorage } from "zustand/middleware";
import { get, set, del } from 'idb-keyval'; // You'll need to install this package

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

export type KeysStore = {
  fhe: ChainRecord<SecurityZoneRecord<Uint8Array | undefined>>;
  crs: ChainRecord<Uint8Array | undefined>;
};

export const _keysStore = createStore<KeysStore>()(
  persist(
    () => ({
      fhe: {},
      crs: {},
    }),
    { 
      name: "cofhejs-keys",
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          return (await get(name)) || null;
        },
        setItem: async (name, value) => {
          await set(name, value);
        },
        removeItem: async (name) => {
          await del(name);
        },
      })),
    },
  ),
);

export type SdkStore = SdkStoreProviderInitialization &
  SdkStoreSignerInitialization & {
    provider: AbstractProvider;
    chainId: string;
    isTestnet: boolean;

    fheKeysInitialized: boolean;

    securityZones: number[];

    coFheUrl: string | undefined;
    verifierUrl: string | undefined;
    thresholdNetworkUrl: string | undefined;
    rpcUrl: string | undefined;
  };

export const _sdkStore = createStore<SdkStore>(
  () =>
    ({
      fheKeysInitialized: false,

      securityZones: [0],

      coFheUrl: undefined,
      verifierUrl: undefined,
      thresholdNetworkUrl: undefined,
      rpcUrl: undefined,
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
  return _keysStore.getState().fhe[chainId]?.[securityZone];
};

export const _store_getConnectedChainFheKey = (securityZone = 0) => {
  const state = _sdkStore.getState();

  if (securityZone == null) return undefined;
  if (state.chainId == null) return undefined;

  return _keysStore.getState().fhe[state.chainId]?.[securityZone];
};

export const _store_getCrs = (chainId: string | undefined) => {
  if (chainId == null) return undefined;
  return _keysStore.getState().crs[chainId];
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
    tfhePublicKeySerializer,
    compactPkeCrsSerializer,
    coFheUrl,
    verifierUrl,
    rpcUrl,
    thresholdNetworkUrl,
  } = params;

  _sdkStore.setState({
    providerInitialized: false,
    signerInitialized: false,
    coFheUrl,
    verifierUrl,
    rpcUrl,
    thresholdNetworkUrl,
  });

  // PROVIDER

  // Fetch chain Id from provider
  const chainId = await getChainIdFromProvider(provider);
  const chainIdChanged =
    chainId != null && chainId !== _sdkStore.getState().chainId;
  if (chainId != null && provider != null) {
    _sdkStore.setState({ providerInitialized: true, provider, chainId });
  }

  // TEMP: Extract out

  // Verify signer address is registered with verifier
  if (verifierUrl != null) {
    try {
      const response = await fetch(`${verifierUrl}/signerAddress`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.warn(`Failed to verify signer address with verifier: ${err}`);
      throw err;
    }
  }

  // END TEMP

  // IS TESTNET
  const isTestnet = await checkIsTestnet(provider);
  console.log("isTestnet", isTestnet);
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
  console.log("fetching pk from cofhe", `${coFheUrl}/GetNetworkPublicKey`);
  try {
    const pk_res = await fetch(`${coFheUrl}/GetNetworkPublicKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ securityZone }),
    });
    pk_data = (await pk_res.json()).publicKey;
  } catch (err) {
    throw new Error(
      `Error initializing cofhejs; fetching FHE publicKey from CoFHE failed with error ${err}`,
    );
  }

  try {
    const crs_res = await fetch(`${coFheUrl}/GetCrs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ securityZone }),
    });
    crs_data = (await crs_res.json()).crs;
  } catch (err) {
    throw new Error(
      `Error initializing cofhejs; fetching CRS from CoFHE failed with error ${err}`,
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

  _keysStore.setState(
    produce<KeysStore>((state) => {
      if (state.fhe[chainId] == null) state.fhe[chainId] = {};
      state.fhe[chainId][securityZone] = pk_buff;
      state.crs[chainId] = crs_buff;
    }),
  );
};
