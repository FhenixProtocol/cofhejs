import { FheTypes, FheUintUTypes } from "./base";

export type UintFheTypes = (typeof FheUintUTypes)[number];
export type UnsealedItem<U extends FheTypes> = U extends FheTypes.Bool
  ? boolean
  : U extends FheTypes.Uint160
    ? string
    : U extends UintFheTypes
      ? bigint
      : never;
