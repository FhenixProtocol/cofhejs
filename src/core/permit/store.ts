import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { produce } from "immer";
import { Permit } from "./permit";
import { SerializedPermit } from "../../types";

type AccountRecord<T> = Record<string, T>;
type HashRecord<T> = Record<string, T>;

type PermitsStore = {
  permits: AccountRecord<HashRecord<SerializedPermit | undefined>>;
  activePermitHash: AccountRecord<string | undefined>;
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

export const getPermit = (
  account: string | undefined,
  hash: string | undefined,
): Permit | undefined => {
  if (account == null || hash == null) return;

  const savedPermit = _permitStore.getState().permits[account]?.[hash];
  if (savedPermit == null) return;

  return Permit.deserialize(savedPermit);
};

export const getActivePermit = (
  account: string | undefined,
): Permit | undefined => {
  if (account == null) return;

  const activePermitHash = _permitStore.getState().activePermitHash[account];
  return getPermit(account, activePermitHash);
};

export const getPermits = (
  account: string | undefined,
): Record<string, Permit> => {
  if (account == null) return {};

  return Object.entries(_permitStore.getState().permits[account] ?? {}).reduce(
    (acc, [hash, permit]) => {
      if (permit == undefined) return acc;
      return { ...acc, [hash]: Permit.deserialize(permit) };
    },
    {} as Record<string, Permit>,
  );
};

export const setPermit = (account: string, permit: Permit) => {
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.permits[account] == null) state.permits[account] = {};
      state.permits[account][permit.getHash()] = permit.serialize();
    }),
  );
};

export const removePermit = (account: string, hash: string) => {
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      state.permits[account][hash] = undefined;
    }),
  );
};

// Active Permit Hash

export const getActivePermitHash = (
  account: string | undefined,
): string | undefined => {
  if (account == null) return undefined;
  return _permitStore.getState().activePermitHash[account];
};

export const setActivePermitHash = (account: string, hash: string) => {
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      state.activePermitHash[account] = hash;
    }),
  );
};

export const removeActivePermitHash = (account: string) => {
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      state.activePermitHash[account] = undefined;
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
