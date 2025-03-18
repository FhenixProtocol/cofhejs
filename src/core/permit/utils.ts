import { EIP712Domain, SerializedEIP712Domain } from "../../types";

export const serializeEIP712Domain = (
  domain: EIP712Domain | undefined,
): SerializedEIP712Domain | undefined => {
  if (domain == null) return undefined;
  return {
    ...domain,
    chainId: domain.chainId.toString(),
  };
};

export const deserializeEIP712Domain = (
  domain: SerializedEIP712Domain | undefined,
): EIP712Domain | undefined => {
  if (domain == null) return undefined;
  return {
    ...domain,
    chainId: BigInt(domain.chainId),
  };
};
