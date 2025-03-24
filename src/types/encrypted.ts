import { FheTypes } from "./base";

export type EncryptedNumber = {
  data: Uint8Array;
  securityZone: number;
};

export type CoFheInItem = {
  ctHash: bigint;
  securityZone: number;
  utype: FheTypes;
  signature: string;
};
export type CoFheInBool = CoFheInItem & {
  utype: FheTypes.Bool;
};
export type CoFheInUint8 = CoFheInItem & {
  utype: FheTypes.Uint8;
};
export type CoFheInUint16 = CoFheInItem & {
  utype: FheTypes.Uint16;
};
export type CoFheInUint32 = CoFheInItem & {
  utype: FheTypes.Uint32;
};
export type CoFheInUint64 = CoFheInItem & {
  utype: FheTypes.Uint64;
};
export type CoFheInUint128 = CoFheInItem & {
  utype: FheTypes.Uint128;
};
export type CoFheInUint256 = CoFheInItem & {
  utype: FheTypes.Uint256;
};
export type CoFheInAddress = CoFheInItem & {
  utype: FheTypes.Uint160;
};
