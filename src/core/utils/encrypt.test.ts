/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import { marshallEncryptParams } from "./encrypt";
import { EncryptStep } from "../../types";

describe("encrypt", () => {
  describe("marshallEncryptParams", () => {
    it("should handle number as first parameter (securityZone)", () => {
      const mockCallback = (_state: EncryptStep) => {};
      const result = marshallEncryptParams(42, mockCallback);

      expect(result.securityZone).toBe(42);
      expect(result.setStateCallback).toBe(mockCallback);
    });

    it("should handle function as first parameter (setStateCallback)", () => {
      const mockCallback = (_state: EncryptStep) => {};
      const result = marshallEncryptParams(mockCallback);

      expect(result.securityZone).toBe(0);
      expect(result.setStateCallback).toBe(mockCallback);
    });

    it("should use default callback when only securityZone provided", () => {
      const result = marshallEncryptParams(99);

      expect(result.securityZone).toBe(99);
      expect(typeof result.setStateCallback).toBe("function");
    });

    it("should use defaults when no parameters provided", () => {
      const result = marshallEncryptParams();

      expect(result.securityZone).toBe(0);
      expect(typeof result.setStateCallback).toBe("function");
    });
  });
});
