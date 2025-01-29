import { Primitive, LiteralToPrimitive } from "type-fest";
import { FheAllUTypes, FheUType } from "./base";
import { PermissionV2 } from "./permit";
import {
  CoFheEncryptedBool,
  CoFheEncryptedUint8,
  CoFheEncryptedUint16,
  CoFheEncryptedUint32,
  CoFheEncryptedUint64,
  CoFheEncryptedUint128,
  CoFheEncryptedUint256,
  CoFheEncryptedAddress,
} from "./encrypted";

export type EncryptableBool = {
  data: boolean;
  securityZone?: number;
  utype: FheUType.bool;
};
export type EncryptableUint8 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint8;
};
export type EncryptableUint16 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint16;
};
export type EncryptableUint32 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint32;
};
export type EncryptableUint64 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint64;
};
export type EncryptableUint128 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint128;
};
export type EncryptableUint256 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheUType.uint256;
};
export type EncryptableAddress = {
  data: string;
  securityZone?: number;
  utype: FheUType.address;
};

export const Encryptable = {
  bool: (data: EncryptableBool["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.bool }) as EncryptableBool,
  uint8: (data: EncryptableUint8["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint8 }) as EncryptableUint8,
  uint16: (data: EncryptableUint16["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint16 }) as EncryptableUint16,
  uint32: (data: EncryptableUint32["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint32 }) as EncryptableUint32,
  uint64: (data: EncryptableUint64["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint64 }) as EncryptableUint64,
  uint128: (data: EncryptableUint128["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint128 }) as EncryptableUint128,
  uint256: (data: EncryptableUint256["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.uint256 }) as EncryptableUint256,
  address: (data: EncryptableAddress["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheUType.address }) as EncryptableAddress,
} as const;

export type EncryptableItem =
  | EncryptableBool
  | EncryptableUint8
  | EncryptableUint16
  | EncryptableUint32
  | EncryptableUint64
  | EncryptableUint128
  | EncryptableUint256
  | EncryptableAddress;

// COFHE Encrypt
export type CoFheEncryptedItemMap<E extends EncryptableItem> =
  E extends EncryptableBool
    ? CoFheEncryptedBool
    : E extends EncryptableUint8
      ? CoFheEncryptedUint8
      : E extends EncryptableUint16
        ? CoFheEncryptedUint16
        : E extends EncryptableUint32
          ? CoFheEncryptedUint32
          : E extends EncryptableUint64
            ? CoFheEncryptedUint64
            : E extends EncryptableUint128
              ? CoFheEncryptedUint128
              : E extends EncryptableUint256
                ? CoFheEncryptedUint256
                : E extends EncryptableAddress
                  ? CoFheEncryptedAddress
                  : never;

export type MappedCoFheEncryptedTypes<T> = T extends "permission"
  ? PermissionV2
  : T extends Primitive
    ? LiteralToPrimitive<T>
    : T extends EncryptableItem
      ? CoFheEncryptedItemMap<T>
      : {
          [K in keyof T]: MappedCoFheEncryptedTypes<T[K]>;
        };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEncryptableItem(value: any): value is EncryptableItem {
  return (
    typeof value === "object" &&
    value !== null &&
    ["string", "number", "bigint", "boolean"].includes(typeof value.data) &&
    typeof value.securityZone === "number" &&
    FheAllUTypes.includes(value.utype)
  );
}
