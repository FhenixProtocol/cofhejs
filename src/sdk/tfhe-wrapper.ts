/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "module";
import { TfheConfig } from "tfhe";

type TfheBrowser = typeof import("tfhe");
let tfheModule: TfheBrowser | typeof import("node-tfhe");

export async function initTfhe(target: "web" | "node") {
  if (!tfheModule) {
    if (typeof require !== "undefined") {
      // Use `createRequire` to load ESM module in CJS environment
      const requireModule = createRequire(import.meta.url);
      tfheModule =
        target === "node" ? requireModule("node-tfhe") : await import("tfhe");
    } else {
      // Use dynamic import in ESM
      tfheModule =
        target === "node" ? await import("node-tfhe") : await import("tfhe");
    }
  }

  if (target === "web") {
    await (tfheModule as TfheBrowser).default();
  }

  tfheModule.init_panic_hook();
  return tfheModule as TfheBrowser;
}

export function getTfhe() {
  if (tfheModule == null) throw new Error("Tfhe not initialized");
  return tfheModule as TfheBrowser;
}

export type TfheCompactPublicKey = {
  free(): void;
  /**
   * @returns {Uint8Array}
   */
  serialize(): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @returns {TfheCompactPublicKey}
   */
  deserialize(buffer: Uint8Array): TfheCompactPublicKey;
  /**
   * @param {bigint} serialized_size_limit
   * @returns {Uint8Array}
   */
  safe_serialize(serialized_size_limit: bigint): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @param {bigint} serialized_size_limit
   * @returns {TfheCompactPublicKey}
   */
  safe_deserialize(
    buffer: Uint8Array,
    serialized_size_limit: bigint,
  ): TfheCompactPublicKey;
};

export type CompactPkeCrs = {
  free(): void;
  /**
   * @param {boolean} compress
   * @returns {Uint8Array}
   */
  serialize(compress: boolean): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @returns {CompactPkeCrs}
   */
  deserialize(buffer: Uint8Array): CompactPkeCrs;
  /**
   * @param {bigint} serialized_size_limit
   * @returns {Uint8Array}
   */
  safe_serialize(serialized_size_limit: bigint): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @param {bigint} serialized_size_limit
   * @returns {CompactPkeCrs}
   */
  safe_deserialize(
    buffer: Uint8Array,
    serialized_size_limit: bigint,
  ): CompactPkeCrs;
  /**
   * @param {TfheConfig} config
   * @param {number} max_num_bits
   * @returns {CompactPkeCrs}
   */
  from_config(config: TfheConfig, max_num_bits: number): CompactPkeCrs;
  /**
   * @param {Uint8Array} buffer
   * @returns {CompactPkeCrs}
   */
  deserialize_from_public_params(buffer: Uint8Array): CompactPkeCrs;
  /**
   * @param {Uint8Array} buffer
   * @param {bigint} serialized_size_limit
   * @returns {CompactPkeCrs}
   */
  safe_deserialize_from_public_params(
    buffer: Uint8Array,
    serialized_size_limit: bigint,
  ): CompactPkeCrs;
};

export enum ZkComputeLoad {
  Proof = 0,
  Verify = 1,
}

export type CompactCiphertextListBuilder = {
  free(): void;
  /**
   * @param {number} value
   */
  push_u2(value: number): void;
  /**
   * @param {number} value
   */
  push_u4(value: number): void;
  /**
   * @param {number} value
   */
  push_u6(value: number): void;
  /**
   * @param {number} value
   */
  push_u8(value: number): void;
  /**
   * @param {number} value
   */
  push_u10(value: number): void;
  /**
   * @param {number} value
   */
  push_u12(value: number): void;
  /**
   * @param {number} value
   */
  push_u14(value: number): void;
  /**
   * @param {number} value
   */
  push_u16(value: number): void;
  /**
   * @param {number} value
   */
  push_u32(value: number): void;
  /**
   * @param {bigint} value
   */
  push_u64(value: bigint): void;
  /**
   * @param {number} value
   */
  push_i2(value: number): void;
  /**
   * @param {number} value
   */
  push_i4(value: number): void;
  /**
   * @param {number} value
   */
  push_i6(value: number): void;
  /**
   * @param {number} value
   */
  push_i8(value: number): void;
  /**
   * @param {number} value
   */
  push_i10(value: number): void;
  /**
   * @param {number} value
   */
  push_i12(value: number): void;
  /**
   * @param {number} value
   */
  push_i14(value: number): void;
  /**
   * @param {number} value
   */
  push_i16(value: number): void;
  /**
   * @param {number} value
   */
  push_i32(value: number): void;
  /**
   * @param {bigint} value
   */
  push_i64(value: bigint): void;
  /**
   * @param {any} value
   */
  push_u128(value: any): void;
  /**
   * @param {any} value
   */
  push_u160(value: any): void;
  /**
   * @param {any} value
   */
  push_u256(value: any): void;
  /**
   * @param {any} value
   */
  push_u512(value: any): void;
  /**
   * @param {any} value
   */
  push_u1024(value: any): void;
  /**
   * @param {any} value
   */
  push_u2048(value: any): void;
  /**
   * @param {any} value
   */
  push_i128(value: any): void;
  /**
   * @param {any} value
   */
  push_i160(value: any): void;
  /**
   * @param {any} value
   */
  push_i256(value: any): void;
  /**
   * @param {boolean} value
   */
  push_boolean(value: boolean): void;
  /**
   * @param {CompactPkeCrs} crs
   * @param {Uint8Array} metadata
   * @param {ZkComputeLoad} compute_load
   * @returns {ProvenCompactCiphertextList}
   */
  build_with_proof_packed(
    crs: CompactPkeCrs,
    metadata: Uint8Array,
    compute_load: ZkComputeLoad,
  ): ProvenCompactCiphertextList;
};

export type ProvenCompactCiphertextList = {
  free(): void;
  /**
   * @param {TfheCompactPublicKey} public_key
   * @returns {CompactCiphertextListBuilder}
   */
  builder(public_key: TfheCompactPublicKey): CompactCiphertextListBuilder;
  /**
   * @returns {number}
   */
  len(): number;
  /**
   * @returns {boolean}
   */
  is_empty(): boolean;
  /**
   * @returns {Uint8Array}
   */
  serialize(): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @returns {ProvenCompactCiphertextList}
   */
  deserialize(buffer: Uint8Array): ProvenCompactCiphertextList;
  /**
   * @param {bigint} serialized_size_limit
   * @returns {Uint8Array}
   */
  safe_serialize(serialized_size_limit: bigint): Uint8Array;
  /**
   * @param {Uint8Array} buffer
   * @param {bigint} serialized_size_limit
   * @returns {ProvenCompactCiphertextList}
   */
  safe_deserialize(
    buffer: Uint8Array,
    serialized_size_limit: bigint,
  ): ProvenCompactCiphertextList;
};
