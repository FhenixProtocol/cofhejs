/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from "ethers";
import {
  AbstractProvider,
  AbstractSigner,
  Result,
  CofhejsError,
  CofhejsErrorCode,
} from "../src/types";
import { expect, vi } from "vitest";
import {
  TaskManagerAddress,
  MockZkVerifierAddress,
  MockQueryDecrypterAddress,
  mockZkVerifierIface,
  mockQueryDecrypterAbi,
  fnAclIface,
  fnEip712DomainIface,
  fnExistsIface,
} from "../src/core/utils/consts";

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

export function setupMockFetch() {
  global.fetch = vi.fn().mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/GetNetworkPublicKey')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ publicKey: '0x' + '11'.repeat(8000) }),
        } as Response);
      }
      if (url.includes('/GetCrs')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ crs: '0x' + '22'.repeat(50) }),
        } as Response);
      }
      if (url.includes('/signerAddress')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      }
      if (url.includes('/verify')) {
        const body = init?.body ? JSON.parse(init.body as string) : { values: [] };
        const values: unknown[] = body.values ?? [];
        const data = values.map(() => ({
          ct_hash: '1',
          signature: '0x' + 'aa'.repeat(64),
          recid: 0,
        }));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data, error: '' }),
        } as Response);
      }
      if (url.includes('/sealoutput')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ sealed: 1n, signature: '0x', encryption_type: 0 }),
        } as Response);
      }
      if (url.includes('/decrypt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ decrypted: '0x' + '01'.repeat(64) }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    },
  );
}

export class MockSigner implements AbstractSigner {
  provider: MockProvider;

  constructor(provider: MockProvider) {
    this.provider = provider;
  }

  signTypedData = async (domain: any, types: any, value: any): Promise<any> => {
    return await this.provider.wallet.signTypedData(domain, types, value);
  };

  sendTransaction = async (tx: {
    to: string;
    data: string;
  }): Promise<string> => {
    // Return a mock transaction hash without sending to a real network
    console.log("sendTransaction tx", tx);
    return "0xmocktx";
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
    const network = {
      name: "mock",
      chainId: Number(chainId ?? 1n),
    };
    this.provider = new ethers.JsonRpcProvider(rpcUrl, network);
    this.wallet = (wallet ?? BobWallet).connect(this.provider);
    this.chainId = chainId ?? 1n;
  }

  async getChainId(): Promise<string> {
    return `${this.chainId}`;
  }

  async call(tx: { to: string; data: string }): Promise<string> {
    const to = tx.to.toLowerCase();
    const data = tx.data.toLowerCase();

    try {
      // Handle acl() call on TaskManager
      const aclIface = new ethers.Interface(fnAclIface);
      const aclCall = aclIface.encodeFunctionData("acl");
      if (to === TaskManagerAddress.toLowerCase() && data === aclCall.toLowerCase()) {
        return aclIface.encodeFunctionResult("acl", ["0xa6Ea4b5291d044D93b73b3CFf3109A1128663E8B"]);
      }

      // Handle eip712Domain() call on ACL contract
      const domainIface = new ethers.Interface(fnEip712DomainIface);
      const domainCall = domainIface.encodeFunctionData("eip712Domain");
      if (to === "0xa6ea4b5291d044d93b73b3cff3109a1128663e8b" && data === domainCall.toLowerCase()) {
        return domainIface.encodeFunctionResult("eip712Domain", [
          "0x01",
          "ACL",
          "1",
          this.chainId,
          "0xa6Ea4b5291d044D93b73b3CFf3109A1128663E8B",
          "0x" + "00".repeat(32),
          [],
        ]);
      }

      // Handle exists() calls for mock contracts
      const existsIface = new ethers.Interface(fnExistsIface);
      const existsCall = existsIface.encodeFunctionData("exists");
      if (
        (to === MockZkVerifierAddress.toLowerCase() || to === MockQueryDecrypterAddress.toLowerCase()) &&
        data === existsCall.toLowerCase()
      ) {
        return existsIface.encodeFunctionResult("exists", [true]);
      }

      // Handle zkVerifyCalcCtHashesPacked on MockZkVerifier
      const zkVerifierIface = new ethers.Interface(mockZkVerifierIface);
      if (to === MockZkVerifierAddress.toLowerCase()) {
        try {
          const txParsed = zkVerifierIface.parseTransaction({ data });
          if (txParsed?.name === "zkVerifyCalcCtHashesPacked") {
            const values = txParsed.args[0] as bigint[];
            const ctHashes = values.map((_, i) => BigInt(i + 1));
            return zkVerifierIface.encodeFunctionResult(
              "zkVerifyCalcCtHashesPacked",
              [ctHashes],
            );
          }
        } catch {}
      }

      // Handle querySealOutput/queryDecrypt on MockQueryDecrypter
      const queryDecrypterIface = new ethers.Interface(mockQueryDecrypterAbi);
      if (to === MockQueryDecrypterAddress.toLowerCase()) {
        try {
          const txParsed = queryDecrypterIface.parseTransaction({ data });
          if (txParsed?.name === "querySealOutput") {
            const [ctHash, _utype, permission] = txParsed.args as [bigint, number, any];
            const result = (BigInt(ctHash) ^ BigInt(permission.sealingKey)).toString();
            return queryDecrypterIface.encodeFunctionResult("querySealOutput", [true, "", result]);
          }
          if (txParsed?.name === "queryDecrypt") {
            const [ctHash, _utype, permission] = txParsed.args as [bigint, number, any];
            const result = (BigInt(ctHash) ^ BigInt(permission.sealingKey)).toString();
            return queryDecrypterIface.encodeFunctionResult("queryDecrypt", [{ allowed: true, error: "", result }]);
          }
        } catch {}
      }
    } catch (e) {
      // Fall back to provider call if any encoding fails
    }

    return await this.provider.call(tx);
  }

  async send(method: string, params: unknown[] | undefined): Promise<any> {
    try {
      return await this.provider.send(method, params ?? []);
    } catch (e) {
      // Return empty result when provider is not connected
      return null;
    }
    // if (method === "eth_chainId") {
    //   return this.chainId;
    // }

    // if (method === "eth_call") {
    //   const { to, data } = (params?.[0] ?? {
    //     to: "undefined",
    //     data: "undefined",
    //   }) as { to: string; data: string };
    //   return this.call({ to, data });
    // }

    // throw new Error(
    //   `MockProvider :: send :: Method not implemented: ${method}`,
    // );
  }

  async getSigner(): Promise<MockSigner> {
    return new MockSigner(this);
  }
}

export const expectResultSuccess = <T>(result: Result<T>): T => {
  expect(result.error).toBe(null);
  expect(result.success).toBe(true);
  expect(result.data).not.toBe(null);
  return result.data as T;
};

export const expectResultError = <T>(
  result: Result<T>,
  errorCode?: CofhejsErrorCode,
  errorMessage?: string,
): void => {
  expect(result.success).toBe(false);
  expect(result.data).toBe(null);
  expect(result.error).not.toBe(null);
  const error = result.error as CofhejsError;
  expect(error).toBeInstanceOf(CofhejsError);
  if (errorCode) {
    expect(error.code).toBe(errorCode);
  }
  if (errorMessage) {
    expect(error.message).toBe(errorMessage);
  }
};

export const expectResultErrorCode = <T>(
  result: Result<T>,
  errorCode: CofhejsErrorCode,
): void => {
  expectResultError(result, errorCode);
};

export const expectResultErrorMessage = <T>(
  result: Result<T>,
  errorMessage: string,
): void => {
  expect(result.success).toBe(false);
  expect(result.data).toBe(null);
  expect(result.error).not.toBe(null);
  const error = result.error as CofhejsError;
  expect(error).toBeInstanceOf(CofhejsError);
  expect(error.message).toBe(errorMessage);
};
