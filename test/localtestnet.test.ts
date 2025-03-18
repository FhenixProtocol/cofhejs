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

describe.only("Local Testnet (Anvil) Tests", () => {
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
  const anvilRpcUrl = "http://127.0.0.1:8545";
  const anvilChainId = 31337n;

  const initSdkWithBob = async () => {
    return cofhejs.initialize({
      provider: bobProvider,
      signer: bobSigner,
    });
  };
  const initSdkWithAda = async () => {
    return cofhejs.initialize({
      provider: adaProvider,
      signer: adaSigner,
    });
  };

  beforeAll(async () => {
    bobPublicKey = await createTfhePublicKey();
    bobProvider = new MockProvider(
      bobPublicKey,
      BobWallet,
      anvilRpcUrl,
      anvilChainId,
    );
    bobSigner = await bobProvider.getSigner();
    bobAddress = await bobSigner.getAddress();

    adaPublicKey = await createTfhePublicKey();
    adaProvider = new MockProvider(
      adaPublicKey,
      AdaWallet,
      anvilRpcUrl,
      anvilChainId,
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

    console.log("encrypting");

    const nestedEncrypt = await cofhejs.encrypt(logState, [
      { a: Encryptable.bool(false), b: Encryptable.uint64(10n), c: "hello" },
      ["hello", 20n, Encryptable.address(contractAddress)],
      Encryptable.uint8("10"),
    ] as const);

    console.log("nestedEncrypt", nestedEncrypt);

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

  // PERMITS

  // Most of the Permit logic is held within the Permit class
  // This core functionality is tested in permit.test.ts
  // The FhenixClient acts as a utility layer to improve the experience of working with Permits
  // The following tests target the client interaction with localstorage and its own reused stateful variables
  //   (this.account, this.chainId, this.send, this.signTypedData)
  // @architect-dev 2024-11-14

  // UNSEAL

  it("unsealCiphertext", async () => {
    await initSdkWithBob();
    const permit = (
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      })
    ).data!;

    // Bool
    const boolValue = true;
    const boolCiphertext = SealingKey.seal(
      boolValue ? 1 : 0,
      permit.sealingPair.publicKey,
    );
    const boolCleartext = permit.unsealCiphertext(boolCiphertext);
    expect(boolCleartext).toEqual(boolValue ? 1n : 0n);

    // Uint
    const uintValue = 937387;
    const uintCiphertext = SealingKey.seal(
      uintValue,
      permit.sealingPair.publicKey,
    );
    const uintCleartext = permit.unsealCiphertext(uintCiphertext);
    expect(uintCleartext).toEqual(BigInt(uintValue));

    // Address
    const bnToAddress = (bn: bigint) =>
      getAddress(`0x${bn.toString(16).slice(-40)}`);
    const addressValue = contractAddress;
    const addressCiphertext = SealingKey.seal(
      BigInt(addressValue),
      permit.sealingPair.publicKey,
    );
    const addressCleartext = permit.unsealCiphertext(addressCiphertext);
    expect(bnToAddress(addressCleartext)).toEqual(addressValue);
  });
  it("unseal", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    // Bool
    const boolValue = true;
    const boolCipherStruct: SealedBool = {
      data: SealingKey.seal(boolValue ? 1 : 0, permit.sealingPair.publicKey),
      utype: FheTypes.Bool,
    };

    // Uint
    const uintValue = 937387n;
    const uintCipherStruct: SealedUint = {
      data: SealingKey.seal(uintValue, permit.sealingPair.publicKey),
      utype: FheTypes.Uint64,
    };

    // Address
    const addressValue = contractAddress;
    const addressCipherStruct: SealedAddress = {
      data: SealingKey.seal(BigInt(addressValue), permit.sealingPair.publicKey),
      utype: FheTypes.Uint160,
    };

    // Array - Nested
    const nestedCleartext = permit.unseal([
      boolCipherStruct,
      uintCipherStruct,
      addressCipherStruct,
    ] as const);

    type ExpectedCleartextType = readonly [boolean, bigint, string];

    const expectedCleartext = [boolValue, uintValue, addressValue];

    expectTypeOf(nestedCleartext).toEqualTypeOf<ExpectedCleartextType>();

    expect(nestedCleartext).toEqual(expectedCleartext);
  });

  // TODO: Re-enable once hardhat integration with CoFHE established
  // it("hardhat encrypt/unseal", async () => {
  //   const hardhatChainId = "31337";

  //   bobProvider = new MockProvider(bobPublicKey, BobWallet, hardhatChainId);
  //   bobSigner = await bobProvider.getSigner();

  //   // Should initialize correctly, but fhe public key for hardhat not set
  //   await cofhejs.initialize({
  //     provider: bobProvider,
  //     signer: bobSigner,
  //   });
  //   await cofhejs.createPermit();

  //   // Chain id set to hardhat Chain id
  //   expect(cofhejs.store.getState().chainId).toEqual(hardhatChainId);
  //   expect(cofhejs.store.getState().fheKeys).toEqual({});

  //   // `unsealCiphertext`

  //   // const encryptedValue = cofhejs.encryptValue(5, EncryptionTypes.uint8);
  //   // const unsealedValue = cofhejs.unsealCiphertext(
  //   //   uint8ArrayToString(encryptedValue.data!.data),
  //   // );
  //   // expect(unsealedValue.success).toEqual(true);
  //   // expect(unsealedValue.data).toEqual(5n);

  //   // `unseal`

  //   const intValue = 5;
  //   const boolValue = false;

  //   const encryptResult = (
  //     await cofhejs.encrypt([
  //       Encryptable.uint8(intValue),
  //       Encryptable.bool(boolValue),
  //     ])
  //   );
  //   expect(encryptResult.success).to.equal(true)
  //   if (!encryptResult.success) return;

  //   const [ encryptedInt, encryptedBool ] = encryptResult.data

  //   const sealed = [
  //     { data: uint8ArrayToString(encryptedInt), utype: FheUType.uint8 },
  //     { data: uint8ArrayToString(encryptedBool), utype: FheUType.bool },
  //   ];

  //   const [unsealedInt, unsealedBool] = cofhejs.unseal(sealed).data!;
  //   expect(unsealedInt).to.eq(BigInt(intValue));
  //   expect(unsealedBool).to.eq(boolValue);
  // });
});
