export interface AbstractProvider {
  getChainId(): Promise<string>;
  call(tx: { to: string; data: string }): Promise<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(method: string, params: any[]): Promise<any>;
}

export interface AbstractSigner {
  getAddress(): Promise<string>;
  signTypedData(
    domain: object,
    types: Record<string, Array<object>>,
    value: object,
  ): Promise<string>;
  provider: AbstractProvider;
  sendTransaction(tx: { to: string; data: string }): Promise<string>;
}

export type Environment = "MOCK" | "LOCAL" | "TESTNET" | "MAINNET";

export type InitializationParams = {
  provider: AbstractProvider;
  signer?: AbstractSigner;
  securityZones?: number[];
  coFheUrl?: string;
  verifierUrl?: string;
  thresholdNetworkUrl?: string;
  tfhePublicKeySerializer: (buff: Uint8Array) => void;
  compactPkeCrsSerializer: (buff: Uint8Array) => void;
  zkvSigner?: AbstractSigner;
};
