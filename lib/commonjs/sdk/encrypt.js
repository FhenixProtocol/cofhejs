"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = exports.encrypt_address = exports.encrypt_uint256 = exports.encrypt_uint128 = exports.encrypt_uint64 = exports.encrypt_uint32 = exports.encrypt_uint16 = exports.encrypt_uint8 = exports.encrypt_bool = void 0;
const fhe_js_1 = require("./fhe/fhe.js");
const types_1 = require("../types");
const utils_js_1 = require("./utils.js");
const consts_js_1 = require("./consts.js");
/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {boolean} value - The Boolean value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedBool} - The encrypted value serialized as Uint8Array.
 */
const encrypt_bool = (value, publicKey, securityZone = 0) => {
    const encrypted = fhe_js_1.CompactFheBool.encrypt_with_compact_public_key(value, publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_bool = encrypt_bool;
/**
 * Encrypts a Uint8 value using TFHE (Fast Fully Homomorphic Encryption over the Torus).
 * @param {string | bigint} value - The Uint8 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint8} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint8 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT8);
    const encrypted = fhe_js_1.CompactFheUint8.encrypt_with_compact_public_key(parseInt(bint.toString()), publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint8 = encrypt_uint8;
/**
 * Encrypts a Uint16 value using TFHE.
 * @param {string | bigint} value - The Uint16 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint16} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint16 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT16);
    const encrypted = fhe_js_1.CompactFheUint16.encrypt_with_compact_public_key(parseInt(bint.toString()), publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint16 = encrypt_uint16;
/**
 * Encrypts a Uint32 value using TFHE.
 * @param {string | bigint} value - The Uint32 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint32} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint32 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT32);
    const encrypted = fhe_js_1.CompactFheUint32.encrypt_with_compact_public_key(parseInt(bint.toString()), publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint32 = encrypt_uint32;
/**
 * Encrypts a Uint64 value using TFHE.
 * @param {string | bigint} value - The Uint64 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint64} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint64 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT64);
    const encrypted = fhe_js_1.CompactFheUint64.encrypt_with_compact_public_key(bint, publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint64 = encrypt_uint64;
/**
 * Encrypts a Uint128 value using TFHE.
 * @param {string | bigint} value - The Uint128 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint128} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint128 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT128);
    const encrypted = fhe_js_1.CompactFheUint128.encrypt_with_compact_public_key(bint, publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint128 = encrypt_uint128;
/**
 * Encrypts a Uint256 value using TFHE.
 * @param {string | bigint} value - The Uint256 value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {EncryptedUint256} - The encrypted value serialized as Uint8Array.
 */
const encrypt_uint256 = (value, publicKey, securityZone = 0) => {
    const bint = (0, utils_js_1.toBigIntOrThrow)(value);
    (0, utils_js_1.validateBigIntInRange)(bint, consts_js_1.MAX_UINT256);
    const encrypted = fhe_js_1.CompactFheUint256.encrypt_with_compact_public_key(bint, publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_uint256 = encrypt_uint256;
/**
 * Encrypts a Address value using TFHE.
 * @param {bigint} value - The Address (Uint160) value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param securityZone - The security zone to encrypt the address on.
 * @returns {EncryptedAddress} - The encrypted value serialized as Uint8Array.
 */
const encrypt_address = (value, publicKey, securityZone = 0) => {
    if (typeof value === "string") {
        value = (0, utils_js_1.toBigInt)((0, utils_js_1.fromHexString)(value));
    }
    else {
        value = value;
    }
    const encrypted = fhe_js_1.CompactFheUint160.encrypt_with_compact_public_key(value, publicKey);
    return {
        data: encrypted.serialize(),
        securityZone,
    };
};
exports.encrypt_address = encrypt_address;
/**
 * Encrypts a numeric value using TFHE according to the specified encryption type.
 * @param {bigint | string} value - The numeric value to encrypt.
 * @param {TfheCompactPublicKey} publicKey - The public key used for encryption.
 * @param {EncryptionTypes} type - The encryption type (uint8, uint16, uint32).
 * @param securityZone - The security zone to encrypt the value on.
 * @returns {Uint8Array} - The encrypted value serialized as Uint8Array.
 * @throws {Error} - Throws an error if an invalid type is specified.
 */
const encrypt = (value, publicKey, type = types_1.EncryptionTypes.uint8, securityZone = 0) => {
    switch (type) {
        case types_1.EncryptionTypes.bool:
            return (0, exports.encrypt_bool)(!!value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint8:
            return (0, exports.encrypt_uint8)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint16:
            return (0, exports.encrypt_uint16)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint32:
            return (0, exports.encrypt_uint32)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint64:
            return (0, exports.encrypt_uint64)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint128:
            return (0, exports.encrypt_uint128)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.uint256:
            return (0, exports.encrypt_uint256)(value, publicKey, securityZone);
        case types_1.EncryptionTypes.address:
            return (0, exports.encrypt_address)(value, publicKey, securityZone);
        default:
            throw new Error("Invalid type");
    }
};
exports.encrypt = encrypt;
//# sourceMappingURL=encrypt.js.map