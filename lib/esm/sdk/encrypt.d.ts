import { TfheCompactPublicKey } from "./fhe/fhe.js";
import { EncryptedNumber, EncryptedUint16, EncryptedUint32, EncryptedUint8, EncryptedBool, EncryptedUint64, EncryptedUint128, EncryptedUint256, EncryptedAddress, EncryptionTypes } from "../types";
/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {boolean} value - The Boolean value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedBool} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_bool: (value: boolean, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedBool;
/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {string | bigint} value - The Uint8 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint8} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint8: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint8;
/**
 * Encrypts a Uint16 value using TFHE.
 * @param {string | bigint} value - The Uint16 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint16} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint16: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint16;
/**
 * Encrypts a Uint32 value using TFHE.
 * @param {string | bigint} value - The Uint32 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint32} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint32: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint32;
/**
 * Encrypts a Uint64 value using TFHE.
 * @param {string | bigint} value - The Uint64 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint64} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint64: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint64;
/**
 * Encrypts a Uint128 value using TFHE.
 * @param {string | bigint} value - The Uint128 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint128} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint128: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint128;
/**
 * Encrypts a Uint256 value using TFHE.
 * @param {string | bigint} value - The Uint256 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint256} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_uint256: (value: string | bigint, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedUint256;
/**
 * Encrypts a Address value using TFHE.
 * @param {bigint} value - The Address (Uint160) value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the address on.
 * @returns {EncryptedAddress} - The encrypted value serialized as Uint8Array.
 */
export declare const encrypt_address: (value: bigint | string, publicKey: TfheCompactPublicKey, securityZone?: number) => EncryptedAddress;
/**
 * Encrypts a numeric value using TFHE according to the specified encryption type.
 * @param {bigint | string} value - The numeric value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param {EncryptionTypes} type - The encryption type (uint8, uint16, uint32).
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {Uint8Array} - The encrypted value serialized as Uint8Array.
 * @throws {Error} - Throws an error if an invalid type is specified.
 */
export declare const encrypt: (value: bigint | string, publicKey: TfheCompactPublicKey, type?: EncryptionTypes, securityZone?: number) => EncryptedNumber;
//# sourceMappingURL=encrypt.d.ts.map