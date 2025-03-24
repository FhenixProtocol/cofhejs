import {
  TfheCompactPublicKey,
  CompactCiphertextListBuilder,
  CompactPkeCrs,
  ProvenCompactCiphertextList,
  ZkComputeLoad,
} from "node-tfhe";
import {
  MAX_UINT8,
  MAX_UINT16,
  MAX_UINT32,
  MAX_UINT64,
  MAX_UINT128,
  MAX_UINT256,
} from "../core/sdk/consts";
import {
  toBigIntOrThrow,
  validateBigIntInRange,
  fromHexString,
  toBigInt,
  toHexString,
} from "../core/utils/utils";
import {
  EncryptableItem,
  FheTypes,
  Result,
  ResultErr,
  ResultOk,
  VerifyResult,
  VerifyResultRaw,
} from "../types";
import { concatSigRecid, constructZkPoKMetadata } from "../core/utils/zkPoK";

export const zkPack = (
  items: EncryptableItem[],
  publicKey: TfheCompactPublicKey,
) => {
  const builder = ProvenCompactCiphertextList.builder(publicKey);

  for (const item of items) {
    switch (item.utype) {
      case FheTypes.Bool: {
        builder.push_boolean(item.data);
        break;
      }
      case FheTypes.Uint8: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT8);
        builder.push_u8(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint16: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT16);
        builder.push_u16(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint32: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT32);
        builder.push_u32(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint64: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT64);
        builder.push_u64(bint);
        break;
      }
      case FheTypes.Uint128: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT128);
        builder.push_u128(bint);
        break;
      }
      case FheTypes.Uint256: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT256);
        builder.push_u256(bint);
        break;
      }
      case FheTypes.Uint160: {
        const bint =
          typeof item.data === "string"
            ? toBigInt(fromHexString(item.data))
            : item.data;
        builder.push_u160(bint);
        break;
      }
    }
  }

  return builder;
};

export const zkProve = async (
  builder: CompactCiphertextListBuilder,
  crs: CompactPkeCrs,
  address: string,
  securityZone: number,
  chainId: string,
): Promise<ProvenCompactCiphertextList> => {
  const metadata = constructZkPoKMetadata(
    address,
    securityZone,
    parseInt(chainId),
  );

  return new Promise((resolve) => {
    setTimeout(() => {
      const compactList = builder.build_with_proof_packed(
        crs,
        metadata,
        ZkComputeLoad.Verify,
      );

      resolve(compactList);
    }, 0);
  });
};

export const zkVerify = async (
  verifierUrl: string,
  compactList: ProvenCompactCiphertextList,
  address: string,
  securityZone: number,
  chainId: string,
): Promise<Result<VerifyResult[]>> => {
  // send this to verifier
  const list_bytes = compactList.serialize();

  // Convert bytearray to hex string
  const packed_list = toHexString(list_bytes);

  const sz_byte = new Uint8Array([securityZone]);

  // Construct request payload
  const payload = {
    packed_list,
    account_addr: address,
    security_zone: sz_byte[0],
    chain_id: parseInt(chainId),
  };

  const body = JSON.stringify(payload);

  // Send request to verification server
  try {
    const response = await fetch(`${verifierUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      // Get the response body as text for better error details
      const errorBody = await response.text();
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers));
      console.log("Response body:", errorBody);
      return ResultErr(
        `HTTP error! status: ${response.status}, body: ${errorBody}`,
      );
    }

    const json: { status: string; data: VerifyResultRaw[]; error: string } =
      await response.json();

    if (json.status === "success") {
      return ResultOk(
        json.data.map(({ ct_hash, signature, recid }) => {
          return {
            ct_hash,
            signature: concatSigRecid(signature, recid),
          };
        }),
      );
    } else {
      return ResultErr(json.error);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : `Error: ${e}`;
    console.error(message);
    return ResultErr(message);
  }
};
