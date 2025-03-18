const ARB_SEPOLIA_RPC = "https://arbitrum-sepolia.drpc.org";
const ARB_SEPOLIA_CHAIN_ID = 421614n;
const ARB_SEPOLIA_COFHE_URL =
  "http://cofhe-sepolia-cofhe-full-lb-59709c003d195d28.elb.eu-west-1.amazonaws.com:8448/";
const ARB_SEPOLIA_VERIFIER_URL =
  "http://fullstack.tn-testnets.fhenix.zone:3001";

/**
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import { AdaWallet, BobWallet, MockProvider, MockSigner } from "./utils";
import { afterEach } from "vitest";
import { getAddress } from "ethers";
import {
  InitializationParams,
  Encryptable,
  Permission,
  SealedBool,
  SealedUint,
  SealedAddress,
  CoFheInUint64,
  CoFheInAddress,
  CoFheInBool,
  CoFheInUint8,
  Result,
  FheTypes,
  EncryptStep,
} from "../src/types";
import { cofhejs, createTfhePublicKey, Permit, SealingKey } from "../src/node";
import { _permitStore, permitStore } from "../src/core/permit/store";

describe("Arbitrum Sepolia Tests", () => {
  let bobPublicKey: string;
  let bobProvider: MockProvider;
  let bobSigner: MockSigner;
  let bobAddress: string;

  let adaPublicKey: string;
  let adaProvider: MockProvider;
  let adaSigner: MockSigner;
  let adaAddress: string;

  const contractAddress = "0x1c786b8ca49D932AFaDCEc00827352B503edf16c";
  const contractAddress2 = "0xB170fC5BAC4a87A63fC84653Ee7e0db65CC62f96";
  const counterProjectId = "COUNTER";
  const uniswapProjectId = "UNISWAP";

  const initSdkWithBob = async () => {
    return cofhejs.initialize({
      provider: bobProvider,
      signer: bobSigner,
      coFheUrl: ARB_SEPOLIA_COFHE_URL,
      verifierUrl: ARB_SEPOLIA_VERIFIER_URL,
    });
  };
  const initSdkWithAda = async () => {
    return cofhejs.initialize({
      provider: adaProvider,
      signer: adaSigner,
      coFheUrl: ARB_SEPOLIA_COFHE_URL,
      verifierUrl: ARB_SEPOLIA_VERIFIER_URL,
    });
  };

  beforeAll(async () => {
    bobPublicKey = await createTfhePublicKey();
    bobProvider = new MockProvider(
      bobPublicKey,
      BobWallet,
      ARB_SEPOLIA_RPC,
      ARB_SEPOLIA_CHAIN_ID,
    );
    bobSigner = await bobProvider.getSigner();
    bobAddress = await bobSigner.getAddress();

    adaPublicKey = await createTfhePublicKey();
    adaProvider = new MockProvider(
      adaPublicKey,
      AdaWallet,
      ARB_SEPOLIA_RPC,
      ARB_SEPOLIA_CHAIN_ID,
    );
    adaSigner = await adaProvider.getSigner();
    adaAddress = await adaSigner.getAddress();

    localStorage.clear();
    cofhejs.store.setState(cofhejs.store.getInitialState());
  });

  afterEach(() => {
    localStorage.clear();
    cofhejs.store.setState(cofhejs.store.getInitialState());
    permitStore.store.setState(permitStore.store.getInitialState());
  });

  it("should be in happy-dom environment", async () => {
    expect(typeof window).not.toBe("undefined");
  });

  it("initialize", async () => {
    expect(cofhejs.store.getState().providerInitialized).toEqual(false);
    expect(cofhejs.store.getState().signerInitialized).toEqual(false);
    expect(cofhejs.store.getState().fheKeysInitialized).toEqual(false);

    await initSdkWithBob();
    expect(cofhejs.store.getState().providerInitialized).toEqual(true);
    expect(cofhejs.store.getState().signerInitialized).toEqual(true);
    expect(cofhejs.store.getState().fheKeysInitialized).toEqual(true);
  });

  it("re-initialize (change account)", async () => {
    const bobPermit = (await initSdkWithBob())!;
    expect(bobPermit.success).toEqual(true);
    expect(bobPermit.data).to.not.equal(undefined);

    // Bob's new permit is the active permit

    let bobFetchedPermit = await cofhejs.getPermit();
    expect(bobFetchedPermit.success).toEqual(true);
    expect(bobFetchedPermit.data?.getHash()).toEqual(bobPermit.data?.getHash());

    const adaPermit = (await initSdkWithAda())!;
    expect(adaPermit.success).toEqual(true);
    expect(adaPermit.data).to.not.equal(undefined);

    // Ada does not have an active permit

    const adaFetchedPermit = await cofhejs.getPermit();
    expect(adaFetchedPermit.success).toEqual(true);
    expect(adaFetchedPermit.data?.getHash()).toEqual(adaPermit.data?.getHash());

    // Switch back to bob

    // Bob's active permit is pulled from the store during init and exists
    bobFetchedPermit = (await initSdkWithBob()) as Result<Permit>;
    expect(bobFetchedPermit.success).toEqual(true);
    expect(bobFetchedPermit.data?.getHash()).toEqual(bobPermit.data?.getHash());
  });

  it("encrypt", { timeout: 320000 }, async () => {
    await initSdkWithBob();

    await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });

    const logState = (state: EncryptStep) => {
      console.log(`Log Encrypt State :: ${state}`);
    };

    const nestedEncrypt = await cofhejs.encrypt(logState, [
      { a: Encryptable.bool(false), b: Encryptable.uint64(10n), c: "hello" },
      ["hello", 20n, Encryptable.address(contractAddress)],
      Encryptable.uint8("10"),
    ] as const);

    expect(nestedEncrypt.success).toEqual(true);
    expect(nestedEncrypt.data).to.not.equal(undefined);

    type ExpectedEncryptedType = [
      {
        readonly a: CoFheInBool;
        readonly b: CoFheInUint64;
        readonly c: string;
      },
      Readonly<[string, bigint, CoFheInAddress]>,
      CoFheInUint8,
    ];

    console.log("bob address", bobAddress);
    console.log(nestedEncrypt.data);
    expectTypeOf<ExpectedEncryptedType>().toEqualTypeOf(nestedEncrypt.data!);
  });
});
