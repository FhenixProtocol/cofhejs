/**
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import { AdaWallet, BobWallet, MockProvider, MockSigner } from "./utils";
import { afterEach } from "vitest";
import { getAddress } from "ethers";
import { cofhejs } from "../src/sdk";
import { Permit, permitStore } from "../src/sdk/permit";
import { _permitStore } from "../src/sdk/permit/store";
import { SealingKey } from "../src/sdk/sealing";
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
} from "../src/types";
import { FheTypes } from "tfhe";
import { createTfhePublicKey } from "../src/types/keygen";

describe("Sdk Tests", () => {
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
  const coFheUrl = "http://127.0.0.1:3000";

  const initSdkWithBob = async () => {
    return cofhejs.initialize({
      target: "node",
      provider: bobProvider,
      signer: bobSigner,
      coFheUrl,
    });
  };
  const initSdkWithAda = async () => {
    return cofhejs.initialize({
      target: "node",
      provider: adaProvider,
      signer: adaSigner,
      coFheUrl,
    });
  };

  beforeAll(async () => {
    bobPublicKey = await createTfhePublicKey("node");
    bobProvider = new MockProvider(bobPublicKey, BobWallet);
    bobSigner = await bobProvider.getSigner();
    bobAddress = await bobSigner.getAddress();

    adaPublicKey = await createTfhePublicKey("node");
    adaProvider = new MockProvider(adaPublicKey, AdaWallet);
    adaSigner = await adaProvider.getSigner();
    adaAddress = await adaSigner.getAddress();

    localStorage.clear();
    cofhejs.store.setState(cofhejs.store.getInitialState());
  });

  afterEach(() => {
    localStorage.clear();
    cofhejs.store.setState(cofhejs.store.getInitialState());
    _permitStore.setState(_permitStore.getInitialState());
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

    const initWithoutProviderResult = await cofhejs.initialize({
      target: "node",
      // provider: bobProvider,
      // signer: bobSigner,
      coFheUrl,
    } as unknown as InitializationParams);
    expect(initWithoutProviderResult.success).toEqual(false);
    expect(initWithoutProviderResult.error).toEqual(
      "initialize :: missing provider - Please provide an AbstractProvider interface",
    );

    const initWithoutSecurityZonesResult = await cofhejs.initialize({
      target: "node",
      provider: bobProvider,
      signer: bobSigner,
      securityZones: [],
      coFheUrl,
    } as unknown as InitializationParams);
    expect(initWithoutSecurityZonesResult.success).toEqual(false);
    expect(initWithoutSecurityZonesResult.error).toEqual(
      "initialize :: a list of securityZones was provided, but it is empty",
    );
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

  // TODO: Re-enable after zkVerification is implemented
  // it("encrypt", async () => {
  //   await initSdkWithBob();

  //   const nestedEncryptArr = await cofhejs.encrypt([
  //     Encryptable.uint8(8),
  //     Encryptable.uint64(64n),
  //     Encryptable.uint256(256n),
  //   ] as const);

  //   expect(nestedEncryptArr.success).to.equal(true);
  //   if (!nestedEncryptArr.success) return;

  //   nestedEncryptArr.data.forEach((coFheEncryptedInput) => {
  //     expect(coFheEncryptedInput.securityZone).to.equal(0);
  //     // (example hash: 53077133949660154852355738254566001437975918234711977485445625445799159290262n)
  //     // Observed lengths [77, 78]. Please update array if you are here because this test failed. - arch
  //     expect(coFheEncryptedInput.hash.toString().length).to.be.gte(76);
  //     // TODO: Fix after real signature is included (test will fail)
  //     expect(coFheEncryptedInput.signature).to.equal("Haim");
  //   });

  //   expect(nestedEncryptArr.data[0].utype).to.equal(FheUType.uint8);
  //   expect(nestedEncryptArr.data[1].utype).to.equal(FheUType.uint64);
  //   expect(nestedEncryptArr.data[2].utype).to.equal(FheUType.uint256);

  //   const nestedEncryptObj = await cofhejs.encrypt({
  //     uint8: Encryptable.uint8(8),
  //     uint64: Encryptable.uint64(64n),
  //     uint256: Encryptable.uint256(256n),
  //   } as const);

  //   expect(nestedEncryptObj.success).to.equal(true);
  //   if (!nestedEncryptObj.success) return;

  //   Object.entries(nestedEncryptObj.data).forEach(
  //     ([utype, coFheEncryptedInput]) => {
  //       expect(coFheEncryptedInput.securityZone).to.equal(0);
  //       expect(coFheEncryptedInput.utype).to.equal(
  //         FheUType[utype as unknown as FheUType],
  //       );
  //       // (example hash: 53077133949660154852355738254566001437975918234711977485445625445799159290262n)
  //       // Observed lengths [77, 78]. Please update array if you are here because this test failed. - arch
  //       expect(coFheEncryptedInput.hash.toString().length).to.be.gte(76);
  //       // TODO: Fix after real signature is included (test will fail)
  //       expect(coFheEncryptedInput.signature).to.equal("Haim");
  //     },
  //   );
  // });

  it("encrypt (type check)", { timeout: 320000 }, async () => {
    await initSdkWithBob();

    await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });

    const nestedEncrypt = await cofhejs.encrypt([
      { a: Encryptable.bool(false), b: Encryptable.uint64(10n), c: "hello" },
      ["hello", 20n, Encryptable.address(contractAddress)],
      Encryptable.uint8("10"),
    ] as const);

    type ExpectedEncryptedType = [
      Readonly<{ a: CoFheInBool; b: CoFheInUint64; c: string }>,
      Readonly<[string, bigint, CoFheInAddress]>,
      CoFheInUint8,
    ];

    console.log(JSON.stringify(nestedEncrypt.data, null, 2));

    expectTypeOf<Readonly<ExpectedEncryptedType>>().toEqualTypeOf(
      nestedEncrypt.data!,
    );
  });

  // PERMITS

  // Most of the Permit logic is held within the Permit class
  // This core functionality is tested in permit.test.ts
  // The FhenixClient acts as a utility layer to improve the experience of working with Permits
  // The following tests target the client interaction with localstorage and its own reused stateful variables
  //   (this.account, this.chainId, this.send, this.signTypedData)
  // @architect-dev 2024-11-14

  it("localstorage", async () => {
    // FhenixClient leverages a persisted zustand store to handle localstorage
    // zustand persist is heavily tested, this test is just to ensure that its working in our implementation

    await initSdkWithBob();
    const permit1 = await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });

    const dumpLocalStorage = (): { [key: string]: object } => {
      const dump: { [key: string]: object } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          dump[key] = JSON.parse(localStorage.getItem(key) || "");
        }
      }
      return dump;
    };

    // Sdk Store
    const dumped = dumpLocalStorage();
    expect(dumped).to.have.keys(["fhenixjs-permits"]);

    // Permits store

    expect(dumped["fhenixjs-permits"]["state"]).to.have.keys(
      "permits",
      "activePermitHash",
    );

    // Permits
    const bobsPermitsDumped =
      dumped["fhenixjs-permits"]["state"]["permits"][bobAddress];
    expect(bobsPermitsDumped).to.have.keys(
      permit1?.data?.getHash() ?? "permit1Hash",
    );

    // ActivePermit
    expect(
      dumped["fhenixjs-permits"]["state"]["activePermitHash"][bobAddress],
    ).toEqual(permit1?.data?.getHash());
  });
  it("createPermit", async () => {
    const createPermitWithoutInitResult = await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });
    expect(createPermitWithoutInitResult.success).toEqual(false);
    expect(createPermitWithoutInitResult.error).toEqual(
      "createPermit :: cofhejs not initialized. Use `cofhejs.initialize(...)`.",
    );

    await initSdkWithBob();
    const permit = await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });

    // Permit established in store

    const storePermitSerialized =
      permitStore.store.getState().permits[bobAddress]?.[
        permit.data!.getHash()
      ];
    expect(storePermitSerialized).to.not.be.null;

    const storePermit = Permit.deserialize(storePermitSerialized!);
    expect(storePermit.getHash()).toEqual(permit.data?.getHash());

    // Is active permit

    const storeActivePermitHash =
      permitStore.store.getState().activePermitHash[bobAddress];
    expect(storeActivePermitHash).toEqual(permit.data?.getHash());

    // Creating new permit

    const permit2 = await cofhejs.createPermit({
      type: "self",
      issuer: bobAddress,
    });

    const storeActivePermitHash2 =
      permitStore.store.getState().activePermitHash[bobAddress];
    expect(storeActivePermitHash2).toEqual(permit2.data?.getHash());
  });

  // The remaining functions rely on the same logic:
  it("importPermit");
  it("selectActivePermit");
  it("getPermit");
  it("getPermission");
  it("getAllPermits");

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
