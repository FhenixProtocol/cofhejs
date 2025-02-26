import { FheTypes } from "tfhe";

export type EncryptedNumber = {
  data: Uint8Array;
  securityZone: number;
};

// TODO: Remove this after `encrypt` removed (in favor of zkpok)
// TODO: Migrate `encrypt` validations to Encryptables
export interface EncryptedBool extends EncryptedNumber {}
export interface EncryptedUint8 extends EncryptedNumber {}
export interface EncryptedUint16 extends EncryptedNumber {}
export interface EncryptedUint32 extends EncryptedNumber {}
export interface EncryptedUint64 extends EncryptedNumber {}
export interface EncryptedUint128 extends EncryptedNumber {}
export interface EncryptedUint256 extends EncryptedNumber {}
export interface EncryptedAddress extends EncryptedNumber {}

export type CoFheInItem = {
  securityZone: number;
  hash: bigint;
  signature: string;
  utype: FheTypes;
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
