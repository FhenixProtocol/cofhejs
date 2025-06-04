/**
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import { AdaWallet, BobWallet, MockProvider, MockSigner } from "./utils";
import { afterEach } from "vitest";
import { getAddress, ZeroAddress } from "ethers";

import { createTfhePublicKey, Permit, SealingKey } from "../src/node";

const describeIf = process.env.SKIP_NETWORK_TESTS ? describe.skip : describe;

describeIf("Permit Tests", () => {
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
  const verifierUrl = "http://127.0.0.1";

  beforeAll(async () => {
    bobPublicKey = await createTfhePublicKey();
    bobProvider = new MockProvider(bobPublicKey, BobWallet, rpcUrl, 420105n);
    bobSigner = await bobProvider.getSigner();
    bobAddress = await bobSigner.getAddress();

    adaPublicKey = await createTfhePublicKey();
    adaProvider = new MockProvider(adaPublicKey, AdaWallet, rpcUrl, 420105n);
    adaSigner = await adaProvider.getSigner();
    adaAddress = await adaSigner.getAddress();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be in happy-dom environment", async () => {
    expect(typeof window).not.toBe("undefined");
  });

  it("create (self)", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    expect(permit.type).to.eq("self");
    expect(permit.issuer).to.eq(bobAddress);

    // Check defaults here, skipped elsewhere
    expect(permit.expiration).to.eq(1000000000000);
    expect(permit.recipient).to.eq(ZeroAddress);
    expect(permit.validatorId).to.eq(0);
    expect(permit.validatorContract).to.eq(ZeroAddress);
    expect(permit.sealingPair).to.not.be.null;
    expect(permit.issuerSignature).to.eq("0x");
    expect(permit.recipientSignature).to.eq("0x");

    // Validity
    expect(permit.isSigned()).to.eq(false);
    expect(permit.isExpired()).to.eq(false);
    expect(permit.isValid()).to.deep.eq({ valid: false, error: "not-signed" });
    expect(permit._signedDomain).to.eq(undefined);

    // Sealing pair can decrypt
    const value = 937387;
    const ciphertext = SealingKey.seal(value, permit.sealingPair.publicKey);
    const cleartext = permit.unseal(ciphertext);
    expect(cleartext).to.eq(BigInt(value));
  });
  it("create (sharing)", async () => {
    const permit = await Permit.create({
      type: "sharing",
      issuer: bobAddress,
      recipient: adaAddress,
    });

    expect(permit.type).to.eq("sharing");
    expect(permit.issuer).to.eq(bobAddress);
    expect(permit.recipient).to.eq(adaAddress);
  });
  it("create (recipient)", async () => {
    const permit = await Permit.create({
      type: "recipient",
      issuer: bobAddress,
      recipient: adaAddress,
      issuerSignature: "0xBobSignature",
    });

    expect(permit.type).to.eq("recipient");
    expect(permit.issuer).to.eq(bobAddress);
    expect(permit.recipient).to.eq(adaAddress);
    expect(permit.issuerSignature).to.eq("0xBobSignature");
  });

  it("sign (self)", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    await permit.sign(bobSigner);

    expect(permit.issuerSignature).to.not.eq("0x");
    expect(permit.recipientSignature).to.eq("0x");
    expect(permit._signedDomain).to.deep.eq({
      name: "ACL",
      version: "1",
      chainId: 420105,
      verifyingContract: "0xa6Ea4b5291d044D93b73b3CFf3109A1128663E8B",
    });
  });
  it("sign (sharing)", async () => {
    const permit = await Permit.create({
      type: "sharing",
      issuer: bobAddress,
      recipient: adaAddress,
    });

    await permit.sign(bobSigner);

    expect(permit.issuerSignature).to.not.eq("0x");
    expect(permit.recipientSignature).to.eq("0x");
  });
  it("sign (recipient)", async () => {
    const bobPermit = await Permit.create({
      type: "sharing",
      issuer: bobAddress,
      recipient: adaAddress,
    });

    expect(bobPermit.issuerSignature).to.eq("0x");
    expect(bobPermit.recipientSignature).to.eq("0x");

    await bobPermit.sign(bobSigner);

    expect(bobPermit.issuerSignature).to.not.eq("0x");
    expect(bobPermit.recipientSignature).to.eq("0x");

    const adaPermit = await Permit.create({
      ...bobPermit,
      type: "recipient",
    });

    expect(adaPermit.issuerSignature).to.not.eq("0x");
    expect(adaPermit.recipientSignature).to.eq("0x");

    await adaPermit.sign(adaSigner);

    expect(adaPermit.issuerSignature).to.not.eq("0x");
    expect(adaPermit.recipientSignature).to.not.eq("0x");
  });

  it("getPermission", async () => {
    const permit = await Permit.create({
      name: "Test Bob Permit",
      type: "self",
      issuer: bobAddress,
    });

    await permit.sign(bobSigner);

    const { name, type, sealingPair, ...iface } = permit.getInterface();
    const { sealingKey, ...permission } = permit.getPermission();

    expect(name).to.eq("Test Bob Permit");
    expect(iface).to.deep.eq(permission);
    expect(`0x${sealingPair.publicKey}`).to.eq(sealingKey);
  });
  it("getHash", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    const permit2 = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    // Stable hashes
    expect(permit.getHash()).to.eq(permit2.getHash());
  });

  it("unseal", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    // Bool
    const boolValue = true;
    const boolCiphertext = SealingKey.seal(
      boolValue ? 1 : 0,
      permit.sealingPair.publicKey,
    );
    const boolCleartext = permit.unseal(boolCiphertext);
    expect(boolCleartext).to.eq(boolValue ? 1n : 0n);

    // Uint
    const uintValue = 937387;
    const uintCiphertext = SealingKey.seal(
      uintValue,
      permit.sealingPair.publicKey,
    );
    const uintCleartext = permit.unseal(uintCiphertext);
    expect(uintCleartext).to.eq(BigInt(uintValue));

    // Address
    const bnToAddress = (bn: bigint) =>
      getAddress(`0x${bn.toString(16).slice(-40)}`);
    const addressValue = contractAddress;
    const addressCiphertext = SealingKey.seal(
      BigInt(addressValue),
      permit.sealingPair.publicKey,
    );
    const addressCleartext = permit.unseal(addressCiphertext);
    expect(bnToAddress(addressCleartext)).to.eq(addressValue);
  });

  it("serialize", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    const serialized = permit.serialize();
    expect(serialized.sealingPair.publicKey).to.eq(
      permit.sealingPair.publicKey,
    );
    expect(serialized.sealingPair.privateKey).to.eq(
      permit.sealingPair.privateKey,
    );
  });
  it("deserialize", async () => {
    const permit = await Permit.create({
      type: "self",
      issuer: bobAddress,
    });

    await permit.sign(bobSigner);

    const serialized = permit.serialize();

    const deserialized = Permit.deserialize(serialized);

    expect(serialized.issuer).to.eq(deserialized.issuer);
    expect(serialized.recipient).to.eq(deserialized.recipient);
    expect(serialized.issuerSignature).to.eq(deserialized.issuerSignature);
    expect(serialized.recipientSignature).to.eq(
      deserialized.recipientSignature,
    );
    expect(serialized.validatorId).to.eq(deserialized.validatorId);
    expect(serialized.validatorContract).to.eq(deserialized.validatorContract);
    expect(serialized.sealingPair.publicKey).to.eq(
      deserialized.sealingPair.publicKey,
    );
    expect(serialized.sealingPair.privateKey).to.eq(
      deserialized.sealingPair.privateKey,
    );
  });
});
