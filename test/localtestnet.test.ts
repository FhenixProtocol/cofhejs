/**
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import {
  AdaWallet,
  BobWallet,
  expectResultSuccess,
  MockProvider,
  MockSigner,
} from "./utils";
import { afterEach } from "vitest";
import { ethers } from "ethers";
import {
  Encryptable,
  CoFheInUint64,
  CoFheInAddress,
  CoFheInBool,
  CoFheInUint8,
  FheTypes,
  EncryptStep,
} from "../src/types";
import { cofhejs, createTfhePublicKey, Permit, SealingKey } from "../src/node";
import { _permitStore, permitStore } from "../src/core/permit/store";

describe("Local Testnet (Anvil) Tests", () => {
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
      environment: "MOCK",
    });
  };
  const initSdkWithAda = async () => {
    return cofhejs.initialize({
      provider: adaProvider,
      signer: adaSigner,
      environment: "MOCK",
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
    const bobPermit = expectResultSuccess(await initSdkWithBob());

    // Bob's new permit is the active permit

    const bobFetchedPermit = expectResultSuccess(await cofhejs.getPermit());
    expect(bobFetchedPermit.getHash()).toEqual(bobPermit?.getHash());

    const adaPermit = expectResultSuccess(await initSdkWithAda());

    // Ada does not have an active permit

    const adaFetchedPermit = expectResultSuccess(await cofhejs.getPermit());
    expect(adaFetchedPermit.getHash()).toEqual(adaPermit?.getHash());

    // Switch back to bob

    // Bob's active permit is pulled from the store during init and exists
    const bobInitializedPermit = expectResultSuccess(await initSdkWithBob());
    expect(bobInitializedPermit?.getHash()).toEqual(bobPermit?.getHash());
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

    expect(nestedEncrypt.error).toEqual(null);
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

  it("full flow", { timeout: 320000 }, async () => {
    await initSdkWithBob();

    const logState = (state: EncryptStep) => {
      console.log(`Log Encrypt State :: ${state}`);
    };

    const inEncryptUint32 = expectResultSuccess(
      await cofhejs.encrypt(logState, [Encryptable.uint32(25n)] as const),
    )[0];

    console.log("inEncryptUint32", inEncryptUint32);

    const exampleContractAddress = "0x0000000000000000000000000000000000000300";
    const exampleContractAbi = [
      {
        type: "function",
        name: "eNumber",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "euint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "numberHash",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "setNumberTrivial",
        inputs: [
          { name: "inNumber", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "setNumber",
        inputs: [
          {
            name: "inNumber",
            type: "tuple",
            internalType: "struct InEuint32",
            components: [
              { name: "ctHash", type: "uint256", internalType: "uint256" },
              { name: "securityZone", type: "uint8", internalType: "uint8" },
              { name: "utype", type: "uint8", internalType: "uint8" },
              { name: "signature", type: "bytes", internalType: "bytes" },
            ],
          },
        ],
        outputs: [],
        stateMutability: "nonpayable",
      },
    ] as const;

    const provider = bobProvider.provider;

    // Connect to a provider
    const wallet = BobWallet.connect(provider);

    console.log("Bob Address", bobAddress);

    const exampleContract = new ethers.Contract(
      exampleContractAddress,
      exampleContractAbi,
      wallet,
    );

    // Get nonce for Bob's wallet
    const nonce = await provider.getTransactionCount(bobAddress);
    console.log("Bob nonce", nonce);

    // const tx = await exampleContract.setNumberTrivial(50, { nonce });
    const tx = await exampleContract.setNumber(inEncryptUint32, { nonce });
    await tx.wait();
    console.log("tx hash", tx.hash);
    const ctHash = await exampleContract.numberHash();
    console.log("ctHash", ctHash);

    expectResultSuccess(
      await cofhejs.createPermit({
        type: "self",
        issuer: bobAddress,
      }),
    );

    const unsealed = await cofhejs.unseal(ctHash, FheTypes.Uint32);
    console.log("unsealed", unsealed);
    if (unsealed.error != null) throw unsealed.error;
  });

  // PERMITS

  // Most of the Permit logic is held within the Permit class
  // This core functionality is tested in permit.test.ts
  // The FhenixClient acts as a utility layer to improve the experience of working with Permits
  // The following tests target the client interaction with localstorage and its own reused stateful variables
  //   (this.account, this.chainId, this.send, this.signTypedData)
  // @architect-dev 2024-11-14

  // UNSEAL

  it("unseal", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    // Bool
    const boolValue = true;
    const boolSealed = SealingKey.seal(
      boolValue ? 1 : 0,
      permit.sealingPair.publicKey,
    );
    const boolCleartext = permit.unseal(boolSealed);
    expect(boolCleartext).toEqual(boolValue ? 1n : 0n);

    // Uint
    const uintValue = 937387n;
    const uintSealed = SealingKey.seal(uintValue, permit.sealingPair.publicKey);
    const uintCleartext = permit.unseal(uintSealed);
    expect(uintCleartext).toEqual(uintValue);

    // Address
    const addressValue = contractAddress;
    const addressSealed = SealingKey.seal(
      BigInt(addressValue),
      permit.sealingPair.publicKey,
    );
    const addressCleartext = permit.unseal(addressSealed);
    expect(addressCleartext).toEqual(addressValue);
  });
});
