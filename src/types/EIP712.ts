export type EIP712Type = { name: string; type: string };
export type EIP712Types = Record<string, EIP712Type[]>;
export type EIP712Message = Record<string, string>;
export type EIP712Domain = {
  chainId: bigint;
  name: string;
  verifyingContract: string;
  version: string;
};
export type SerializedEIP712Domain = Omit<EIP712Domain, "chainId"> & {
  chainId: string;
};

export type EIP712 = {
  domain: EIP712Domain;
  message: EIP712Message;
  primaryType: string;
  types: EIP712Types;
};
