import { Permission } from "../../types";
import { EIP712Message, EIP712Types } from "../../types/EIP712";
import { ZeroAddress } from "ethers";

const PermitSignatureAllFields = [
  { name: "issuer", type: "address" },
  { name: "expiration", type: "uint64" },
  { name: "recipient", type: "address" },
  { name: "validatorId", type: "uint256" },
  { name: "validatorContract", type: "address" },
  { name: "sealingKey", type: "bytes32" },
  { name: "issuerSignature", type: "bytes" },
] as const;
type PermitSignatureFieldOption =
  (typeof PermitSignatureAllFields)[number]["name"];

export const SignatureTypes = {
  PermissionedIssuerSelf: [
    "issuer",
    "expiration",
    "recipient",
    "validatorId",
    "validatorContract",
    "sealingKey",
  ] satisfies PermitSignatureFieldOption[],
  PermissionedIssuerShared: [
    "issuer",
    "expiration",
    "recipient",
    "validatorId",
    "validatorContract",
  ] satisfies PermitSignatureFieldOption[],
  PermissionedRecipient: [
    "sealingKey",
    "issuerSignature",
  ] satisfies PermitSignatureFieldOption[],
} as const;
export type PermitSignaturePrimaryType = keyof typeof SignatureTypes;

export const getSignatureTypesAndMessage = <
  T extends PermitSignatureFieldOption,
>(
  primaryType: PermitSignaturePrimaryType,
  fields: T[] | readonly T[],
  values: Pick<Permission, T> & Partial<Permission>,
): { types: EIP712Types; primaryType: string; message: EIP712Message } => {
  const types = {
    [primaryType]: PermitSignatureAllFields.filter((fieldType) =>
      fields.includes(fieldType.name as T),
    ),
  };

  const message: Record<T, string | string[] | number | number[]> =
    {} as Record<T, string | string[] | number | number[]>;
  fields.forEach((field) => {
    if (field in values) {
      message[field] = values[field];
    }
  });

  return { types, primaryType, message: message as EIP712Message };
};

export const getSignatureDomain = (chainId: string) => ({
  name: "Fhenix Permission 1.0.0",
  version: "1.0.0",
  chainId: parseInt(chainId),
  verifyingContract: ZeroAddress,
});
