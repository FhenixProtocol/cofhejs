import { UnsealedItem, FheTypes, FheUintUTypes } from "../../types";
import { uint160ToAddress } from "./utils";

export const isValidUtype = (utype: FheTypes): boolean => {
  return (
    utype === FheTypes.Bool ||
    utype === FheTypes.Uint160 ||
    utype == null ||
    FheUintUTypes.includes(utype as number)
  );
};

export const convertViaUtype = <U extends FheTypes>(
  utype: U,
  value: bigint,
): UnsealedItem<U> => {
  if (utype === FheTypes.Bool) {
    return !!value as UnsealedItem<U>;
  } else if (utype === FheTypes.Uint160) {
    return uint160ToAddress(value) as UnsealedItem<U>;
  } else if (utype == null || FheUintUTypes.includes(utype as number)) {
    return value as UnsealedItem<U>;
  } else {
    throw new Error(`convertViaUtype :: invalid utype :: ${utype}`);
  }
};
