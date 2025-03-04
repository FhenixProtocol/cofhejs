export enum FheTypes {
  Bool = 0,
  Uint2 = 1,
  Uint4 = 2,
  Uint6 = 3,
  Uint8 = 4,
  Uint10 = 5,
  Uint12 = 6,
  Uint14 = 7,
  Uint16 = 8,
  Uint32 = 9,
  Uint64 = 10,
  Uint128 = 11,
  Uint160 = 12,
  Uint256 = 13,
  Uint512 = 14,
  Uint1024 = 15,
  Uint2048 = 16,
  Int2 = 17,
  Int4 = 18,
  Int6 = 19,
  Int8 = 20,
  Int10 = 21,
  Int12 = 22,
  Int14 = 23,
  Int16 = 24,
  Int32 = 25,
  Int64 = 26,
  Int128 = 27,
  Int160 = 28,
  Int256 = 29,
}

/**
 * List of All FHE uint types (excludes bool and address)
 */
export const FheUintUTypes = [
  FheTypes.Uint8,
  FheTypes.Uint16,
  FheTypes.Uint32,
  FheTypes.Uint64,
  FheTypes.Uint128,
  FheTypes.Uint256,
] as const;

/**
 * List of All FHE types (uints, bool, and address)
 */
export const FheAllUTypes = [
  FheTypes.Bool,
  FheTypes.Uint8,
  FheTypes.Uint16,
  FheTypes.Uint32,
  FheTypes.Uint64,
  FheTypes.Uint128,
  FheTypes.Uint256,
  FheTypes.Uint160,
] as const;
