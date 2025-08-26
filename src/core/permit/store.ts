import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { produce } from "immer";
import { Permit } from "./permit";
import { SerializedPermit } from "../../types";

type ChainRecord<T> = Record<string, T>;
type AccountRecord<T> = Record<string, T>;
type HashRecord<T> = Record<string, T>;

type PermitsStore = {
  permits: ChainRecord<AccountRecord<HashRecord<SerializedPermit | undefined>>>;
  activePermitHash: ChainRecord<AccountRecord<string | undefined>>;
};

// Stores generated permits for each user, a hash indicating the active permit for each user, and a list of fheKeys as a cache
// Can be used to create reactive hooks
export const _permitStore = createStore<PermitsStore>()(
  persist(
    () => ({
      permits: {},
      activePermitHash: {},
    }),
    { name: "cofhejs-permits" },
  ),
);

// Permit

export const clearStaleStore = () => {
  // Any is used here because we do not have types of the previous store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = _permitStore.getState() as any;

  // Check if the store has the expected structure
  const hasExpectedStructure =
    state &&
    typeof state === "object" &&
    "permits" in state &&
    "activePermitHash" in state &&
    typeof state.permits === "object" &&
    typeof state.activePermitHash === "object";

  if (hasExpectedStructure) return;
  // Invalid structure detected - clear the store
  _permitStore.setState({ permits: {}, activePermitHash: {} });
};

export const getPermit = (
  chainId: string | undefined,
  account: string | undefined,
  hash: string | undefined,
): Permit | undefined => {
  clearStaleStore();
  if (chainId == null || account == null || hash == null) return;

  const savedPermit =
    _permitStore.getState().permits[chainId]?.[account]?.[hash];
  if (savedPermit == null) return;

  return Permit.deserialize(savedPermit);
};

export const getActivePermit = (
  chainId: string | undefined,
  account: string | undefined,
): Permit | undefined => {
  clearStaleStore();
  if (chainId == null || account == null) return;

  const activePermitHash =
    _permitStore.getState().activePermitHash[chainId]?.[account];
  return getPermit(chainId, account, activePermitHash);
};

export const getPermits = (
  chainId: string | undefined,
  account: string | undefined,
): Record<string, Permit> => {
  clearStaleStore();
  if (chainId == null || account == null) return {};

  return Object.entries(
    _permitStore.getState().permits[chainId]?.[account] ?? {},
  ).reduce(
    (acc, [hash, permit]) => {
      if (permit == undefined) return acc;
      return { ...acc, [hash]: Permit.deserialize(permit) };
    },
    {} as Record<string, Permit>,
  );
};

export const setPermit = (chainId: string, account: string, permit: Permit) => {
  clearStaleStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.permits[chainId] == null) state.permits[chainId] = {};
      if (state.permits[chainId][account] == null)
        state.permits[chainId][account] = {};
      state.permits[chainId][account][permit.getHash()] = permit.serialize();
    }),
  );
};

export const removePermit = (
  chainId: string,
  account: string,
  hash: string,
  force?: boolean,
) => {
  clearStaleStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.permits[chainId] == null) state.permits[chainId] = {};
      if (state.activePermitHash[chainId] == null)
        state.activePermitHash[chainId] = {};

      const accountPermits = state.permits[chainId][account];
      if (accountPermits == null) return;

      if (accountPermits[hash] == null) return;

      if (state.activePermitHash[chainId][account] === hash) {
        // Find other permits before removing
        const otherPermitHash = Object.keys(accountPermits).find(
          (key) => key !== hash && accountPermits[key] != null,
        );

        if (otherPermitHash) {
          state.activePermitHash[chainId][account] = otherPermitHash;
        } else {
          if (!force) {
            throw new Error("Cannot remove the last permit without force flag");
          }
        }
      }
      // Remove the permit
      accountPermits[hash] = undefined;
    }),
  );
};

// Active Permit Hash

export const getActivePermitHash = (
  chainId: string | undefined,
  account: string | undefined,
): string | undefined => {
  clearStaleStore();
  if (chainId == null || account == null) return undefined;
  return _permitStore.getState().activePermitHash[chainId]?.[account];
};

export const setActivePermitHash = (
  chainId: string,
  account: string,
  hash: string,
) => {
  clearStaleStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.activePermitHash[chainId] == null)
        state.activePermitHash[chainId] = {};
      state.activePermitHash[chainId][account] = hash;
    }),
  );
};

export const removeActivePermitHash = (chainId: string, account: string) => {
  clearStaleStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.activePermitHash[chainId])
        state.activePermitHash[chainId][account] = undefined;
    }),
  );
};

export const permitStore = {
  store: _permitStore,

  getPermit,
  getActivePermit,
  getPermits,
  setPermit,
  removePermit,

  getActivePermitHash,
  setActivePermitHash,
  removeActivePermitHash,
};
