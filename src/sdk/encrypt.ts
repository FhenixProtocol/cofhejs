import {
  TfheCompactPublicKey,
  CompactFheBool,
  CompactFheUint8,
  CompactFheUint16,
  CompactFheUint32,
  CompactFheUint64,
  CompactFheUint128,
  CompactFheUint160,
  CompactFheUint256,
} from "./fhe/fhe.js";
import {
  EncryptedNumber,
  EncryptedUint16,
  EncryptedUint32,
  EncryptedUint8,
  EncryptedBool,
  EncryptedUint64,
  EncryptedUint128,
  EncryptedUint256,
  EncryptedAddress,
  EncryptionTypes,
} from "../types";
import {
  fromHexString,
  toBigInt,
  toBigIntOrThrow,
  validateBigIntInRange,
} from "./utils.js";
import {
  MAX_UINT8,
  MAX_UINT16,
  MAX_UINT32,
  MAX_UINT64,
  MAX_UINT128,
  MAX_UINT256,
} from "./consts.js";

/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {boolean} value - The Boolean value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedBool} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_bool = (
  value: boolean,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedBool => {
  const encrypted = CompactFheBool.encrypt_with_compact_public_key(
    value,
    publicKey,
  );
  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {string | bigint} value - The Uint8 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint8} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint8 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint8 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT8);

  const encrypted = CompactFheUint8.encrypt_with_compact_public_key(
    parseInt(bint.toString()),
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint16 value using TFHE.
 * @param {string | bigint} value - The Uint16 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint16} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint16 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint16 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT16);

  const encrypted = CompactFheUint16.encrypt_with_compact_public_key(
    parseInt(bint.toString()),
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint32 value using TFHE.
 * @param {string | bigint} value - The Uint32 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint32} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint32 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint32 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT32);

  const encrypted = CompactFheUint32.encrypt_with_compact_public_key(
    parseInt(bint.toString()),
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint64 value using TFHE.
 * @param {string | bigint} value - The Uint64 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint64} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint64 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint64 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT64);

  const encrypted = CompactFheUint64.encrypt_with_compact_public_key(
    bint,
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint128 value using TFHE.
 * @param {string | bigint} value - The Uint128 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint128} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint128 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint128 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT128);

  const encrypted = CompactFheUint128.encrypt_with_compact_public_key(
    bint,
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};

/**
 * Encrypts a Uint256 value using TFHE.
 * @param {string | bigint} value - The Uint256 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint256} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_uint256 = (
  value: string | bigint,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedUint256 => {
  const bint = toBigIntOrThrow(value);
  validateBigIntInRange(bint, MAX_UINT256);

  const encrypted = CompactFheUint256.encrypt_with_compact_public_key(
    bint,
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};
/**
 * Encrypts a Address value using TFHE.
 * @param {bigint} value - The Address (Uint160) value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the address on.
 * @returns {EncryptedAddress} - The encrypted value serialized as Uint8Array.
 */
export const encrypt_address = (
  value: bigint | string,
  publicKey: TfheCompactPublicKey,
  securityZone: number = 0,
): EncryptedAddress => {
  if (typeof value === "string") {
    value = toBigInt(fromHexString(value));
  } else {
    value = value as bigint;
  }

  const encrypted = CompactFheUint160.encrypt_with_compact_public_key(
    value,
    publicKey,
  );

  return {
    data: encrypted.serialize(),
    securityZone,
  };
};
/**
 * Encrypts a numeric value using TFHE according to the specified encryption type.
 * @param {bigint | string} value - The numeric value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param {EncryptionTypes} type - The encryption type (uint8, uint16, uint32).
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {Uint8Array} - The encrypted value serialized as Uint8Array.
 * @throws {Error} - Throws an error if an invalid type is specified.
 */
export const encrypt = (
  value: bigint | string,
  publicKey: TfheCompactPublicKey,
  type: EncryptionTypes = EncryptionTypes.uint8,
  securityZone: number = 0,
): EncryptedNumber => {
  switch (type) {
    case EncryptionTypes.bool:
      return encrypt_bool(!!value, publicKey, securityZone);
    case EncryptionTypes.uint8:
      return encrypt_uint8(value, publicKey, securityZone);
    case EncryptionTypes.uint16:
      return encrypt_uint16(value, publicKey, securityZone);
    case EncryptionTypes.uint32:
      return encrypt_uint32(value, publicKey, securityZone);
    case EncryptionTypes.uint64:
      return encrypt_uint64(value, publicKey, securityZone);
    case EncryptionTypes.uint128:
      return encrypt_uint128(value, publicKey, securityZone);
    case EncryptionTypes.uint256:
      return encrypt_uint256(value, publicKey, securityZone);
    case EncryptionTypes.address:
      return encrypt_address(value, publicKey, securityZone);
    default:
      throw new Error("Invalid type");
  }
};
