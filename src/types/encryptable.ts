import { Primitive, LiteralToPrimitive } from "type-fest";
import { FheAllUTypes, FheTypes } from "./base";
import {
  CoFheInBool,
  CoFheInUint8,
  CoFheInUint16,
  CoFheInUint32,
  CoFheInUint64,
  CoFheInUint128,
  CoFheInUint256,
  CoFheInAddress,
} from "./encrypted";

export type EncryptableBool = {
  data: boolean;
  utype: FheTypes.Bool;
};
export type EncryptableUint8 = {
  data: string | bigint;
  utype: FheTypes.Uint8;
};
export type EncryptableUint16 = {
  data: string | bigint;
  utype: FheTypes.Uint16;
};
export type EncryptableUint32 = {
  data: string | bigint;
  utype: FheTypes.Uint32;
};
export type EncryptableUint64 = {
  data: string | bigint;
  utype: FheTypes.Uint64;
};
export type EncryptableUint128 = {
  data: string | bigint;
  utype: FheTypes.Uint128;
};
export type EncryptableUint256 = {
  data: string | bigint;
  utype: FheTypes.Uint256;
};
export type EncryptableAddress = {
  data: string | bigint;
  utype: FheTypes.Uint160;
};

export const Encryptable = {
  bool: (data: EncryptableBool["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Bool }) as EncryptableBool,
  address: (data: EncryptableAddress["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint160 }) as EncryptableAddress,
  uint8: (data: EncryptableUint8["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint8 }) as EncryptableUint8,
  uint16: (data: EncryptableUint16["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint16 }) as EncryptableUint16,
  uint32: (data: EncryptableUint32["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint32 }) as EncryptableUint32,
  uint64: (data: EncryptableUint64["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint64 }) as EncryptableUint64,
  uint128: (data: EncryptableUint128["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint128 }) as EncryptableUint128,
  uint256: (data: EncryptableUint256["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint256 }) as EncryptableUint256,
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
export type Encryptable_CoFheInItem_Map<E extends EncryptableItem> =
  E extends EncryptableBool
    ? CoFheInBool
    : E extends EncryptableUint8
      ? CoFheInUint8
      : E extends EncryptableUint16
        ? CoFheInUint16
        : E extends EncryptableUint32
          ? CoFheInUint32
          : E extends EncryptableUint64
            ? CoFheInUint64
            : E extends EncryptableUint128
              ? CoFheInUint128
              : E extends EncryptableUint256
                ? CoFheInUint256
                : E extends EncryptableAddress
                  ? CoFheInAddress
                  : never;

export type Encrypted_Inputs<T> = T extends Primitive
  ? LiteralToPrimitive<T>
  : T extends EncryptableItem
    ? Encryptable_CoFheInItem_Map<T>
    : {
        [K in keyof T]: Encrypted_Inputs<T[K]>;
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
