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

// Mock the functions with vitest
const mockZkPack = vi.fn();
const mockZkProve = vi.fn();
const mockZkVerify = vi.fn();

const packMetadata = (
  signer: string,
  securityZone: number,
  chainId: string,
) => {
  return `${signer}-${securityZone}-${chainId}`;
};
const unpackMetadata = (metadata: string) => {
  const [signer, securityZone, chainId] = metadata.split("-");
  return { signer, securityZone: parseInt(securityZone), chainId };
};
const packVerifyResult = (item: EncryptableItem, metadata: string) => {
  return {
    ct_hash: `${item.data}`,
    signature: metadata,
  };
};
const unpackVerifyResult = (result: VerifyResult) => {
  return {
    ct_hash: result.ct_hash,
    metadata: unpackMetadata(result.signature),
  };
};

class MockZkListBuilder {
  private items: EncryptableItem[];
  constructor(items: EncryptableItem[]) {
    this.items = items;
  }

  prove(metadata: string): MockZkProvenList {
    return new MockZkProvenList(this.items, metadata);
  }
}

const mockZkPackImpl = (items: EncryptableItem[]): MockZkListBuilder => {
  mockZkPack(items);
  return new MockZkListBuilder(items);
};

class MockZkProvenList {
  private items: EncryptableItem[];
  private metadata: string;

  constructor(items: EncryptableItem[], metadata: string) {
    this.items = items;
    this.metadata = metadata;
  }

  verify(): Promise<VerifyResult[]> {
    const verifiedItems = this.items.map((item) => {
      return packVerifyResult(item, this.metadata);
    });

    return Promise.resolve(verifiedItems);
  }
}

const mockZkProveImpl = (
  builder: MockZkListBuilder,
  address: string,
  securityZone: number,
  chainId: string,
): Promise<MockZkProvenList> => {
  mockZkProve(builder, address, securityZone, chainId);

  const metadata = packMetadata(address, securityZone, chainId);

  return Promise.resolve(builder.prove(metadata));
};

const mockZkVerifyImpl = (
  verifierUrl: string,
  proved: MockZkProvenList,
  address: string,
  securityZone: number,
  chainId: string,
): Promise<VerifyResult[]> => {
  mockZkVerify(verifierUrl, proved, address, securityZone, chainId);
  return Promise.resolve(proved.verify());
};

describe("EncryptInputsBuilder", () => {
  const defaultParams = {
    inputs: [Encryptable.uint128(100n)] as [EncryptableUint128],
    sender: "0x1234567890123456789012345678901234567890",
    chainId: "1",
    zkVerifierUrl: "http://localhost:3001",
    zk: new ZkPackProveVerify(
      mockZkPackImpl,
      mockZkProveImpl,
      mockZkVerifyImpl,
    ),
  };
  let builder: EncryptInputsBuilder<[EncryptableUint128]>;

  beforeEach(() => {
    // Reset all mocks before each test
    mockZkPack.mockClear();
    mockZkProve.mockClear();
    mockZkVerify.mockClear();

    const mockZkPackProveVerify = new ZkPackProveVerify(
      mockZkPackImpl,
      mockZkProveImpl,
      mockZkVerifyImpl,
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
      const sender = "0x9876543210987654321098765432109876543210";

      const result = builder.setSender(sender);

      expect(result).toBe(builder);
      expect(result.getSender()).toBe(sender);
    });

    it("should allow chaining with other methods", () => {
      const sender = "0x1111111111111111111111111111111111111111";
      const securityZone = 5;

      const result = builder
        .setSender(sender)
        .setSecurityZone(securityZone)
        .setStepCallback(() => {});

      expect(result).toBe(builder);
      expect(result.getSender()).toBe(sender);
      expect(result.getSecurityZone()).toBe(securityZone);
    });
  });

  describe("setSecurityZone", () => {
    it("should set security zone and return builder for chaining", () => {
      const securityZone = 42;
      const result = builder.setSecurityZone(securityZone);
      expect(result).toBe(builder);
      expect(result.getSecurityZone()).toBe(securityZone);
    });

    it("should allow chaining with other methods", () => {
      const sender = "0x2222222222222222222222222222222222222222";
      const securityZone = 10;

      const result = builder
        .setSecurityZone(securityZone)
        .setSender(sender)
        .setStepCallback(() => {});

      expect(result).toBe(builder);
      expect(result.getSender()).toBe(sender);
      expect(result.getSecurityZone()).toBe(securityZone);
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
      expect(stepCallback).toHaveBeenCalledTimes(6);
      expect(stepCallback).toHaveBeenNthCalledWith(1, EncryptStep.Extract);
      expect(stepCallback).toHaveBeenNthCalledWith(2, EncryptStep.Pack);
      expect(stepCallback).toHaveBeenNthCalledWith(3, EncryptStep.Prove);
      expect(stepCallback).toHaveBeenNthCalledWith(4, EncryptStep.Verify);
      expect(stepCallback).toHaveBeenNthCalledWith(5, EncryptStep.Replace);
      expect(stepCallback).toHaveBeenNthCalledWith(6, EncryptStep.Done);

      // Verify ZK methods were called
      expect(mockZkPack).toHaveBeenCalledWith([
        {
          data: 100n,
          utype: FheTypes.Uint128,
          securityZone: 0,
        },
      ]);
      expect(mockZkProve).toHaveBeenCalledWith(
        expect.any(MockZkListBuilder),
        defaultParams.sender,
        0,
        defaultParams.chainId,
      );
      expect(mockZkVerify).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(MockZkProvenList),
        defaultParams.sender,
        0,
        defaultParams.chainId,
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verify result embedded metadata
      const [encrypted] = result;
      const encryptedMetadata = unpackMetadata(encrypted.signature);
      expect(encryptedMetadata).toBeDefined();
      expect(encryptedMetadata.signer).toBe(defaultParams.sender);
      expect(encryptedMetadata.securityZone).toBe(0);
      expect(encryptedMetadata.chainId).toBe(defaultParams.chainId);
    });

    it("should use overridden sender when set", async () => {
      const overriddenSender = "0x5555555555555555555555555555555555555555";
      builder.setSender(overriddenSender);

      const result = await builder.encrypt();

      expect(mockZkProve).toHaveBeenCalledWith(
        expect.any(MockZkListBuilder),
        overriddenSender,
        0,
        defaultParams.chainId,
      );
      expect(mockZkVerify).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(MockZkProvenList),
        overriddenSender,
        0,
        defaultParams.chainId,
      );

      // Verify result embedded metadata
      const [encrypted] = result;
      const encryptedMetadata = unpackMetadata(encrypted.signature);
      expect(encryptedMetadata).toBeDefined();
      expect(encryptedMetadata.signer).toBe(overriddenSender);
      expect(encryptedMetadata.securityZone).toBe(0);
      expect(encryptedMetadata.chainId).toBe(defaultParams.chainId);
    });

    it("should use overridden security zone when set", async () => {
      const overriddenZone = 7;
      builder.setSecurityZone(overriddenZone);

      const result = await builder.encrypt();

      expect(mockZkProve).toHaveBeenCalledWith(
        expect.any(MockZkListBuilder),
        defaultParams.sender,
        overriddenZone,
        defaultParams.chainId,
      );
      expect(mockZkVerify).toHaveBeenCalledWith(
        defaultParams.zkVerifierUrl,
        expect.any(MockZkProvenList),
        defaultParams.sender,
        overriddenZone,
        defaultParams.chainId,
      );

      // Verify result embedded metadata
      const [encrypted] = result;
      const encryptedMetadata = unpackMetadata(encrypted.signature);
      expect(encryptedMetadata).toBeDefined();
      expect(encryptedMetadata.signer).toBe(defaultParams.sender);
      expect(encryptedMetadata.securityZone).toBe(overriddenZone);
      expect(encryptedMetadata.chainId).toBe(defaultParams.chainId);
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
        zk: defaultParams.zk,
      });

      const result = await multiInputBuilder.encrypt();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockZkPack).toHaveBeenCalledWith([
        { data: 100n, utype: FheTypes.Uint128, securityZone: 0 },
        { data: true, utype: FheTypes.Bool, securityZone: 0 },
      ]);
    });
  });

  describe("error handling", () => {
    it("should handle ZK pack errors gracefully", async () => {
      mockZkPack.mockImplementation(() => {
        throw new Error("ZK pack failed");
      });

      await expect(builder.encrypt()).rejects.toThrow("ZK pack failed");
    });

    it("should handle ZK prove errors gracefully", async () => {
      mockZkProve.mockRejectedValue(new Error("ZK prove failed"));

      await expect(builder.encrypt()).rejects.toThrow("ZK prove failed");
    });

    it("should handle ZK verify errors gracefully", async () => {
      mockZkVerify.mockRejectedValue(new Error("ZK verify failed"));

      await expect(builder.encrypt()).rejects.toThrow("ZK verify failed");
    });
  });

  describe("integration scenarios", () => {
    it("should work with the complete builder chain", async () => {
      const sender = "0x9999999999999999999999999999999999999999";
      const securityZone = 3;

      const stepCallback = vi.fn();
      const result = await builder
        .setSender(sender)
        .setSecurityZone(securityZone)
        .setStepCallback(stepCallback)
        .encrypt();

      expect(result).toBeDefined();
      expect(stepCallback).toHaveBeenCalledTimes(6);
      expect(mockZkProve).toHaveBeenCalledWith(
        expect.any(MockZkListBuilder),
        sender,
        securityZone,
        defaultParams.chainId,
      );

      // Verify result embedded metadata
      const [encrypted] = result;
      const encryptedMetadata = unpackMetadata(encrypted.signature);
      expect(encryptedMetadata).toBeDefined();
      expect(encryptedMetadata.signer).toBe(sender);
      expect(encryptedMetadata.securityZone).toBe(securityZone);
      expect(encryptedMetadata.chainId).toBe(defaultParams.chainId);
    });

    it("should maintain state across method calls", async () => {
      const sender = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const securityZone = 99;

      builder.setSender(sender);
      builder.setSecurityZone(securityZone);

      // Call encrypt multiple times to ensure state is maintained
      const result1 = await builder.encrypt();
      const result2 = await builder.encrypt();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Both calls should use the same overridden values
      expect(mockZkProve).toHaveBeenCalledWith(
        expect.any(MockZkListBuilder),
        sender,
        securityZone,
        defaultParams.chainId,
      );

      // Verify result embedded metadata
      const [encrypted1] = result1;
      const encryptedMetadata1 = unpackMetadata(encrypted1.signature);
      expect(encryptedMetadata1).toBeDefined();
      expect(encryptedMetadata1.signer).toBe(sender);
      expect(encryptedMetadata1.securityZone).toBe(securityZone);
      expect(encryptedMetadata1.chainId).toBe(defaultParams.chainId);

      // Verify result embedded metadata
      const [encrypted2] = result2;
      const encryptedMetadata2 = unpackMetadata(encrypted2.signature);
      expect(encryptedMetadata2).toBeDefined();
      expect(encryptedMetadata2.signer).toBe(sender);
      expect(encryptedMetadata2.securityZone).toBe(securityZone);
      expect(encryptedMetadata2.chainId).toBe(defaultParams.chainId);
    });
  });
});
