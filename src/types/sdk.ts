export interface AbstractProvider {
  getChainId?(): Promise<string>;
  getNetwork?(): Promise<{ chainId: string | number } | string | number>;
  call(tx: { to: string; data: string }): Promise<string>;
  request?(args: { method: string; params?: any[] }): Promise<any>;
}

export interface AbstractSigner {
  getAddress(): Promise<string>;
  signTypedData(
    domain: object,
    types: Record<string, Array<object>>,
    value: object,
  ): Promise<string>;
}

export type InitializationParams = {
  provider: AbstractProvider;
  signer?: AbstractSigner;
  securityZones?: number[];
  coFheUrl?: string;
  tfhePublicKeySerializer: (buff: Uint8Array) => void;
  compactPkeCrsSerializer: (buff: Uint8Array) => void;
};
