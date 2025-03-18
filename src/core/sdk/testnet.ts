/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { encryptExtract, encryptReplace } from ".";
import {
  AbstractProvider,
  CoFheInItem,
  EncryptableItem,
  Encrypted_Inputs,
  EncryptStep,
  Result,
  ResultErr,
  ResultOk,
  VerifyResult,
} from "../../types";
import { sleep } from "../utils";
import { _sdkStore } from "./store";

const mockZkVerifierAddress = "0x0000000000000000000000000000000000000100";
const mockQueryDecrypterAddress = "0x0000000000000000000000000000000000000200";
const mockZkVerifierSignerPkey =
  "0x6c8d7f768a6bb4aafe85e8a2f5a9680355239c7e14646ed62b044e39de154512";
const existsSignature = "0x267c4ae4";

export async function checkIsTestnet(
  provider: AbstractProvider,
): Promise<boolean> {
  // Check if testnet mock contracts are deployed by attempting to call them
  try {
    // Call with empty data to check if contracts exist
    const zkVerifierExistsRaw = await provider.call({
      to: mockZkVerifierAddress,
      data: existsSignature,
    });
    const queryDecrypterExistsRaw = await provider.call({
      to: mockQueryDecrypterAddress,
      data: existsSignature,
    });

    const [zkVerifierExists] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      zkVerifierExistsRaw,
    );
    const [queryDecrypterExists] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      queryDecrypterExistsRaw,
    );

    return zkVerifierExists && queryDecrypterExists;
  } catch (err) {
    console.log("checkIsTestnet :: err", err);
    return false;
  }
}

async function mockZkVerifySign(
  items: EncryptableItem[],
  securityZone: number,
): Promise<Result<VerifyResult[]>> {
  // Create ethers wallet with mockZkVerifierSignerPkey
  const wallet = new ethers.Wallet(mockZkVerifierSignerPkey);

  // Create array to store results
  const results = [];

  try {
    for (const item of items) {
      // Pack the data into bytes and hash it
      const packedData = ethers.solidityPacked(
        ["uint256", "int32", "uint8"],
        [BigInt(item.data), securityZone, item.utype],
      );
      const messageHash = ethers.keccak256(packedData);

      // Convert to EthSignedMessageHash (adds "\x19Ethereum Signed Message:\n32" prefix)
      const ethSignedHash = ethers.hashMessage(ethers.getBytes(messageHash));

      // Sign the message
      const signature = await wallet.signMessage(
        ethers.getBytes(ethSignedHash),
      );

      results.push({
        ct_hash: messageHash,
        signature: signature,
      });
    }
    return ResultOk(results);
  } catch (err) {
    console.log("mockZkVerifySign :: err:", err);
    return ResultErr(`mockZkVerifySign :: err: ${err}`);
  }
}

export async function mockEncrypt<T extends any[]>(
  setState: (state: EncryptStep) => void,
  item: [...T],
  securityZone = 0,
): Promise<Result<[...Encrypted_Inputs<T>]>> {
  setState(EncryptStep.Extract);

  const state = _sdkStore.getState();

  if (state.account == null)
    return ResultErr("encrypt :: account uninitialized");

  if (state.chainId == null)
    return ResultErr("encrypt :: chainId uninitialized");

  const encryptableItems = encryptExtract(item);

  setState(EncryptStep.Pack);

  // Sleep to avoid rate limiting
  await sleep(100);

  setState(EncryptStep.Prove);

  await sleep(500);

  setState(EncryptStep.Verify);

  await sleep(2000);

  const signedResults = await mockZkVerifySign(encryptableItems, securityZone);
  if (!signedResults.success)
    return ResultErr(
      `encrypt :: ZK proof verification failed - ${signedResults.error}`,
    );

  const inItems: CoFheInItem[] = signedResults.data.map(
    ({ ct_hash, signature }, index) => ({
      hash: BigInt(ct_hash),
      securityZone,
      utype: encryptableItems[index].utype,
      signature,
    }),
  );

  setState(EncryptStep.Replace);

  const [preparedInputItems, remainingInItems] = encryptReplace(item, inItems);

  if (remainingInItems.length !== 0)
    return ResultErr(
      "encrypt :: some encrypted inputs remaining after replacement",
    );

  setState(EncryptStep.Done);

  return ResultOk(preparedInputItems);
}
