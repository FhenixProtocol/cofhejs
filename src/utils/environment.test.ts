/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import { applyEnvironmentDefaults } from "./environment";
import { Environment, EnvironmentParams } from "../types";

describe("Environment Utils", () => {
  describe("applyEnvironmentDefaults", () => {
    it("should return original params when no environment is specified and all URLs are provided", () => {
      const params: EnvironmentParams = {
        coFheUrl: "https://custom-cofhe.example.com",
        verifierUrl: "https://custom-verifier.example.com",
        thresholdNetworkUrl: "https://custom-threshold.example.com",
      };

      const result = applyEnvironmentDefaults(params);

      expect(result).toEqual(params);
      expect(result.coFheUrl).toBe("https://custom-cofhe.example.com");
      expect(result.verifierUrl).toBe("https://custom-verifier.example.com");
      expect(result.thresholdNetworkUrl).toBe(
        "https://custom-threshold.example.com",
      );
    });

    it("should throw error when no environment is specified and URLs are missing", () => {
      const params: EnvironmentParams = {
        coFheUrl: "https://custom-cofhe.example.com",
        // Missing verifierUrl and thresholdNetworkUrl
      };

      expect(() => applyEnvironmentDefaults(params)).toThrow(
        "When environment is not specified, coFheUrl, verifierUrl, and thresholdNetworkUrl must be provided",
      );
    });

    it("should throw error when no environment is specified and all URLs are missing", () => {
      const params: EnvironmentParams = {};

      expect(() => applyEnvironmentDefaults(params)).toThrow(
        "When environment is not specified, coFheUrl, verifierUrl, and thresholdNetworkUrl must be provided",
      );
    });

    describe("MOCK environment", () => {
      it("should set all URLs to undefined for MOCK environment", () => {
        const params: EnvironmentParams = {
          environment: "MOCK",
          coFheUrl: "https://should-be-removed.example.com",
          verifierUrl: "https://should-be-removed.example.com",
          thresholdNetworkUrl: "https://should-be-removed.example.com",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("MOCK");
        expect(result.coFheUrl).toBeUndefined();
        expect(result.verifierUrl).toBeUndefined();
        expect(result.thresholdNetworkUrl).toBeUndefined();
      });
    });

    describe("LOCAL environment", () => {
      it("should apply default local URLs when none provided", () => {
        const params: EnvironmentParams = {
          environment: "LOCAL",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("LOCAL");
        expect(result.coFheUrl).toBe("http://127.0.0.1:8448");
        expect(result.verifierUrl).toBe("http://127.0.0.1:3001");
        expect(result.thresholdNetworkUrl).toBe("http://127.0.0.1:3000");
      });

      it("should preserve custom URLs when provided for LOCAL environment", () => {
        const params: EnvironmentParams = {
          environment: "LOCAL",
          coFheUrl: "http://localhost:9999",
          verifierUrl: "http://localhost:8888",
          thresholdNetworkUrl: "http://localhost:7777",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("LOCAL");
        expect(result.coFheUrl).toBe("http://localhost:9999");
        expect(result.verifierUrl).toBe("http://localhost:8888");
        expect(result.thresholdNetworkUrl).toBe("http://localhost:7777");
      });
    });

    describe("TESTNET environment", () => {
      it("should apply default testnet URLs when none provided", () => {
        const params: EnvironmentParams = {
          environment: "TESTNET",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("TESTNET");
        expect(result.coFheUrl).toBe("https://testnet-cofhe.fhenix.zone");
        expect(result.verifierUrl).toBe(
          "https://testnet-cofhe-vrf.fhenix.zone",
        );
        expect(result.thresholdNetworkUrl).toBe(
          "https://testnet-cofhe-tn.fhenix.zone",
        );
      });

      it("should preserve custom URLs when provided for TESTNET environment", () => {
        const params: EnvironmentParams = {
          environment: "TESTNET",
          coFheUrl: "https://custom-testnet-cofhe.example.com",
          verifierUrl: "https://custom-testnet-verifier.example.com",
          thresholdNetworkUrl: "https://custom-testnet-threshold.example.com",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("TESTNET");
        expect(result.coFheUrl).toBe(
          "https://custom-testnet-cofhe.example.com",
        );
        expect(result.verifierUrl).toBe(
          "https://custom-testnet-verifier.example.com",
        );
        expect(result.thresholdNetworkUrl).toBe(
          "https://custom-testnet-threshold.example.com",
        );
      });
    });

    describe("MAINNET environment", () => {
      it("should apply default mainnet URLs when none provided", () => {
        const params: EnvironmentParams = {
          environment: "MAINNET",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("MAINNET");
        expect(result.coFheUrl).toBe("https://mainnet-cofhe.fhenix.zone");
        expect(result.verifierUrl).toBe(
          "https://mainnet-cofhe-vrf.fhenix.zone",
        );
        expect(result.thresholdNetworkUrl).toBe(
          "https://mainnet-cofhe-tn.fhenix.zone",
        );
      });

      it("should preserve custom URLs when provided for MAINNET environment", () => {
        const params: EnvironmentParams = {
          environment: "MAINNET",
          coFheUrl: "https://custom-mainnet-cofhe.example.com",
          verifierUrl: "https://custom-mainnet-verifier.example.com",
          thresholdNetworkUrl: "https://custom-mainnet-threshold.example.com",
        };

        const result = applyEnvironmentDefaults(params);

        expect(result.environment).toBe("MAINNET");
        expect(result.coFheUrl).toBe(
          "https://custom-mainnet-cofhe.example.com",
        );
        expect(result.verifierUrl).toBe(
          "https://custom-mainnet-verifier.example.com",
        );
        expect(result.thresholdNetworkUrl).toBe(
          "https://custom-mainnet-threshold.example.com",
        );
      });
    });

    it("should throw error for unknown environment", () => {
      const params: EnvironmentParams = {
        environment: "UNKNOWN" as Environment,
      };

      expect(() => applyEnvironmentDefaults(params)).toThrow(
        "Unknown environment: UNKNOWN",
      );
    });

    it("should not modify the original input parameters", () => {
      const originalParams: EnvironmentParams = {
        environment: "LOCAL",
        coFheUrl: "http://localhost:9999",
      };

      const result = applyEnvironmentDefaults(originalParams);

      // Original params should remain unchanged
      expect(originalParams.coFheUrl).toBe("http://localhost:9999");
      expect(originalParams.verifierUrl).toBeUndefined();
      expect(originalParams.thresholdNetworkUrl).toBeUndefined();

      // Result should have the defaults applied
      expect(result.coFheUrl).toBe("http://localhost:9999");
      expect(result.verifierUrl).toBe("http://127.0.0.1:3001");
      expect(result.thresholdNetworkUrl).toBe("http://127.0.0.1:3000");
    });

    it("should handle partial URL overrides correctly", () => {
      const params: EnvironmentParams = {
        environment: "TESTNET",
        thresholdNetworkUrl: "https://custom-threshold.example.com",
      };

      const result = applyEnvironmentDefaults(params);

      expect(result.environment).toBe("TESTNET");
      expect(result.coFheUrl).toBe("https://testnet-cofhe.fhenix.zone");
      expect(result.verifierUrl).toBe("https://testnet-cofhe-vrf.fhenix.zone");
      expect(result.thresholdNetworkUrl).toBe(
        "https://custom-threshold.example.com",
      );
    });
  });
});
