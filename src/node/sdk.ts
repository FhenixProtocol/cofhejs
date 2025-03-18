/* eslint-disable @typescript-eslint/no-explicit-any */
import { CompactPkeCrs, TfheCompactPublicKey } from "node-tfhe";
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
} from "../core/sdk";
import { Permit } from "../core/permit";
import { _sdkStore } from "../core/sdk/store";
import {
  CoFheInItem,
  Encrypted_Inputs,
  EncryptStep,
  InitializationParams,
  Result,
  ResultErr,
  ResultOk,
} from "../types";
import { initTfhe } from "./init";
import { zkPack, zkProve, zkVerify } from "./zkPoK";
import { mockEncrypt } from "../core/sdk/testnet";

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
  },
): Promise<Result<Permit | undefined>> => {
  // Initialize the fhevm
  await initTfhe().catch((err: unknown) => {
    if (params.ignoreErrors) {
      return undefined;
    } else {
      return ResultErr(
        `initialize :: failed to initialize cofhejs - is the network FHE-enabled? ${err}`,
      );
    }
  });

  return initializeCore({
    ...params,
    tfhePublicKeySerializer: (buff: Uint8Array) => {
      return TfheCompactPublicKey.deserialize(buff);
    },
    compactPkeCrsSerializer: (buff: Uint8Array) => {
      return CompactPkeCrs.deserialize(buff);
    },
  });
};

async function encrypt<T extends any[]>(
  setState: (state: EncryptStep) => void,
  item: [...T],
  securityZone = 0,
): Promise<Result<[...Encrypted_Inputs<T>]>> {
  const state = _sdkStore.getState();
  if (state.isTestnet) {
    return mockEncrypt(setState, item, securityZone);
  }

  setState(EncryptStep.Extract);

  const keysResult = encryptGetKeys();

  if (!keysResult.success) return ResultErr(`encrypt :: ${keysResult.error}`);
  const { fhePublicKey, crs, verifierUrl, account, chainId } = keysResult.data;

  const encryptableItems = encryptExtract(item);

  console.log("encryptableItems", encryptableItems);

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

  const zkVerifyRes = await zkVerify(
    verifierUrl,
    proved,
    account,
    securityZone,
    chainId,
  );

  if (!zkVerifyRes.success)
    return ResultErr(
      `encrypt :: ZK proof verification failed - ${zkVerifyRes.error}`,
    );

  const inItems: CoFheInItem[] = zkVerifyRes.data.map(
    ({ ct_hash, signature }, index) => ({
      hash: BigInt(ct_hash),
      securityZone,
      utype: encryptableItems[index].utype,
      signature,
    }),
  );

  console.log("inItems", inItems);

  setState(EncryptStep.Replace);

  const [preparedInputItems, remainingInItems] = encryptReplace(item, inItems);

  if (remainingInItems.length !== 0)
    return ResultErr(
      "encrypt :: some encrypted inputs remaining after replacement",
    );

  setState(EncryptStep.Done);

  return ResultOk(preparedInputItems);
}

export const cofhejs = {
  store: _sdkStore,
  initialize,

  createPermit,
  importPermit,
  selectActivePermit,
  getPermit,
  getPermission,
  getAllPermits,

  encrypt,

  unseal,
};
