import { EncryptableItem, Result, ResultErr, ResultOk } from "../types";
import {
  fromHexString,
  toBigInt,
  toBigIntOrThrow,
  validateBigIntInRange,
} from "./utils";
import {
  MAX_UINT128,
  MAX_UINT16,
  MAX_UINT256,
  MAX_UINT32,
  MAX_UINT64,
  MAX_UINT8,
} from "./consts";
import {
  type TfheCompactPublicKey,
  type CompactPkeCrs,
  type CompactCiphertextListBuilder,
  type ProvenCompactCiphertextList,
} from "tfhe";
import { getTfhe } from "./tfhe-wrapper";

export const zkPack = (
  items: EncryptableItem[],
  publicKey: TfheCompactPublicKey,
) => {
  const tfhe = getTfhe();
  const builder = tfhe.ProvenCompactCiphertextList.builder(publicKey);

  for (const item of items) {
    switch (item.utype) {
      case tfhe.FheTypes.Bool: {
        builder.push_boolean(item.data);
        break;
      }
      case tfhe.FheTypes.Uint8: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT8);
        builder.push_u8(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint16: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT16);
        builder.push_u16(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint32: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT32);
        builder.push_u32(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint64: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT64);
        builder.push_u64(bint);
        break;
      }
      case tfhe.FheTypes.Uint128: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT128);
        builder.push_u128(bint);
        break;
      }
      case tfhe.FheTypes.Uint256: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT256);
        builder.push_u256(bint);
        break;
      }
      case tfhe.FheTypes.Uint160: {
        const bint =
          typeof item.data === "string"
            ? toBigInt(fromHexString(item.data))
            : item.data;
        builder.push_u160(bint);
        break;
      }
    }
  }

  return builder as CompactCiphertextListBuilder;
};

export const zkProve = async (
  builder: CompactCiphertextListBuilder,
  crs: CompactPkeCrs,
  address: string,
  securityZone: number,
): Promise<ProvenCompactCiphertextList> => {
  const sz_byte = new Uint8Array([securityZone]);

  const metadata = new Uint8Array(address.length + 1);
  metadata.set(new TextEncoder().encode(address));
  metadata.set([sz_byte[0]], address.length);

  return new Promise((resolve) => {
    setTimeout(() => {
      const tfhe = getTfhe();

      const compactList = builder.build_with_proof_packed(
        crs,
        metadata,
        // recordToUint8Array({
        //   account_address: address,
        //   security_zone: securityZone,
        // }),
        tfhe.ZkComputeLoad.Verify,
      );

      resolve(compactList);
    }, 0);
  });
};

type VerifyResultRaw = {
  ct_hash: string;
  signature: string;
  recid: number;
};

type VerifyResult = {
  ct_hash: string;
  signature: string;
};

export const zkVerify = async (
  coFheUrl: string,
  compactList: ProvenCompactCiphertextList,
  address: string,
  securityZone: number,
): Promise<Result<VerifyResult[]>> => {
  // send this to verifier
  const list_bytes = compactList.serialize();

  // Convert bytearray to base64 string
  const base64List = btoa(
    String.fromCharCode.apply(null, Array.from(list_bytes)),
  );

  const sz_byte = new Uint8Array([securityZone]);

  // Construct request payload
  const payload = {
    packed_list: base64List,
    account_addr: address,
    security_zone: sz_byte[0],
  };

  const body = JSON.stringify(payload);

  // Send request to verification server
  try {
    const response = await fetch(`${coFheUrl}/verify`, {
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
        json.data.map(({ ct_hash, signature, recid }) => ({
          ct_hash,
          signature: `${signature}${recid + 27}`,
        })),
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
