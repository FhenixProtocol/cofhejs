/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AbstractProvider,
  AbstractSigner,
  CofhejsError,
  CofhejsErrorCode,
  Environment,
  InitializationParams,
} from "../../types";
import { unwrapCallResult } from "../utils";

type InitializerReturn = Promise<{
  signer: AbstractSigner;
  provider: AbstractProvider;
}>;

// Shared initializers

export type ViemInitializerParams = Omit<
  InitializationParams,
  "tfhePublicKeySerializer" | "compactPkeCrsSerializer" | "provider" | "signer"
> & {
  ignoreErrors?: boolean;
  generatePermit?: boolean;
  environment?: Environment;
  viemClient: any; // Replace 'any' with the actual Viem client type
  viemWalletClient?: any; // Replace 'any' with the actual Viem wallet client type
};

/**
 * Initializes the SDK with a Viem client
 * @param params Initialization parameters with Viem-specific provider and signer
 * @returns Result of the initialization
 */
export async function getViemAbstractProviders(
  params: ViemInitializerParams,
): InitializerReturn {
  if (!params.viemClient) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InitViemFailed,
      message: `Viem client not provided.`,
    });
  }
  if (!params.viemWalletClient) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InitViemFailed,
      message: `Viem wallet client not provided.`,
    });
  }

  try {
    // Extract Viem-specific parameters
    const { viemClient, viemWalletClient } = params;

    const provider: AbstractProvider = {
      getChainId: async () => {
        return await viemClient.getChainId();
      },
      call: async (transaction: any) => {
        return unwrapCallResult(await viemClient.call({
          ...transaction,
        }));
      },
      send: async (method: string, params: any[]) => {
        return await viemClient.send(method, params);
      },
    };

    // Create signer adapter if wallet client is provided
    const signer: AbstractSigner = {
      getAddress: async (): Promise<string> => {
        return viemWalletClient
          .getAddresses()
          .then((addresses: string) => addresses[0]);
      },
      signTypedData: async (
        domain: any,
        types: any,
        value: any,
      ): Promise<string> => {
        return await viemWalletClient.signTypedData({
          domain,
          types,
          primaryType: Object.keys(types)[0], // Usually the primary type is the first key in types
          message: value,
        });
      },
      provider: provider,
      sendTransaction: async (tx: {
        to: string;
        data: string;
      }): Promise<string> => {
        return await viemWalletClient.sendTransaction(tx);
      },
      // Add other signer methods as needed
    };

    // Call the original initialize function with adapted parameters
    return {
      signer,
      provider,
    };
  } catch (error) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InitViemFailed,
      message: `Failed to initialize with Viem.`,
      cause: error instanceof Error ? error : undefined,
    });
  }
}

export type EthersInitializerParams = Omit<
  InitializationParams,
  "tfhePublicKeySerializer" | "compactPkeCrsSerializer" | "provider" | "signer"
> & {
  generatePermit?: boolean;
  ethersProvider: any; // Ethers provider (e.g., Web3Provider connected to window.ethereum)
  ethersSigner?: any; // Ethers signer (usually provider.getSigner())
  environment?: Environment;

};

/**
 * Initializes the SDK with ethers.js provider and signer
 * @param params Initialization parameters with ethers-specific provider and signer
 * @returns Result of the initialization
 */
export async function getEthersAbstractProviders(
  params: EthersInitializerParams,
): InitializerReturn {
  try {
    const { ethersProvider, ethersSigner } = params;

    const provider: AbstractProvider = {
      getChainId: async () => {
        return (await ethersProvider.getNetwork()).chainId.toString();
      },
      call: async (transaction: any) => {
        // Pass through to the original provider's call method
        return unwrapCallResult(await ethersProvider.call(transaction));
      },
      send: async (method: string, params: any[]) => {
        return await ethersProvider.send(method, params);
      },
    };

    const signer: AbstractSigner = {
      getAddress: async () => {
        return await ethersSigner.getAddress();
      },
      signTypedData: async (domain: any, types: any, value: any) => {
        // Ethers v5 uses _signTypedData
        if (typeof ethersSigner._signTypedData === "function") {
          return await ethersSigner._signTypedData(domain, types, value);
        }
        // Ethers v6 uses signTypedData
        else if (typeof ethersSigner.signTypedData === "function") {
          return await ethersSigner.signTypedData(domain, types, value);
        }
        // Fallback for other versions or implementations
        else {
          throw new Error(
            "Ethers signer does not support signTypedData or _signTypedData",
          );
        }
      },
      provider: provider,
      sendTransaction: async (tx: {
        to: string;
        data: string;
      }): Promise<string> => {
        return await ethersSigner.sendTransaction(tx);
      },
    };

    return {
      signer,
      provider,
    };
  } catch (error) {
    throw new CofhejsError({
      code: CofhejsErrorCode.InitEthersFailed,
      message: `Failed to initialize with ethers.`,
      cause: error instanceof Error ? error : undefined,
    });
  }
}
