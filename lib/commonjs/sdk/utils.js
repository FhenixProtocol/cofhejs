"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bigintToUint8Array = exports.uint8ArrayToString = exports.stringToUint8Array = exports.toABIEncodedUint32 = exports.toNumber = exports.isAddress = exports.toBeArray = exports.toBigInt = exports.toHexString = exports.fromHexString = exports.validateUintInRange = exports.validateBigIntInRange = exports.toBigIntOrThrow = void 0;
const validation_js_1 = require("./validation.js");
const toBigIntOrThrow = (value) => {
    if (typeof value === "bigint") {
        return value;
    }
    try {
        return BigInt(value);
    }
    catch (error) {
        throw new Error("Invalid input: Unable to convert to bigint");
    }
};
exports.toBigIntOrThrow = toBigIntOrThrow;
const validateBigIntInRange = (value, max, min = 0n) => {
    if (typeof value !== "bigint") {
        throw new Error("Value must be of type bigint");
    }
    if (value > max || value < min) {
        throw new Error(`Value out of range: ${max} - ${min}, try a different uint type`);
    }
};
exports.validateBigIntInRange = validateBigIntInRange;
const validateUintInRange = (value, max, min) => {
    (0, validation_js_1.isNumber)(value);
    if (value > max || value < min) {
        throw new Error(`Value out of range: ${max} - ${min}, try a different uint type`);
    }
};
exports.validateUintInRange = validateUintInRange;
const fromHexString = (hexString) => {
    const cleanString = hexString.length % 2 === 1 ? `0${hexString}` : hexString;
    const arr = cleanString.replace(/^0x/, "").match(/.{1,2}/g);
    if (!arr)
        return new Uint8Array();
    return new Uint8Array(arr.map((byte) => parseInt(byte, 16)));
};
exports.fromHexString = fromHexString;
const toHexString = (bytes) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
exports.toHexString = toHexString;
function toBigInt(value) {
    if (typeof value === "string") {
        return ethersToBigInt((0, exports.fromHexString)(value));
    }
    else if (typeof value === "number") {
        return BigInt(value);
    }
    else if (typeof value === "object") {
        // Uint8Array
        return ethersToBigInt(value);
    }
    else {
        return value;
    }
}
exports.toBigInt = toBigInt;
function toBeArray(value) {
    return ethersToBeArray(value);
}
exports.toBeArray = toBeArray;
function isAddress(address) {
    if (!_isAddress(address)) {
        throw new Error(`Address ${address} is not valid EVM address`);
    }
}
exports.isAddress = isAddress;
function toNumber(value) {
    try {
        switch (typeof value) {
            case "string":
                return parseInt(value);
            case "bigint":
                return Number(value);
        }
        return value;
    }
    catch (error) {
        throw new Error(`Cannot convert ${value} to number`);
    }
}
exports.toNumber = toNumber;
function _isAddress(value) {
    try {
        if (!value.startsWith("0x")) {
            return false;
        }
        else if (value.length !== 42) {
            return false;
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
const Nibbles = "0123456789abcdef";
// IEEE 754 support 53-bits of mantissa
const maxValue = 0x1fffffffffffff;
const BN_0 = BigInt(0);
/*
 * Converts %%value%% to a BigInt. If %%value%% is a Uint8Array, it
 * is treated as Big Endian data.
 */
function ethersToBigInt(value) {
    if (value instanceof Uint8Array) {
        let result = "0x0";
        for (const v of value) {
            result += Nibbles[v >> 4];
            result += Nibbles[v & 0x0f];
        }
        return BigInt(result);
    }
    return getBigInt(value);
}
function ethersToBeArray(_value) {
    const value = getUint(_value);
    if (value === BN_0) {
        return new Uint8Array([]);
    }
    let hex = value.toString(16);
    if (hex.length % 2) {
        hex = "0" + hex;
    }
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < result.length; i++) {
        const offset = i * 2;
        result[i] = parseInt(hex.substring(offset, offset + 2), 16);
    }
    return result;
}
/**
 *  Returns %%value%% as a bigint, validating it is valid as a bigint
 *  value and that it is positive.
 */
function getUint(value) {
    const result = getBigInt(value);
    assertArgument(result >= BN_0, "unsigned value cannot be negative");
    return result;
}
/**
 *  Gets a BigInt from %%value%%. If it is an invalid value for
 *  a BigInt, then an ArgumentError will be thrown for %%name%%.
 */
function getBigInt(value) {
    switch (typeof value) {
        case "bigint":
            return value;
        case "number":
            assertArgument(Number.isInteger(value), "underflow");
            assertArgument(value >= -maxValue && value <= maxValue, "overflow");
            return BigInt(value);
        case "string":
            try {
                if (value === "") {
                    throw new Error("empty string");
                }
                if (value[0] === "-" && value[1] !== "-") {
                    return -BigInt(value.substring(1));
                }
                return BigInt(value);
                // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            }
            catch (e) {
                assertArgument(false, `invalid BigNumberish string: ${e.message}`);
            }
    }
    assertArgument(false, "invalid BigNumberish value");
}
function assertArgument(check, message) {
    if (!check) {
        throw new Error(message);
    }
}
function toABIEncodedUint32(value) {
    // Ensure the number is a valid unsigned 32-bit integer
    if (value < 0 || value > 0xffffffff) {
        throw new RangeError("Number must be between 0 and 2^32 - 1.");
    }
    // Convert the number to a hexadecimal string and pad it to 64 characters (32 bytes)
    return value.toString(16).padStart(64, "0");
}
exports.toABIEncodedUint32 = toABIEncodedUint32;
// Uint8Array conversions
const stringToUint8Array = (value) => {
    return new Uint8Array(value.split("").map((c) => c.charCodeAt(0)));
};
exports.stringToUint8Array = stringToUint8Array;
const uint8ArrayToString = (value) => {
    return Array.from(value)
        .map((byte) => String.fromCharCode(byte))
        .join("");
};
exports.uint8ArrayToString = uint8ArrayToString;
const bigintToUint8Array = (bigNum) => {
    const byteLength = 32;
    const byteArray = new Uint8Array(byteLength);
    // Create a BigInt mask for each byte
    const mask = BigInt(0xff);
    // Initialize an index to start from the end of the array
    for (let i = 0; i < byteLength; i++) {
        // Extract the last byte and assign it to the corresponding position in the array
        byteArray[byteLength - 1 - i] = Number(bigNum & mask);
        // Shift bigint right by 8 bits to process the next byte in the next iteration
        bigNum >>= BigInt(8);
    }
    return byteArray;
};
exports.bigintToUint8Array = bigintToUint8Array;
//# sourceMappingURL=utils.js.map