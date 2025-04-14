/**
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import {
  AdaWallet,
  BobWallet,
  expectResultError,
  expectResultSuccess,
  MockProvider,
  MockSigner,
} from "./utils";
import { afterEach } from "vitest";
import { getAddress } from "ethers";
import {
  InitializationParams,
  Encryptable,
  Permission,
  CoFheInUint64,
  CoFheInAddress,
  CoFheInBool,
  CoFheInUint8,
  FheTypes,
  EncryptStep,
  CofhejsErrorCode,
} from "../src/types";
import { cofhejs, createTfhePublicKey, Permit, SealingKey } from "../src/node";
import { _permitStore, permitStore } from "../src/core/permit/store";
import { bytesToBigInt } from "../src/core/utils";

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
  const rpcUrl = "http://127.0.0.1:42069";
  const coFheUrl = "http://127.0.0.1";
  const verifierUrl = "http://127.0.0.1:3001";
  const thresholdNetworkUrl = "http://127.0.0.1:3000";

  const initSdkWithBob = async () => {
    return cofhejs.initialize({
      provider: bobProvider,
      signer: bobSigner,
      environment: "LOCAL",
    });
  };
  const initSdkWithAda = async () => {
    return cofhejs.initialize({
      provider: adaProvider,
      signer: adaSigner,
      environment: "LOCAL",
    });
  };

  beforeAll(async () => {
    bobPublicKey = await createTfhePublicKey();
    bobProvider = new MockProvider(bobPublicKey, BobWallet, rpcUrl, 420105n);
    bobSigner = await bobProvider.getSigner();
    bobAddress = await bobSigner.getAddress();

    adaPublicKey = await createTfhePublicKey();
    adaProvider = new MockProvider(adaPublicKey, AdaWallet, rpcUrl, 420105n);
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

    expectResultError(
      await cofhejs.initialize({
        target: "node",
        // provider: bobProvider,
        // signer: bobSigner,
        environment: "LOCAL",
      } as unknown as InitializationParams),
      CofhejsErrorCode.MissingProviderParam,
    );

    expectResultError(
      await cofhejs.initialize({
        target: "node",
        provider: bobProvider,
        signer: bobSigner,
        securityZones: [],
        environment: "LOCAL",
      } as unknown as InitializationParams),
      CofhejsErrorCode.EmptySecurityZonesParam,
    );
  });

  it("re-initialize (change account)", async () => {
    const bobPermit = expectResultSuccess(await initSdkWithBob());

    // Bob's new permit is the active permit

    let bobFetchedPermit: Permit | undefined = expectResultSuccess(
      await cofhejs.getPermit(),
    );
    expect(bobFetchedPermit.getHash()).toEqual(bobPermit?.getHash());

    const adaPermit = expectResultSuccess(await initSdkWithAda());

    // Ada does not have an active permit

    const adaFetchedPermit = expectResultSuccess(await cofhejs.getPermit());
    expect(adaFetchedPermit.getHash()).toEqual(adaPermit?.getHash());

    // Switch back to bob

    // Bob's active permit is pulled from the store during init and exists
    bobFetchedPermit = expectResultSuccess(await initSdkWithBob());
    expect(bobFetchedPermit?.getHash()).toEqual(bobPermit?.getHash());
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

    const logState = (state: EncryptStep) => {
      console.log(`Log Encrypt State :: ${state}`);
    };

    try {
      const nestedEncryptResult = await cofhejs.encrypt(
        [
          {
            a: Encryptable.bool(false),
            b: Encryptable.uint64(10n),
            c: "hello",
          },
          ["hello", 20n, Encryptable.address(contractAddress)],
          Encryptable.uint8("10"),
        ] as const,
        0,
        logState,
      );

      const nestedEncrypt = expectResultSuccess(nestedEncryptResult);

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
      console.log(nestedEncrypt);

      expectTypeOf<ExpectedEncryptedType>().toEqualTypeOf(nestedEncrypt);
    } catch (err) {
      console.log("Err in Encrypt (Type Check)", err);
    }
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
    const permit1 = expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

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
    expect(dumped).to.have.keys(["cofhejs-permits", "cofhejs-keys"]);

    // Keys store
    expect(dumped["cofhejs-keys"]["state"]).to.have.keys(["fhe", "crs"]);
    expect(dumped["cofhejs-keys"]["state"]["fhe"]).to.have.keys(["420105"]);
    expect(dumped["cofhejs-keys"]["state"]["crs"]).to.have.keys(["420105"]);

    // Permits store

    expect(dumped["cofhejs-permits"]["state"]).to.have.keys(
      "permits",
      "activePermitHash",
    );

    // Permits
    const bobsPermitsDumped =
      dumped["cofhejs-permits"]["state"]["permits"][bobAddress];
    expect(bobsPermitsDumped).to.have.keys(permit1?.getHash() ?? "permit1Hash");

    // ActivePermit
    expect(
      dumped["cofhejs-permits"]["state"]["activePermitHash"][bobAddress],
    ).toEqual(permit1?.getHash());
  });
  it("createPermit", async () => {
    expectResultError(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
      CofhejsErrorCode.NotInitialized,
    );

    await initSdkWithBob();
    const permit = expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    // Permit established in store

    const storePermitSerialized =
      permitStore.store.getState().permits[bobAddress]?.[permit.getHash()];
    expect(storePermitSerialized).to.not.be.null;

    const storePermit = Permit.deserialize(storePermitSerialized!);
    expect(storePermit.getHash()).toEqual(permit.getHash());

    // Is active permit

    const storeActivePermitHash =
      permitStore.store.getState().activePermitHash[bobAddress];
    expect(storeActivePermitHash).toEqual(permit.getHash());

    // Creating new permit

    const permit2 = expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    const storeActivePermitHash2 =
      permitStore.store.getState().activePermitHash[bobAddress];
    expect(storeActivePermitHash2).toEqual(permit2.getHash());
  });

  // The remaining functions rely on the same logic:
  it("importPermit");
  it("selectActivePermit");
  it("getPermit");
  it("getPermission");
  it("getAllPermits");

  // UNSEAL

  it("unseal", async () => {
    await initSdkWithBob();
    const permit = expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    // Bool
    const boolValue = true;
    const boolSealed = SealingKey.seal(
      boolValue ? 1 : 0,
      permit.sealingPair.publicKey,
    );
    const boolCleartext = permit.unseal(boolSealed);
    expect(boolCleartext).toEqual(boolValue ? 1n : 0n);

    // Uint
    const uintValue = 937387;
    const uintSealed = SealingKey.seal(uintValue, permit.sealingPair.publicKey);
    const uintCleartext = permit.unseal(uintSealed);
    expect(uintCleartext).toEqual(BigInt(uintValue));

    // Address
    const bnToAddress = (bn: bigint) =>
      getAddress(`0x${bn.toString(16).slice(-40)}`);
    const addressValue = contractAddress;
    const addressSealed = SealingKey.seal(
      BigInt(addressValue),
      permit.sealingPair.publicKey,
    );
    const addressCleartext = permit.unseal(addressSealed);
    expect(bnToAddress(addressCleartext)).toEqual(addressValue);
  });

  it("unseal via cofhe", async () => {
    await initSdkWithBob();

    expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    const result = expectResultSuccess(
      await cofhejs.unseal(
        19802325772829003454295216436649817904709442291884150996340034369559496655872n,
        FheTypes.Uint32,
      ),
    );

    console.log("result", result);
  });

  it("decrypt via cofhe", async () => {
    await initSdkWithBob();

    expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    const result = expectResultSuccess(
      await cofhejs.decrypt(
        19802325772829003454295216436649817904709442291884150996340034369559496655872n,
        FheTypes.Uint32,
      ),
    );

    console.log("result", result);
  });

  it("unseal (hardcoded permit)", async () => {
    await initSdkWithBob();

    const ctHash =
      19802325772829003454295216436649817904709442291884150996340034369559496655872n;
    const permission: Permission = {
      issuer: "0xB4E1decAd11798C446BcBed8C25b2f2923Fc1AC8",
      expiration: 1000000000000,
      recipient: "0x0000000000000000000000000000000000000000",
      validatorId: 0,
      validatorContract: "0x0000000000000000000000000000000000000000",
      sealingKey:
        "0xeebfae87c1537b80331615758eebf9c04e0ed1a878ac9804f6d66dbf44376a15",
      issuerSignature:
        "0x4a5bc77846e2a1f846bb2d91971eb2ce520baa633634217b1a888ab609f8f447173c57f7498e249f25b4fd1666b4f79099e8c7f987d2971765b7b4ac46b642e31b",
      recipientSignature: "0x",
    };

    try {
      const body = {
        ct_tempkey: ctHash.toString(16).padStart(64, "0"),
        host_chain_id: 420105,
        permit: {
          ...permission,
          issuerSignature: permission.issuerSignature.replace("0x", ""),
          recipientSignature: permission.recipientSignature.replace("0x", ""),
        },
      };
      const decryptRes = await fetch(`${thresholdNetworkUrl}/decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const { decrypted } = await decryptRes.json();
      console.log({ decrypted });
      const unsealed = bytesToBigInt(decrypted);
      console.log("unsealed", unsealed);
    } catch (e) {
      console.log("unseal :: decrypt request failed ::", e);
    }

    try {
      const body = {
        ct_tempkey: ctHash.toString(16).padStart(64, "0"),
        host_chain_id: 420105,
        permit: {
          ...permission,
          issuerSignature: permission.issuerSignature.replace("0x", ""),
          recipientSignature: permission.recipientSignature.replace("0x", ""),
        },
      };
      const sealOutputRes = await fetch(`${thresholdNetworkUrl}/sealoutput`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const { sealed, signature, encryption_type } = await sealOutputRes.json();
      console.log("sealed", sealed);
      console.log("signature", signature);
      console.log("encryption_type", encryption_type);

      // const sealOutput = await sealOutputRes.json();
      // console.log("sealed output", sealOutput);
      // const sealed = BigInt(sealOutput.data).toString();
      // console.log("unsealed", sealed);
    } catch (e) {
      console.log("unseal :: sealOutput request failed ::", e);
    }
  });
});
