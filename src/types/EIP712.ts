export type EIP712Type = { name: string; type: string };
export type EIP712Types = Record<string, EIP712Type[]>;
export type EIP712Message = Record<string, string>;
export type EIP712Domain = {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
};
export type EIP712 = {
  domain: EIP712Domain;
  message: EIP712Message;
  primaryType: string;
  types: EIP712Types;
};

export interface SerializedEIP712Domain {
  name: string;
  version: string;
  chainId: string; // Note: serialized as string
  verifyingContract: string;
}
