/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { isNumber } from "./validation";

export const toBigIntOrThrow = (value: bigint | string): bigint => {
  if (typeof value === "bigint") {
    return value;
  }

  try {
    return BigInt(value);
  } catch (error) {
    throw new Error("Invalid input: Unable to convert to bigint");
  }
};

export const validateBigIntInRange = (
  value: bigint,
  max: bigint,
  min: bigint = 0n,
): void => {
  if (typeof value !== "bigint") {
    throw new Error("Value must be of type bigint");
  }

  if (value > max || value < min) {
    throw new Error(
      `Value out of range: ${max} - ${min}, try a different uint type`,
    );
  }
};

export const validateUintInRange = (
  value: number,
  max: number,
  min: number,
): void => {
  isNumber(value);

  if (value > max || value < min) {
    throw new Error(
      `Value out of range: ${max} - ${min}, try a different uint type`,
    );
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const recordToUint8Array = (record: Record<string, any>): Uint8Array => {
  const jsonString = JSON.stringify(record);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
};

export const fromHexString = (hexString: string): Uint8Array => {
  const cleanString = hexString.length % 2 === 1 ? `0${hexString}` : hexString;
  const arr = cleanString.replace(/^0x/, "").match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return new Uint8Array(arr.map((byte) => parseInt(byte, 16)));
};

export const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

export function toBigInt(value: number | string | bigint | Uint8Array): bigint {
  if (typeof value === "string") {
    return ethersToBigInt(fromHexString(value));
  } else if (typeof value === "number") {
    return BigInt(value);
  } else if (typeof value === "object") {
    // Uint8Array
    return ethersToBigInt(value);
  } else {
    return value as bigint;
  }
}

export function toBeArray(value: bigint | number): Uint8Array {
  return ethersToBeArray(value);
}

export function isAddress(address: string) {
  if (!_isAddress(address)) {
    throw new Error(`Address ${address} is not valid EVM address`);
  }
}

export function toNumber(value: number | string | bigint): number {
  try {
    switch (typeof value) {
      case "string":
        return parseInt(value);
      case "bigint":
        return Number(value);
    }
    return value;
  } catch (error) {
    throw new Error(`Cannot convert ${value} to number`);
  }
}

function _isAddress(value: string): value is string {
  try {
    if (!value.startsWith("0x")) {
      return false;
    } else if (value.length !== 42) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

// ********************* THE FOLLOWING CODE IS TAKEN FROM ETHERS.JS AND IS UNDER THEIR MIT LICENSE  ****************** //
// ********************* FOR A COPY OF THE LICENSE VISIT https://github.com/ethers-io/ethers.js/blob/main/LICENSE.md * //

type BigNumberish = string | bigint | number;
const Nibbles = "0123456789abcdef";
// IEEE 754 support 53-bits of mantissa
const maxValue = 0x1fffffffffffff;
const BN_0 = BigInt(0);
/*
 * Converts %%value%% to a BigInt. If %%value%% is a Uint8Array, it
 * is treated as Big Endian data.
 */
function ethersToBigInt(value: BigNumberish | Uint8Array): bigint {
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

function ethersToBeArray(_value: BigNumberish): Uint8Array {
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
function getUint(value: BigNumberish): bigint {
  const result = getBigInt(value);
  assertArgument(result >= BN_0, "unsigned value cannot be negative");
  return result;
}

/**
 *  Gets a BigInt from %%value%%. If it is an invalid value for
 *  a BigInt, then an ArgumentError will be thrown for %%name%%.
 */
function getBigInt(value: BigNumberish): bigint {
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
      } catch (e: any) {
        assertArgument(false, `invalid BigNumberish string: ${e.message}`);
      }
  }
  assertArgument(false, "invalid BigNumberish value");
}

function assertArgument(check: unknown, message: string): asserts check {
  if (!check) {
    throw new Error(message);
  }
}

export function toABIEncodedUint32(value: number) {
  // Ensure the number is a valid unsigned 32-bit integer
  if (value < 0 || value > 0xffffffff) {
    throw new RangeError("Number must be between 0 and 2^32 - 1.");
  }

  // Convert the number to a hexadecimal string and pad it to 64 characters (32 bytes)
  return value.toString(16).padStart(64, "0");
}

// Uint8Array conversions

export const stringToUint8Array = (value: string): Uint8Array => {
  return new Uint8Array(value.split("").map((c) => c.charCodeAt(0)));
};
export const uint8ArrayToString = (value: Uint8Array): string => {
  return Array.from(value)
    .map((byte) => String.fromCharCode(byte))
    .join("");
};
export const bigintToUint8Array = (bigNum: bigint): Uint8Array => {
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

// General tooling

export const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function uint160ToAddress(uint160: bigint): string {
  // Convert bigint to hex string and pad to 20 bytes (40 hex chars)
  const hexStr = uint160.toString(16).padStart(40, "0");

  // Add 0x prefix and convert to checksum address
  return ethers.getAddress("0x" + hexStr);
}

export function bytesToBigInt(bytes: Uint8Array) {
  const arr = Array.from(bytes); // Ensure it's an array
  return arr.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
}

export function unwrapCallResult(result: any): string {
  return typeof result === "string" ? result : result?.data ?? `${result}`;
}
