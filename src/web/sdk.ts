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
import { applyEnvironmentDefaults } from "../utils/environment";
import { Environment } from "../types";

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
): Promise<Result<Permit | undefined>> => {
  // Apply environment-specific defaults if environment is provided
  const processedParams = applyEnvironmentDefaults(params);

  // Initialize the fhevm
  await initTfhe().catch((err: unknown) => {
    if (processedParams.ignoreErrors) {
      return undefined;
    } else {
      return ResultErr(
        `initialize :: failed to initialize cofhejs - is the network FHE-enabled? ${err}`,
      );
    }
  });

  // Make sure we're passing all required properties to initializeCore
  if (!processedParams.provider) {
    return ResultErr("initialize :: provider is required");
  }

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
      ctHash: BigInt(ct_hash),
      securityZone,
      utype: encryptableItems[index].utype,
      signature,
    }),
  );

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

  //unsealCiphertext,
  unseal,
};

/**
 * Initializes the SDK with a Viem client for web environments
 * @param params Initialization parameters with Viem-specific provider and signer
 * @returns Result of the initialization
 */
export async function initializeWithViem(
  params: Omit<
    InitializationParams,
    "tfhePublicKeySerializer" | "compactPkeCrsSerializer" | "provider" | "signer"
  > & {
    ignoreErrors?: boolean;
    generatePermit?: boolean;
    viemClient: any; // Viem public client
    viemWalletClient?: any; // Viem wallet client (connected to browser extension)
  }
): Promise<Result<Permit | undefined>> {
  try {
    // Extract Viem-specific parameters
    const { viemClient, viemWalletClient, ...restParams } = params;
    
    const provider = {
      getChainId: async () => {
        return await viemClient.getChainId();
      },
      call: async (transaction: any) => {
        return await viemClient.call({
            ...transaction
        });
      }
    };
    
    // Create signer adapter if wallet client is provided
    const signer = viemWalletClient ? {
      getAddress: async () : Promise<string> => {
        // For browser wallets, we might need to request accounts first
        const addresses = await viemWalletClient.getAddresses();
        return addresses[0];
      },
      signTypedData: async (domain: any, types: any, value: any) : Promise<string> => {
        return await viemWalletClient.signTypedData({
            domain,
            types,
            primaryType: Object.keys(types)[0],
            message: value
        });
      },
      signMessage: async (message: string) => {
        return viemWalletClient.signMessage({ message });
      },
      provider: provider,
    } : undefined;
    
    // Call the original initialize function with adapted parameters
    return initialize({
      ...restParams,
      provider,
      signer,
    });
  } catch (error) {
    if (params.ignoreErrors) {
      console.warn("Error in initializeWithViem:", error);
      return ResultOk(undefined);
    }
    return ResultErr(`Failed to initialize with Viem: ${error}`);
  }
}

/**
 * Initializes the SDK with ethers.js provider and signer for web environments
 * @param params Initialization parameters with ethers-specific provider and signer
 * @returns Result of the initialization
 */
export async function initializeWithEthers(
  params: Omit<
    InitializationParams,
    "tfhePublicKeySerializer" | "compactPkeCrsSerializer" | "provider" | "signer"
  > & {
    ignoreErrors?: boolean;
    generatePermit?: boolean;
    ethersProvider: any; // Ethers provider (e.g., Web3Provider connected to window.ethereum)
    ethersSigner?: any; // Ethers signer (usually provider.getSigner())
  }
): Promise<Result<Permit | undefined>> {
  try {
    const { ethersProvider, ethersSigner, ...restParams } = params;
    
    const provider = {
      getChainId: async () => {
        return (await ethersProvider.getNetwork()).chainId.toString();
      },
      call: async (transaction: any) => {
        return await ethersProvider.call(transaction);
      }
    };

    // For web environments, we might need to request access to the wallet
    let signer = ethersSigner;
    
    // If no signer provided but we have a provider that can get a signer 
    if (!signer && ethersProvider.getSigner) {
      try {
        // This might trigger a wallet connection prompt in the browser
        signer = ethersProvider.getSigner();
      } catch (e) {
        console.warn("Failed to get signer from provider:", e);
      }
    }

    const signerAdapter = signer ? {
      getAddress: async () => {
        return await signer.getAddress();
      },
      signTypedData: async (domain: any, types: any, value: any) => {
        // Ethers v5 uses _signTypedData
        if (typeof signer._signTypedData === 'function') {
          return await signer._signTypedData(domain, types, value);
        }
        // Ethers v6 uses signTypedData
        else if (typeof signer.signTypedData === 'function') {
          return await signer.signTypedData(domain, types, value);
        }
        // Fallback for other versions or implementations
        else {
          throw new Error('Ethers signer does not support signTypedData or _signTypedData');
        }
      },
      provider: provider,
    } : undefined;

    return initialize({
      ...restParams,
      provider,
      signer: signerAdapter,
    });
  } catch (error) {
    if (params.ignoreErrors) {
      console.warn("Error in initializeWithEthers:", error);
      return ResultOk(undefined);
    }
    return ResultErr(`Failed to initialize with ethers: ${error}`);
  }
}
