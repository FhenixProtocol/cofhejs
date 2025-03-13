export enum FheTypes {
  Bool = 0,
  Uint4 = 1,
  Uint8 = 2,
  Uint16 = 3,
  Uint32 = 4,
  Uint64 = 5,
  Uint128 = 6,
  Uint160 = 7,
  Uint256 = 8,
  Uint512 = 9,
  Uint1024 = 10,
  Uint2048 = 11,
  Uint2 = 12,
  Uint6 = 13,
  Uint10 = 14,
  Uint12 = 15,
  Uint14 = 16,
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
