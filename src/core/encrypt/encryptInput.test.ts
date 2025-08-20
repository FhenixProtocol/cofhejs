/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EncryptInputsBuilder } from "./encryptInput";
import {
  EncryptStep,
  Encryptable,
  EncryptableItem,
  EncryptableUint128,
  FheTypes,
  VerifyResult,
} from "../../types";
import { ZkPackProveVerify } from "./zkPackProveVerify";
import { constructZkPoKMetadata } from "../utils/zkPoK";

class MockZkListBuilder {
  private items: EncryptableItem[];
  constructor(items: EncryptableItem[]) {
    this.items = items;
  }

  prove(metadata: Uint8Array): MockZkProvenList {
    return new MockZkProvenList(this.items, metadata);
  }
}

const mockZkPack = (items: EncryptableItem[]): MockZkListBuilder => {
  return new MockZkListBuilder(items);
};

class MockZkProvenList {
  private items: EncryptableItem[];
  private metadata: Uint8Array;

  constructor(items: EncryptableItem[], metadata: Uint8Array) {
    this.items = items;
    this.metadata = metadata;
  }

  verify(): Promise<VerifyResult[]> {
    return Promise.resolve([
      { ct_hash: "123456789", signature: "0xabcdef123456789" },
    ]);
  }
}

const mockZkProve = (
  builder: MockZkListBuilder,
  address: string,
  securityZone: number,
  chainId: string,
): Promise<MockZkProvenList> => {
  const metadata = constructZkPoKMetadata(
    address,
    securityZone,
    parseInt(chainId),
  );

  return Promise.resolve(builder.prove(metadata));
};

const mockZkVerify = (
  _verifierUrl: string,
  proved: MockZkProvenList,
  _address: string,
  _securityZone: number,
  _chainId: string,
): Promise<VerifyResult[]> => {
  return Promise.resolve(proved.verify());
};

describe("EncryptInputsBuilder", () => {
  const defaultParams = {
    inputs: [Encryptable.uint128(100n)] as [EncryptableUint128],
    sender: "0x1234567890123456789012345678901234567890",
    chainId: "1",
    zkVerifierUrl: "http://localhost:3001",
    zk: new ZkPackProveVerify(mockZkPack, mockZkProve, mockZkVerify),
  };
  let builder: EncryptInputsBuilder<[EncryptableUint128]>;

  beforeEach(() => {
    const mockZkPackProveVerify = new ZkPackProveVerify(
      mockZkPack,
      mockZkProve,
      mockZkVerify,
    );
    defaultParams.zk = mockZkPackProveVerify;
    builder = new EncryptInputsBuilder(defaultParams);
  });

  describe("constructor and initialization", () => {
    it("should initialize with default values", () => {
      expect(builder).toBeInstanceOf(EncryptInputsBuilder);
    });

    it("should set default security zone to 0", () => {
      const builderWithDefaultZone = new EncryptInputsBuilder({
        inputs: defaultParams.inputs,
        sender: defaultParams.sender,
        chainId: defaultParams.chainId,
        zkVerifierUrl: defaultParams.zkVerifierUrl,
        zk: defaultParams.zk,
        securityZone: undefined,
      });
      // We can't directly test private properties, but we can test behavior
      expect(builderWithDefaultZone).toBeInstanceOf(EncryptInputsBuilder);
    });
  });

  describe("setSender", () => {
    it("should set sender and return builder for chaining", () => {
      const result = builder.setSender(
        "0x9876543210987654321098765432109876543210",
      );
      expect(result).toBe(builder);
    });

    it("should allow chaining with other methods", () => {
      const result = builder
        .setSender("0x1111111111111111111111111111111111111111")
        .setSecurityZone(5)
        .setStepCallback(() => {});

      expect(result).toBe(builder);
    });
  });

  describe("setSecurityZone", () => {
    it("should set security zone and return builder for chaining", () => {
      const result = builder.setSecurityZone(42);
      expect(result).toBe(builder);
    });

    it("should allow chaining with other methods", () => {
      const result = builder
        .setSecurityZone(10)
        .setSender("0x2222222222222222222222222222222222222222");

      expect(result).toBe(builder);
    });
  });

  describe("setStepCallback", () => {
    it("should set step callback and return builder for chaining", () => {
      const callback = vi.fn();
      const result = builder.setStepCallback(callback);
      expect(result).toBe(builder);
    });

    it("should allow chaining with other methods", () => {
      const callback = vi.fn();
      const result = builder.setStepCallback(callback).setSecurityZone(15);

      expect(result).toBe(builder);
    });
  });

  describe("encrypt", () => {
    it("should execute the full encryption flow with step callbacks", async () => {
      const stepCallback = vi.fn();
      builder.setStepCallback(stepCallback);

      const result = await builder.encrypt();

      // Verify step callbacks were called in order
      expect(stepCallback).toHaveBeenCalledTimes(5);
      expect(stepCallback).toHaveBeenNthCalledWith(1, EncryptStep.Extract);
      expect(stepCallback).toHaveBeenNthCalledWith(2, EncryptStep.Pack);
      expect(stepCallback).toHaveBeenNthCalledWith(3, EncryptStep.Prove);
      expect(stepCallback).toHaveBeenNthCalledWith(4, EncryptStep.Verify);
      expect(stepCallback).toHaveBeenNthCalledWith(5, EncryptStep.Replace);
      expect(stepCallback).toHaveBeenNthCalledWith(6, EncryptStep.Done);

      // Verify ZK methods were called
      expect(mockZk.getMockPack()).toHaveBeenCalledWith([
        {
          data: 100n,
          utype: FheTypes.Uint128,
          securityZone: 0,
        },
      ]);
      expect(mockZk.getMockProve()).toHaveBeenCalledWith(
        expect.any(Object),
        defaultParams.sender,
        0,
        defaultParams.chainId,
      );
      expect(mockZk.getMockVerify()).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(Object),
        defaultParams.sender,
        0,
        defaultParams.chainId,
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should use overridden sender when set", async () => {
      const overriddenSender = "0x5555555555555555555555555555555555555555";
      builder.setSender(overriddenSender);

      await builder.encrypt();

      expect(mockZk.getMockProve()).toHaveBeenCalledWith(
        expect.any(Object),
        overriddenSender,
        0,
        defaultParams.chainId,
      );
      expect(mockZk.getMockVerify()).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(Object),
        overriddenSender,
        0,
        defaultParams.chainId,
      );
    });

    it("should use overridden security zone when set", async () => {
      const overriddenZone = 7;
      builder.setSecurityZone(overriddenZone);

      await builder.encrypt();

      expect(mockZk.getMockProve()).toHaveBeenCalledWith(
        expect.any(Object),
        defaultParams.sender,
        overriddenZone,
        defaultParams.chainId,
      );
      expect(mockZk.getMockVerify()).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(Object),
        defaultParams.sender,
        overriddenZone,
        defaultParams.chainId,
      );
    });

    it("should work without step callback", async () => {
      // No step callback set
      const result = await builder.encrypt();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should not throw when no callback is set
    });

    it("should handle multiple input types", async () => {
      const multiInputBuilder = new EncryptInputsBuilder({
        inputs: [Encryptable.uint128(100n), Encryptable.bool(true)] as [
          ReturnType<typeof Encryptable.uint128>,
          ReturnType<typeof Encryptable.bool>,
        ],
        sender: defaultParams.sender,
        chainId: defaultParams.chainId,
        zkVerifierUrl: defaultParams.zkVerifierUrl,
        zk: mockZk,
      });

      const result = await multiInputBuilder.encrypt();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockZk.getMockPack()).toHaveBeenCalledWith([
        { data: 100n, utype: FheTypes.Uint128, securityZone: 0 },
        { data: true, utype: FheTypes.Bool, securityZone: 0 },
      ]);
    });
  });

  describe("error handling", () => {
    it("should handle ZK pack errors gracefully", async () => {
      mockZk.getMockPack().mockImplementation(() => {
        throw new Error("ZK pack failed");
      });

      await expect(builder.encrypt()).rejects.toThrow("ZK pack failed");
    });

    it("should handle ZK prove errors gracefully", async () => {
      mockZk.getMockProve().mockRejectedValue(new Error("ZK prove failed"));

      await expect(builder.encrypt()).rejects.toThrow("ZK prove failed");
    });

    it("should handle ZK verify errors gracefully", async () => {
      mockZk.getMockVerify().mockRejectedValue(new Error("ZK verify failed"));

      await expect(builder.encrypt()).rejects.toThrow("ZK verify failed");
    });
  });

  describe("integration scenarios", () => {
    it("should work with the complete builder chain", async () => {
      const stepCallback = vi.fn();
      const result = await builder
        .setSender("0x9999999999999999999999999999999999999999")
        .setSecurityZone(3)
        .setStepCallback(stepCallback)
        .encrypt();

      expect(result).toBeDefined();
      expect(stepCallback).toHaveBeenCalledTimes(5);
      expect(mockZk.getMockProve()).toHaveBeenCalledWith(
        expect.any(Object),
        "0x9999999999999999999999999999999999999999",
        3,
        defaultParams.chainId,
      );
    });

    it("should maintain state across method calls", async () => {
      builder.setSender("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      builder.setSecurityZone(99);

      // Call encrypt multiple times to ensure state is maintained
      const result1 = await builder.encrypt();
      const result2 = await builder.encrypt();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Both calls should use the same overridden values
      expect(mockZk.getMockProve()).toHaveBeenCalledWith(
        expect.any(Object),
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        99,
        defaultParams.chainId,
      );
    });
  });
});
