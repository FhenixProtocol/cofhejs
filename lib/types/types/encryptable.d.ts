import { Primitive, LiteralToPrimitive } from "type-fest";
import { FheUType } from "./base";
import { PermissionV2 } from "./permit";
import { CoFheEncryptedBool, CoFheEncryptedUint8, CoFheEncryptedUint16, CoFheEncryptedUint32, CoFheEncryptedUint64, CoFheEncryptedUint128, CoFheEncryptedUint256, CoFheEncryptedAddress } from "./encrypted";
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
export declare const Encryptable: {
    readonly bool: (data: EncryptableBool["data"], securityZone?: number) => EncryptableBool;
    readonly uint8: (data: EncryptableUint8["data"], securityZone?: number) => EncryptableUint8;
    readonly uint16: (data: EncryptableUint16["data"], securityZone?: number) => EncryptableUint16;
    readonly uint32: (data: EncryptableUint32["data"], securityZone?: number) => EncryptableUint32;
    readonly uint64: (data: EncryptableUint64["data"], securityZone?: number) => EncryptableUint64;
    readonly uint128: (data: EncryptableUint128["data"], securityZone?: number) => EncryptableUint128;
    readonly uint256: (data: EncryptableUint256["data"], securityZone?: number) => EncryptableUint256;
    readonly address: (data: EncryptableAddress["data"], securityZone?: number) => EncryptableAddress;
};
export type EncryptableItem = EncryptableBool | EncryptableUint8 | EncryptableUint16 | EncryptableUint32 | EncryptableUint64 | EncryptableUint128 | EncryptableUint256 | EncryptableAddress;
export type CoFheEncryptedItemMap<E extends EncryptableItem> = E extends EncryptableBool ? CoFheEncryptedBool : E extends EncryptableUint8 ? CoFheEncryptedUint8 : E extends EncryptableUint16 ? CoFheEncryptedUint16 : E extends EncryptableUint32 ? CoFheEncryptedUint32 : E extends EncryptableUint64 ? CoFheEncryptedUint64 : E extends EncryptableUint128 ? CoFheEncryptedUint128 : E extends EncryptableUint256 ? CoFheEncryptedUint256 : E extends EncryptableAddress ? CoFheEncryptedAddress : never;
export type MappedCoFheEncryptedTypes<T> = T extends "permission" ? PermissionV2 : T extends Primitive ? LiteralToPrimitive<T> : T extends EncryptableItem ? CoFheEncryptedItemMap<T> : {
    [K in keyof T]: MappedCoFheEncryptedTypes<T[K]>;
};
export declare function isEncryptableItem(value: any): value is EncryptableItem;
//# sourceMappingURL=encryptable.d.ts.map