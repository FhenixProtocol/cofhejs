/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { _permitStore, clearStaleStore } from "./store";

describe("Permit Store Clearing Tests", () => {
  beforeEach(() => {
    _permitStore.setState({ permits: {}, activePermitHash: {} });
  });

  afterEach(() => {
    _permitStore.setState({ permits: {}, activePermitHash: {} });
  });

  describe("clearStaleStore", () => {
    it("should clear store with invalid structure", () => {
      // Test various invalid structures
      const invalidStructures = [
        { permits: {} }, // missing activePermitHash
        { permits: "invalid" as never, activePermitHash: {} },
        { permits: {}, activePermitHash: "invalid" as never },
        { permits: null as never, activePermitHash: undefined as never },
      ];

      invalidStructures.forEach((invalidStructure) => {
        _permitStore.setState(invalidStructure as any);
        clearStaleStore();

        const result = _permitStore.getState();
        expect(result).toEqual({ permits: {}, activePermitHash: {} });
      });
    });

    it("should preserve valid store structure", () => {
      const validState = {
        permits: {},
        activePermitHash: {},
      };

      _permitStore.setState(validState);
      clearStaleStore();

      const result = _permitStore.getState();
      expect(result).toEqual(validState);
    });
  });
});
