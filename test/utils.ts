/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { JsonRpcProvider, AbiCoder, ethers } from "ethers";
import { AbstractProvider, AbstractSigner, Result } from "../src/types";
import { expect } from "vitest";

// Initialize genesis accounts
const mnemonics = [
  "grant rice replace explain federal release fix clever romance raise often wild taxi quarter soccer fiber love must tape steak together observe swap guitar", // account a
  "jelly shadow frog dirt dragon use armed praise universe win jungle close inmate rain oil canvas beauty pioneer chef soccer icon dizzy thunder meadow", // account b
  "chair love bleak wonder skirt permit say assist aunt credit roast size obtain minute throw sand usual age smart exact enough room shadow charge", // account c
];

// Anvil account 3 - address 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
export const BobWallet = new ethers.Wallet(
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
);

// Anvil account 4 - address 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
export const AdaWallet = new ethers.Wallet(
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
);

export const fromHexString = (hexString: string): Uint8Array => {
  const arr = hexString.replace(/^(0x)/, "").match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return Uint8Array.from(arr.map((byte) => parseInt(byte, 16)));
};

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForZkVerifierToStart(url: string) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log(`connecting to ${url}/GetNetworkPublicKey`);
      await fetch(`${url}/GetNetworkPublicKey`, {
        method: "POST",
      });
      console.log(`connected!`);
      return;
    } catch (e) {
      console.log(`client not ready`);
    }
    await sleep(500);
  }
}

export class MockSigner implements AbstractSigner {
  provider: MockProvider;

  constructor(provider: MockProvider) {
    this.provider = provider;
  }

  signTypedData = async (domain: any, types: any, value: any): Promise<any> => {
    return await this.provider.wallet.signTypedData(domain, types, value);
  };

  getAddress = async (): Promise<string> => {
    return this.provider.wallet.getAddress();
  };
}

export class MockProvider implements AbstractProvider {
  provider: ethers.JsonRpcProvider;
  publicKey: any;
  wallet: ethers.Wallet;
  chainId: bigint;

  constructor(
    pk: any,
    wallet?: ethers.Wallet,
    rpcUrl?: string,
    chainId?: bigint,
  ) {
    this.publicKey = pk;
    this.wallet = wallet ?? BobWallet;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = chainId ?? 1n;
  }

  async getChainId(): Promise<string> {
    return `${this.chainId}`;
  }

  async call(tx: { to: string; data: string }): Promise<string> {
    return await this.provider.call(tx);
  }

  async send(method: string, params: unknown[] | undefined): Promise<any> {
    if (method === "eth_chainId") {
      return this.chainId;
    }

    if (method === "eth_call") {
      const { to, data } = (params?.[0] ?? {
        to: "undefined",
        data: "undefined",
      }) as { to: string; data: string };
      return this.call({ to, data });
    }

    throw new Error(
      `MockProvider :: send :: Method not implemented: ${method}`,
    );
  }

  async getSigner(): Promise<MockSigner> {
    return new MockSigner(this);
  }
}

export const expectResultSuccess = <T>(result: Result<T>): T => {
  expect(result.error).toEqual(null);
  expect(result.data).not.toEqual(null);
  return result.data as T;
};

export const expectResultError = <T>(
  result: Result<T>,
  error: string,
): void => {
  expect(result.error).toEqual(error);
  expect(result.data).toEqual(null);
};
