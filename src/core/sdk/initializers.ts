/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AbstractProvider,
  AbstractSigner,
  Environment,
  InitializationParams,
  Result,
  ResultErr,
  ResultOk,
} from "../../types";

type InitializerReturn = Promise<
  Result<{
    signer: AbstractSigner | undefined;
    provider: AbstractProvider | undefined;
  }>
>;

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
  try {
    // Extract Viem-specific parameters
    const { viemClient, viemWalletClient } = params;

    const provider = {
      getChainId: async () => {
        return await viemClient.getChainId();
      },
      call: async (transaction: any) => {
        return await viemClient.call({
          ...transaction,
        });
      },
      send: async (method: string, params: any[]) => {
        return await viemClient.send(method, params);
      },
    };

    // Create signer adapter if wallet client is provided
    const signer: AbstractSigner | undefined = viemWalletClient
      ? {
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
        }
      : undefined;

    // Call the original initialize function with adapted parameters
    return ResultOk({
      signer,
      provider,
    });
  } catch (error) {
    if (params.ignoreErrors) {
      console.warn("Error in initializeWithViem:", error);
      return ResultOk({
        signer: undefined,
        provider: undefined,
      });
    }
    return ResultErr(`Failed to initialize with Viem: ${error}`);
  }
}

export type EthersInitializerParams = Omit<
  InitializationParams,
  "tfhePublicKeySerializer" | "compactPkeCrsSerializer" | "provider" | "signer"
> & {
  ignoreErrors?: boolean;
  generatePermit?: boolean;
  ethersProvider: any; // Ethers provider (e.g., Web3Provider connected to window.ethereum)
  ethersSigner?: any; // Ethers signer (usually provider.getSigner())
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
        return await ethersProvider.call(transaction);
      },
      send: async (method: string, params: any[]) => {
        return await ethersProvider.send(method, params);
      },
    };

    const signer: AbstractSigner | undefined = ethersSigner
      ? {
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
        }
      : undefined;

    return ResultOk({
      signer,
      provider,
    });
  } catch (error) {
    if (params.ignoreErrors) {
      console.warn("Error in initializeWithEthers:", error);
      return ResultOk({
        signer: undefined,
        provider: undefined,
      });
    }
    return ResultErr(`Failed to initialize with ethers: ${error}`);
  }
}
