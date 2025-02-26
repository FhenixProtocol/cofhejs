import { LiteralToPrimitive, Primitive } from "type-fest";
import { FheAllUTypes, FheUintUTypes } from "./base";
import { FheTypes } from "tfhe";

export type SealedBool = {
  data: string;
  utype: FheTypes.Bool;
};
export type SealedUint = {
  data: string;
  utype: (typeof FheUintUTypes)[number];
};
export type SealedAddress = {
  data: string;
  utype: FheTypes.Uint160;
};
export type SealedItem = SealedBool | SealedUint | SealedAddress;

export type UnsealedItemMap<S extends SealedItem> = S extends SealedBool
  ? boolean
  : S extends SealedUint
    ? bigint
    : S extends SealedAddress
      ? string
      : never;

export type MappedUnsealedTypes<T> = T extends Primitive
  ? LiteralToPrimitive<T>
  : T extends SealedItem
    ? UnsealedItemMap<T>
    : {
        [K in keyof T]: MappedUnsealedTypes<T[K]>;
      };

// Determine if `value` is an instance of a `sealedItem` { data: string, utype: 0-5 | 12 | 13 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAsSealedItem(value: any): SealedItem | undefined {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    FheAllUTypes.includes(parseInt(`${value[1]}`))
  )
    return {
      data: value[0],
      utype: value[1],
    };

  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.data === "string" &&
    FheAllUTypes.includes(value.utype)
  )
    return value as SealedItem;

  return undefined;
}

export function isSealedBool(value: SealedItem): boolean {
  return parseInt(`${value.utype}`) === FheTypes.Bool;
}

export function isSealedUint(value: SealedItem): boolean {
  return FheUintUTypes.includes(parseInt(`${value.utype}`));
}

export function isSealedAddress(value: SealedItem): boolean {
  return parseInt(`${value.utype}`) === FheTypes.Uint160;
}
