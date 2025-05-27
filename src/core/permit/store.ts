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

let migrated = false;

const migrateLegacyStore = () => {
  if (migrated) return;
  migrated = true;

  const state = _permitStore.getState() as any;

  const firstVal = Object.values(state.permits)[0];
  const innerVal = firstVal && Object.values(firstVal)[0];

  if (innerVal && typeof innerVal === "object" && "name" in innerVal) {
    // old format detected
    const newPermits: Record<string, Record<string, Record<string, SerializedPermit | undefined>>> = {};
    const newActive: Record<string, Record<string, string | undefined>> = {};

    for (const [account, permits] of Object.entries(state.permits as Record<string, Record<string, SerializedPermit | undefined>>)) {
      for (const [hash, permit] of Object.entries(permits ?? {})) {
        if (!permit) continue;
        const chainId = String(permit._signedDomain?.chainId ?? "");
        if (!newPermits[chainId]) newPermits[chainId] = {};
        if (!newPermits[chainId][account]) newPermits[chainId][account] = {};
        newPermits[chainId][account][hash] = permit;
      }
    }

    for (const [account, hash] of Object.entries(state.activePermitHash as Record<string, string | undefined>)) {
      if (!hash) continue;
      const permit = state.permits?.[account]?.[hash];
      const chainId = permit ? String(permit._signedDomain?.chainId ?? "") : "";
      if (!chainId) continue;
      if (!newActive[chainId]) newActive[chainId] = {};
      newActive[chainId][account] = hash;
    }

    _permitStore.setState({ permits: newPermits, activePermitHash: newActive });
  }
};

export const getPermit = (
  chainId: string | undefined,
  account: string | undefined,
  hash: string | undefined,
): Permit | undefined => {
  migrateLegacyStore();
  if (chainId == null || account == null || hash == null) return;

  const savedPermit = _permitStore.getState().permits[chainId]?.[account]?.[hash];
  if (savedPermit == null) return;

  return Permit.deserialize(savedPermit);
};

export const getActivePermit = (
  chainId: string | undefined,
  account: string | undefined,
): Permit | undefined => {
  migrateLegacyStore();
  if (chainId == null || account == null) return;

  const activePermitHash = _permitStore.getState().activePermitHash[chainId]?.[
    account
  ];
  return getPermit(chainId, account, activePermitHash);
};

export const getPermits = (
  chainId: string | undefined,
  account: string | undefined,
): Record<string, Permit> => {
  migrateLegacyStore();
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
  migrateLegacyStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.permits[chainId] == null) state.permits[chainId] = {} as any;
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
) => {
  migrateLegacyStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.permits[chainId]?.[account])
        state.permits[chainId][account][hash] = undefined;
    }),
  );
};

// Active Permit Hash

export const getActivePermitHash = (
  chainId: string | undefined,
  account: string | undefined,
): string | undefined => {
  migrateLegacyStore();
  if (chainId == null || account == null) return undefined;
  return _permitStore.getState().activePermitHash[chainId]?.[account];
};

export const setActivePermitHash = (
  chainId: string,
  account: string,
  hash: string,
) => {
  migrateLegacyStore();
  _permitStore.setState(
    produce<PermitsStore>((state) => {
      if (state.activePermitHash[chainId] == null)
        state.activePermitHash[chainId] = {} as any;
      state.activePermitHash[chainId][account] = hash;
    }),
  );
};

export const removeActivePermitHash = (chainId: string, account: string) => {
  migrateLegacyStore();
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
