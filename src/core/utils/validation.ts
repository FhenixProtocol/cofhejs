function assertIs(is: boolean, expected: string, value: unknown) {
  if (!is) {
    throw new Error(
      `Expected value which is \`${expected}\`, received value of type \`${typeof value}\`.`,
    );
  }
}

export function isString(value: unknown) {
  const is = typeof value === "string";

  assertIs(is, "string", value);
}

export function isPlainObject(value: unknown) {
  // From: https://github.com/sindresorhus/is-plain-obj/blob/main/index.js
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const prototype = Object.getPrototypeOf(value);

  const is =
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value);

  assertIs(is, "plain object", value);

  return true;
}

export function isBigIntOrHexString(value: unknown) {
  const is = typeof value === "bigint" || typeof value === "string";

  assertIs(is, "bigint or hex string", value);
}

export function isNumber(value: unknown) {
  const is = typeof value === "number" && !Number.isNaN(value);

  assertIs(is, "number", value);
}

export function isBigIntOrNumber(value: unknown) {
  const is = typeof value === "bigint";

  if (!is) {
    try {
      isNumber(value);
    } catch (e) {
      throw new Error(
        `Value ${value} is not a number or bigint: ${typeof value}`,
      );
    }
  }
}
