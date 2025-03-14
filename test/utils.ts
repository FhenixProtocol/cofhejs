/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { JsonRpcProvider, AbiCoder, ethers } from "ethers";
import { AbstractProvider, AbstractSigner } from "../src/types";

// Initialize genesis accounts
const mnemonics = [
  "grant rice replace explain federal release fix clever romance raise often wild taxi quarter soccer fiber love must tape steak together observe swap guitar", // account a
  "jelly shadow frog dirt dragon use armed praise universe win jungle close inmate rain oil canvas beauty pioneer chef soccer icon dizzy thunder meadow", // account b
  "chair love bleak wonder skirt permit say assist aunt credit roast size obtain minute throw sand usual age smart exact enough room shadow charge", // account c
];

export const BobWallet = ethers.Wallet.fromPhrase(mnemonics[1]);
export const AdaWallet = ethers.Wallet.fromPhrase(mnemonics[2]);

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
      console.log(`connecting to ${url}/GetNetworkPublickKey`);
      await fetch(`${url}/GetNetworkPublickKey`, {
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
  wallet: ethers.HDNodeWallet;
  chainId: any;

  constructor(pk: any, wallet?: ethers.HDNodeWallet, chainId?: any) {
    this.publicKey = pk;
    this.wallet = wallet ?? ethers.Wallet.fromPhrase(mnemonics[0]);
    this.chainId = chainId || "0x10";

    this.provider = new ethers.JsonRpcProvider("http://localhost:42069");
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

export const uint8ArrayToString = (value: Uint8Array): string => {
  return Array.from(value)
    .map((byte) => String.fromCharCode(byte))
    .join("");
};
